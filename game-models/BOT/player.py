'''
Simple example pokerbot, written in Python.
'''
import pickle
import random
import eval7

from skeleton.actions import FoldAction, CallAction, CheckAction, RaiseAction, AssignAction
from skeleton.states import GameState, TerminalState, RoundState, BoardState
from skeleton.states import NUM_ROUNDS, STARTING_STACK, BIG_BLIND, SMALL_BLIND, NUM_BOARDS
from skeleton.bot import Bot
from skeleton.runner import parse_args, run_bot

from skeleton.card_pairing import generate_pairings
from skeleton.hand_strengths import calculate_hole_strengths, calculate_hand_strengths


class Player(Bot):
    '''
    A pokerbot.
    '''

    def __init__(self):
        '''
        Called when a new game starts. Called exactly once.

        Arguments:
        Nothing.

        Returns:
        Nothing.
        ''' 
        with open('hands_prob.p', 'rb') as fp:
            self.hand_probs = pickle.load(fp)
        self.board_allocations = [[], [], []] # Card allocations per board
        self.hole_strengths_probs = [] # Table Win Probs for cards without factoring in other 4 we were dealt
        self.hole_strengths_eval7 = [] # Eval7 Hand Strength for cards factoring in all 6 dealt

        self.strengths_cache = {0: {}, 3: {}, 4: {}, 5: {}}
        self.fold_always = False


    def allocate_cards(self, my_cards):
        best_pairs, best_pairs_evals = generate_pairings(my_cards, self.hand_probs)
        for i in range(NUM_BOARDS):
            pair = [best_pairs[2*i], best_pairs[2*i + 1]] #subsequest cards are pairs
            self.board_allocations[i] = pair #record our allocations

        self.hole_strengths_probs = list(best_pairs_evals.values()) # keep track of prob strength calculations


    def handle_new_round(self, game_state, round_state, active):
        '''
        Called when a new round starts. Called NUM_ROUNDS times.

        Arguments:
        game_state: the GameState object.
        round_state: the RoundState object.
        active: your player's index.

        Returns:
        Nothing.
        '''
        # my_bankroll = game_state.bankroll  # the total number of chips you've gained or lost from the beginning of the game to the start of this round
        # opp_bankroll = game_state.opp_bankroll # ^but for your opponent
        # game_clock = game_state.game_clock  # the total number of seconds your bot has left to play this game
        # round_num = game_state.round_num  # the round number from 1 to NUM_ROUNDS
        my_cards = round_state.hands[active]  # your six cards at the start of the round
        # big_blind = bool(active)  # True if you are the big blind

        self.allocate_cards(my_cards)
        self.hole_strengths_eval7 = calculate_hole_strengths(self.board_allocations, NUM_BOARDS)

        for i in range(NUM_BOARDS):
            strength = self.hole_strengths_eval7[i]
            self.strengths_cache[0][i] = strength


    def handle_round_over(self, game_state, terminal_state, active):
        '''
        Called when a round ends. Called NUM_ROUNDS times.

        Arguments:
        game_state: the GameState object.
        terminal_state: the TerminalState object.
        active: your player's index.

        Returns:
        Nothing.
        '''
        my_delta = terminal_state.deltas[active]  # your bankroll change from this round
        opp_delta = terminal_state.deltas[1-active] # your opponent's bankroll change from this round
        previous_state = terminal_state.previous_state  # RoundState before payoffs
        street = previous_state.street  # 0, 3, 4, or 5 representing when this round ended
        for terminal_board_state in previous_state.board_states:
            previous_board_state = terminal_board_state.previous_state
            my_cards = previous_board_state.hands[active]  # your cards
            opp_cards = previous_board_state.hands[1-active]  # opponent's cards or [] if not revealed

        self.board_allocations = [[], [], []] #reset to no cards
        self.hole_strengths_probs = [] # reset hole strengths
        self.hole_strengths_eval7 = []
        self.strengths_cache = {0: {}, 3: {}, 4: {}, 5: {}}

        if game_state.game_clock < 1:
            print(game_state.round_num)
        if game_state.round_num == NUM_ROUNDS:
            print(game_state.game_clock)



    def get_actions(self, game_state, round_state, active):
        '''
        Where the magic happens - your code should implement this function.
        Called any time the engine needs a triplet of actions from your bot.

        Arguments:
        game_state: the GameState object.
        round_state: the RoundState object.
        active: your player's index.

        Returns:
        Your actions.
        '''
        legal_actions = round_state.legal_actions()  # the actions you are allowed to take
        street = round_state.street  # 0, 3, 4, or 5 representing pre-flop, flop, turn, or river respectively
        # my_cards = round_state.hands[active]  # your cards across all boards
        board_cards = [board_state.deck if isinstance(board_state, BoardState) else board_state.previous_state.deck for board_state in round_state.board_states] #the board cards ex: [['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']]
        my_pips = [board_state.pips[active] if isinstance(board_state, BoardState) else 0 for board_state in round_state.board_states] # the number of chips you have contributed to the pot on each board this round of betting
        opp_pips = [board_state.pips[1-active] if isinstance(board_state, BoardState) else 0 for board_state in round_state.board_states] # the number of chips your opponent has contributed to the pot on each board this round of betting
        continue_cost = [opp_pips[i] - my_pips[i] for i in range(NUM_BOARDS)] #the number of chips needed to stay in each board's pot
        my_stack = round_state.stacks[active]  # the number of chips you have remaining
        opp_stack = round_state.stacks[1-active]  # the number of chips your opponent has remaining
        stacks = [my_stack, opp_stack]
        net_upper_raise_bound = round_state.raise_bounds()[1] # max raise across 3 boards
        net_cost = 0 # keep track of the net additional amount you are spending across boards this round

        my_actions = [None] * NUM_BOARDS
        for i in range(NUM_BOARDS):

            if AssignAction in legal_actions[i]:
                cards = self.board_allocations[i] #allocate our cards that we made earlier
                my_actions[i] = AssignAction(cards) #add to our actions

            elif isinstance(round_state.board_states[i], TerminalState): #make sure the game isn't over at this board
                my_actions[i] = CheckAction() #check if it is

            # elif FoldAction in legal_actions[i] and self.fold_always:
            #     my_actions[i] = FoldAction()

            # elif FoldAction in legal_actions[i] and game_state.bankroll - game_state.opp_bankroll > 11 * (NUM_ROUNDS - game_state.round_num):
            #     print(game_state.round_num)
            #     self.fold_always = True
            #     my_actions[i] = FoldAction()

            else: #do we add more resources?

                # if FoldAction in legal_actions[i] and game_state.bankroll - game_state.opp_bankroll > 10.5 * (NUM_ROUNDS - game_state.round_num):
                #     my_actions[i] = FoldAction()


                board_total = round_state.board_states[i].pot # amount before we started betting
                board_cont_cost = continue_cost[i] # we need to pay this to keep playing
                pot_total = my_pips[i] + opp_pips[i] + board_total # total money in the pot right now
                min_raise, max_raise = round_state.board_states[i].raise_bounds(active, round_state.stacks)

                # CALCULATE HAND STRENGTH OR PULL FROM CACHE
                try:
                    strength = self.strengths_cache[street][i]
                except KeyError:
                    strength = calculate_hand_strengths(self.board_allocations, board_cards[i], i, NUM_BOARDS)
                    self.strengths_cache[street][i] = strength



                if street < 3: #pre-flop
                    raise_ammount = int(my_pips[i] + board_cont_cost + 0.4 * (pot_total + board_cont_cost)) #play a little conservatively pre-flop
                else:
                    raise_ammount = int(my_pips[i] + board_cont_cost + 0.75 * (pot_total + board_cont_cost)) #raise the stakes deeper into the game
                
                raise_ammount = max([min_raise, raise_ammount]) #make sure we have a valid raise
                raise_ammount = min([max_raise, raise_ammount])

                raise_cost = raise_ammount - my_pips[i] #how much it costs to make that raise

                if RaiseAction in legal_actions[i] and (raise_cost <= my_stack - net_cost): #raise if we can and if we can afford it
                    commit_action = RaiseAction(raise_ammount)
                    commit_cost = raise_cost
                
                elif CallAction in legal_actions[i]: 
                    commit_action = CallAction()
                    commit_cost = board_cont_cost #the cost to call is board_cont_cost
                
                else: #checking is our only valid move here
                    commit_action = CheckAction()
                    commit_cost = 0


                if board_cont_cost > 0: #our opp raised!!! we must respond

                    if board_cont_cost > 5: #<--- parameters to tweak. 
                        _INTIMIDATION = 0.15
                        strength = max([0, strength - _INTIMIDATION]) #if our opp raises a lot, be cautious!
                    

                    pot_odds = board_cont_cost / (pot_total + board_cont_cost)

                    if strength >= pot_odds: #Positive Expected Value!! at least call!!

                        if strength > 0.5 and random.random() < strength: #raise sometimes, more likely if our hand is strong
                            my_actions[i] = commit_action
                            net_cost += commit_cost
                        
                        else: # at least call if we don't raise
                            my_actions[i] = CallAction()
                            net_cost += board_cont_cost
                    
                    else: #Negatice Expected Value!!! FOLD!!!
                        my_actions[i] = FoldAction()
                        net_cost += 0
                
                else: #board_cont_cost == 0, we control the action

                    if random.random() < strength: #raise sometimes, more likely if our hand is strong
                        my_actions[i] = commit_action
                        net_cost += commit_cost

                    else: #just check otherwise
                        my_actions[i] = CheckAction()
                        net_cost += 0
        return my_actions


if __name__ == '__main__':
    run_bot(Player(), parse_args())
