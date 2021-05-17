/*
SPEECH RECOGNITION CODE RE-USED FROM MP3.

Some modifications have been made for our purposes, like changed to how
recognition is killed and restarted, but most is left the same (our speech
recognition changes come from how we postprocess the speech).
 */

/*****************************************************************/
/******** SPEECH RECOGNITION SETUP YOU CAN IGNORE ****************/
/*****************************************************************/
const DEBUGSPEECH = true;

var debouncedProcessSpeech = _.debounce(processSpeech, 500);

var recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.onresult = function(event) {
  // Build the interim transcript, so we can process speech faster
  var transcript = '';
  var hasFinal = false;
  for (var i = event.resultIndex; i < event.results.length; ++i) {
    if (event.results[i].isFinal)
      hasFinal = true;
    else
      transcript += event.results[i][0].transcript;
  }

  if (DEBUGSPEECH) {
    if (hasFinal){
      console.log("SPEECH DEBUG: ready");
    }else {
      console.log("SPEECH DEBUG: " + transcript);
    }
  }

  var speechProcessed = debouncedProcessSpeech(transcript);

  // If we reacted to speech, kill recognition and restart
  if (speechProcessed) {
    recognition.stop();
  }
};
// Restart recognition if it has stopped
recognition.onend = function(event) {
  setTimeout(function() {
    recognition.start();
  }, 500);
};
recognition.start();
/*****************************************************************/
/******** END OF SPEECH RECOG SETUP ******************************/
/*****************************************************************/

