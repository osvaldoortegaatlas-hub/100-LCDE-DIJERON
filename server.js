/**
 * 100 LCDE Dijeron - servidor
 * - Sirve la página (/ = presentador, /pantalla = pantalla pública)
 * - Sincroniza todos los dispositivos por WebSocket
 * - El presentador necesita PIN; la pantalla pública NUNCA recibe las
 *   respuestas que todavía no se han revelado.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PIN = String(process.env.ADMIN_PIN || 'lcde');
const PUBLIC_DIR = path.join(__dirname, 'public');
const STATE_FILE = path.join(__dirname, 'state.json');
const EJEMPLO = JSON.parse(fs.readFileSync(path.join(__dirname, 'ejemplo.json'), 'utf8'));

let state = null;
try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) {}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(STATE_FILE, JSON.stringify(state), () => {}), 300);
}

/* Versión pública: oculta el texto y los puntos de lo que aún no se revela */
function publicView(s) {
  if (!s || !s.cfg) return null;
  const c = s.cfg, g = s.g;
  let questions = [];
  if (s.screen !== 'setup' && g) {
    questions = (c.questions || []).map((q, i) => {
      if (s.screen !== 'game' || i !== g.qi) return { q: '', mult: q.mult, answers: [] };
      return {
        q: q.q, mult: q.mult,
        answers: q.answers.map((a, j) => (g.revealed[j] ? { t: a.t, p: a.p } : { t: '', p: 0 }))
      };
    });
  }
  return {
    v: s.v, screen: s.screen,
    cfg: { title: c.title, teamA: c.teamA, teamB: c.teamB, stealMult: c.stealMult, failSteal: c.failSteal, questions },
    g: g || null
  };
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0].replace(/\/+$/, '') || '/';
  if (url === '/health') { res.writeHead(200); return res.end('ok'); }
  if (url === '/' || url === '/pantalla' || url === '/index.html') {
    return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); return res.end('Error'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  }
  res.writeHead(404); res.end('No encontrado');
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 });
const send = (ws, obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };

function broadcast(except) {
  if (!state) return;
  const full = JSON.stringify({ type: 'state', state });
  const pub = JSON.stringify({ type: 'state', state: publicView(state) });
  for (const c of wss.clients) {
    if (c === except || c.readyState !== 1) continue;
    if (c.admin) c.send(full); else if (c.role === 'display') c.send(pub);
  }
}

wss.on('connection', ws => {
  ws.admin = false; ws.role = null; ws.fails = 0; ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }

    if (m.type === 'hello') {
      if (m.role === 'presenter') {
        if (String(m.pin || '') === PIN) {
          ws.admin = true; ws.role = 'presenter';
          send(ws, { type: 'auth', ok: true });
          send(ws, { type: 'ejemplo', cfg: EJEMPLO });
          if (state) send(ws, { type: 'state', state });
        } else {
          send(ws, { type: 'auth', ok: false });
          if (++ws.fails >= 5) ws.close();
        }
      } else {
        ws.role = 'display'; ws.admin = false;
        if (state) send(ws, { type: 'state', state: publicView(state) });
      }
    } else if (m.type === 'state' && ws.admin) {
      const s = m.state;
      if (!s || typeof s.v !== 'number' || !s.cfg) return;
      if (state && s.v <= state.v) return;
      state = s; persist(); broadcast(ws);
    }
  });
});

setInterval(() => {
  for (const c of wss.clients) {
    if (!c.alive) { c.terminate(); continue; }
    c.alive = false; try { c.ping(); } catch (e) {}
  }
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces()))
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
  console.log('='.repeat(56));
  console.log(' 100 LCDE DIJERON - servidor activo');
  console.log('='.repeat(56));
  console.log(` Presentador (esta compu):  http://localhost:${PORT}/`);
  console.log(` Pantalla pública (esta):   http://localhost:${PORT}/pantalla`);
  ips.forEach(ip => {
    console.log(` Otros dispositivos (misma red Wi-Fi):`);
    console.log(`   Presentador: http://${ip}:${PORT}/`);
    console.log(`   Pantalla:    http://${ip}:${PORT}/pantalla`);
  });
  console.log(` PIN del presentador: ${PIN}${process.env.ADMIN_PIN ? '' : '  (cámbialo con la variable ADMIN_PIN)'}`);
  console.log('='.repeat(56));
});
