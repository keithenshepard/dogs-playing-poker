
let suitToText = {'c': '\u2663', 'd': '\u2666', 'h': '\u2665', 's': '\u2660',};
let suitToColor = {'c': 'black', 'd': 'red', 'h': 'red', 's': 'black'};

let flopDiv = document.getElementById('flop');
let turnDiv = document.getElementById('turn');
let riverDiv = document.getElementById('river');

let flop1Card = document.getElementById('flop-1');
let flop2Card = document.getElementById('flop-2');
let flop3Card = document.getElementById('flop-3');
let turnCard = document.getElementById('turn-card');
let riverCard = document.getElementById('river-card');

let flop1Rank = document.getElementById('flop-rank-1');
let flop2Rank = document.getElementById('flop-rank-2');
let flop3Rank = document.getElementById('flop-rank-3');
let turnRank = document.getElementById('turn-rank');
let riverRank = document.getElementById('river-rank');

let flop1Suit = document.getElementById('flop-suit-1');
let flop2Suit = document.getElementById('flop-suit-2');
let flop3Suit = document.getElementById('flop-suit-3');
let turnSuit = document.getElementById('turn-suit');
let riverSuit = document.getElementById('river-suit');

let myHoleDiv = document.getElementById('my-hand');
let myCard1 = document.getElementById('my-hand-1');
let myCard2 = document.getElementById('my-hand-2');

let my1Rank = document.getElementById('my-rank-1');
let my2Rank = document.getElementById('my-rank-2');

let my1Suit = document.getElementById('my-suit-1');
let my2Suit = document.getElementById('my-suit-2');


let compHoleDiv = document.getElementById('comp-hand');
let compCard1 = document.getElementById('comp-hand-1');
let compCard2 = document.getElementById('comp-hand-2');

let comp1Rank = document.getElementById('comp-rank-1');
let comp2Rank = document.getElementById('comp-rank-2');

let comp1Suit = document.getElementById('comp-suit-1');
let comp2Suit = document.getElementById('comp-suit-2');

let pot = document.getElementById('pot');
let myStack = document.getElementById('my-stack');
let myBet = document.getElementById('my-bet');
let compStack = document.getElementById('comp-stack');
let compBet = document.getElementById('comp-bet');

let hideCompHand = function () {
  comp1Rank.style.color = 'blue';
  comp1Suit.style.color = 'blue';
  
  comp2Rank.style.color = 'blue';
  comp2Suit.style.color = 'blue';
  
  compCard1.classList.add('turned-over');
  compCard2.classList.add('turned-over');
}

let showCompHand = function () {
  let compHand = round.board.hands.comp;
  let comp1Card = compHand[0];
  let comp2Card = compHand[1];
  
  if (compCard1[0] === 'T') {
    comp1Rank.innerText = '10';
  } else {
    comp1Rank.innerText = comp1Card[0];
  }
  comp1Suit.innerText = suitToText[comp1Card[1]];
  comp1Rank.style.color = suitToColor[comp1Card[1]];
  comp1Suit.style.color = suitToColor[comp1Card[1]];
  
  if (compCard2[0] === 'T') {
    comp2Rank.innerText = '10';
  } else {
    comp2Rank.innerText = comp2Card[0];
  }
  comp2Suit.innerText = suitToText[comp2Card[1]];
  comp2Rank.style.color = suitToColor[comp2Card[1]];
  comp2Suit.style.color = suitToColor[comp2Card[1]];
  
  compCard1.style.backgroundColor = 'white';
  compCard1.style.color = 'white';
  compCard1.classList.remove('turned-over');
  compCard2.classList.remove('turned-over');
}

let showMyHand = function () {
  let myHand = round.board.hands.user;
  let myCard1 = myHand[0];
  let myCard2 = myHand[1];
  
  if (myCard1[0] === 'T') {
    my1Rank.innerText = '10';
  } else {
    my1Rank.innerText = myCard1[0];
  }
  my1Suit.innerText = suitToText[myCard1[1]];
  my1Rank.style.color = suitToColor[myCard1[1]];
  my1Suit.style.color = suitToColor[myCard1[1]];
  
  if (myCard2[0] === 'T') {
    my2Rank.innerText = '10';
  } else {
    my2Rank.innerText = myCard2[0];
  }
  my2Suit.innerText = suitToText[myCard2[1]];
  my2Rank.style.color = suitToColor[myCard2[1]];
  my2Suit.style.color = suitToColor[myCard2[1]];
  
}
let showRiver = function () {
  let river = round.board.deck.top(5)[4];;
  if (river[0] === 'T') {
    riverRank.innerText = '10';
  } else {
    riverRank.innerText = river[0];
  }
  riverSuit.innerText = suitToText[river[1]];
  riverCard.style.color = suitToColor[river[1]];
  riverSuit.style.color = suitToColor[river[1]];
  
  riverDiv.classList.remove('hidden');
}

let showTurn = function () {
  let turn = round.board.deck.top(4)[3];
  if (turn[0] === 'T') {
    turnRank.innerText = '10';
  } else {
    turnRank.innerText = turn[0];
  }
  turnSuit.innerText = suitToText[turn[1]];
  turnCard.style.color = suitToColor[turn[1]];
  turnSuit.style.color = suitToColor[turn[1]];
  
  turnDiv.classList.remove('hidden');
}


let showFlop = function () {
  let flopCards = round.board.deck.top(3);
  let flop1 = flopCards[0];
  let flop2 = flopCards[1];
  let flop3 = flopCards[2];
  
  if (flop1[0] === 'T') {
    flop1Rank.innerText = '10';
  } else {
    flop1Rank.innerText = flop1[0];
  }
  flop1Suit.innerText = suitToText[flop1[1]];
  flop1Rank.style.color = suitToColor[flop1[1]];
  flop1Suit.style.color = suitToColor[flop1[1]];
  
  if (flop2[0] === 'T') {
    flop2Rank.innerText = '10';
  } else {
    flop2Rank.innerText = flop2[0];
  }
  flop2Suit.innerText = suitToText[flop2[1]];
  flop2Rank.style.color = suitToColor[flop2[1]];
  flop2Suit.style.color = suitToColor[flop2[1]];
  
  if (flop3[0] === 'T') {
    flop3Rank.innerText = '10';
  } else {
    flop3Rank.innerText = flop3[0];
  }
  flop3Suit.innerText = suitToText[flop3[1]];
  flop3Rank.style.color = suitToColor[flop3[1]];
  flop3Suit.style.color = suitToColor[flop3[1]];
  
  flopDiv.classList.remove('hidden');
}

let hideFlop = function () {
  flopDiv.classList.add('hidden');
}

let hideTurn = function () {
  turnDiv.classList.add('hidden');
}

let hideRiver = function () {
  riverDiv.classList.add('hidden');
}

let hideCommunity = function () {
  hideFlop();
  hideTurn();
  hideRiver();
}

let updateStacks = function () {
  pot.innerText = `Pot: ${round.board.pot}`;
  myBet.innerText = `Bet: ${round.board.pips.user}`;
  myStack.innerText = `Stack: ${CHIP_STACKS.user}`;
  compBet.innerText = `Bet: ${round.boards.pips.comp}`;
  compStack.innerText = `Stack: ${CHIP_STACKS.comp}`;
}