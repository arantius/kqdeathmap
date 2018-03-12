// COPY this file to "settings-custom.js".  Edit THAT file to change settings.
var gHost = 'kq.local';

var gSpriteType = 'warriors';  // Or 'bears'.

// Either "false", do not enable, or a 4-element array, where the values
// are the top, right, bottom, and left edge of the game video, overall in
// the expected stream.
var gHighlightKills = [0, 96, 108, 96];
// True to ignore all but queen deaths, when highlighting is enabled.
var gHighlightQueenKillsOnly = false;

// If true, load sample data instead of connecting to a WebSocket feed.
var gDemoMode = false;
