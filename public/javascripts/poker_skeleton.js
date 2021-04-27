// Other variables used in MP3 that were deemed important.
const LEAPSCALE = 0.6;

// Variables to detect gestures.
var lastTimeVisible = 0;   // Last time we saw the hand, how long had it been visible?
var lastActionsIdentified = [];   // Since the hand has become visible, what actions have been done?
var maxActionsIdentified = 100; // Upper limit on how many possible actions we track
var actionCountMap = new Map(); // Map that counts occurrences of actions in lastActionsIdentified
var actionCountThreshold = 3; // How many of the same action do we need to see before choosing that action?
actionCountThreshold.set("fold", {count: 0}); // set initial counts
actionCountThreshold.set("check", {count: 0});
actionCountThreshold.set("bet", {count: 0});
var userAction = 'no action'; // Stores the user action, once assigned.

// MAIN GAME LOOP
// Called every time the Leap provides a new frame of data
Leap.loop({ hand: function(hand) {
  /* Start by determining the user action (if any).
  Since this function will be called every time the Leap provides
  a new frame of data, it might make sense to have some persistent
  variables that track the last few actions (i.e. if we identify
  three checks in a row, the action is probably a check). */

  // Start simple: if the hand stays visible, detect what we think the action is.
  if (lastTimeVisible < hand.timeVisible) {
    // Check if each action is performed, then identify the action.
    let actionList = [gestureIsFold(hand), gestureIsCheck(hand), 0]; // Bet functionality not implemented
    let actionListSum = actionList.reduce((a, b) => a + b, 0);
    if (actionListSum > 1){
      lastActionsIdentified.push('multiple');
    }else if (actionListSum == 0){
      lastActionsIdentified.push('none');
    }else if (actionList[0] == 1){
      lastActionsIdentified.push('fold');
      actionCountMap["fold"] = actionCountMap["fold"] ? actionCountMap["fold"]+1 : 1;
    }else if (actionList[1] == 1){
      lastActionsIdentified.push('check');
      actionCountMap["check"] = actionCountMap["check"] ? actionCountMap["check"]+1 : 1;
    }else if (actionList[2] == 1){
      lastActionsIdentified.push('bet');
      actionCountMap["bet"] = actionCountMap["bet"] ? actionCountMap["bet"]+1 : 1;
    }
    // We have a limit on the number of previous actions tracked to improve performance and reduce errors.
    // In case our list is too long, we remove an element and decrement its count.
    if (lastActionsIdentified.length > maxActionsIdentified){
      let actionDropped = lastActionsIdentified.shift();
      actionCountMap.get(actionDropped).count--;
    }
  }
  // Next, regardless of if the hand is still visible or not, we check if there are enough
  // values of any action to infer that is what the user is doing.
  var maxListItem = Object.keys(actionCountMap).reduce(function(a, b){ return actionCountMap[a] > actionCountMap[b] ? a : b });
  if (maxListItem == 'fold' || maxListItem == 'check' || maxListItem == 'bet') {
    userAction = maxListItem;
    lastActionsIdentified = [];
    console.log(userAction);
  }
  // Finally, if the user's hand has disappeared from the screen, we clean the list
  // of actions and reset the time visible.
  if (hand.timeVisible < lastTimeVisible) {
    lastTimeVisible = 0;
    lastActionsIdentified = [];
  }


  // Once we've determined the user action, we check the game state
  // and compare the action given to the valid actions. We may want to
  // provide some responses based on if certain actions are restricted
  // (i.e. telling the user they can't bet out of turn, etc).



  // If it's the users turn, we now update the game state according to their
  // action.



  // If it's the CPU turn, we take an action for them and update the game state.
}}).use('screenPosition', {scale: LEAPSCALE});

// processSpeech(transcript)
//  Is called anytime speech is recognized by the Web Speech API
// Input: 
//    transcript, a string of possibly multiple words that were recognized
// Output: 
//    processed, a boolean indicating whether the system reacted to the speech or not
var processSpeech = function(transcript) {
  // Helper function to detect if any commands appear in a string
  var userSaid = function(str, commands) {
    for (var i = 0; i < commands.length; i++) {
      if (str.indexOf(commands[i]) > -1)
        return true;
    }
    return false;
  };

  var processed = false;
  if (gameState.get('state') == 'setup') {
    // TODO: 4.3, Starting the game with speech
    var startGame = userSaid(transcript, ['start'])
    if (startGame) {
      gameState.startGame();
      processed = true;
    }
  }

  else if (gameState.get('state') == 'playing') {
    if (gameState.isPlayerTurn()) {
      // TODO: 4.4, Player's turn, Detect the 'fire' command, and register the shot if it was said
      var fireShot = userSaid(transcript, ['fire'])
      if (fireShot) {
        registerPlayerShot();
        processed = true;
      }
    }

    else if (gameState.isCpuTurn() && gameState.waitingForPlayer()) {
      // TODO: 4.5, CPU's turn
      // Detect the player's response to the CPU's shot: hit, miss, you sunk my ..., game over
      // and register the CPU's shot if it was said
      var playersResponse = userSaid(transcript, ['hit', 'Hit', 'miss', 'Miss', 'you sunk my ship', 'game over', 'sunk', 'sank'])
      if (playersResponse) {
        var response = playersResponse;
        registerCpuShot(transcript);
        processed = true;
      }
    }
  }

  return processed;
};

// TODO: 4.4, Player's turn
// Generate CPU speech feedback when player takes a shot
var registerPlayerShot = function() {
  // TODO: CPU should respond if the shot was off-board
  if (!selectedTile) {
    generateSpeech('On the board idiot')
  }

  // If aiming at a tile, register the player's shot
  else {
    var shot = new Shot({position: selectedTile});
    var result = cpuBoard.fireShot(shot);

    // Duplicate shot
    if (!result) return;

    // TODO: Generate CPU feedback in three cases
    // Game over
    if (result.isGameOver) {
      generateSpeech('You won, let me know if you want to play again.');
      gameState.endGame("player");
      return;
    }
    // Sunk ship
    else if (result.sunkShip) {
      var shipName = result.sunkShip.get('type');
      generateSpeech('Shoot, you sunk my' + shipName);
    }
    // Hit or miss
    else {
      var isHit = result.shot.get('isHit');
      if (isHit) {
        generateSpeech('Hit');
      }
      else {
        generateSpeech('You missed, tough luck.');
      }
    }

    if (!result.isGameOver) {
      // TODO: Uncomment nextTurn to move onto the CPU's turn
      nextTurn();
    }
  }
};

// TODO: 4.5, CPU's turn
// Generate CPU shot as speech and blinking
var cpuShot;
var generateCpuShot = function() {
  // Generate a random CPU shot
  cpuShot = gameState.getCpuShot();
  var tile = cpuShot.get('position');
  var rowName = ROWNAMES[tile.row]; // e.g. "A"
  var colName = COLNAMES[tile.col]; // e.g. "5"

  // TODO: Generate speech and visual cues for CPU shot
  generateSpeech('Fire' + rowName + colName);
  blinkTile(tile);
};

// TODO: 4.5, CPU's turn
// Generate CPU speech in response to the player's response
// E.g. CPU takes shot, then player responds with "hit" ==> CPU could then say "AWESOME!"
var registerCpuShot = function(playerResponse) {

  var userSaid = function(str, commands) {
    for (var i = 0; i < commands.length; i++) {
      if (str.indexOf(commands[i]) > -1)
        return true;
    }
    return false;
  };

  // Cancel any blinking
  unblinkTiles();
  var result = playerBoard.fireShot(cpuShot);

  // NOTE: Here we are using the actual result of the shot, rather than the player's response
  // In 4.6, you may experiment with the CPU's response when the player is not being truthful!
  // TODO: Generate CPU feedback in three cases
  // Game over
  if (result.isGameOver) {
    generateSpeech('I WON, you need some practice.')
    gameState.endGame("cpu");
    return;
  }
  // Sunk ship
  else if (result.sunkShip) {
    var shipName = result.sunkShip.get('type');
    var userLied = userSaid(playerResponse, ['miss', 'Miss', 'missed'])
    if (userLied) {
      userLies += 1;
      if (userLies == 1) {
        generateSpeech('You cant trick me, I know I sunk')
      }
      else if (userLies == 2) {
        generateSpeech('Almost got me again, sunk your ship.')
      }
      else {
        generateSpeech('That was the last straw. Lets play without cheating next time')
        gameState.endGame("cpu");
      }
    }
    generateSpeech('HAHA I sunk your' + shipName)
  }
  // Hit or miss
  else {
    var isHit = result.shot.get('isHit');
    if (isHit) {
      var userLied = userSaid(playerResponse, ['miss', 'Miss', 'missed'])
      if (userLied) {
        userLies += 1;
        if (userLies == 1) {
          generateSpeech('You cant trick me, I know I hit')
        }
        else if (userLies == 2) {
          generateSpeech('Almost got me again, hit your ship.')
        }
        else {
          generateSpeech('That was the last straw. Lets play without cheating next time.')
          gameState.endGame("cpu");
        }
      }
      generateSpeech('Yay!')
    }
    else { generateSpeech('Darnit')}
  }

  if (!result.isGameOver) {
    // TODO: Uncomment nextTurn to move onto the player's next turn
    nextTurn();
  }
};

