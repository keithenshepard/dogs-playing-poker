import eval7
import random

def calculate_hole_strengths(board_holes, NUM_BOARDS):
    '''
    A Monte Carlo method meant to estimate the win probability of a pair of 
    hole cards. Simlulates 'iters' games and determines the win rates of our cards

    Arguments:
    board_holes: a list of our two hole cards for each board
    NUM_BOARDS: the number of boards we are playing on
    '''
    MONTE_CARLO_ITERS = 75 #the number of monte carlo samples we will use

    # create a deck with the 6 cards that were dealt to us removed
    my_cards = [eval7.Card(card) for hole in board_holes for card in hole]
    deck = eval7.Deck()
    for card in my_cards:
        deck.cards.remove(card)

    strengths = []
    for i in range(NUM_BOARDS): # calculate strength for each board
        hole = board_holes[i]
        hole_cards = [eval7.Card(card) for card in hole] # card objects, used to evaliate hands

        score = 0
        for _ in range(MONTE_CARLO_ITERS): #take 'iters' samples
            _COMM = 5 #the number of cards we need to draw
            _OPP = 2

            deck.shuffle() #make sure our samples are random
            draw = deck.peek(_COMM + _OPP)

            opp_hole = draw[: _OPP]
            community = draw[_OPP: ]

            our_hand = hole_cards + community #the two showdown hands
            opp_hand = opp_hole + community

            our_hand_value = eval7.evaluate(our_hand) #the ranks of our hands (only useful for comparisons)
            opp_hand_value = eval7.evaluate(opp_hand)

            if our_hand_value > opp_hand_value: #we win!
                score += 2

            elif our_hand_value == opp_hand_value: #we tie.
                score += 1

            else: #we lost....
                score += 0

        hand_strength = score / (2 * MONTE_CARLO_ITERS) #this is our win probability!
        strengths.append(hand_strength)

    return strengths

def calculate_hand_strengths(board_allocations, board_cards, BOARD_INDEX, NUM_BOARDS):
    '''
    A Monte Carlo method meant to estimate the win probability of a pair of
    hole cards. Simlulates 'iters' games and determines the win rates of our cards

    Arguments:
    board_holes: a list of our two hole cards for each board
    NUM_BOARDS: the number of boards we are playing on
    '''
    # create a deck with the 6 cards that were dealt to us removed
    all_my_cards = [eval7.Card(card) for hand in board_allocations for card in hand]
    all_board_cards = [eval7.Card(card) for card in board_cards if card != '']
    all_seen_cards = all_my_cards + all_board_cards

    if len(all_board_cards) == 3:
        MONTE_CARLO_ITERS = 50
    elif len(all_board_cards) == 4:
        MONTE_CARLO_ITERS = 40
    else:
        MONTE_CARLO_ITERS = 25

    deck = eval7.Deck()
    for card in all_seen_cards:
        deck.cards.remove(card)

    # get the cards in our hand and cards shown on the board
    hand = board_allocations[BOARD_INDEX]
    hand_cards = [eval7.Card(card) for card in hand]


    score = 0
    _COMM = 5-len(all_board_cards) #the number of cards we need to draw
    _OPP = 2
    for _ in range(MONTE_CARLO_ITERS): #take 'iters' samples

        deck.shuffle() #make sure our samples are random
        draw = deck.peek(_COMM + _OPP)

        opp_hole = draw[: _OPP]
        community = draw[_OPP: ]

        our_hand = hand_cards + all_board_cards + community #the two showdown hands
        opp_hand = opp_hole + all_board_cards + community

        our_hand_value = eval7.evaluate(our_hand) #the ranks of our hands (only useful for comparisons)
        opp_hand_value = eval7.evaluate(opp_hand)

        if our_hand_value > opp_hand_value: #we win!
            score += 2

        elif our_hand_value == opp_hand_value: #we tie.
            score += 1

        else: #we lost....
            score += 0

    hand_strength = score / (2 * MONTE_CARLO_ITERS) #this is our win probability!

    return hand_strength


# print(calculate_hole_strengths([['Th', 'Tc'], ['4s', '9d'], ['3d', 'Ad']], 3))
