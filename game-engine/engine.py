
from collections import namedtuple
from threading import Thread
from queue import Queue
import time
import json
import subprocess
import socket
import eval7
import sys
import os

sys.path.append(os.getcwd())
from config import *

FoldAction = namedtuple('FoldAction', [])
CallAction = namedtuple('CallAction', [])
CheckAction = namedtuple('CheckAction', [])
# we coalesce BetAction and RaiseAction for convenience
RaiseAction = namedtuple('RaiseAction', ['amount'])
AssignAction = namedtuple('AssignAction', ['cards'])
TerminalState = namedtuple('TerminalState', ['deltas', 'previous_state'])

STREET_NAMES = ['Flop', 'Turn', 'River']
DECODE = {'F': FoldAction, 'C': CallAction, 'K': CheckAction, 'R': RaiseAction, 'A': AssignAction}
CCARDS = lambda cards: ','.join(map(str, cards))
PCARDS = lambda cards: '[{}]'.format(' '.join(map(str, cards)))
PVALUE = lambda name, value: ', {} ({})'.format(name, value)
STATUS = lambda players: ''.join([PVALUE(p.name, p.bankroll) for p in players])
POTVAL = lambda value: ', ({})'.format(value)

# Socket encoding scheme:
#
# T#.### the player's game clock
# P# the player's index
# H**,** the player's holde cards in common format
# #F a fold action in the round history on a particular board
# #C a call action in the round history on a particular board
# #K a check action in the round history on a particular board
# #R### a raise action in the round history on a particular board
# #B**,**,**,**,** the board cards in common format for each board
# #O**,** the opponent's hand in common format for each board
# D###;D## the player's, followed by opponent's, bankroll delta from the round
# Q game over
#
# Board clauses are separated by semicolons
# Clauses are separated by spaces
# Messages end with '\n'
# The engine expects a response of #K for each board at the end of the round as an ack,
# otherwise a response which encodes the player's action
# Action history is sent once, including the player's actions


class SmallDeck(eval7.Deck):
    '''
    Provides method for creating new deck from existing eval7.Deck object.
    '''
    def __init__(self, existing_deck):
        self.cards = [eval7.Card(str(card)) for card in existing_deck.cards]


class BoardState(namedtuple('_BoardState', ['pot', 'pips', 'hands', 'deck', 'previous_state', 'settled', 'reveal'], defaults=[False, True])):
    '''
    Encodes the game tree for one board within a round.
    '''
    def showdown(self):
        '''
        Compares the players' hands and computes payoffs.
        '''
        score0 = eval7.evaluate(self.deck.peek(5) + self.hands[0])
        score1 = eval7.evaluate(self.deck.peek(5) + self.hands[1])
        if score0 > score1:
            winnings = [self.pot, 0]
        elif score0 < score1:
            winnings = [0, self.pot]
        else:  # split the pot
            winnings = [self.pot//2, self.pot//2]
        return TerminalState(winnings, self)

    def legal_actions(self, button, stacks):
        '''
        Returns a set which corresponds to the active player's legal moves on this board.
        '''
        active = button % 2
        if (self.hands is None) or (len(self.hands[active]) == 0):
            return {AssignAction}
        elif self.settled:
            return {CheckAction}
        # board being played on
        continue_cost = self.pips[1-active] - self.pips[active]
        if continue_cost == 0:
            # we can only raise the stakes if both players can afford it
            bets_forbidden = (stacks[0] == 0 or stacks[1] == 0)
            return {CheckAction} if bets_forbidden else {CheckAction, RaiseAction}
        # continue_cost > 0
        # similarly, re-raising is only allowed if both players can afford it
        raises_forbidden = (continue_cost == stacks[active] or stacks[1-active] == 0)
        return {FoldAction, CallAction} if raises_forbidden else {FoldAction, CallAction, RaiseAction}

    def raise_bounds(self, button, stacks):
        '''
        Returns a tuple of the minimum and maximum legal raises on this board.
        '''
        active = button % 2
        continue_cost = self.pips[1-active] - self.pips[active]
        max_contribution = min(stacks[active], stacks[1-active] + continue_cost)
        min_contribution = min(max_contribution, continue_cost + max(continue_cost, BIG_BLIND))
        return (self.pips[active] + min_contribution, self.pips[active] + max_contribution)

    def proceed(self, action, button, street):
        '''
        Advances the game tree by one action performed by the active player on the current board.
        '''
        active = button % 2
        if isinstance(action, AssignAction):
            new_hands = [[]] * 2
            new_hands[active] = action.cards
            if self.hands is not None:
                opp_hands = self.hands[1-active]
                new_hands[1-active] = opp_hands
            return BoardState(self.pot, self.pips, new_hands, self.deck, self)
        if isinstance(action, FoldAction):
            new_pot = self.pot + sum(self.pips)
            winnings = [0, new_pot] if active == 0 else [new_pot, 0]
            return TerminalState(winnings, BoardState(new_pot, [0, 0], self.hands, self.deck, self, True, False))
        if isinstance(action, CallAction):
            if button == 0: # sb calls bb
                return BoardState(self.pot, [BIG_BLIND] * 2, self.hands, self.deck, self)
            # both players acted
            new_pips = list(self.pips)
            contribution = new_pips[1-active] - new_pips[active]
            new_pips[active] += contribution
            return BoardState(self.pot, new_pips, self.hands, self.deck, self, True)
        if isinstance(action, CheckAction):
            if (street == 0 and button > 0) or button > 1:  # both players acted
                return BoardState(self.pot, self.pips, self.hands, self.deck, self, True, self.reveal)
            # let opponent act
            return BoardState(self.pot, self.pips, self.hands, self.deck, self, self.settled, self.reveal)
        # isinstance(action, RaiseAction)
        new_pips = list(self.pips)
        contribution = action.amount - new_pips[active]
        new_pips[active] += contribution
        return BoardState(self.pot, new_pips, self.hands, self.deck, self)


class RoundState(namedtuple('_RoundState', ['button', 'street', 'stacks', 'hands', 'board_states', 'previous_state'])):
    '''
    Encodes the game tree for one round of poker.
    '''
    def showdown(self):
        '''
        Compares the players' hands and computes payoffs.
        '''
        terminal_board_state = [self.board_state.showdown() if isinstance(self.board_state, BoardState) else self.board_state]
        net_winnings = [0, 0]
        net_winnings[0] += terminal_board_state.deltas[0]
        net_winnings[1] += terminal_board_state.deltas[1]
        end_stacks = [self.stacks[0] + net_winnings[0], self.stacks[1] + net_winnings[1]]
        deltas = [end_stacks[0] - STARTING_STACK, end_stacks[1] - STARTING_STACK]
        return TerminalState(deltas, RoundState(self.button, self.street, self.stacks, self.hands, terminal_board_state, self))

    def legal_actions(self):
        '''
        Returns a list of sets which correspond to the active player's legal moves on the board.
        '''
        return [self.board_state.legal_actions(self.button, self.stacks) if isinstance(self.board_state, BoardState) else {CheckAction}]

    def proceed_street(self):
        '''
        Resets the players' pips on board and advances the game tree to the next round of betting.
        '''
        new_pot = 0
        if isinstance(self.board_state, BoardState):
            new_pot = self.board_state.pot + sum(self.board_state.pips)
        new_board_state = [BoardState(new_pot, [0, 0], self.board_state.hands, self.board_state.deck, self.board_state) if isinstance(self.board_state, BoardState) else self.board_state]
        is_terminal = isinstance(new_board_state, TerminalState)
        if self.street == 5 or is_terminal:
            return RoundState(self.button, 5, self.stacks, self.hands, new_board_state, self).showdown()
        new_street = 3 if self.street == 0 else self.street + 1
        return RoundState(1, new_street, self.stacks, self.hands, new_board_state, self)

    def proceed(self, actions):
        '''
        Advances the game tree by one tuple of actions performed by the active player.
        '''
        new_board_state = [self.board_state.proceed(action, self.button, self.street) if isinstance(self.board_state, BoardState) else self.board_state]
        active = self.button % 2
        new_stacks = list(self.stacks)
        contribution = 0
        if isinstance(new_board_state, BoardState) and isinstance(self.board_state, BoardState):
            contribution += new_board_state.pips[active] - self.board_state.pips[active]
        new_stacks[active] -= contribution
        settled = (isinstance(new_board_state, TerminalState) or new_board_state.settled)
        state = RoundState(self.button + 1, self.street, new_stacks, self.hands, new_board_state, self)
        return state.proceed_street() if settled else state


class Player():
    '''
    Handles subprocess and socket interactions with one player's pokerbot.
    '''

    def __init__(self, name, path):
        self.name = name
        self.path = path
        self.bankroll = 0
        self.commands = None
        self.bot_subprocess = None
        self.socketfile = None
        self.bytes_queue = Queue()

    def build(self):
        '''
        Loads the commands file and builds the pokerbot.
        '''
        try:
            with open(self.path + '/commands.json', 'r') as json_file:
                commands = json.load(json_file)
            if ('build' in commands and 'run' in commands and
                    isinstance(commands['build'], list) and
                    isinstance(commands['run'], list)):
                self.commands = commands
            else:
                print(self.name, 'commands.json missing command')
        except FileNotFoundError:
            print(self.name, 'commands.json not found - check PLAYER_PATH')
        except json.decoder.JSONDecodeError:
            print(self.name, 'commands.json misformatted')
        if self.commands is not None and len(self.commands['build']) > 0:
            try:
                proc = subprocess.run(self.commands['build'],
                                      stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                      cwd=self.path, timeout=BUILD_TIMEOUT, check=False)
                self.bytes_queue.put(proc.stdout)
            except subprocess.TimeoutExpired as timeout_expired:
                error_message = 'Timed out waiting for ' + self.name + ' to build'
                print(error_message)
                self.bytes_queue.put(timeout_expired.stdout)
                self.bytes_queue.put(error_message.encode())
            except (TypeError, ValueError):
                print(self.name, 'build command misformatted')
            except OSError:
                print(self.name, 'build failed - check "build" in commands.json')

    def run(self):
        '''
        Runs the pokerbot and establishes the socket connection.
        '''
        if self.commands is not None and len(self.commands['run']) > 0:
            try:
                server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                with server_socket:
                    server_socket.bind(('', 0))
                    server_socket.settimeout(CONNECT_TIMEOUT)
                    server_socket.listen()
                    port = server_socket.getsockname()[1]
                    proc = subprocess.Popen(self.commands['run'] + [str(port)],
                                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                            cwd=self.path)
                    self.bot_subprocess = proc
                    # function for bot listening
                    def enqueue_output(out, queue):
                        try:
                            for line in out:
                                queue.put(line)
                        except ValueError:
                            pass
                    # start a separate bot listening thread which dies with the program
                    Thread(target=enqueue_output, args=(proc.stdout, self.bytes_queue), daemon=True).start()
                    # block until we timeout or the player connects
                    client_socket, _ = server_socket.accept()
                    with client_socket:
                        client_socket.settimeout(CONNECT_TIMEOUT)
                        sock = client_socket.makefile('rw')
                        self.socketfile = sock
                        print(self.name, 'connected successfully')
            except (TypeError, ValueError):
                print(self.name, 'run command misformatted')
            except OSError:
                print(self.name, 'run failed - check "run" in commands.json')
            except socket.timeout:
                print('Timed out waiting for', self.name, 'to connect')

    def stop(self):
        '''
        Closes the socket connection and stops the pokerbot.
        '''
        if self.socketfile is not None:
            try:
                self.socketfile.write('Q\n')
                self.socketfile.close()
            except socket.timeout:
                print('Timed out waiting for', self.name, 'to disconnect')
            except OSError:
                print('Could not close socket connection with', self.name)
        if self.bot_subprocess is not None:
            try:
                outs, _ = self.bot_subprocess.communicate(timeout=CONNECT_TIMEOUT)
                self.bytes_queue.put(outs)
            except subprocess.TimeoutExpired:
                print('Timed out waiting for', self.name, 'to quit')
                self.bot_subprocess.kill()
                outs, _ = self.bot_subprocess.communicate()
                self.bytes_queue.put(outs)
        with open(self.name + '.txt', 'wb') as log_file:
            bytes_written = 0
            for output in self.bytes_queue.queue:
                try:
                    bytes_written += log_file.write(output)
                    if bytes_written >= PLAYER_LOG_SIZE_LIMIT:
                        break
                except TypeError:
                    pass

    def query(self, round_state, player_message, game_log):
        '''
        Requests an action from the pokerbot over the socket connection.
        At the end of the round, we request CheckAction from the pokerbot.
        '''
        active = round_state.button % 2 if isinstance(round_state, RoundState) else None
        if self.socketfile is not None:
            clauses = ''
            try:
                player_message[0] = 'T{:.3f}'.format('No game clock')
                message = ' '.join(player_message) + '\n'
                del player_message[1:]  # do not send redundant action history
                self.socketfile.write(message)
                self.socketfile.flush()
                clause = self.socketfile.readline().strip()
                action = self.query_board(round_state.board_state, clause, game_log, active, round_state.stacks) if isinstance(round_state, RoundState)
                    else self.query_board(round_state.previous_state.board_state, clause, game_log, active, round_state.previous_state.stacks)
                if isinstance(action, AssignAction):
                    if set().union(*[set(action.cards)]) == set(round_state.hands[active]):
                        return action
                    #else: (assigned cards not in hand or some cards unassigned)
                    game_log.append(self.name + ' attempted illegal assignment')
                else:
                    contribution = 0
                    opp_continue_cost = 0
                    if isinstance(action, RaiseAction):
                        contribution += action.amount - round_state.board_state.pips[active]
                        opp_continue_cost += action.amount - round_state.board_state.pips[1-active]
                    elif isinstance(action, CallAction):
                        contribution += round_state.board_state.pips[1-active] - round_state.board_state.pips[active]
                    max_contribution = round_state.stacks[active] if isinstance(round_state, RoundState) else 0
                    opp_stack = round_state.stacks[1-active] if isinstance(round_state, RoundState) else 0
                    all_in_flag = (contribution == max_contribution)
                    if 0 <= contribution <= max_contribution:
                        if not all_in_flag:
                            if not isinstance(action, RaiseAction):
                                continue
                            min_raise = round_state.board_state.raise_bounds(active, round_state.stacks)[0]
                            legal_actions = round_state.board_state.legal_actions(active, round_state.stacks)
                            if action.amount < min_raise:
                                game_log.append(self.name + ' did not meet minimum raise amount on board {}'.format(i+1))
                                action = CallAction() if CallAction in legal_actions else CheckAction()

                        if opp_continue_cost <= opp_stack:
                            return action
                        else:
                            game_log.append(self.name + " attempted net RaiseAction's which opponent cannot match")
                            effective_stack = round_state.stacks[1-active]
                            if isinstance(action, RaiseAction):
                                raise_delta = action.amount - round_state.board_state.pips[1-active]
                                if effective_stack == 0:
                                    action = CallAction()
                                elif raise_delta > effective_stack:
                                    action = RaiseAction(round_state.board_state.pips[1-active] + effective_stack)
                                    effective_stack = 0
                                else:
                                    effective_stack -= raise_delta
                            return action
                    else: # (attempted negative net raise or net raise larger than bankroll)
                        game_log.append(self.name + " attempted an illegal Raise or Call Action")
            except socket.timeout:
                error_message = self.name + ' ran out of time'
                game_log.append(error_message)
                print(error_message)
            except OSError:
                error_message = self.name + ' disconnected'
                game_log.append(error_message)
                print(error_message)
            except (IndexError, KeyError, ValueError):
                error_message = self.name + ' response misformatted: ' + str(clauses)
                game_log.append(error_message)
            except TypeError:
                error_message = self.name + ' attempted an action after the round has ended'
                game_log.append(error_message)
        default_action = round_state.legal_actions() if isinstance(round_state, RoundState) else {CheckAction}
        return CheckAction() if CheckAction in default_action else FoldAction()

    def query_board(self, board_state, clause, game_log, active, stacks):
        '''
        Parses one action from the pokerbot for a specific board.
        '''
        legal_actions = board_state.legal_actions(active, stacks) if isinstance(board_state, BoardState) else {CheckAction}
        action = DECODE[clause[1]]
        if action in legal_actions:
            if clause[1] == 'R':
                amount = int(clause[2:])
                max_raise = board_state.raise_bounds(active, stacks)[1]
                if board_state.pips[1-active] < amount <= max_raise:
                    return action(amount)
                elif board_state.pips[1-active] == amount:
                    return CallAction()
            elif clause[1] == 'A':
                cards_strings = clause[2:].split(',')
                cards = [eval7.Card(s) for s in cards_strings]
                return action(cards)
            else:
                return action()
        game_log.append(self.name + ' attempted illegal ' + action.__name__)
        return CheckAction() if CheckAction in legal_actions else FoldAction()


class Game():
    '''
    Manages logging and the high-level game procedure.
    '''

    def __init__(self):
        self.log = ['6.176 MIT Pokerbots - ' + PLAYER_1_NAME + ' vs ' + PLAYER_2_NAME]
        self.player_messages = [[], []]

    def log_round_state(self, players, round_state):
        '''
        Incorporates RoundState information into the game log and player messages.
        '''
        if round_state.street == 0 and round_state.button == -2:
            self.log.append('{} posts the blind of {} on each board'.format(players[0].name, SMALL_BLIND))
            self.log.append('{} posts the blind of {} on each board'.format(players[1].name, BIG_BLIND))
            self.log.append('{} dealt {}'.format(players[0].name, PCARDS(round_state.hands[0])))
            self.log.append('{} dealt {}'.format(players[1].name, PCARDS(round_state.hands[1])))
            self.player_messages[0] = ['T0.', 'P0', 'H' + CCARDS(round_state.hands[0])]
            self.player_messages[1] = ['T0.', 'P1', 'H' + CCARDS(round_state.hands[1])]
        elif round_state.street > 0 and round_state.button == 1:
            board = round_state.board_state.deck.peek(round_state.street) if isinstance(round_state.board_state, BoardState) else []
            log_message = ''
            if isinstance(round_state.board_state, BoardState):
                log_message += STREET_NAMES[round_state.street - 3] + ' ' + PCARDS(board)
                log_message += POTVAL(round_state.board_state.pot)
                log_message += PVALUE(players[0].name, round_state.stacks[0])
                log_message += PVALUE(players[1].name, round_state.stacks[1])
            else:
                log_message += POTVAL(round_state.board_state.previous_state.pot)
            self.log.append(log_message)
            compressed_board = ';'.join([str(i+1) + 'B' + CCARDS(board)])
            self.player_messages[0].append(compressed_board)
            self.player_messages[1].append(compressed_board)

    def log_action(self, name, action, bet_override, active):
        '''
        Incorporates action information into the game log and player messages.
        '''
        code = self.log_board_action(name, action, bet_override)
        if 'A' in code:
            self.player_messages[active].append(code)
            self.player_messages[1-active].append(';'.join(['A']))
        else:
            self.player_messages[0].append(code)
            self.player_messages[1].append(code)

    def log_board_action(self, name, action, bet_override):
        '''
        Incorporates action information from a single board into the game log.

        Returns code for a single action on one board.
        '''
        if isinstance(action, FoldAction):
            phrasing = ' folds.'
            code = 'F'
        elif isinstance(action, CallAction):
            phrasing = ' calls.'
            code = 'C'
        elif isinstance(action, CheckAction):
            phrasing = ' checks.'
            code = 'K'
        else:  # isinstance(action, RaiseAction)
            phrasing = (' bets ' if bet_override else ' raises to ') + str(action.amount)
            code = 'R' + str(action.amount)
        self.log.append(name + phrasing)
        return code

    def log_terminal_state(self, players, round_state):
        '''
        Incorporates TerminalState information from each board and the overall round into the game log and player messages.
        '''
        previous_round = round_state.previous_state
        log_message_zero = ''
        log_message_one = ''
        previous_board = previous_round.board_state.previous_state
        if previous_board.reveal:
            self.log.append('{} shows {}'.format(players[0].name, PCARDS(previous_board.hands[0]))
            self.log.append('{} shows {}'.format(players[1].name, PCARDS(previous_board.hands[1]))
            log_message_zero = 'O' + CCARDS(previous_board.hands[1])
            log_message_one = 'O' + CCARDS(previous_board.hands[0])
        else:
            log_message_zero = 'O'
            log_message_one = 'O'
        self.player_messages[0].append(log_message_zero)
        self.player_messages[1].append(log_message_one)
        self.log.append('{} awarded {}'.format(players[0].name, round_state.deltas[0]))
        self.log.append('{} awarded {}'.format(players[1].name, round_state.deltas[1]))
        log_messages = ['D' + str(round_state.deltas[0]), 'D' + str(round_state.deltas[1])]
        self.player_messages[0].append(';'.join(log_messages))
        self.player_messages[1].append(';'.join(log_messages[::-1]))

    def run_round(self, players):
        '''
        Runs one round of poker.
        '''
        deck = eval7.Deck()
        deck.shuffle()
        hands = [deck.deal(2), deck.deal(2)]
        new_deck  = SmallDeck(deck)
        new_deck.shuffle()
        stacks = [100*BIG_BLIND - SMALL_BLIND, 100*BIG_BLIND - BIG_BLIND]
        board_state = BoardState(2*BIG_BLIND, [SMALL_BLIND, BIG_BLIND], None, new_deck, None)]
        round_state = RoundState(-2, 0, stacks, hands, board_states, None)
        while not isinstance(round_state, TerminalState):
            self.log_round_state(players, round_state)
            active = round_state.button % 2
            player = players[active]
            action = player.query(round_state, self.player_messages[active], self.log)
            bet_override = (round_state.board_state.pips == [0, 0]) if isinstance(round_state.board_state, BoardState) else None
            self.log_action(player.name, action, bet_override, active)
            round_state = round_state.proceed(action)
        self.log_terminal_state(players, round_state)
        for player, player_message, delta in zip(players, self.player_messages, round_state.deltas):
            player.query(round_state, player_message, self.log)
            player.bankroll += delta

    def run(self):
        '''
        Runs one game of poker.
        '''
        print('   __  _____________  ___       __           __        __    ')
        print('  /  |/  /  _/_  __/ / _ \\___  / /_____ ____/ /  ___  / /____')
        print(' / /|_/ // /  / /   / ___/ _ \\/  \'_/ -_) __/ _ \\/ _ \\/ __(_-<')
        print('/_/  /_/___/ /_/   /_/   \\___/_/\\_\\\\__/_/ /_.__/\\___/\\__/___/')
        print()
        print('Starting the Pokerbots engine...')
        players = [
            Player(PLAYER_1_NAME, PLAYER_1_PATH),
            Player(PLAYER_2_NAME, PLAYER_2_PATH)
        ]
        for player in players:
            player.build()
            player.run()
        for round_num in range(1, NUM_ROUNDS + 1):
            self.log.append('')
            self.log.append('Round #' + str(round_num) + STATUS(players))
            self.run_round(players)
            players = players[::-1]
        self.log.append('')
        self.log.append('Final' + STATUS(players))
        for player in players:
            player.stop()
        name = GAME_LOG_FILENAME + '.txt'
        print('Writing', name)
        with open(name, 'w') as log_file:
            log_file.write('\n'.join(self.log))


if __name__ == '__main__':
    Game().run()
