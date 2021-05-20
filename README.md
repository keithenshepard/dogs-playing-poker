# dogs-playing-poker
6.835 Group Project by Spencer Hylen, Keithen Shepard, and Mark Wright

GUI found from poker API at https://js-css-poker.sourceforge.io/

## Hardware Needed
- LEAP Motion Sensor
- Laptop microphone

## Interacting with the system
We have 4 different actions that the user can perform to interact with our system: fold, call, check, or raise.  
Each action can be performed using either speech or gesture.

### Speech Commands
- Fold: "Fold"
- Check: "Check"
- Call: "Call"
- Raise: "Raise x" where x is the amount you want to raise

### Gesture Commands
Your hand must be raise over the LEAP motion approximately 6 inches above the sensor.
- Fold: palm down waving motion with your hand
- Check: knocking motion towards the sensor with closed fist
- Call: knocking motion towards the sensor with closed fist
- Raise: none

## Starting the server
Please refer to the different sections for whichever version of python you are running this system with.  
To start, navigate to the directory that contains all the code files.

#### Python 2
```python -m SimpleHTTPServer```

#### Python 3
```python3 -m http.server```  
```python -m http.server```

This will start up the game and should ask you to use your mouse to choose the number of opponent players you would like to play against.

## Code Files
- bin: holds the server that runs our game
- gesture-recognition: the starter code files from MP3 (don't use)
- public/javascripts: holds all of our speech and gesture recognition code
- routes: sets up the api routes to run the server
- sounds: sound files for card dealing and chips clinking
- static/js: the code directory holding the gui, poker logic, and poker bot logic code
- help.html: html rendering for the help interface if a user doesn't know how to play poker
- index.html: html rendering for the poker interface that the user plays on
