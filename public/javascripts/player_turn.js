// Other variables used in MP3 that were deemed important.
const LEAPSCALE = 0.6;

// General Variables
const masterActionList = ["fold", "check", "raise", "call"];

// Variables to detect gestures.
var lastTimeVisible = 0;   // Last time we saw the hand, how long had it been visible?
var actionCountMap = new Map();   // Map that counts occurrences of actions
const actionThreshold = 10;   // How many of the same action do we need to see before choosing that action?

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
    // Start by resetting the time variable
    lastTimeVisible = hand.timeVisible;
    // Check if each action is performed, then identify the action.
    // actionList is associated with masterActionList: ["fold", "check", "raise", "call"]
    let actionList = [gestureIsFold(hand) ? 1 : 0, gestureIsCheck(hand) ? 1 : 0, 0, 0]; // Bet functionality implemented via speech
    // TODO: Make this an API result rather than a console log. Function is below.
    determinePlayerAction(actionList);
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

  let actionList = [0, 0, 0, 0];
  // Right now, we are just using voice recognition to implement betting.
  if (userSaid(transcript, ["call", "all"])){
    // actionList is associated with masterActionList: ["fold", "check", "raise", "call"]
    actionList = [0, 0, 0, actionThreshold+1];
  }else if (userSaid(transcript, ["raise", "ray", "rays", "Ray"])){
    actionList = [0, 0, actionThreshold+1, 0];
  }else if (userSaid(transcript, ["check", "Shaq"])){
    actionList = [0, actionThreshold+1, 0, 0];
  }else if (userSaid(transcript, ["fold", "full", "folding", "old"])){
    actionList = [actionThreshold+1, 0, 0, 0];
  };
  // TODO: Make this an API result rather than a console log. Function is below.
  determinePlayerAction(actionList);

  var processed = false; // if this is set to true anywhere in the function, it will quit executing.
  return processed;
};

var determinePlayerAction = function(actionList){
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
  let legal_actions = round.board.legal_actions('user');

  // Finally, we check to see if any action has been recognized enough to be selected
  // as the user's action.
  for (let i=0; i<masterActionList.length; i++){
    if (actionCountMap[masterActionList[i]] > actionThreshold){
      console.log('User Action Selected: ' + masterActionList[i]);
      if (legal_actions.includes(masterActionList[i])) {
        process_turn(masterActionList[i], 100);
        actionCountMap = new Map();
      }
    }
  }
  return;
};