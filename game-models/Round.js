import './Settings';
const Board = require ('./Board');

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
            new_pot = that.board.pot + that.board.pips.values().reduce((a, b) => a + b, 0);
        }
        let new_board = Board(new_pot, {'user': 0, 'comp': 0}, that.board.hands, that.board.deck, that.board.is_terminal) ? that.board.is_terminal === false :
            that.board
        let is_terminal = (new_board.is_terminal === true)
        if (that.street === 5 || is_terminal) {
            return Round(that.button, 5, new_board, settled = true);
        }
        else {
            let new_street = 3 ? that.street === 0 : that.street + 1
            return Round(1, new_street, new_board, settled = false);
        }
    }

    // Move round forward to next street if settled or keep same
    that.advance = function(user, action, amount = null) {
        let new_board = that.board.proceed(button, user, that.street, action) ? that.board.settled === false : that.board
        let contribution = 0;
        if (new_board.settled === false && that.board.settled === false) {
            contribution += new_board.pips[user] - that.board.pips[user];
        }
        CHIP_STACKS[user] -= contribution;
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
        var Hand = require('pokersolver').Hand;
        var user_hand = Hand.solve(board.hands['user'] + board.deck.top(5));
        var comp_hand = Hand.solve(board.hands['comp'] + board.deck.top(5));
        var winner = Hand.winners([user_hand, comp_hand]);

        if (winner.length === 1) {
            if (winner[0] === user_hand) {
                CHIP_STACKS['user'] += board.pot;
            } else {
                CHIP_STACKS['comp'] += board.pot;
            }
        } else {
            let split = board.pot/2;
            CHIP_STACKS['user'] += split;
            CHIP_STACKS['comp'] += split;
        }
    }

    return that;
}

module.exports = Round;