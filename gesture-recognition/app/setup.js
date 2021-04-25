// Import Famo.us dependencies
var Engine = famous.core.Engine;
var Modifier = famous.core.Modifier;
var Transform = famous.core.Transform;
var Surface = famous.core.Surface;
var ImageSurface = famous.surfaces.ImageSurface;
var StateModifier = famous.modifiers.StateModifier;
var Draggable = famous.modifiers.Draggable;
var GridLayout = famous.views.GridLayout;

var tiles = [];
var tileModifiers = [];
var gridOrigin = [350, 35];

var background, turnFeedback, otherFeedback;

// USER INTERFACE SETUP
var setupUserInterface = function() {
  var mainContext = Engine.createContext();
  background = new Surface({
    content: "<h1>battleship</h1>",
    properties: {
      backgroundColor: "rgb(34, 34, 34)",
      color: "white"
    }
  });
  mainContext.add(background);
  turnFeedback = new Surface({
    content: "",
    size: [undefined, 150],
    properties: {
      backgroundColor: "rgb(34, 34, 34)",
      color: "white"
    }
  });
  var turnModifier = new StateModifier({
    origin: [0.0, 0.0],
    align: [0.0, 0.4] 
  })
  mainContext.add(turnModifier).add(turnFeedback);
  otherFeedback = new Surface({
    content: "",
    size: [undefined, 50],
    properties: {
      backgroundColor: "rgb(34, 34, 34)",
      color: "white"
    }
  });
  var otherModifier = new StateModifier({
    origin: [0.0, 1.0],
    align: [0.0, 1.0]
  })
  mainContext.add(otherModifier).add(otherFeedback);

  // Draw the board
  for (var row = 0; row < NUMTILES; row++) {
    for (var col = 0; col < NUMTILES; col++) {
      var tile = new Surface({
          size: [TILESIZE, TILESIZE],
          properties: {
              backgroundColor: Colors.GREY,
              color: "white",
              border: "solid 1px black"
          },
      });
      var transformModifier = new StateModifier({
        transform: Transform.translate(gridOrigin[0] + col*TILESIZE, gridOrigin[1] + row*TILESIZE, 0)
      });
      var tileModifier = new Modifier({
        opacity: 1.0
      });
      mainContext.add(transformModifier).add(tileModifier).add(tile);
      tiles.push(tile);
      tileModifiers.push(tileModifier);
    }
  }
  ROWNAMES.slice(0,NUMTILES).forEach(function(rowName, row) {
    var label = new Surface({
        content: rowName,
        size: [TILESIZE, TILESIZE],
        properties: {
          textAlign: "center",
          color: "white",
          lineHeight: TILESIZE / 15
        },
    });
    var labelModifier = new StateModifier({
      transform: Transform.translate(gridOrigin[0] - 80, gridOrigin[1] + row*TILESIZE, 0)
    });
    mainContext.add(labelModifier).add(label);
  });
  COLNAMES.slice(0,NUMTILES).forEach(function(colName, col) {
    var label = new Surface({
        content: colName,
        size: [TILESIZE, TILESIZE],
        properties: {
          textAlign: "center",
          color: "white"
        },
    });
    var labelModifier = new StateModifier({
      transform: Transform.translate(gridOrigin[0] + col*TILESIZE, gridOrigin[1] - 25, 0)
    });
    mainContext.add(labelModifier).add(label);
  });

  // Draw the player ships
  playerBoard.get('ships').forEach(function(ship) {
    var shipView = new ImageSurface({
        size: [ship.get('length') * TILESIZE, TILESIZE],
        content: 'img/' + ship.get('type') + '.png',
    });
    var shipTranslateModifier = new Modifier({
      transform : function(){
        var shipPosition = this.get('screenPosition').slice(0);
        if (this.get('isVertical')) {
          shipPosition[0] += TILESIZE / 2;
          shipPosition[1] += ship.get('length') * TILESIZE/2;
        } else {
          shipPosition[1] += TILESIZE / 2;
          shipPosition[0] += ship.get('length') * TILESIZE/2;
        }
        return Transform.translate(shipPosition[0], shipPosition[1], 0);
      }.bind(ship)
    });
    var shipRotateModifier = new Modifier({
      origin: [0.5, 0.5],
      transform : function(){
        var shipRotation = this.get('screenRotation');
        return Transform.rotateZ(shipRotation);
      }.bind(ship)
    });
    mainContext.add(shipTranslateModifier).add(shipRotateModifier).add(shipView);
    ship.set('view', shipView);
  });

  // Draw the cursor
  var cursorSurface = new Surface({
    size : [CURSORSIZE, CURSORSIZE],
    properties : {
        backgroundColor: 'white',
        borderRadius: CURSORSIZE/2 + 'px',
        pointerEvents : 'none',
        zIndex: 1
    }
  });
  var cursorOriginModifier = new StateModifier({origin: [0.5, 0.5]});
  var cursorModifier = new Modifier({
    transform : function(){
      var cursorPosition = this.get('screenPosition');
      return Transform.translate(cursorPosition[0], cursorPosition[1], 0);
    }.bind(cursor)
  });
  mainContext.add(cursorOriginModifier).add(cursorModifier).add(cursorSurface);

};
