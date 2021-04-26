// GAME SETUP (from Battleship)
var initialState = SKIPSETUP ? "playing" : "setup";
var gameState = new GameState({state: initialState});
var cpuBoard = new Board({autoDeploy: true, name: "cpu"});
var playerBoard = new Board({autoDeploy: SKIPSETUP, name: "player"});
var cursor = new Cursor();

// UI SETUP (from Battleship)
setupUserInterface();



// Variables to detect gestures.
var lastTimeVisible = 0;   // Last time we saw the hand, how long had it been visible?
var lastActionsIdentified = [];   // Since the hand has become visible, what actions have been done?
var actionCountThreshold = 3; // How many of the same action do we need to see before choosing that action?
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
    var actionList = [{
      'actionName': 'fold',
      'actionFound': (gestureIsFold(hand) ? 1 : 0)
    },{
      'actionName': 'check',
      'actionFound': (gestureIsCheck(hand) ? 1 : 0)
    },{
      'actionName': 'bet',
      'actionFound': 0; // TODO: Implement betting actions.
    }].sort(function(action1, action2){return (action1.actionFound < action2.actionFound)});
    if (actionList[0].actionFound == 1 && actionList[1].actionFound == 1){
      lastActionsIdentified.push('multiple');
    }else if (actionList[0].actionFound == 1){
      lastActionsIdentified.push(actionList[0].actionName);
    }else if (actionList[0].actionFound == 0){
      lastActionsIdentified.push('none');
    }
  }
  // Next, regardless of if the hand is still visible or not, we check if there are enough
  // values of any action to infer that is what the user is doing.
  var actionCounts = {};
  for (var i=0; i<lastActionsIdentified.length; i++){
    var thisAction = lastActionsIdentified[i];
    actionCounts[thisAction] = actionCounts[thisAction] ? actionCounts[thisAction]+1 : 1;
  }
  var maxListItem = Object.keys(actionCounts).reduce(function(a, b){ return actionCounts[a] > actionCounts[b] ? a : b });
  if (maxListItem == 'fold' || maxListItem == 'check' || maxListItem == 'bet') {
    userAction = maxListItem;
    lastActionsIdentified = [];
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

  // TODO: 4.1 Use the hand data to control the cursor's screen position
  var cursorPosition = hand.screenPosition();
  cursor.setScreenPosition(cursorPosition);

  // TODO: 4.1 Get the tile that the player is currently selecting, and highlight it
  selectedTile = getIntersectingTile(cursorPosition);
  if (selectedTile !== false) {
    highlightTile(selectedTile, Colors.GREEN)
  }

  // SETUP mode
  if (gameState.get('state') == 'setup') {
    background.setContent("<h1>battleship</h1><h3 style='color: #7CD3A2;'>deploy ships</h3>");

    // TODO: 4.2, Deploying ships
    //  Enable the player to grab, move, rotate, and drop ships to deploy them

    // First, determine if grabbing pose or not
    var pinchStrength = hand.pinchStrength;
    if (pinchStrength > 0.5) {
      isGrabbing = true;
    }
    else {
      isGrabbing = false;
    }

    // Also determine hand roll angle in radians
    var handAngle = hand.roll();
    console.log(handAngle)
    // Rotate right
    if (handAngle < -.35) {
      var shipRotation = Math.PI/2;
    }
    // Rotate left
    else if (handAngle > -.10) {
      console.log("HEREREEREREREREERERERERERERERRERERRERER")
      var shipRotation = -Math.PI/2;
    }
    else {
      var shipRotation = 0;
    }


    // Grabbing, but no selected ship yet. Look for one.
    // TODO: Update grabbedShip/grabbedOffset if the user is hovering over a ship
    if (!grabbedShip && isGrabbing) {
      grabbedShip = getIntersectingShipAndOffset(cursorPosition)
    }

    // Has selected a ship and is still holding it
    // TODO: Move the ship
    else if (grabbedShip && isGrabbing) {
      var x_loc = cursorPosition[0] - grabbedShip.offset[0]
      var y_loc = cursorPosition[1] - grabbedShip.offset[1]
      grabbedShip.ship.setScreenPosition([x_loc, y_loc]);
      grabbedShip.ship.setScreenRotation(shipRotation);
    }

    // Finished moving a ship. Release it, and try placing it.
    // TODO: Try placing the ship on the board and release the ship
    else if (grabbedShip && !isGrabbing) {
      placeShip(grabbedShip.ship);
      grabbedShip = false;
    }
  }

  // PLAYING or END GAME so draw the board and ships (if player's board)
  // Note: Don't have to touch this code
  else {
    if (gameState.get('state') == 'playing') {
      background.setContent("<h1>battleship</h1><h3 style='color: #7CD3A2;'>game on</h3>");
      turnFeedback.setContent(gameState.getTurnHTML());
    }
    else if (gameState.get('state') == 'end') {
      var endLabel = gameState.get('winner') == 'player' ? 'you won!' : 'game over';
      background.setContent("<h1>battleship</h1><h3 style='color: #7CD3A2;'>"+endLabel+"</h3>");
      turnFeedback.setContent("");
    }

    var board = gameState.get('turn') == 'player' ? cpuBoard : playerBoard;
    // Render past shots
    board.get('shots').forEach(function(shot) {
      var position = shot.get('position');
      var tileColor = shot.get('isHit') ? Colors.RED : Colors.YELLOW;
      highlightTile(position, tileColor);
    });

    // Render the ships
    playerBoard.get('ships').forEach(function(ship) {
      if (gameState.get('turn') == 'cpu') {
        var position = ship.get('position');
        var screenPosition = gridOrigin.slice(0);
        screenPosition[0] += position.col * TILESIZE;
        screenPosition[1] += position.row * TILESIZE;
        ship.setScreenPosition(screenPosition);
        if (ship.get('isVertical'))
          ship.setScreenRotation(Math.PI/2);
      } else {
        ship.setScreenPosition([-500, -500]);
      }
    });

    // If playing and CPU's turn, generate a shot
    if (gameState.get('state') == 'playing' && gameState.isCpuTurn() && !gameState.get('waiting')) {
      gameState.set('waiting', true);
      generateCpuShot();
    }
  }
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

