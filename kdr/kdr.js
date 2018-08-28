'use strict';
const machineId = Math.round(Math.random() * 9999 + 1);

let sockDebug = false;

let gDeaths = Array(11).fill(0);
let gKills = Array(11).fill(0);
let gPlayers = Array(11).fill('');
let gQueenKills = Array(11).fill(0);
let gSock = null;
let gStart = (new Date()).valueOf();
let gStartOffset = new Date(1970, 1, 1, 0, 0, 0, 0).valueOf();

///////////////////////////////////////////////////////////////////////////////

function addKill(v) {
  let [x, y, victor, victim, victimKind] = v.split(',');

  if (gIgnoreBearKills && victimKind == 'Worker') return;
  let victimEl = document.getElementById('player' + victim)
  if (gIgnoreBearDeaths && victimEl.classList.contains('bear')) return;

  victor = parseInt(victor, 10);
  victim = parseInt(victim, 10);

  if (victim == 1 || victim == 2) {
    gQueenKills[victor]++;
  }

  gKills[victor]++;
  populate(victor);

  gDeaths[victim]++;
  populate(victim);

  if (victim > 2) {  // Ignore Queens for bear reset.
    victimEl.classList.add('bear');
  }
  victimEl.classList.add('death');

  highlightKill(x, y, victim);
}


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
  gDeaths = Array(11).fill(0);
  gKills = Array(11).fill(0);
  gQueenKills = Array(11).fill(0);
  for (let i = 1; i <= 10; i++) {
    populate(i);
  }
  gStart = (new Date()).valueOf();
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
  case 'playerKill':
    if (sockDebug) console.log('kill:', v);
    localStorage.setItem(`${new Date().valueOf()}_playerKill`, v);
    addKill(v);
    break;
  case 'playernames':
    if (sockDebug) console.log('players:', new Date(), v);
    localStorage.setItem(`${new Date().valueOf()}_playerNames`, v);
    gPlayers = [''].concat(v.split(','));
    init();
    break;
  case 'useMaiden':
    v = v.split(',');
    if (v[2] == 'maiden_wings') {
      document.getElementById('player' + v[3]).classList.remove('bear');
    }
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
        function demoKill() {
          let m = lines[i++].match(/^([0-9]+) = (.*)/);
          //console.log('demo event?', lines[i], m);
          let tm = parseInt(m[1]);
          sockMessage({'data': m[2]});

          if (demoStop) return;

          try {
            let tmNext = parseInt(lines[i+1]);
            setTimeout(demoKill, Math.floor((tmNext - tm) / 10));
          } catch (e) {
            console.warn('demo done');
          }
        }
        demoKill();
      });
  window.addEventListener('keydown', event => {
    if (event.key == 'Escape') demoStop = true;
  }, false);
} else {
  sockStart();
}

setInterval(() => {
  let ms = (new Date()).valueOf() - gStart;
  var d=new Date(ms + gStartOffset).toString()
      .replace(/.*([0-9][0-9]:[0-9][0-9]).*/, '$1');
  document.getElementById('clock').innerText = d;
}, 950);
