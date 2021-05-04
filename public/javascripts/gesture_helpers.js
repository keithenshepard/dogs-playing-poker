// GESTURE PARAMETERS
const maxFistValue = 0.6; // Min value of closedness needed for a fist
const minCheckSpeed = 5; // Min z-velocity needed to check (in mm/sec)
const minPalmValue = 0.3; // Max value of closedness to be considered open
const minFoldSpeed = 50; // Min horizontal velocity needed to fold (in mm/sec)


/*
START WITH HELPER FUNCTIONS
*/
// I am not sure what is best organizationally here. Maybe classes? Lmk. -Spencer

// Computes the number of extended fingers on the hand
function computeExtendedFingers(hand){
  var extendedFingers = 0;
  for(var i=0; i<hand.fingers.length; i++){
    if(hand.fingers[i].extended){
      extendedFingers++;
    }
  }
  return extendedFingers;
}

// Computes the open or closedness of a hand
function computeClosedness(hand){
  var fingerSum = 0;
  for(var i=0; i<hand.fingers.length; i++){
    var finger = hand.fingers[i];
    var meta = finger.bones[0].direction();
    var proxi = finger.bones[1].direction();
    var inter = finger.bones[2].direction();
    var dotMetaProxi = Leap.vec3.dot(meta, proxi);
    var dotProxiInter = Leap.vec3.dot(proxi, inter);
    fingerSum += dotMetaProxi + dotProxiInter;
  }
  return fingerSum / 10;
}

/*
END HELPER FUNCTIONS. DETERMINE GESTURES.
 */

// Uses computeExtendedFingers and computeClosedness
// to determine if a hand is in a fist or not.
function isFist(hand){
  if(computeClosedness(hand)<=maxFistValue && computeExtendedFingers(hand)<1){
    return true;
  }else{
    return false;
  }
}

// Uses computeExtendedFingers and computeClosedness
// to determine if a hand is an open palm or not.
function isOpenPalm(hand){
  if(computeClosedness(hand)>=minPalmValue && computeExtendedFingers(hand)>=3){
    return true;
  }else{
    return false;
  }
}

/*
END GESTURES. DETERMINE ACTIONS. (no bet detection - this should be done via voice for now).
 */

// Using the shape of the hand and its velocity, determines if the gesture
// qualifies as a check.
function gestureIsCheck(hand){
  let handVelocity = hand.palmVelocity[2];   // I've assumed the elements are [x, y, z] - need to confirm
  if (isFist(hand) && handVelocity>=minCheckSpeed){
    return true;
  }else{
    return false;
  }
}

// Using the shape of the hand and its velocity, determines if the gesture
// qualifies as a fold.
function gestureIsFold(hand){
  let handVelocity = hand.palmVelocity;   // I've assumed the elements are [x, y, z] - need to confirm
  let maxHorizontalVelocity = Math.max(handVelocity[0], handVelocity[1]);
  let handNormalVector = hand.palmNormal; // Adding robustness for the raise feature below.
  let palmFacingDown = (handNormalVector[0] > -0.1) && (handNormalVector[2] > -0.1)
  if (isOpenPalm(hand) && maxHorizontalVelocity>=minFoldSpeed){
    return true;
  }else{
    return false;
  }
}

function gestureIsRaise(hand){
  let handNormalVector = hand.palmNormal;
  if (isOpenPalm(hand) && (handNormalVector[0] < -0.5) && (handNormalVector[2] < -0.5)){
    return true;
  }else{
    return false;
  }
}

/*
END ACTIONS.
 */