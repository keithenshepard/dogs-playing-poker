import './Settings';
const Board = require('./Board');
const Round = require('./Round');
// const Gestures = require('./Gestures');

let Game = function() {
    let that = {};

    /* RUNS ONE ROUND OF POKER FROM DEAL TO PAYOUT */
    that.run_round = function() {
        // Init. deck and hands
        var deck = new Deck();
        deck.shuffle();
        var user_hand = deck.draw(2);
        var comp_hand = deck.draw(2);


        let starting_pips = {'user': SMALL_BLIND, 'comp': BIG_BLIND} ? BUTTON :
            {'user': BIG_BLIND, 'comp': SMALL_BLIND};
        let starting_hands = {'user': user_hand, 'comp': comp_hand};
        let board = Board(2*BIG_BLIND + BIG_BLIND + SMALL_BLIND, starting_pips, starting_hands, deck, false);
        let round = Round(-2, board, false);

        while (round.settled === false) {
            // get action from first person and update board
            if (BUTTON) {
                let action1 = get_user_action()
                round = round.advance('user', action1);

                let action2 = get_comp_action()
                round = round.advance('comp', action2);
            }
            else {
                let action1 = get_comp_action()
                round = round.advance('comp', action1);

                let action2 = get_user_action()
                round = round.advance('user', action2);
            }
        }
        // round over so settle the board and modify stacks
        round.settle_board();
    }

    that.run_game = function() {
        // Only play a fixed number of rounds to start
        for (let round_num = 0; round_num++; round_num < NUM_ROUNDS) {
            that.run_round();

            // Check if early game over
            if (CHIP_STACKS.values()[0] === 0 || CHIP_STACKS.values()[1] === 0) {
                break;
            }
        }
    }
}

module.exports = Game;