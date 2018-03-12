'use strict';
const machineId = Math.round(Math.random() * 9999 + 1);

let sockDebug = false;

let gDeaths = Array(11).fill(0);
let gKills = Array(11).fill(0);
let gPlayers = Array(11).fill("");
let gQueenKills = Array(11).fill(0);
let gSock = null;

///////////////////////////////////////////////////////////////////////////////

function addKill(v) {
  let [_1, _2, victor, victim] = v.split(',');
  victor = parseInt(victor, 10);
  victim = parseInt(victim, 10);

  if (victim == 1 || victim == 2) {
    gQueenKills[victor]++;
  }

  gKills[victor]++;
  populate(victor);

  gDeaths[victim]++;
  populate(victim);

  document.getElementById('player' + victim).classList.add('death');
}

window.addEventListener('animationend', event => {
  let el = event.target;
  el.classList.remove('death');
}, false);


function init() {
  document.body.classList.remove('warriors');
  document.body.classList.remove('bears');
  document.body.classList.add(gSpriteType);

  gDeaths = Array(11).fill(0);
  gKills = Array(11).fill(0);
  gQueenKills = Array(11).fill(0);
  for (let i = 1; i <= 10; i++) {
    populate(i);
  }
}

function populate(i) {
  let queenKills = '<div class="queenKill">&nbsp;</div>'.repeat(gQueenKills[i]);
  document.getElementById('player' + i).innerHTML = `
      <div class="queenKills">${queenKills}</div>
      <div class="wrap">
        <sup class="k">${gKills[i]}</sup>
        /
        <sub class="d">${gDeaths[i]}</sub>
      </div>
      <div class="name">${gPlayers[i]}</div>`;
}

///////////////////////////////////////////////////////////////////////////////

function sockClose(event) {
  if (sockDebug) console.log('socket closed!', event);
  gSock.close();
  setTimeout(sockStart, 1500);
}
function sockOpen(event) {
  if (sockDebug) console.log('socket opened!', event);
  sockSend('connect', {'name': 'null', 'isGameMachine': false});
}
function sockSend(k, v) {
  let vs = JSON.stringify(v);
  let d = `![k[${k}],v[${vs}]]!`;
  if (sockDebug) console.log('>>> WS sending:', d);
  gSock.send(d);
}
function sockStart() {
  if (sockDebug) console.log('opening socket ...');
  gSock = new WebSocket(`ws://${gHost}:12749`);
  gSock.onopen = sockOpen;
  gSock.onclose = sockClose;
  gSock.onmessage = sockMessage;
}


function sockMessage(event) {
  if (sockDebug) console.log('<<< WS received:', event.data);
  let m = event.data.match(/!\[k\[(.*?)\],v\[(.*)?\]\]!/);
  if (!m) {
    console.warn('Could not parse socket message data!\n', event);
    return;
  }
  let [_, k, v] = m;
  switch (k) {
  case 'connected':
    if (sockDebug) console.log('connected; ', event.data);
    break;
  case 'alive':
    sockSend('im alive', null);
    break;
  case 'playerKill':
    if (sockDebug) console.log('kill:', v);
    localStorage.setItem(`${new Date().valueOf()}_playerKill`, v);
    addKill(v);
    break;
  case 'playernames':
    if (sockDebug) console.log('players:', new Date(), v);
    localStorage.setItem(`${new Date().valueOf()}_playerNames`, v);
    gPlayers = [""].concat(v.split(','));
    init();
    break;
  default:
    console.log('unhandled message: ', k, '=', v);
    break;
  }
};

///////////////////////////////////////////////////////////////////////////////

init();
if (gDemoMode) {
  fetch('../kills.txt')
      .then(r => r.text())
      .then(str => {
        let lines = str.split('\n');
        let i = 0;
        function demoKill() {
          let m = lines[i++].match(/^kill_([a-z]+)_([0-9]+) (.*)/);
          addKill(m[3]);
          if (gDeaths[1] == 3 || gDeaths[2] == 3) {
            init();
          }
          if (i < lines.length) {
            setTimeout(demoKill, Math.floor(Math.random()*750) + 250);
          } else {
            console.warn('demo done');
          }
        }
        demoKill();
      });
} else {
  sockStart();
}
