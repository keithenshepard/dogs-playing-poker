// NPM Imports
const Deck = window.node_modules['card-deck'];
const PokerSolver = window.node_modules['pokersolver'];

/* GAME SETTINGS */
const NUM_ROUNDS = 2;
const SMALL_BLIND = 25;
const BIG_BLIND = 50;
let IS_BIG = false;
let USERS_TURN = true;
let GAME_OVER = false;

/* GLOBAL GAME INFO */
let round; // current round
let CHIP_STACKS = {'user': 500, 'comp': 500}

/* HELPER FUNCTIONS */
let make_deck = function () {
    let deck = new Deck(['As', "Ac", "Ad", "Ah",
        '2s', "2c", "2d", "2h",
        '3s', "3c", "3d", "3h",
        '4s', "4c", "4d", "4h",
        '5s', "5c", "5d", "5h",
        '6s', "6c", "6d", "6h",
        '7s', "7c", "7d", "7h",
        '8s', "8c", "8d", "8h",
        '9s', "9c", "9d", "9h",
        'Ts', "Tc", "Td", "Th",
        'Js', "Jc", "Jd", "Jh",
        'Qs', "Qc", "Qd", "Qh",
        'Ks', "Kc", "Kd", "Kh",
    ]);
    return deck;
}


/* BOARD CLASS TO TRACK INFO OVER ROUND */
 let Board = function (pot, pips, hands, deck, settled, is_terminal, winner = null) {
     let that = {};
     that.pips = pips;
     that.pot = pot;
     that.hands = hands;
     that.deck = deck;
     that.settled = settled;
     that.is_terminal = is_terminal;
     that.winner = winner;

     /* ADVANCE THE BOARD BY ONE USER'S ACTION */
     that.proceed = function(button, user, street, action, amount = null) {
         if (action === 'fold') {
             let other = user === 'user' ? 'comp' : 'user';
             return Board(that.pot, that.pips, that.hands, that.deck, true, true, other);
         }
         else if (action === 'call') {
             let settled;
             // SB calls BB allow continuation
             settled = (button === 0) ? false : true;
             let other  = user === 'user' ? 'comp' : 'user';
             let contribution = that.pips[other] - that.pips[user];
             let new_pips = {'user': that.pips[user] + contribution, 'comp': that.pips[other]};
             return Board(that.pot, new_pips, that.hands, that.deck, settled, false);
         }
         else if (action === 'check') {
             // both players acted
             if ((street === 0 && button > 0) || button > 1) {
                 return Board(that.pot, that.pips, that.hands, that.deck, true, false);
             }
             // let opponent act
             return Board(that.pot, that.pips, that.hands, that.deck, that.settled, false);
         }
         else if (action === 'raise') {
             let contribution = amount - that.pips[user];
             that.pips[user] += contribution;
             return Board(that.pot, that.pips, that.hands, that.deck, that.settled, false);
         }
     }
     
     that.showdown = function () {
         alert("check");
         let Hand = PokerSolver.Hand;
         let user_hand = Hand.solve(that.hands.user.concat(that.deck.top(5)));
         let comp_hand = Hand.solve(that.hands.comp.concat(that.deck.top(5)));
         let winner = Hand.winners([user_hand, comp_hand]);
         
         winnings = {'user': 0, 'comp' : 0}
         if (winner.length === 1) {
             if (winner[0] === user_hand) {
                 winnings['user'] += that.pot;
             } else {
                 winnings['comp'] += that.pot;
             }
         } else {
             let split = that.pot/2;
             winnings['user'] += split;
             winnings['comp'] += split;
         }
         that.winnings = winnings;
         return that;
     }

     that.legal_actions = function(user) {
         // board already settled
         if (that.settled) {
             return ['check'];
         }
         // board still being played
         else {
             let other  = user === 'user' ? 'comp' : 'user';
             let continue_cost = that.pips[other] - that.pips[user];
             // can only raise if both can afford
             if (continue_cost === 0) {
                 let bets_forbidden = (CHIP_STACKS[user] === 0 || CHIP_STACKS[other] === 0);
                 return bets_forbidden ? ['check'] : ['check', 'raise'];
             }
             // already bet placed, need to call, raise, or fold
             else {
                 let raises_forbidden = (continue_cost === CHIP_STACKS[user] || CHIP_STACKS[other] === 0);
                 return raises_forbidden ? ['fold', 'call'] : ['fold', 'call', 'raise'];
             }
         }
     }

     that.raise_bounds = function(user) {
         let other  = user === 'user' ? 'comp' : 'user';
         let continue_cost = that.pips[other] - that.pips[user];
         let max_contribution = Math.min(CHIP_STACKS[user], CHIP_STACKS[other] + continue_cost);
         let min_contribution = Math.min(max_contribution, continue_cost + Math.max(continue_cost, BIG_BLIND))
         return [that.pips[user] + min_contribution, that.pips[user] + max_contribution];
     }


     return that;
 }

 /* ROUND CLASS TO TRACK STREET AND BOARD */
 let Round = function (button, street, board, settled= false) {
     let that = {};
     that.button = button;
     that.street = street;
     that.board = board;
     that.settled = settled;

     // Move round to next street
     that.advance_street = function() {
         let new_pot = 0;
         if (that.board.is_terminal === false) {
             new_pot = that.board.pot + that.board.pips.user + that.board.pips.comp;
         }
         CHIP_STACKS.user -= that.board.pips.user;
         CHIP_STACKS.comp -= that.board.pips.comp;
         
         let new_board = that.board.is_terminal === false ? Board(new_pot, {'user': 0, 'comp': 0}, that.board.hands, that.board.deck, that.board.is_terminal) :
                         that.board
         let is_terminal = (new_board.is_terminal === true)
         if (that.street === 5 || is_terminal) {
             return Round(that.button, 5, new_board, settled = true).settle_board();
         }
         else {
             let new_street = that.street === 0 ? 3 : that.street + 1;
             return Round(1, new_street, new_board, settled = false);
         }
     }

     // Move round forward to next street if settled or keep same
     that.advance = function(user, action, amount = null) {
         let new_board = that.board.settled === false ? that.board.proceed(that.button, user, that.street, action, amount) : that.board;
         let contribution = 0;
         if (new_board.settled === false && that.board.settled === false) {
             contribution += new_board.pips[user] - that.board.pips[user];
         }
         // CHIP_STACKS[user] -= contribution;
         let settled = (new_board.settled || new_board.is_terminal);
         that.button += 1;
         that.board = new_board;
         if (settled) {
             return that.advance_street()
         }
         else {
             return that;
         }
     }
     
     // Finish board and add stuff to stacks
     that.settle_board = function() {
         IS_BIG = !IS_BIG;
         if (that.board.is_terminal) {
             let new_pot = that.board.pot + that.board.pips.user + that.board.pips.comp;
             let winnings = that.board.winner !== 'user' ? {'user': 0, 'comp': new_pot} :
               {'user': new_pot, 'comp': 0};
             CHIP_STACKS.user += winnings.user;
             CHIP_STACKS.comp += winnings.comp;
             if (CHIP_STACKS.user === 0 || CHIP_STACKS.comp === 0) {
                 GAME_OVER = true;
                 return;
             }
             return Round(0, 0, that.board, true);
         } else {
             let terminal_board = that.board.showdown();
             CHIP_STACKS.user += terminal_board.winnings.user;
             CHIP_STACKS.comp += terminal_board.winnings.comp;
             if (CHIP_STACKS.user === 0 || CHIP_STACKS.comp === 0) {
                 GAME_OVER = true;
                 return;
             }
             return Round(0, 0, terminal_board, true);
         }
         // let Hand = PokerSolver.Hand;
         // console.log(board.hands.user.concat(board.deck.top(5)));
         // let user_hand = Hand.solve(board.hands.user.concat(board.deck.top(5)));
         // let comp_hand = Hand.solve(board.hands.comp.concat(board.deck.top(5)));
         // let winner = Hand.winners([user_hand, comp_hand]);
         //
         // if (winner.length === 1) {
         //     if (winner[0] === user_hand) {
         //         CHIP_STACKS['user'] += board.pot;
         //     } else {
         //         CHIP_STACKS['comp'] += board.pot;
         //     }
         // } else {
         //     let split = board.pot/2;
         //     CHIP_STACKS['user'] += split;
         //     CHIP_STACKS['comp'] += split;
         // }
     }

     return that;
 }
 
 
 let start_round = function () {
     let deck = make_deck();
     deck.shuffle();
    
     let user_hand = deck.draw(2);
     let comp_hand = deck.draw(2);
    
     let starting_pips = IS_BIG ? {'user': BIG_BLIND, 'comp': SMALL_BLIND} : {'user': SMALL_BLIND, 'comp': BIG_BLIND};
     let starting_hands = {'user': user_hand, 'comp': comp_hand};
     let board = Board(2*BIG_BLIND, starting_pips, starting_hands, deck, false);
     round = Round(0, 0, board, false);
 }
 
 let process_turn = function (action, amount = null) {
     if (USERS_TURN) {
         USERS_TURN = !USERS_TURN;
         round = round.advance('user', action, amount);

         //computers turn
         setTimeout(function () {
             let opp_leg_actions = round.board.legal_actions('comp');
             let opp_action = opp_leg_actions[getRandomIntInclusive(0, opp_leg_actions.length-1)];
             console.log(`Opp action chosen: ${opp_action}`);
             let amount = null;
             if (opp_action === 'raise') {
                 amount = 100;
             }
             round = round.advance('comp', opp_action, amount);
             USERS_TURN = !USERS_TURN;
             console.log(round);
             console.log(CHIP_STACKS)
         }, 5000);

     }
 }

let getRandomIntInclusive = function(min, max) {
    let minimum = Math.ceil(min);
    let maximum = Math.floor(max);
    return Math.floor(Math.random() * (maximum - minimum + 1) + minimum);
}

 
start_round();





 