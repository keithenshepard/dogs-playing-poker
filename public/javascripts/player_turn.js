// Other variables used in MP3 that were deemed important.
const LEAPSCALE = 0.6;

// General Variables
const masterActionList = ["fold", "check", "raise", "call"];

// Variables to detect gestures.
var lastTimeVisible = -1;   // Last time we saw the hand, how long had it been visible?
var actionCountMap = new Map();   // Map that counts occurrences of actions
const actionThresholdList = [3, 3, 1, 1];   // How many of the same action do we need to see before choosing that action?
var canSendAction = true;

// MAIN GESTURE LOOP: Called every time the Leap provides a new frame of data
/*
In this loop, we work to determine user gestures. We start by determining if the hand
is still visible (i.e. has been over the Leap for some time). So long as the hand stays over
the sensor, we assume the user is trying to make a gesture.

Once the hand is over the Leap, we use our gesture recognition helpers to try and identify
which gesture is being executed. We compare these to a threshold for each action (i.e.
the number of times we need to see an action before identifying it). Once this is completed,
we send the action to our execution function.
 */
Leap.loop({ hand: function(hand) {
    console.log(!(canSendAction), players[current_bettor_index].name)
    if (canSendAction) {
      // Start simple: if the hand stays visible, detect what we think the action is.
      if (lastTimeVisible < hand.timeVisible) {
        // Start by resetting the time variable
        lastTimeVisible = hand.timeVisible;
        // Check if each action is performed, then identify the action.
        // actionList is associated with masterActionList: ["fold", "check", "raise", "call"]
        let actionList = [gestureIsFold(hand) ? 1 : 0, gestureIsCheck(hand) ? 1 : 0, gestureIsRaise(hand) ? 2 : 0, 0]; // Bet functionality implemented via speech
        determinePlayerAction(actionList);
      } else {
        lastTimeVisible = -1; // If the hand has appeared again, reset it.
      };
    } else {
      if (players[current_bettor_index].name != "You"){
        canSendAction = true;
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
  /*
  We start with an updated userSaid function, which uses RegEx commands and a phonetic algorithm
  to improve speech recognition.
  */
  var userSaid = function(transcriptStr, commandCode) {
    let splitTranscriptStr = transcriptStr.split(" ");
    for (var i = 0; i < splitTranscriptStr.length; i++) {
      let strCode = doubleMetaphone(splitTranscriptStr[i])[0];
      if (strCode.match("[A-Z]*".concat(commandCode).concat("[A-Z]*"))) {
        return true;
      }
    }
    return false;
  }
  if (players[current_bettor_index].name != "You"){
    canSendAction = true;
  };
  // Skip if the transcript is empty or the player is not up.
  if ((transcript.length < 1) || !(canSendAction)){
    var processed = false;
    return processed;
  }
  // If the transcript is nonempty, attempt to perform recognition to see if we can identify a command.
  let actionList = [0, 0, 0, 0];
  let raiseAmount = 0;
  if (userSaid(transcript, "KL")){ // Call phonetic matching
    // actionList is associated with masterActionList: ["fold", "check", "raise", "call"]
    actionList = [0, 0, 0, actionThresholdList[3]+1];
  }else if (userSaid(transcript, "RS")){ // Raise phonetic matching
    actionList = [0, 0, actionThresholdList[2]+1, 0];
    let digitRegEx = /\d+/;
    let foundRaiseAmount = parseInt(transcript.match(digitRegEx));
    if (foundRaiseAmount) {
      raiseAmount = foundRaiseAmount;
    };
  }else if (userSaid(transcript, "XK")){ // Check phonetic matching
    actionList = [0, actionThresholdList[1]+1, 0, 0];
  }else if (userSaid(transcript, "LT")){ // Fold phonetic matching
    actionList = [actionThresholdList[0]+1, 0, 0, 0];
  };
  let actionReturned = determinePlayerAction(actionList, raiseAmount);
  return actionReturned; // replacement for processed
};

// TODO: Is there a way to find the current high bid on the board? We could then set this raise amount based on that for expert players.
// TODO: Is there a way to find the amount of chips a player has remaining? We could then create an "all in" feature
// TODO: Change default raiseAmount to be something different.
var determinePlayerAction = function(actionList, raiseAmount=current_min_raise){
  //console.log(!(canSendAction), !(players[current_bettor_index].name != "You"))
  if (!(canSendAction) || !(players[current_bettor_index].name == "You")){
    return false;
  };


  // We start by counting the number of actions recognized in a given action list. If there are
  // more than one action recognized, we dismiss the actionList and don't do anything.
  let actionListSum = actionList.map(function(x){return (x>0) ? 1 : 0}).reduce((a, b) => a + b, 0);
  if (actionListSum === 1){
    for (let i=0; i<masterActionList.length; i++){
      if (actionList[i] > 0){
        let thisAction = masterActionList[i]
        actionCountMap[thisAction] = actionCountMap[thisAction] ? actionCountMap[thisAction]+actionList[i] : actionList[i];
      };
    };
  };

  // To determine the actions a user can say
  // let legal_actions = round.board.legal_actions('user');

  // Finally, we check to see if any action has been recognized enough to be selected
  // as the user's action.
  let actionReturned = false;
  for (let i=0; i<masterActionList.length; i++){
    if (actionCountMap[masterActionList[i]] > actionThresholdList[i]){
      console.log('User Action Selected: ' + masterActionList[i], raiseAmount);
      canSendAction = false;
      if (masterActionList[i] === 'fold') {
        
        human_fold();

        actionCountMap = new Map();
        actionReturned = true;
      } else if (masterActionList[i] === 'call') {
        let call_sound = new Audio('sounds/chipslight.wav');
        call_sound.play();
        human_call();
        actionCountMap = new Map();
        actionReturned = true;
      } else if (masterActionList[i] === 'check') {
        let check_sound = new Audio('sounds/check.wav');
        check_sound.play();
        human_call();
        actionCountMap = new Map();
        actionReturned = true;
      } else  if (masterActionList[i] === "raise") {
        let raise_sound = new Audio('sounds/chips.wav');
        raise_sound.play();
        handle_human_bet(raiseAmount);
        actionCountMap = new Map();
        actionReturned = true;
      }
      // }
    }
  }
  return actionReturned;
};
