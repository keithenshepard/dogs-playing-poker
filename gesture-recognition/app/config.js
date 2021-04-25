// Configuration of the game

var Colors = {
  GREY: "#AAAAAA",  // default tile color
  GREEN: "#7CD3A2", // highlighting
  RED: "#FA5C4F",   // hits
  YELLOW: "#FAF36F",// misses
};
var ROWNAMES = ["A", "B", "C", "D", "E", "F", "G", "H"];
var COLNAMES = ["1", "2", "3", "4", "5", "6", "7", "8"];

var BOARDSIZE = 550;
var NUMTILES = 5;
var TILESIZE = Math.ceil(BOARDSIZE / NUMTILES);
var CURSORSIZE = 20;
var TURNDELAY = 2500;

var VOICEINDEX = 17; // UK British Female
var LEAPSCALE = 0.6;
var DEBUGSPEECH = true;
var SKIPSETUP = true;
