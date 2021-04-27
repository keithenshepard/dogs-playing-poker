//Actions
const actions = ['FOLD', 'CHECK', 'CALL', 'RAISE']

//Game setup
const NUM_ROUNDS = 100;
const SMALL_BLIND = 25;
const BIG_BLIND = 50;

let USER_STACK = 500;
let COMP_STACK = 500;
let POT_TOTAL = 0;

let BUTTON = false;


/* BOARD CLASS TO TRACK INFO OVER ROUND */
let Board = function (pot, pips, hands, deck) {
    let that = {};
    that.pips = pips;
    that.pot = pot;
    that.hands = hands;
    that.deck = deck;

    let perform_action = function(action, button, street) {

    }


    return that;
}

/* ROUND CLASS TO TRACK STREET AND BOARD */
let Round = function (street, board, settled= false) {
    let that = {};
    that.street = street;
    that.board = board;
    that.settled = settled;

    // Move round to next street
    that.advance_street = function() {
        if (street < 5) {
            street = street + 1 ? street > 0 : 3
        }
        else {
            settled = true;
        }
    }

    that.advance = function() {
        let new_board = that.board.proceed() ? that.board.settled === false : that.board
        
    }

    // Finish board and add stuff to stacks
    that.settle_board = function() {
        var Hand = require('pokersolver').Hand;
        var user_hand = Hand.solve(board.hands['user'] + board.deck.top(5));
        var comp_hand = Hand.solve(board.hands['comp'] + board.deck.top(5));
        var winner = Hand.winners([user_hand, comp_hand]);

        if (winner.length === 1) {
            if (winner[0] === user_hand) {
                USER_STACK += board.pot;
            } else {
                COMP_STACK += board.pot;
            }
        } else {
            let split = board.pot/2;
            USER_STACK += split;
            COMP_STACK += split;
        }
    }


    return that;
}

// Function to run one round of poker
let run_round = function() {
    // INITIALIZE DECK AND HANDS
    var deck = new Deck();
    deck.shuffle();
    var user_hand = deck.draw(2);
    var comp_hand = deck.draw(2);


    let starting_pips = {'user': SMALL_BLIND, 'comp': BIG_BLIND} ? BUTTON :
                        {'user': BIG_BLIND, 'comp': SMALL_BLIND};
    let starting_hands = {'user': user_hand, 'comp': comp_hand};
    let board = Board(2*BIG_BLIND + BIG_BLIND + SMALL_BLIND, starting_pips, starting_hands, deck);
    let round = Round(0, board, false);

    while (round.settled === false) {

        // get action from first person and update board
        if (BUTTON) {
            let action1 = get_user_action()
            round.advance(action1);

            let action2 = get_comp_action()
            round.advance(action2);
        }
        else {
            let action1 = get_comp_action()
            round.advance(action1);

            let action2 = get_user_action()
            round.advance(action2);
        }

        // advance the round by one street
        round.advance();
    }

    // round over so settle the board and modify stacks
    round.settle_board();
}

// Only play a fixed number of rounds to start
for (let round_num = 0; round_num ++; round_num < NUM_ROUNDS) {
    run_round();

    // Check if early game over
    if (USER_STACK === 0) {
        break;
    }




}