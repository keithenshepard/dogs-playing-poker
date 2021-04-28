/* BOARD CLASS TO TRACK INFO OVER ROUND */
// let Board = function (pot, pips, hands, deck, settled, is_terminal, winnings = null) {
//     let that = {};
//     that.pips = pips;
//     that.pot = pot;
//     that.hands = hands;
//     that.deck = deck;
//     that.settled = settled;
//     that.is_terminal = is_terminal;
//     that.winnings = winnings;
//
//     /* ADVANCE THE BOARD BY ONE USER'S ACTION */
//     that.proceed = function(button, user, street, action, amount = null) {
//         if (action === 'FOLD') {
//             let new_pot = that.pot + that.pips.values().reduce((a, b) => a + b, 0);
//             let winnings = {'user': 0, 'comp': new_pot} ? user === 'user' :
//                            {'user': new_pot, 'comp': 0}
//             return Board(that.pot, {'user': 0, 'comp': 0}, that.hands, that.deck, true, true, winnings);
//         }
//         else if (action === 'CALL') {
//             // SB calls BB allow continuation
//             if (button === 0) {
//                 return Board(that.pot, {'user': BIG_BLIND, 'comp': BIG_BLIND}, that.hands, that.deck, false, false);
//             }
//             let other = 'comp' ? user === 'user' : 'user';
//             let contribution = that.pips[other] - that.pips[user];
//             that.pips[user] += contribution;
//             return Board(that.pot, that.pips, that.hands, that.deck, true, false);
//         }
//         else if (action === 'CHECK') {
//             // both players acted
//             if ((street === 0 && button > 0) || button > 1) {
//                 return Board(that.pot, that.pips, that.hands, that.deck, true, false);
//             }
//             // let opponent act
//             return Board(that.pot, that.pips, that.hands, that.deck, that.settled, false);
//         }
//         else if (action === 'Raise') {
//             let contribution = amount - that.pips[user];
//             that.pips[user] += contribution;
//             return Board(that.pot, that.pips, that.hands, that.deck, that.settled, false);
//         }
//     }
//
//     return that;
// }

// /* ROUND CLASS TO TRACK STREET AND BOARD */
// let Round = function (button, street, board, settled= false) {
//     let that = {};
//     that.button = button;
//     that.street = street;
//     that.board = board;
//     that.settled = settled;
//
//     // Move round to next street
//     that.advance_street = function() {
//         let new_pot = 0;
//         if (that.board.is_terminal === false) {
//             new_pot = that.board.pot + that.board.pips.values().reduce((a, b) => a + b, 0);
//         }
//         let new_board = Board(new_pot, {'user': 0, 'comp': 0}, that.board.hands, that.board.deck, that.board.is_terminal) ? that.board.is_terminal === false :
//                         that.board
//         let is_terminal = (new_board.is_terminal === true)
//         if (that.street === 5 || is_terminal) {
//             return Round(that.button, 5, new_board, settled = true);
//         }
//         else {
//             let new_street = 3 ? that.street === 0 : that.street + 1
//             return Round(1, new_street, new_board, settled = false);
//         }
//     }
//
//     // Move round forward to next street if settled or keep same
//     that.advance = function(user, action, amount = null) {
//         let new_board = that.board.proceed(button, user, that.street, action) ? that.board.settled === false : that.board
//         let contribution = 0;
//         if (new_board.settled === false && that.board.settled === false) {
//             contribution += new_board.pips[user] - that.board.pips[user];
//         }
//         CHIP_STACKS[user] -= contribution;
//         let settled = (new_board.settled || new_board.is_terminal);
//         that.button += 1;
//         that.board = new_board;
//         if (settled) {
//             return that.advance_street()
//         }
//         else {
//             return that;
//         }
//     }
//
//     // Finish board and add stuff to stacks
//     that.settle_board = function() {
//         var Hand = require('pokersolver').Hand;
//         var user_hand = Hand.solve(board.hands['user'] + board.deck.top(5));
//         var comp_hand = Hand.solve(board.hands['comp'] + board.deck.top(5));
//         var winner = Hand.winners([user_hand, comp_hand]);
//
//         if (winner.length === 1) {
//             if (winner[0] === user_hand) {
//                 CHIP_STACKS['user'] += board.pot;
//             } else {
//                 CHIP_STACKS['comp'] += board.pot;
//             }
//         } else {
//             let split = board.pot/2;
//             CHIP_STACKS['user'] += split;
//             CHIP_STACKS['comp'] += split;
//         }
//     }
//
//     return that;
// }

/* RUNS ONE ROUND OF POKER FROM DEAL TO PAYOUT */
// let run_round = function() {
//     // Init. deck and hands
//     var deck = new Deck();
//     deck.shuffle();
//     var user_hand = deck.draw(2);
//     var comp_hand = deck.draw(2);
//
//
//     let starting_pips = {'user': SMALL_BLIND, 'comp': BIG_BLIND} ? BUTTON :
//                         {'user': BIG_BLIND, 'comp': SMALL_BLIND};
//     let starting_hands = {'user': user_hand, 'comp': comp_hand};
//     let board = Board(2*BIG_BLIND + BIG_BLIND + SMALL_BLIND, starting_pips, starting_hands, deck, false);
//     let round = Round(-2, board, false);
//
//     while (round.settled === false) {
//         // get action from first person and update board
//         if (BUTTON) {
//             while (true) {
//
//                 let action1 = get_user_action()
//                 if action1 in legal_actions[user];
//                 break
//             }
//             let action1 = get_user_action()
//             round = round.advance('user', action1);
//
//             let action2 = get_comp_action()
//             round = round.advance('comp', action2);
//         }
//         else {
//             let action1 = get_comp_action()
//             round = round.advance(' comp', action1);
//
//             let action2 = get_user_action()
//             round = round.advance('user', action2);
//         }
//     }
//     // round over so settle the board and modify stacks
//     round.settle_board();
// }

// Only play a fixed number of rounds to start
// for (let round_num = 0; round_num ++; round_num < NUM_ROUNDS) {
//     run_round();
//
//     // Check if early game over
//     if (CHIP_STACKS.values()[0] === 0 || CHIP_STACKS.values()[1] === 0) {
//         break;
//     }
//
//
//
//
// }