import './Settings';

/* BOARD CLASS TO TRACK INFO OVER ROUND */
let Board = function (pot, pips, hands, deck, settled, is_terminal, winnings = null) {
    let that = {};
    that.pips = pips;
    that.pot = pot;
    that.hands = hands;
    that.deck = deck;
    that.settled = settled;
    that.is_terminal = is_terminal;
    that.winnings = winnings;

    /* ADVANCE THE BOARD BY ONE USER'S ACTION */
    that.proceed = function(button, user, street, action, amount = null) {
        if (action === 'FOLD') {
            let new_pot = that.pot + that.pips.values().reduce((a, b) => a + b, 0);
            let winnings = {'user': 0, 'comp': new_pot} ? user === 'user' :
                {'user': new_pot, 'comp': 0}
            return Board(that.pot, {'user': 0, 'comp': 0}, that.hands, that.deck, true, true, winnings);
        }
        else if (action === 'CALL') {
            // SB calls BB allow continuation
            if (button === 0) {
                return Board(that.pot, {'user': BIG_BLIND, 'comp': BIG_BLIND}, that.hands, that.deck, false, false);
            }
            let other = 'comp' ? user === 'user' : 'user';
            let contribution = that.pips[other] - that.pips[user];
            that.pips[user] += contribution;
            return Board(that.pot, that.pips, that.hands, that.deck, true, false);
        }
        else if (action === 'CHECK') {
            // both players acted
            if ((street === 0 && button > 0) || button > 1) {
                return Board(that.pot, that.pips, that.hands, that.deck, true, false);
            }
            // let opponent act
            return Board(that.pot, that.pips, that.hands, that.deck, that.settled, false);
        }
        else if (action === 'Raise') {
            let contribution = amount - that.pips[user];
            that.pips[user] += contribution;
            return Board(that.pot, that.pips, that.hands, that.deck, that.settled, false);
        }
    }
    return that;
}

module.exports = Board;