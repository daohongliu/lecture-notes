// Lecture Notes, run locally: serves the built page and answers Ask Claude through the Claude Agent SDK,
// signed in with your own Claude account (the login Claude Code uses). Start with `npm start`.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { makeAuth } from './auth.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = path.join(ROOT, 'dist', 'artifact.html');
const DATA = path.join(ROOT, 'local', 'data', 'chats');
const PORT = Number(process.env.PORT) || 4173;
const MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1']);
const EFFORTS = new Set(['low', 'medium', 'high']);
fs.mkdirSync(DATA, { recursive: true });
/* sign-in: only when local/data/auth.json exists (npm run set-password -- <username>) */
const AUTH = makeAuth(path.join(ROOT, 'local', 'data'));

/* The Agent SDK runs Claude Code underneath. These settings make it a plain question-and-answer call:
   no tools, one turn, none of your Claude Code settings or CLAUDE.md files, nothing saved as a session,
   and no API key from the environment, so it always uses your Claude login. */
const ENV = { ...process.env }; delete ENV.ANTHROPIC_API_KEY; delete ENV.ANTHROPIC_AUTH_TOKEN;
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'lecture-notes-'));

function transcript(turns) {
  if (turns.length === 1) return turns[0].content;
  const parts = turns.map(t => `<${t.role === 'assistant' ? 'assistant' : 'user'}>\n${t.content}\n</${t.role === 'assistant' ? 'assistant' : 'user'}>`);
  return 'The conversation so far, oldest first:\n\n' + parts.join('\n\n') + '\n\nReply to the last user message.';
}

function classify(msg) {
  const m = String(msg || '');
  if (/log ?in|auth|401|unauthori[sz]ed|credential|oauth|not signed/i.test(m)) return { code: 'not_signed_in', message: 'Not signed in to Claude. In the lecture-notes folder run `npm run login`, sign in with your Claude account, then ask again.' };
  if (/rate.?limit|429|usage limit|overloaded|529/i.test(m)) return { code: 'rate_limited', message: 'A usage limit was reached or Claude is busy. Try again in a little while.' };
  if (/prompt is too long|too long|context/i.test(m)) return { code: 'prompt_too_large', message: 'Too much text was attached. Highlight less and try again.' };
  return { code: 'upstream_error', message: m.slice(0, 400) || 'Something went wrong talking to Claude.' };
}

async function ask(req, res) {
  let body = '';
  for await (const c of req) body += c;
  let p; try { p = JSON.parse(body); } catch { res.writeHead(400).end(); return; }
  const turns = Array.isArray(p.turns) ? p.turns.filter(t => t && typeof t.content === 'string') : [];
  if (!turns.length) { res.writeHead(400).end(); return; }
  /* the page sends its instructions as the first message: they become the system prompt */
  const system = turns[0].role === 'user' && turns.length > 1 ? turns.shift().content : undefined;
  const model = MODELS.has(p.model) ? p.model : 'claude-opus-5-5';
  const effort = EFFORTS.has(p.effort) ? p.effort : 'medium';
  res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' });
  const send = o => res.write(JSON.stringify(o) + '\n');
  const ctl = new AbortController();
  res.on('close', () => { if (!res.writableFinished) ctl.abort(); });
  let text = '', failed = false;
  const fail = msg => { if (!failed) { failed = true; console.error('[ask] ' + String(msg).slice(0, 300)); send({ t: 'error', ...classify(msg) }); } };
  try {
    const q = query({ prompt: transcript(turns), options: {
      model, effort, systemPrompt: system, tools: [], allowedTools: [], maxTurns: 1, settingSources: [],
      persistSession: false, includePartialMessages: true, verbatimPrompts: true,
      cwd: WORK, env: ENV, abortController: ctl,
    } });
    for await (const m of q) {
      if (m.type === 'stream_event' && !m.parent_tool_use_id) {
        const e = m.event;
        if (e.type === 'content_block_delta' && e.delta && e.delta.type === 'text_delta') { text += e.delta.text; send({ t: 'delta', text: e.delta.text }); }
      } else if (m.type === 'result') {
        if (m.is_error || m.subtype !== 'success') fail(m.result || (m.errors || []).join(' ') || m.subtype);
        else send({ t: 'done', text: m.result || text, truncated: m.stop_reason === 'max_tokens' });
      }
    }
  } catch (e) {
    if (!ctl.signal.aborted) fail(e && e.message);
  }
  res.end();
}

/* chat history: one JSON file per conversation in local/data/chats (kept out of git) */
const safeId = id => /^[a-z0-9]{6,40}$/.test(id || '') ? id : null;
async function chats(req, res, id) {
  const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(o === undefined ? '' : JSON.stringify(o)); };
  if (!id && req.method === 'GET') {
    const list = fs.readdirSync(DATA).filter(f => f.endsWith('.json')).map(f => {
      try { const d = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); return { id: f.slice(0, -5), ...d.meta }; } catch { return null; }
    }).filter(Boolean).sort((a, b) => (b.updated || 0) - (a.updated || 0));
    return json(200, list);
  }
  id = safeId(id); if (!id) return json(400);
  const file = path.join(DATA, id + '.json');
  if (req.method === 'GET') { if (!fs.existsSync(file)) return json(404); return json(200, JSON.parse(fs.readFileSync(file, 'utf8')).body); }
  if (req.method === 'PUT') { let b = ''; for await (const c of req) b += c; const d = JSON.parse(b); fs.writeFileSync(file, JSON.stringify({ meta: d.meta, body: d.body })); return json(204); }
  if (req.method === 'DELETE') { if (fs.existsSync(file)) fs.unlinkSync(file); return json(204); }
  return json(405);
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (AUTH && await AUTH.gate(req, res, url)) return;
    if (url.pathname === '/api/health') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify({ ok: true, backend: 'agent-sdk', auth: !!AUTH, user: AUTH ? AUTH.user(req) : null })); return; }
    if (url.pathname === '/api/ask' && req.method === 'POST') return await ask(req, res);
    const m = url.pathname.match(/^\/api\/chats(?:\/([^/]+))?$/);
    if (m) return await chats(req, res, m[1]);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      if (!fs.existsSync(PAGE)) { res.writeHead(503, { 'content-type': 'text/plain' }); res.end('Build the page first: python3 build/build.py'); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); fs.createReadStream(PAGE).pipe(res); return;
    }
    res.writeHead(404).end();
  } catch (e) { try { res.writeHead(500).end(String(e && e.message)); } catch {} }
}).listen(PORT, '127.0.0.1', () => console.log(`Lecture Notes: http://localhost:${PORT}` + (AUTH ? ' (sign-in on)' : '')));
