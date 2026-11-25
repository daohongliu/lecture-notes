// Optional sign-in for local/server.mjs, for hosting it on a server. Off unless local/data/auth.json exists
// (create it with `npm run set-password`). A login page sets a session cookie; "log out" ends that session.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DAY = 864e5, SESSION_DAYS = 30;

export function makeAuth(dataDir) {
  const AUTH = path.join(dataDir, 'auth.json'), SESS = path.join(dataDir, 'sessions.json');
  const cfg = () => { try { return JSON.parse(fs.readFileSync(AUTH, 'utf8')); } catch { return null; } };
  if (!cfg()) return null;

  /* sessions: random ids, kept on disk so a restart doesn't log you out; only a hash of each id is stored */
  let sessions = {};
  try { sessions = JSON.parse(fs.readFileSync(SESS, 'utf8')); } catch {}
  const saveSessions = () => { const now = Date.now(); for (const k in sessions) if (sessions[k].exp < now) delete sessions[k]; fs.writeFileSync(SESS, JSON.stringify(sessions), { mode: 0o600 }); };
  const h = id => crypto.createHash('sha256').update(id).digest('hex');

  /* wrong passwords: after 5 from one address, that address waits a minute per further attempt */
  const fails = new Map();
  const clientIp = req => {
    const peer = req.socket.remoteAddress || '';
    const fwd = /^(::ffff:)?127\.0\.0\.1$|^::1$/.test(peer) ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
    return fwd || peer;
  };

  const cookieOf = req => { const m = String(req.headers.cookie || '').match(/(?:^|;\s*)ln_session=([A-Za-z0-9_-]{20,})/); return m ? m[1] : null; };
  const secure = req => req.headers['x-forwarded-proto'] === 'https';
  const cookie = (req, val, maxAge) => `ln_session=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(req) ? '; Secure' : ''}`;

  function user(req) {
    const id = cookieOf(req); if (!id) return null;
    const s = sessions[h(id)]; if (!s || s.exp < Date.now()) return null;
    return s.user;
  }

  function verify(name, pw) {
    const c = cfg(); if (!c) return false;
    const got = crypto.scryptSync(String(pw), Buffer.from(c.salt, 'hex'), 64);
    const want = Buffer.from(c.hash, 'hex');
    const okPw = got.length === want.length && crypto.timingSafeEqual(got, want);
    const okUser = crypto.timingSafeEqual(crypto.createHash('sha256').update(String(name)).digest(), crypto.createHash('sha256').update(c.user).digest());
    return okPw && okUser;
  }

  const page = (msg, name = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in · Lecture Notes</title><link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%235a3a5e'/%3E%3Cpath d='M32 19c-5-4-12-5-19-4v29c7-1 14 0 19 4z' fill='%23f3efe8'/%3E%3Cpath d='M32 19c5-4 12-5 19-4v29c-7-1-14 0-19 4z' fill='%23e4dccf'/%3E%3Cpath d='M41 15.6v13l3.5-2.6 3.5 2.6V15.2c-2.4-.1-4.7.1-7 .4z' fill='%23c9962e'/%3E%3Cpath d='M17 23c4-.5 8 0 11 1.6M17 28.5c4-.5 8 0 11 1.6M17 34c4-.5 8 0 11 1.6' stroke='%235a3a5e' stroke-width='1.6' stroke-linecap='round' fill='none' opacity='.45'/%3E%3C/svg%3E"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,700;1,400&family=Recursive:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light dark;--bg:light-dark(#f3efe8,#1b1916);--ink:light-dark(#2a2420,#ece6dc);--soft:light-dark(#7a6e66,#a89d93);--rule:light-dark(#d6cdc1,#3a3530);--blue:light-dark(#5a3a5e,#c7a6cc);--card:light-dark(#fbf8f3,#23201c)}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:17px/1.5 Alegreya,Georgia,serif;padding:16px}
form{width:min(360px,100%);background:var(--card);border:1px solid var(--rule);border-radius:6px;padding:28px 26px 24px}
h1{font-variant:small-caps;letter-spacing:.04em;font-weight:700;font-size:26px;margin:0 0 4px}p{margin:0 0 18px;color:var(--soft);font-size:15px}
label{display:block;font:600 12px Recursive,ui-monospace,monospace;color:var(--soft);margin:12px 0 4px}
input{width:100%;font:16px Alegreya,Georgia,serif;padding:9px 10px;border:1px solid var(--rule);border-radius:4px;background:var(--bg);color:var(--ink)}
input:focus-visible,button:focus-visible{outline:2px solid var(--blue);outline-offset:1px}
button{margin-top:18px;width:100%;min-height:44px;font:600 14px Recursive,ui-monospace,monospace;color:#fff;background:var(--blue);border:0;border-radius:4px;cursor:pointer}
.err{color:light-dark(#a3261d,#f08a80);margin:8px 0 0;font-size:15px}
</style></head><body><form method="post" action="login"><h1>Lecture Notes</h1><p>Sign in to read and ask Claude.</p>
<label for="u">Username</label><input id="u" name="user" autocomplete="username" required value="${String(name).replace(/[&"<>]/g, c => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]))}" autofocus>
<label for="p">Password</label><input id="p" name="password" type="password" autocomplete="current-password" required>
${msg ? `<p class="err" role="alert">${msg}</p>` : ''}<button type="submit">Sign in</button></form></body></html>`;

  const html = (res, code, body, headers = {}) => { res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...headers }); res.end(body); };

  /* Returns true when the request was handled here (login page, login, logout, or a refusal). */
  async function gate(req, res, url) {
    if (url.pathname === '/login' && req.method === 'GET') { if (user(req)) { res.writeHead(303, { location: './' }).end(); return true; } html(res, 200, page('')); return true; }
    if (url.pathname === '/login' && req.method === 'POST') {
      let b = ''; for await (const c of req) { b += c; if (b.length > 4096) break; }
      const f = new URLSearchParams(b), name = f.get('user') || '', pw = f.get('password') || '';
      const ip = clientIp(req), now = Date.now(), st = fails.get(ip) || { n: 0, until: 0 };
      if (st.until > now) { html(res, 429, page(`Too many wrong attempts. Try again in ${Math.ceil((st.until - now) / 1000)} s.`, name)); return true; }
      if (!verify(name, pw)) {
        st.n++; if (st.n >= 5) st.until = now + 60e3; fails.set(ip, st);
        html(res, 401, page('Wrong username or password.', name)); return true;
      }
      fails.delete(ip);
      const id = crypto.randomBytes(32).toString('base64url');
      sessions[h(id)] = { user: name, exp: now + SESSION_DAYS * DAY, created: now }; saveSessions();
      res.writeHead(303, { location: './', 'set-cookie': cookie(req, id, SESSION_DAYS * 86400), 'cache-control': 'no-store' }).end(); return true;
    }
    if (url.pathname === '/logout' && req.method === 'POST') {
      const id = cookieOf(req); if (id) { delete sessions[h(id)]; saveSessions(); }
      res.writeHead(303, { location: 'login', 'set-cookie': cookie(req, '', 0), 'cache-control': 'no-store' }).end(); return true;
    }
    if (user(req)) return false;
    if (url.pathname.startsWith('/api/')) { res.writeHead(401, { 'content-type': 'application/json' }).end('{"error":"sign in"}'); return true; }
    res.writeHead(303, { location: 'login', 'cache-control': 'no-store' }).end(); return true;
  }

  return { gate, user };
}

/* `npm run set-password`: writes local/data/auth.json from a username and a password read on stdin. */
export function setPassword(dataDir, name, pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 64);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'auth.json'), JSON.stringify({ user: name, salt: salt.toString('hex'), hash: hash.toString('hex') }), { mode: 0o600 });
  try { fs.unlinkSync(path.join(dataDir, 'sessions.json')); } catch {}
}
