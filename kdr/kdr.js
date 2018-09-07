'use strict';
const machineId = Math.round(Math.random() * 9999 + 1);

let sockDebug = false;

let gBerries = Array(11).fill(0);
let gDeaths = Array(11).fill(0);
let gIsHuman = Array(11).fill(false);
let gKills = Array(11).fill(0);
let gPlayers = Array(11).fill('');
let gSnailStart = Array(11).fill(0);
let gSnailYardage = Array(11).fill(0);
let gQueenKills = Array(11).fill(0);
let gSock = null;
let gStart = (new Date()).valueOf();
let gStartOffset = new Date(1970, 1, 1, 0, 0, 0, 0).valueOf();

///////////////////////////////////////////////////////////////////////////////

function handleBerryDeposit(v) {
  let [x, y, player] = v.split(',');
  gBerries[player]++;
  populate(player);
}


function handleGetOffSnail(v) {
  let [x, y, _, player] = v.split(',');
  gSnailYardage[player] += Math.abs(parseInt(x) - gSnailStart[player]);
  gSnailStart[player] = 0;
  populate(player);
}


function handleGetOnSnail(v) {
  let [x, y, player] = v.split(',');
  gSnailStart[player] = parseInt(x);
}


function handlePlayerKill(v) {
  let [x, y, victor, victim, victimKind] = v.split(',');

  if (gIgnoreBearKills && victimKind == 'Worker') return;
  let victimEl = document.getElementById('player' + victim);

  victor = parseInt(victor, 10);
  victim = parseInt(victim, 10);

  if (victim == 1 || victim == 2) {
    gQueenKills[victor]++;
  }

  gKills[victor]++;
  populate(victor);

  gDeaths[victim]++;
  populate(victim);

  if (victimEl.caste == 'warrior') victimEl.setAttribute('caste', 'bear');
  victimEl.classList.add('death');

  highlightKill(x, y, victim);
}


function handleSnailEat(v) {
  let [x, y, rider, snack] = v.split(',');
  console.log('snail eat', gSnailStart[rider], x);
  gSnailYardage[rider] += Math.abs(parseInt(x) - gSnailStart[rider]);
  gSnailStart[rider] = x;
  populate(rider);
}

function handleSpawn(v) {
  let [player, isHuman] = v.split(',');
  gIsHuman[player] = !(isHuman == 'True');

  if (parseInt(player) > 2) {
    let playerEl = document.getElementById('player' + player);
    playerEl.setAttribute('caste', isHuman ? 'bear' : 'bot');
  }

  populate(player);
}


function handleUseMaiden(v) {
  let [x, y, gateType, player] = v.split(',');
  if (gateType == 'maiden_wings') {
    let playerEl = document.getElementById('player' + player)
    playerEl.setAttribute('caste', 'warrior');
  }
}

///////////////////////////////////////////////////////////////////////////////

function highlightKill(x, y, victim) {
  if (!gHighlightKills) return;
  if (gHighlightQueenKillsOnly && victim > 2) return;

  let el = document.getElementById('highlight' + victim);

  // TODO: Subtract half of the highlight element's width/height?
  let [ay0, ax1, ay1, ax0] = gHighlightKills;
  let l = (x / 1920) * (ax1 - ax0) + ax0;
  let t = ((1080 - y) / 1080) * (ay1 - ay0) + ay0;

  el.style = `left: ${l}px; top: ${t}px;`;
  el.className = 'show';
}


window.addEventListener('animationend', event => {
  let el = event.target;
  el.classList.remove('death');
  el.classList.remove('show');
}, false);


function init() {
  gBerries = Array(11).fill(0);
  gDeaths = Array(11).fill(0);
  gKills = Array(11).fill(0);
  gSnailStart = Array(11).fill(0);
  gSnailYardage = Array(11).fill(0);
  gStart = (new Date()).valueOf();
  gQueenKills = Array(11).fill(0);

  for (let i = 1; i <= 10; i++) {
    if (i > 2) {
      let playerEl = document.getElementById('player' + i);
      playerEl.setAttribute('caste', 'bot');
    }
    populate(i);
  }
}


function populate(i) {
  let berries = '<b></b>'.repeat(gBerries[i]);
  let queenKills = '<div class="queenKill">&nbsp;</div>'.repeat(gQueenKills[i]);
  let snailProgress = 0;

  if (gSnailYardage[i] > 0) {
    // TODO: Correct max value, per map, not just 960.
    let maxYardage = Math.max(960, ...gSnailYardage);
    snailProgress = gSnailYardage[i] / maxYardage;
  }

  document.getElementById('player' + i).innerHTML = `
      <div class="berries">${berries}</div>
      <div class="queenKills">${queenKills}</div>
      <div class="wrap">
        <sup class="k">${gKills[i]}</sup>
        /
        <sub class="d">${gDeaths[i]}</sub>
      </div>
      <div class="name">${gPlayers[i]}</div>
      <div class="snail" style="width: ${snailProgress*90}px"></div>`;
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
  if (sockDebug && k != 'im alive') console.log('>>> WS sending:', d);
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
  let m = event.data.match(/!\[k\[(.*?)\],v\[(.*)?\]\]!/);
  if (!m) {
    console.warn('Could not parse socket message data!\n', event);
    return;
  }
  let [_, k, v] = m;
  if (sockDebug && k != 'alive') console.log('<<< WS received:', event.data);

  switch (k) {
  case 'connected':
    if (sockDebug) console.log('connected; ', event.data);
    break;
  case 'alive':
    sockSend('im alive', null);
    break;
  case 'berryKickIn':
  case 'berryDeposit':
    handleBerryDeposit(v);
    break;
  // At least in beta, the ": " is in these key names!
  case 'getOffSnail':
  case 'getOffSnail: ':
    handleGetOffSnail(v);
    break;
  case 'getOnSnail':
  case 'getOnSnail: ':
    handleGetOnSnail(v);
    break;
  case 'playerKill':
    handlePlayerKill(v);
    break;
  case 'playernames':
    gPlayers = [''].concat(v.split(','));
    break;
  case 'gamestart':
    init();
    break;
  case 'spawn':
    handleSpawn(v);
    break;
  case 'snailEat':
    handleSnailEat(v);
    break;
  case 'useMaiden':
    handleUseMaiden(v);
  default:
    //console.log('unhandled message: ', k, '=', v);
    break;
  }
};

///////////////////////////////////////////////////////////////////////////////

init();
if (location.search == '?demo') {
  init();
  let demoStop = false;
  fetch('../events.txt')
      .then(r => r.text())
      .then(str => {
        let lines = str.split('\n');
        let i = 0;
        function demoEvent() {
          let m = lines[i++].match(/^([0-9]+) = (.*)/);
          let tm = parseInt(m[1]);
          sockMessage({'data': m[2]});

          if (demoStop) return;

          try {
            let tmNext = parseInt(lines[i+1]);
            setTimeout(demoEvent, Math.floor((tmNext - tm) / 10));
          } catch (e) {
            console.warn('demo done');
          }
        }
        demoEvent();
      });
  window.addEventListener('keydown', event => {
    if (event.key == 'Escape') {
      demoStop = true;
      clearInterval(clockTimer);
    }
  }, false);
} else {
  sockStart();
}

let clockTimer = setInterval(() => {
  let ms = (new Date()).valueOf() - gStart;
  var d=new Date(ms + gStartOffset).toString()
      .replace(/.*([0-9][0-9]:[0-9][0-9]).*/, '$1');
  document.getElementById('clock').innerText = d;
}, 950);
