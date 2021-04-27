import requests
import json
import pandas as pd
import pickle
from itertools import combinations 
import numpy as np
import eval7


def scrape_hole_prob_dataset():
    #Store the contents of the website under doc
    #Parse data that are stored between <tr>..</tr> of HTML
    url='https://wizardofodds.com/games/texas-hold-em/2-player-game/'
    print('Making Request')
    page = requests.get(url)
    doc = lh.fromstring(page.content)
    tr_elements = doc.xpath('//tr')
    print('Request Successful!')

    #Store data from second row on
    holes = {}
    for j in range(1,len(tr_elements)):
        probs = {}
        T=tr_elements[j]
        #If row is not of size 7, the //tr data is not from prob table 
        if len(T)!=7:
            break
        #column index
        i=0
        for t in T.iterchildren():
            data=t.text_content() 
            #process the cards
            if i == 0:
                cards = str(data)
                if 'Pair' in cards:
                    rank = cards[8]
                    key = (rank, rank)
                    holes[key] = probs
                
                elif 'unsuited' in cards:
                    key = (cards[0], cards[2], 'diff')
                    holes[key] = probs
                
                elif 'suited' in cards:
                    key = (cards[0], cards[2], 'same')
                    holes[key] = probs

                #end of table
                elif 'Total' in cards:
                    break

            elif i == 1:
                probs['win_prob'] = float(data[0:-1])/100
            elif i == 2:
                probs['lose_prob'] = float(data[0:-1])/100
            elif i == 3:
                probs['draw_prob'] = float(data[0:-1])/100
            elif i == 4:
                probs['exp_value'] = float(data[0:-1])/100
            
            i+=1

    with open('hands_prob.p', 'wb') as fp:
        pickle.dump(holes, fp, protocol=pickle.HIGHEST_PROTOCOL)
    return holes


# def calculate_hole_strengths_sim(hole): 
#     MONTE_CARLO_ITERS = 5000 #the number of monte carlo samples we will use
    
#     # create a deck with the 6 cards that were dealt to us removed
#     my_cards = [eval7.Card(card) for card in hole]
#     deck = eval7.Deck()
#     for card in my_cards:
#         deck.cards.remove(card)

#     score = 0
#     for _ in range(MONTE_CARLO_ITERS): #take 'iters' samples
#         _COMM = 5 #the number of cards we need to draw
#         _OPP = 2
#         _OTHER = 4
        
#         deck.shuffle()
#         draw = deck.peek(_COMM + _OPP + _OTHER)
#         opp_hole = draw[: _OPP]
#         community = draw[_OPP: _OPP + _OTHER]
#         other = draw[_OPP + _OTHER:]

#         for card in other:
#             deck.cards.remove(card)

#         our_hand = my_cards + community #the two showdown hands
#         opp_hand = opp_hole + community

#         our_hand_value = eval7.evaluate(our_hand) #the ranks of our hands (only useful for comparisons)
#         opp_hand_value = eval7.evaluate(opp_hand)

#         if our_hand_value > opp_hand_value: #we win!
#             score += 2
        
#         elif our_hand_value == opp_hand_value: #we tie.
#             score += 1
        
#         else: #we lost....
#             score += 0

#         for card in other:
#             deck.cards.append(card)
    
#     hand_strength = score / (2 * MONTE_CARLO_ITERS) #this is our win probability!
    
#     return hand_strength


# hand_probs = scrape_hole_prob_dataset()
# print(calculate_hole_strengths_sim(('Tc', 'Td')))