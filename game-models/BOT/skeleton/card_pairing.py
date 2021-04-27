import requests
import json
import pandas as pd
import pickle
from itertools import combinations 
import numpy as np

def possible_hole_pairings(my_cards):
    combos = list(combinations(list(combinations(my_cards, 2)), 3))
    valid = []
    for pairings in combos:
        pair1 = pairings[0]
        pair2 = pairings[1]
        pair3 = pairings[2]
        if pair1[0] in pair2 or pair1[0] in pair3 or \
           pair1[1] in pair2 or pair1[1] in pair3:
           continue
        elif pair2[0] in pair1 or pair2[0] in pair3 or \
             pair2[1] in pair1 or pair2[1] in pair3:
            continue
        elif pair3[0] in pair1 or pair3[0] in pair2 or \
             pair3[1] in pair1 or pair3[1] in pair2:
            continue
        valid.append(pairings)
    return valid

def generate_pair_key(pair):
    card1 = pair[0]
    rank1 = card1[0]
    suit1 = card1[1]

    card2 = pair[1]
    rank2 = card2[0]
    suit2 = card2[1]

    if rank1 == rank2:
        return (rank1, rank2), (rank2, rank1)
    
    if suit1 == suit2:
        return (rank1, rank2, 'same'), (rank2, rank1, 'same')
    return (rank1, rank2, 'diff'), (rank2, rank1, 'diff')

def generate_pairings(my_cards, hand_probs):
    possible_pairings = possible_hole_pairings(my_cards)
    pairing_evals = {}
    for i in range(len(possible_pairings)):
        pairings_dict = {}
        pairings = possible_pairings[i]
        pair1 = pairings[0]
        pair2 = pairings[1]
        pair3 = pairings[2]

        p1key, p1keyOpp = generate_pair_key(pair1)
        p2key, p2keyOpp = generate_pair_key(pair2)
        p3key, p3keyOpp = generate_pair_key(pair3)

        try:
            exp_val = hand_probs[p1key]['win_prob']
            pairings_dict['pair1'] = exp_val
        except:
            exp_val = hand_probs[p1keyOpp]['win_prob']
            pairings_dict['pair1'] = exp_val
        
        try:
            exp_val = hand_probs[p2key]['win_prob']
            pairings_dict['pair2'] = exp_val
        except:
            exp_val = hand_probs[p2keyOpp]['win_prob']
            pairings_dict['pair2'] = exp_val

        try:
            exp_val = hand_probs[p3key]['win_prob']
            pairings_dict['pair3'] = exp_val
        except:
            exp_val = hand_probs[p3keyOpp]['win_prob']
            pairings_dict['pair3'] = exp_val
        
        pairing_evals[i] = pairings_dict

    index = max(pairing_evals, key=lambda i: sum(pairing_evals[i].values())) #take the pairings with highest sum of win-lose %'s
    best_pairings = possible_pairings[index]
    best_pairings_evals = pairing_evals[index]

    #order them in increasing order for the diff boards
    cards = []
    best_pairings_evals_ = {}
    for i in range(3):
        index = min(best_pairings_evals, key=lambda i: best_pairings_evals[i])
        if index == 'pair1':
            for card in best_pairings[0]:
                cards.append(card)
            best_pairings_evals_[index] = best_pairings_evals[index]
        if index == 'pair2':
            for card in best_pairings[1]:
                cards.append(card)
            best_pairings_evals_[index] = best_pairings_evals[index]
        if index == 'pair3':
            for card in best_pairings[2]:
                cards.append(card)
            best_pairings_evals_[index] = best_pairings_evals[index]
        del best_pairings_evals[index]

    return cards, best_pairings_evals_



with open('hands_prob.p', 'rb') as fp:
    hand_probs = pickle.load(fp)
my_cards = [('J','c'), ('Q','c'), ('2','c'), ('K','d'), ('2','s'), ('3','d')]
# print(generate_pairings(my_cards, hand_probs))