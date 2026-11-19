
/* ---------- Ask Claude: a side panel that sees the selection and its context ---------- */
const ASK = { sample: undefined, turns: [], msgs: [], chatId: null, chatCreated: 0, ctx: null, ctl: null, busy: false, model: 'claude-opus-5-5', effort: 'medium' };
let askSampleP = null;
function askSample() {
  if (!askSampleP) askSampleP = (window.claude && typeof window.claude.use === 'function') ? window.claude.use('sample').catch(() => null) : Promise.resolve(null);
  return askSampleP;
}

/* Text of a node (optionally clipped to a range), with rendered maths turned back into TeX. */
const ASK_BLOCK = /^(P|DIV|LI|UL|OL|H1|H2|H3|H4|TR|TABLE|FIGURE|FIGCAPTION|ASIDE|DETAILS|SUMMARY|SECTION|BLOCKQUOTE)$/;
function askTex(root, range) {
  let out = '';
  (function walk(n) {
    if (range && !range.intersectsNode(n)) return;
    if (n.nodeType === 3) {
      let t = n.nodeValue;
      if (range) t = t.slice(n === range.startContainer ? range.startOffset : 0, n === range.endContainer ? range.endOffset : t.length);
      out += t; return;
    }
    if (n.nodeType !== 1) return;
    const el = n;
    if (el.matches('mjx-container')) {
      if (askEdgeTex && askEdgeTex.has(el)) { const pt = askEdgeTex.get(el); out += el.dataset.disp ? '\n$$' + pt + '$$\n' : '$' + pt + '$'; return; }
      const tex = el.dataset.tex;
      if (tex != null) out += el.dataset.disp ? '\n$$' + tex.trim() + '$$\n' : '$' + tex.trim() + '$';
      return;
    }
    if (el.matches('script, style, button, input, select, textarea, .for-llms, .role-l, .sec-meta, .pg, .ask-ui, mjx-assistive-mml')) return;
    if (el.matches('svg')) { out += ' [figure] '; return; }
    const blk = ASK_BLOCK.test(el.tagName);
    if (blk) out += '\n';
    el.childNodes.forEach(walk);
    if (blk) out += '\n';
  })(root);
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}
const askClip = (s, n, fromEnd) => s.length <= n ? s : fromEnd ? '…' + s.slice(s.length - n) : s.slice(0, n) + '…';
const ASK_UNIT = '.thm, .proof, .algo, figure, aside.bg, details.pause, .sq, .role, .disp, table, li, p';

/* The block the reader is looking at: the selection's block, else what sits mid-screen. */
function askAnchor(range) {
  let n = null;
  if (range) n = range.commonAncestorContainer;
  else {
    const v = currentView && document.getElementById(currentView); if (!v) return null;
    const panelW = document.body.classList.contains('ask-open') && innerWidth > 900 ? ASKP.offsetWidth : 0;
    for (const f of [.42, .3, .55, .2, .7]) {
      n = document.elementFromPoint((innerWidth - panelW) / 2, innerHeight * f);
      if (n && v.contains(n) && n.closest('.sec-block, .ch-head, .sq')) break;
      n = null;
    }
  }
  if (!n) return null;
  return n.nodeType === 1 ? n : n.parentElement;
}
function askUnitOf(el) {
  const big = el.closest('.thm, .proof, .algo, figure, aside.bg, details.pause, .sq');
  return big || el.closest('.role, .disp, table, ul, ol, p') || el;
}
function askContext(range) {
  const v = currentView && document.getElementById(currentView);
  if (!v || v.classList.contains('hub')) return null;
  const anchor = askAnchor(range); if (!anchor || !v.contains(anchor)) return { view: v, where: askWhere(v, null), sel: range ? askTex(range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement, range) : '', unit: '', before: '', after: '', label: v.dataset.short + ' · ' + v.dataset.title };
  const unit = askUnitOf(anchor);
  let unitText = askTex(unit);
  /* a proof needs its statement, and a statement its proof */
  if (unit.matches('.proof')) { const s = unit.previousElementSibling; if (s && s.matches('.thm')) unitText = askClip(askTex(s), 3000) + '\n\n' + unitText; }
  else if (unit.matches('.thm')) { const p = unit.nextElementSibling; if (p && p.matches('.proof')) unitText += '\n\n' + askClip(askTex(p), 4000); }
  /* neighbouring blocks inside the same section */
  let top = unit; while (top.parentElement && !top.parentElement.matches('.sec-block, .view') ) top = top.parentElement;
  const sib = (el, dir, budget) => { let s = '', k = el; while (s.length < budget && (k = dir < 0 ? k.previousElementSibling : k.nextElementSibling)) { if (k.matches('h2, .sec-meta, .for-llms')) continue; const t = askTex(k); s = dir < 0 ? t + '\n\n' + s : s + '\n\n' + t; } return s.trim(); };
  const before = askClip(sib(top, -1, 2500), 2500, true), after = askClip(sib(top, 1, 1500), 1500);
  const sel = range ? askTex(range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement, range) : '';
  const lab = unit.dataset && unit.dataset.label ? unit.dataset.label : unit.matches('.proof') ? 'a proof' : unit.matches('figure') ? (unit.querySelector('.figtag') || {}).textContent || 'a figure' : unit.matches('.sq') ? 'Question ' + ((unit.querySelector('.sq-n') || {}).textContent || '') : '';
  return { view: v, where: askWhere(v, top), sel, unit: askClip(unitText, 7000), before, after, label: (lab ? lab + ' · ' : '') + v.dataset.short, el: unit };
}
function askWhere(v, top) {
  const course = COURSE_NAME[v.dataset.course] || '';
  const h = top && top.closest('.sec-block') ? top.closest('.sec-block').querySelector('h2') : null;
  const sec = h ? plainHeading(h) : '';
  return course + ', ' + (v.classList.contains('sheet') ? 'Problem ' + v.dataset.title : 'Chapter ' + (v.dataset.short || '').split(' ').pop() + ': ' + v.dataset.title) + (sec ? ', section “' + sec + '”' : '');
}

/* ---------- the panel ---------- */
const ASKP = document.createElement('aside');
ASKP.className = 'ask-panel ask-ui'; ASKP.hidden = true; ASKP.setAttribute('aria-label', 'Ask Claude');
ASKP.innerHTML = '<div class="ask-head"><span class="ask-title">Ask Claude</span><button type="button" class="ask-histb" title="Earlier conversations" aria-pressed="false">history</button><button type="button" class="ask-new" title="Start a new conversation">new chat</button><button type="button" class="ask-x" aria-label="Close">×</button></div>' +
  '<div class="ask-log" aria-live="polite"><p class="ask-hint">Highlight anything on the page and press <b>Ask</b>, or just type. Inside a formula, click a symbol or drag across symbols to pick part of it; click the pick again to widen it. Claude sees the passage you are reading, the section around it, and your highlight.</p></div>' +
  '<div class="ask-hist" hidden><div class="ask-hist-top"><input type="search" class="ask-hist-q" placeholder="Search earlier chats…" aria-label="Search earlier chats"></div><div class="ask-hist-list" role="list"></div></div>' +
  '<div class="ask-ctx" hidden><div class="ask-ctx-l"></div><button type="button" class="ask-ctx-x" title="Don’t attach this">×</button></div>' +
  '<form class="ask-form"><textarea rows="3" placeholder="Ask about this…" aria-label="Your question"></textarea><div class="ask-row"><select class="ask-model" aria-label="Model" title="Model"><option value="claude-opus-5-5">Opus 5.5</option><option value="claude-sonnet-5-5">Sonnet 5.5</option><option value="claude-haiku-5-5">Haiku 5.5</option><option value="claude-fable-5-1">Fable 5.1</option></select><select class="ask-effort" aria-label="Effort" title="Effort: how long Claude thinks before answering"><option value="low">low effort</option><option value="medium">medium effort</option><option value="high">high effort</option></select><span class="ask-sp"></span><button type="button" class="ask-stop" hidden>stop</button><button type="submit" class="ask-send">ask</button></div></form>';
document.body.appendChild(ASKP);
const askLog = $('.ask-log', ASKP), askTa = $('textarea', ASKP), askCtxBox = $('.ask-ctx', ASKP);
const askChip = document.createElement('button');
askChip.type = 'button'; askChip.className = 'ask-chip ask-ui'; askChip.textContent = 'Ask Claude'; askChip.hidden = true; document.body.appendChild(askChip);
const askBtn = document.createElement('button');
askBtn.type = 'button'; askBtn.className = 'tool-btn'; askBtn.id = 'ask-btn'; askBtn.textContent = 'ask'; askBtn.title = 'Ask Claude about what you are reading (select text first to ask about it)';
const toolsEl = $('.topbar .tools'); if (toolsEl) toolsEl.insertBefore(askBtn, toolsEl.firstChild);

function askShowCtx() {
  const c = ASK.ctx;
  askCtxBox.hidden = !c;
  if (!c) return;
  $('.ask-ctx-l', ASKP).innerHTML = '';
  const a = document.createElement('div'); a.className = 'ask-ctx-where'; a.textContent = (c.sel ? 'Highlight in ' : 'Looking at ') + c.label;
  $('.ask-ctx-l', ASKP).appendChild(a);
  if (c.pick) { const q = document.createElement('div'); q.className = 'ask-ctx-sel'; q.textContent = '\\(' + c.pick + '\\)'; $('.ask-ctx-l', ASKP).appendChild(q); typeset([q]); }
  else if (c.sel) { const q = document.createElement('div'); q.className = 'ask-ctx-sel'; q.textContent = '“' + askClip(c.sel.replace(/\s+/g, ' '), 160) + '”'; $('.ask-ctx-l', ASKP).appendChild(q); }
}
/* keep the reader's place when the page column changes width */
function askReadAnchor(range) {
  if (range) { const n = range.startContainer; const el = n.nodeType === 1 ? n : n.parentElement; if (el) return el; }
  const v = currentView && document.getElementById(currentView); if (!v) return null;
  const tb = $('.topbar'), y0 = (tb ? tb.getBoundingClientRect().bottom : 0) + 30;
  /* the first content block whose bottom is below the reading line; descend one level into tall blocks */
  const pick = list => { for (const el of list) { const r = el.getBoundingClientRect(); if (r.height && r.bottom > y0) return el; } return null; };
  let el = pick($$('.ch-head, .sec-block > *, .view.sheet .sq', v).filter(x => !x.closest('.toc-side, .minimap, .cmap')));
  for (let d = 0; d < 8 && el && el.getBoundingClientRect().top < y0 - 60 && el.children.length; d++) { const inner = pick(Array.from(el.children).filter(x => getComputedStyle(x).position !== 'absolute')); if (!inner) break; el = inner; }
  return el;
}
function askKeepPlace(range, change) {
  const a = askReadAnchor(range), top = a ? a.getBoundingClientRect().top : 0;
  change();
  if (!a) return;
  const fix = () => { const d = a.getBoundingClientRect().top - top; if (Math.abs(d) > 1) window.scrollBy(0, d); };
  fix();
  const v = currentView && document.getElementById(currentView);
  requestAnimationFrame(() => { if (v) fixWide([v]); fix(); });
}
function askOpen(range, t) {
  ASK.ctx = askContext(range || null);
  if (ASK.ctx && t && t.sel) { ASK.ctx.sel = t.sel; ASK.ctx.pick = t.pick; }
  if (ASKP.hidden) askKeepPlace(range, () => { ASKP.hidden = false; document.body.classList.add('ask-open'); });
  askBtn.setAttribute('aria-pressed', 'true');
  askShowCtx();
  askChip.hidden = true;
  setTimeout(() => askTa.focus({ preventScroll: true }), 30);
  askSample();
}
function askClose() {
  askKeepPlace(null, () => { ASKP.hidden = true; document.body.classList.remove('ask-open'); });
  askBtn.setAttribute('aria-pressed', 'false');
}
/* resizing: every right-hand panel (Ask Claude, "beside the text", notes) has a grip on its left edge;
   the width is remembered in this browser, and the reading position is held while it changes */
function panelGrip(panel, o) {
  const setW = (w, keep) => {
    const max = Math.max(o.min + 20, Math.round(innerWidth * .7));
    w = Math.max(o.min, Math.min(max, Math.round(w)));
    const apply = () => { document.documentElement.style.setProperty(o.cssVar, w + 'px'); if (typeof placeNotes === 'function') placeNotes(); };
    if (keep && !panel.hidden) askKeepPlace(null, apply); else apply();
    return w;
  };
  try { const w = +localStorage.getItem(o.key); if (w) setW(w); } catch (_) {}
  const grip = document.createElement('div');
  grip.className = 'ask-grip'; grip.setAttribute('role', 'separator'); grip.setAttribute('aria-orientation', 'vertical'); grip.setAttribute('aria-label', 'Resize panel'); grip.tabIndex = 0;
  grip.title = 'Drag to resize · double-click to reset';
  panel.appendChild(grip);
  let drag = null;
  const settle = (a, top) => {
    placeCmap();
    const v = currentView && document.getElementById(currentView);
    requestAnimationFrame(() => { if (v && typeof fixWide === 'function') fixWide([v]); if (a) { const d = a.getBoundingClientRect().top - top; if (Math.abs(d) > 1) window.scrollBy(0, d); } });
  };
  grip.addEventListener('pointerdown', e => {
    if (innerWidth <= 900) return;
    e.preventDefault(); grip.setPointerCapture(e.pointerId);
    drag = { anchor: askReadAnchor(null) }; drag.top = drag.anchor ? drag.anchor.getBoundingClientRect().top : 0;
    document.body.classList.add('ask-resizing');
  });
  grip.addEventListener('pointermove', e => {
    if (!drag) return;
    setW(innerWidth - e.clientX, false);
    if (drag.anchor) { const d = drag.anchor.getBoundingClientRect().top - drag.top; if (Math.abs(d) > 1) window.scrollBy(0, d); }
  });
  const end = () => {
    if (!drag) return;
    const a = drag.anchor, top = drag.top; drag = null;
    document.body.classList.remove('ask-resizing');
    try { localStorage.setItem(o.key, String(panel.offsetWidth)); } catch (_) {}
    settle(a, top);
  };
  grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  grip.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const w = setW(panel.offsetWidth + (e.key === 'ArrowLeft' ? 40 : -40), true);
    try { localStorage.setItem(o.key, String(w)); } catch (_) {}
    settle(null, 0);
  });
  grip.addEventListener('dblclick', () => { setW(o.def, true); try { localStorage.removeItem(o.key); } catch (_) {} settle(null, 0); });
  return setW;
}
panelGrip(ASKP, { cssVar: '--askw', key: 'partb-ask-width', def: 420, min: 300 });
document.querySelectorAll('.side-panel, .notes-drawer').forEach(p => panelGrip(p, { cssVar: '--sidew', key: 'partb-side-width', def: 480, min: 300 }));
askBtn.addEventListener('click', () => {
  const t = askTarget();
  if (!ASKP.hidden && !t) { askClose(); return; }
  askOpen(t && t.range, t);
});
$('.ask-x', ASKP).addEventListener('click', askClose);
$('.ask-ctx-x', ASKP).addEventListener('click', () => { ASK.ctx = null; askShowCtx(); });
$('.ask-new', ASKP).addEventListener('click', () => {
  if (ASK.ctl) ASK.ctl.abort();
  histShow(false); askNewChat(); ASK.ctx = askContext(null); askShowCtx(); askTa.focus();
});
function askNewChat() { ASK.turns = []; ASK.msgs = []; ASK.chatId = null; ASK.chatCreated = 0; askLog.innerHTML = ''; }

/* ---------- chat history ----------
   Each conversation is saved after every answer: in this artifact's database, in this viewer's private space
   (data/users/<id>/…, which nobody else can read), or in this browser's storage when the database isn't available.
   Two documents per chat: a small one for the list, and one with the messages. */
const HIST = { db: null, uid: null, ready: null, chain: Promise.resolve(), cache: null };
const HIST_LS = 'partb-ask-chats';
function histInit() {
  if (!HIST.ready) HIST.ready = (async () => {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      const [db, u] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      const uid = u ? await u.id() : null;
      if (db && uid) { HIST.db = db; HIST.uid = uid; }
    } catch (_) {}
  })();
  return HIST.ready;
}
const histRoot = () => HIST.db.doc('data/users/' + HIST.uid + '/ask');
function lsRead() { try { return JSON.parse(localStorage.getItem(HIST_LS) || '{}') || {}; } catch (_) { return {}; } }
function lsWrite(o) {
  const ids = Object.keys(o).sort((a, b) => (o[b].meta.updated || 0) - (o[a].meta.updated || 0));
  ids.slice(40).forEach(i => delete o[i]);
  try { localStorage.setItem(HIST_LS, JSON.stringify(o)); } catch (_) {}
}
async function histList() {
  await histInit();
  if (HIST.db) {
    try { const snap = await histRoot().collection('chats').orderBy('updated', 'desc').limit(200).get(); return snap.docs.map(d => Object.assign({ id: d.id }, d.data())); }
    catch (_) {}
  }
  const o = lsRead(); return Object.keys(o).map(id => Object.assign({ id }, o[id].meta)).sort((a, b) => b.updated - a.updated);
}
async function histGet(id) {
  await histInit();
  if (HIST.db) { try { const d = await histRoot().collection('bodies').doc(id).get(); if (d.exists) return d.data(); } catch (_) {} }
  const o = lsRead(); return o[id] ? o[id].body : null;
}
/* a stored chat must stay under the 256 KB document limit: older questions keep only the question, not the attached passage */
function histBody() {
  const body = { msgs: ASK.msgs.slice(), turns: ASK.turns.slice() };
  let n = 0;
  while (JSON.stringify(body).length > 200000 && n < body.turns.length - 2) {
    const t = body.turns[n];
    if (t.role === 'user' && t.content.length > 600) body.turns[n] = { role: 'user', content: '(context omitted)\nHIS QUESTION:\n' + (t.content.split('HIS QUESTION:\n').pop() || '') };
    n++;
  }
  return body;
}
function histSave() {
  if (!ASK.msgs.length) return;
  if (!ASK.chatId) { ASK.chatId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7); ASK.chatCreated = Date.now(); }
  const first = ASK.msgs.find(m => m.role === 'user');
  const meta = { title: askClip((first && first.q || 'Chat').replace(/\s+/g, ' '), 90), where: (first && first.tag) || '', view: currentView || '', created: ASK.chatCreated, updated: Date.now(), n: ASK.msgs.length };
  const id = ASK.chatId, body = histBody();
  HIST.cache = null;
  HIST.chain = HIST.chain.then(async () => {
    await histInit();
    if (HIST.db) {
      try { await histRoot().collection('bodies').doc(id).set(body); await histRoot().collection('chats').doc(id).set(meta); return; }
      catch (e) { if (e && e.code === 'quota_exceeded') askNote('History is full: delete some old chats to keep saving new ones.', 'err'); }
    }
    const o = lsRead(); o[id] = { meta, body }; lsWrite(o);
  }).catch(() => {});
}
function histDelete(id) {
  HIST.cache = null;
  HIST.chain = HIST.chain.then(async () => {
    await histInit();
    if (HIST.db) { try { await histRoot().collection('chats').doc(id).delete(); await histRoot().collection('bodies').doc(id).delete(); } catch (_) {} }
    const o = lsRead(); if (o[id]) { delete o[id]; lsWrite(o); }
  });
  return HIST.chain;
}
const histPanel = $('.ask-hist', ASKP), histListEl = $('.ask-hist-list', ASKP), histQ = $('.ask-hist-q', ASKP), histBtn = $('.ask-histb', ASKP);
function histAgo(t) {
  const d = (Date.now() - t) / 1000;
  if (d < 60) return 'just now'; if (d < 3600) return Math.round(d / 60) + ' min ago'; if (d < 86400) return Math.round(d / 3600) + ' h ago';
  if (d < 86400 * 7) return Math.round(d / 86400) + ' d ago';
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}
function histRenderList() {
  const q = histQ.value.trim().toLowerCase(), list = (HIST.cache || []).filter(c => !q || (c.title + ' ' + c.where).toLowerCase().includes(q));
  histListEl.innerHTML = '';
  if (!HIST.cache) { histListEl.innerHTML = '<p class="ask-note">Loading…</p>'; return; }
  if (!list.length) { histListEl.innerHTML = '<p class="ask-note">' + (HIST.cache.length ? 'No chats match.' : 'No earlier chats yet. Each conversation is saved here after Claude answers.') + '</p>'; return; }
  list.forEach(c => {
    const row = document.createElement('div'); row.className = 'ask-hrow' + (c.id === ASK.chatId ? ' cur' : ''); row.setAttribute('role', 'listitem');
    const open = document.createElement('button'); open.type = 'button'; open.className = 'ask-hopen';
    const t = document.createElement('span'); t.className = 'ask-ht'; t.textContent = c.title;
    const m = document.createElement('span'); m.className = 'ask-hm'; m.textContent = [c.where, histAgo(c.updated), Math.ceil((c.n || 0) / 2) + ' question' + (Math.ceil((c.n || 0) / 2) === 1 ? '' : 's')].filter(Boolean).join(' · ');
    open.append(t, m); open.addEventListener('click', () => histOpen(c.id));
    const del = document.createElement('button'); del.type = 'button'; del.className = 'ask-hdel'; del.textContent = '×'; del.title = 'Delete this chat'; del.setAttribute('aria-label', 'Delete chat: ' + c.title);
    del.addEventListener('click', () => {
      if (!del.classList.contains('sure')) { del.classList.add('sure'); del.textContent = 'delete?'; setTimeout(() => { del.classList.remove('sure'); del.textContent = '×'; }, 3000); return; }
      HIST.cache = (HIST.cache || []).filter(x => x.id !== c.id); histRenderList(); histDelete(c.id);
      if (ASK.chatId === c.id) ASK.chatId = null;
    });
    row.append(open, del); histListEl.appendChild(row);
  });
}
async function histShow(on) {
  histPanel.hidden = !on; askLog.hidden = on; $('.ask-form', ASKP).hidden = on; if (on) askCtxBox.hidden = true; else askShowCtx();
  histBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); histBtn.textContent = on ? 'back' : 'history';
  if (!on) return;
  histQ.value = ''; histRenderList();
  await HIST.chain;
  HIST.cache = await histList(); histRenderList();
  histQ.focus({ preventScroll: true });
}
async function histOpen(id) {
  if (ASK.busy && ASK.ctl) ASK.ctl.abort();
  const body = await histGet(id);
  if (!body) { askNote('That chat couldn’t be loaded.', 'err'); return; }
  askNewChat();
  const meta = (HIST.cache || []).find(c => c.id === id) || {};
  ASK.chatId = id; ASK.chatCreated = meta.created || Date.now();
  ASK.msgs = (body.msgs || []).slice(); ASK.turns = (body.turns || []).slice();
  const outs = [];
  ASK.msgs.forEach(m => {
    if (m.role === 'user') { const ub = askBubble('user', m.q); if (m.tag) { const t = document.createElement('span'); t.className = 'ask-tag'; t.textContent = m.tag; ub.prepend(t); } }
    else { const b = askBubble('assistant', ''); b.innerHTML = askMd(m.text || ''); outs.push(b); }
  });
  if (outs.length) typeset(outs);
  ASK.ctx = askContext(null);
  histShow(false);
  askLog.scrollTop = askLog.scrollHeight;
}
histBtn.addEventListener('click', () => histShow(histPanel.hidden));
/* scrolling inside the panel never scrolls the page: the wheel moves the nearest scrollable box under the pointer,
   and stops at its ends instead of passing on to the page (also when the box has nothing to scroll) */
ASKP.addEventListener('wheel', e => {
  let el = e.target.nodeType === 1 ? e.target : e.target.parentElement;
  for (; el && el !== ASKP; el = el.parentElement) {
    const cs = getComputedStyle(el), dy = e.deltaY;
    if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
      const atTop = el.scrollTop <= 0, atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((dy < 0 && atTop) || (dy > 0 && atEnd)) e.preventDefault();
      return;
    }
  }
  e.preventDefault();
}, { passive: false });
histQ.addEventListener('input', histRenderList);
histQ.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); histShow(false); } });
/* model and effort: Opus 5.5 at medium effort unless changed; the choice is remembered in this browser */
const ASK_TIER = { 'claude-opus-5-5': 'complex', 'claude-fable-5-1': 'complex', 'claude-sonnet-5-5': 'default', 'claude-haiku-5-5': 'quick' };
const ASK_MNAME = { 'claude-opus-5-5': 'Opus 5.5', 'claude-sonnet-5-5': 'Sonnet 5.5', 'claude-haiku-5-5': 'Haiku 5.5', 'claude-fable-5-1': 'Fable 5.1' };
ASK.model = 'claude-opus-5-5'; ASK.effort = 'medium';
try { const m = localStorage.getItem('partb-ask-model'), e = localStorage.getItem('partb-ask-effort'); if (m && ASK_TIER[m]) ASK.model = m; if (/^(low|medium|high)$/.test(e || '')) ASK.effort = e; } catch (_) {}
$('.ask-model', ASKP).value = ASK.model; $('.ask-effort', ASKP).value = ASK.effort;
$('.ask-model', ASKP).addEventListener('change', e => { ASK.model = e.target.value; try { localStorage.setItem('partb-ask-model', ASK.model); } catch (_) {} });
$('.ask-effort', ASKP).addEventListener('change', e => { ASK.effort = e.target.value; try { localStorage.setItem('partb-ask-effort', ASK.effort); } catch (_) {} });
$('.ask-stop', ASKP).addEventListener('click', () => ASK.ctl && ASK.ctl.abort());
askTa.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('.ask-form', ASKP).requestSubmit(); } if (e.key === 'Escape') askClose(); });
$('.ask-form', ASKP).addEventListener('submit', e => { e.preventDefault(); askSend(); });

/* the floating chip next to a selection */
function askSelRange() {
  const s = window.getSelection(); if (!s || s.isCollapsed || !s.rangeCount) return null;
  const r = s.getRangeAt(0), v = currentView && document.getElementById(currentView);
  if (!v || !v.contains(r.commonAncestorContainer) || ASKP.contains(r.commonAncestorContainer)) return null;
  if (!s.toString().trim() && !(r.cloneContents().querySelector && r.cloneContents().querySelector('mjx-container'))) return null;
  return r;
}
/* the browser can't paint a selection over rendered maths, so formulas inside the selection get a tint */
let askInSel = [];
function askMarkSel() {
  askInSel.forEach(x => x.classList.remove('mjx-insel')); askInSel = [];
  const s = window.getSelection(); if (!s || s.isCollapsed || !s.rangeCount) { if (!mDrag) { EDGE.start = EDGE.end = null; } edgeDraw(); return; }
  const r = s.getRangeAt(0), root = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
  if (!root || root.closest('.ask-panel')) return;
  const own = root.closest('mjx-container'); const list = own ? [own] : Array.from(root.querySelectorAll('mjx-container'));
  list.forEach(m => { if (r.intersectsNode(m) && !edgeOf(m)) { m.classList.add('mjx-insel'); askInSel.push(m); } });
  edgeDraw();
}
document.addEventListener('selectionchange', () => requestAnimationFrame(askMarkSel));
let askSelT = null;
document.addEventListener('selectionchange', () => {
  clearTimeout(askSelT);
  askSelT = setTimeout(() => {
    const r = askSelRange();
    if (r && MSEL) mselClear();
    if (!r) { if (!MSEL) askChip.hidden = true; return; }
    const rects = r.getClientRects(), last = rects[rects.length - 1] || r.getBoundingClientRect();
    askChip.hidden = false;
    const w = askChip.offsetWidth || 90;
    askChip.style.left = Math.max(8, Math.min(innerWidth - w - 8, last.right - w / 2)) + 'px';
    askChip.style.top = Math.min(innerHeight - 44, last.bottom + 8) + 'px';
  }, 180);
});
askChip.addEventListener('mousedown', e => e.preventDefault());
askChip.addEventListener('click', () => {
  const t = askTarget(), r = t && t.range;
  if (!ASKP.hidden && ASK.turns.length && r) { ASK.ctx = askContext(r); if (ASK.ctx && t.sel) { ASK.ctx.sel = t.sel; ASK.ctx.pick = t.pick; } askShowCtx(); askChip.hidden = true; askTa.focus(); return; }
  askOpen(r, t);
});
window.addEventListener('scroll', () => { if (MSEL) mselChip(); else if (!askChip.hidden) askChip.hidden = true; }, { passive: true });

/* ---------- picking part of a formula ----------
   Rendered maths is a picture, so the browser cannot select inside it. Instead: click a symbol to pick it,
   drag across symbols to pick everything between them, click the pick again (or press Alt+↑) to widen it
   to the enclosing piece. The pick is sent to Claude as LaTeX, together with the whole formula. */
let MSEL = null;  /* { box: mjx-container, nodes: [g…] } */
/* highlight boxes live inside the formula they mark, so they move with it when the text reflows (a panel opening, a resize) */
function mHi(box, r, cls) {
  const b = box.getClientRects()[0] || box.getBoundingClientRect();
  const d = document.createElement('span'); d.className = 'msel-hi ask-ui ' + cls;
  Object.assign(d.style, { left: (r.left - b.left - 2) + 'px', top: (r.top - b.top - 2) + 'px', width: (r.width + 4) + 'px', height: (r.height + 4) + 'px' });
  box.appendChild(d);
}
const mHiClear = cls => document.querySelectorAll('.msel-hi.' + cls).forEach(x => x.remove());
const MNODE = 'g[data-mml-node]';
const M_SKIP = /^(math|mrow|TeXAtom|mstyle|mpadded|semantics|mtd|inferred)$/;
const mKind = g => g.getAttribute('data-mml-node');
function mLeafChars(g) {
  let t = '';
  g.querySelectorAll('use[data-c], path[data-c], text').forEach(u => {
    if (u.closest(MNODE) !== g && !['mi', 'mo', 'mn', 'mtext', 'ms'].includes(mKind(g))) return;
    if (u.tagName === 'text') { t += u.textContent.normalize('NFKC'); return; }
    const cp = parseInt(u.getAttribute('data-c'), 16), raw = String.fromCodePoint(cp), ch = raw.normalize('NFKC');
    if (/^[A-Za-z]$/.test(ch) && raw !== ch) {
      const st = /[ℂℍℕℙℚℝℤ]/.test(raw) || (cp >= 0x1D538 && cp <= 0x1D56B) ? 'mathbb' : /[ℬℰℱℋℐℒℳℛ]/.test(raw) || (cp >= 0x1D49C && cp <= 0x1D4CF) ? 'mathcal' : (cp >= 0x1D400 && cp <= 0x1D433) ? 'mathbf' : '';
      if (st) { t += '\\' + st + '{' + ch + '}'; return; }
    }
    /* the font tells \mathcal F from F: hrefs look like #MJX-TEX-C-46 */
    const fv = ((u.getAttribute('href') || u.getAttribute('xlink:href') || '').match(/-TEX-([A-Z]+)-[0-9A-F]+$/) || [])[1];
    const cmd = /^[A-Za-z]$/.test(ch) && { C: 'mathcal', SC: 'mathcal', A: 'mathbb', FR: 'mathfrak', BFR: 'mathfrak', B: 'mathbf', SS: 'mathsf', T: 'mathtt' }[fv];
    t += cmd ? '\\' + cmd + '{' + ch + '}' : ch;
  });
  return t.replace(/\u2061/g, '');
}
const M_TEX = { '∞': '\\infty', '≤': '\\le', '≥': '\\ge', '≠': '\\ne', '∈': '\\in', '∉': '\\notin', '⊆': '\\subseteq', '⊂': '\\subset', '∪': '\\cup', '∩': '\\cap', '⋃': '\\bigcup', '⋂': '\\bigcap',
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '→': '\\to', '⇒': '\\Rightarrow', '⟹': '\\implies', '⟺': '\\iff', '↦': '\\mapsto', '×': '\\times', '·': '\\cdot', '⋅': '\\cdot', '∘': '\\circ', '∖': '\\setminus',
  '∀': '\\forall', '∃': '\\exists', '¬': '\\neg', '∧': '\\wedge', '∨': '\\vee', '∅': '\\emptyset', '∂': '\\partial', '∇': '\\nabla', '±': '\\pm', '≈': '\\approx', '≡': '\\equiv', '∼': '\\sim', '∣': '\\mid', '‖': '\\|', '…': '\\dots', '⋯': '\\cdots',
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\epsilon', 'ϵ': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta', 'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau', 'φ': '\\phi', 'ϕ': '\\phi', 'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda', 'Σ': '\\Sigma', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega' };
const mTexChars = t => Array.from(t).map(c => M_TEX[c] ? M_TEX[c] + ' ' : c).join('').replace(/ +/g, ' ').trim();
const mKids = g => Array.from(g.children).filter(c => c.matches(MNODE));
function mLin(g) {
  const k = mKind(g), K = mKids(g), L = x => x ? mLin(x) : '', B = x => { const t = L(x).trim(); return t.length === 1 ? t : '{' + t + '}'; };
  if (['mi', 'mo', 'mn', 'ms'].includes(k)) {
    const c = mLeafChars(g), w = c.replace(/\s+/g, '');
    if (k !== 'mn' && /^[A-Za-z]{2,}$/.test(w)) return /^(lim|limsup|liminf|sup|inf|max|min|log|ln|exp|sin|cos|tan|det|dim|ker|deg|gcd|arg|Pr)$/.test(w) ? '\\' + w + ' ' : '\\operatorname{' + w + '}';
    return mTexChars(c);
  }
  if (k === 'mtext') return '\\text{' + mLeafChars(g) + '}';
  if (k === 'mspace') return ' ';
  if (k === 'mphantom') return '';
  if (k === 'msub' || k === 'munder') return L(K[0]) + '_' + B(K[1]);
  if (k === 'msup' || k === 'mover') return L(K[0]) + '^' + B(K[1]);
  if (k === 'msubsup' || k === 'munderover') return L(K[0]) + '_' + B(K[1]) + '^' + B(K[2]);
  if (k === 'mfrac') return '\\frac' + B(K[0]) + B(K[1]);
  if (k === 'msqrt') return '\\sqrt{' + K.map(mLin).join(' ') + '}';
  if (k === 'mroot') return '\\sqrt[' + L(K[1]) + ']{' + L(K[0]) + '}';
  if (k === 'mtable') return K.map(mLin).join(' \\\\ ');
  if (k === 'mtr' || k === 'mlabeledtr') return K.map(mLin).join(' & ');
  return K.map(mLin).join(' ').replace(/ +/g, ' ');
}
function mselTex() {
  if (!MSEL) return '';
  const n = MSEL.nodes, k = n.length === 1 ? mKind(n[0]) : '';
  const sep = n.length > 1 && mKind(n[0].parentElement.closest(MNODE)) === 'mtr' ? ' & ' : ' ';
  return n.map(mLin).join(sep).replace(/ +/g, ' ').trim();
}
function mselText() {
  const t = mselTex(), full = (MSEL.box.dataset.tex || '').trim();
  return 'the part ' + '$' + t + '$' + (full ? ' of the formula $' + full + '$' : '') + ' (this is the part he picked out of the rendered formula; written back as LaTeX, so the notation may differ slightly from the source)';
}
function mselRect() {
  let L = 1e9, T = 1e9, R = -1e9, Bm = -1e9;
  MSEL.nodes.forEach(g => { const r = g.getBoundingClientRect(); if (!r.width && !r.height) return; L = Math.min(L, r.left); T = Math.min(T, r.top); R = Math.max(R, r.right); Bm = Math.max(Bm, r.bottom); });
  if (R < L) { const r = MSEL.box.getBoundingClientRect(); return r; }
  return { left: L, top: T, right: R, bottom: Bm, width: R - L, height: Bm - T };
}
function mselDraw() {
  if (!MSEL || !document.contains(MSEL.box)) { mselClear(); return; }
  mHiClear('msel-main'); mHi(MSEL.box, mselRect(), 'msel-main'); mselChip();
}
function mselChip() {
  if (!MSEL) return;
  const r = mselRect();
  if (r.bottom < 0 || r.top > innerHeight) { askChip.hidden = true; return; }
  askChip.hidden = false;
  const w = askChip.offsetWidth || 90;
  askChip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w / 2)) + 'px';
  askChip.style.top = Math.min(innerHeight - 44, r.bottom + 8) + 'px';
}
function mselClear() { MSEL = null; mHiClear('msel-main'); }
function mselSet(box, nodes) { MSEL = { box, nodes }; mselDraw(); }
/* the leaf under a point, if it lies in this formula */
function mLeafAt(x, y, box) {
  /* hit-test by geometry: the browser reports the whole <svg> as the target */
  let best = null, bd = 1e9;
  box.querySelectorAll('g[data-mml-node="mi"], g[data-mml-node="mo"], g[data-mml-node="mn"], g[data-mml-node="mtext"], g[data-mml-node="ms"]').forEach(g => {
    const r = g.getBoundingClientRect(); if (!r.width) return;
    const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0, dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    const d = Math.hypot(dx, dy * 1.5) + (dx || dy ? 0 : -1 / (1 + r.width * r.height));
    if (d < bd) { bd = d; best = g; }
  });
  return bd < 24 ? best : null;
}
function mPath(g, box) { const p = []; for (let x = g; x && box.contains(x); x = x.parentElement) if (x.matches && x.matches(MNODE)) p.unshift(x); return p; }
/* everything between two picked symbols: their nearest common piece, or a run of its children */
function mSpan(a, b, box) {
  if (a === b) return [a];
  const pa = mPath(a, box), pb = mPath(b, box);
  let i = 0; while (i < pa.length && i < pb.length && pa[i] === pb[i]) i++;
  const lca = pa[i - 1]; if (!lca) return [a];
  if (M_SKIP.test(mKind(lca)) || ['mtr', 'mtable'].includes(mKind(lca))) {
    const kids = mKids(lca), ia = kids.indexOf(pa[i]), ib = kids.indexOf(pb[i]);
    if (ia >= 0 && ib >= 0) return kids.slice(Math.min(ia, ib), Math.max(ia, ib) + 1);
  }
  return [lca];
}
/* widen: the smallest enclosing piece that is visibly bigger than the current pick */
function mWiden() {
  if (!MSEL) return;
  const r0 = mselRect(); let g = MSEL.nodes.length > 1 ? MSEL.nodes[0].parentElement.closest(MNODE) : MSEL.nodes[0].parentElement.closest(MNODE);
  while (g && MSEL.box.contains(g)) {
    const r = g.getBoundingClientRect();
    if (mKind(g) !== 'math' && (r.width > r0.width + 1 || r.height > r0.height + 1)) break;
    if (mKind(g) === 'math') break;
    g = g.parentElement.closest(MNODE);
  }
  if (g && MSEL.box.contains(g)) mselSet(MSEL.box, [g]);
}
const mBoxOf = t => {
  const box = t.closest && t.closest('mjx-container');
  if (!box || !box.dataset.tex || t.closest('a, button, summary, label, .ask-ui, .xcard, .toc-side')) return null;
  const v = currentView && document.getElementById(currentView);
  return v && v.contains(box) ? box : null;
};
let mDrag = null;
document.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const box = mBoxOf(e.target);
  if (!box) { if (MSEL && !e.target.closest('.ask-chip, .ask-panel, #ask-btn')) mselClear(); return; }
  const leaf = mLeafAt(e.clientX, e.clientY, box); if (!leaf) return;
  if (e.pointerType === 'touch') { mDrag = { box, a: leaf, x: e.clientX, y: e.clientY, touch: true, moved: false }; return; }
  e.preventDefault();
  const s = window.getSelection(); if (s) s.removeAllRanges();
  const again = MSEL && MSEL.box === box && MSEL.nodes.some(n => n === leaf || n.contains(leaf));
  mDrag = { box, a: leaf, x: e.clientX, y: e.clientY, again, moved: false };
}, true);
function mCaret(x, y) {
  if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(x, y); return c && { node: c.offsetNode, off: c.offset }; }
  if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r && { node: r.startContainer, off: r.startOffset }; }
  return null;
}
/* a drag that starts in a formula and leaves it becomes an ordinary text selection, with the whole formula in it */
function mToNative(e) {
  const box = mDrag.box, c = mCaret(e.clientX, e.clientY); if (!c || box.contains(c.node) || ASKP.contains(c.node)) return false;
  /* anchor on whichever side of the formula keeps it inside the selection */
  const par = box.parentNode, i = Array.prototype.indexOf.call(par.childNodes, box);
  const r = document.createRange(); r.selectNode(box);
  const after = r.comparePoint(c.node, c.off) >= 0;
  if (MSEL) mselClear();
  /* the formula the drag started in is only partly selected: from the start symbol onwards, or up to it */
  EDGE.start = { box, leaf: mDrag.a, part: after ? 'suffix' : 'prefix' };
  window.getSelection().setBaseAndExtent(par, after ? i : i + 1, c.node, c.off);
  mDrag.native = true; return true;
}
/* stop the browser starting its own selection from inside the picture (pointerdown's preventDefault doesn't always) */
document.addEventListener('mousedown', e => { if (e.button === 0 && mBoxOf(e.target)) e.preventDefault(); }, true);
document.addEventListener('pointermove', e => {
  if (!mDrag) return;
  if (Math.hypot(e.clientX - mDrag.x, e.clientY - mDrag.y) > 4) mDrag.moved = true;
  if (mDrag.touch || !mDrag.moved) return;
  if (mDrag.native) { mToNative(e); edgeTrack(e); return; }
  const r = mDrag.box.getBoundingClientRect(), out = e.clientX < r.left - 6 || e.clientX > r.right + 6 || e.clientY < r.top - 6 || e.clientY > r.bottom + 6;
  if (out && mToNative(e)) return;
  const b = mLeafAt(e.clientX, e.clientY, mDrag.box); if (b) mselSet(mDrag.box, mSpan(mDrag.a, b, mDrag.box));
});
document.addEventListener('pointerup', () => {
  const d = mDrag; mDrag = null; if (!d || (d.touch && d.moved) || d.native) return;
  if (d.moved) return;
  if (d.again || (d.touch && MSEL && MSEL.box === d.box && MSEL.nodes.some(n => n === d.a || n.contains(d.a)))) mWiden();
  else mselSet(d.box, [d.a]);
});
document.addEventListener('keydown', e => {
  if (!MSEL) return;
  if (e.key === 'Escape') { mselClear(); askChip.hidden = true; }
  else if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); mWiden(); }
});
window.addEventListener('resize', () => MSEL && requestAnimationFrame(mselDraw));
if (window.ResizeObserver) new ResizeObserver(() => MSEL && mselDraw()).observe(document.querySelector('.page') || document.body);
/* ---------- selections that start or end partway through a formula ----------
   The browser can only put a selection's ends between formulas, so when a drag starts inside a formula or ends
   over one, we remember the symbol under the pointer and treat that formula as selected only up to (or from) it. */
const EDGE = { start: null, end: null };
const edgeOf = box => (EDGE.start && EDGE.start.box === box && EDGE.start) || (EDGE.end && EDGE.end.box === box && EDGE.end) || null;
const mRowLike = g => M_SKIP.test(mKind(g)) || ['mtr', 'mtable'].includes(mKind(g));
const M_SCRIPT = /^(msub|msup|msubsup|munder|mover|munderover)$/;
/* the pieces of g from its start up to and including leaf (prefix), or from leaf to its end (suffix) */
function mPart(g, leaf, part) {
  if (g === leaf) return [g];
  const kids = mKids(g), bi = kids.findIndex(k => k === leaf || k.contains(leaf));
  if (bi < 0) return [];
  if (mRowLike(g)) {
    const inner = mPart(kids[bi], leaf, part);
    return part === 'prefix' ? kids.slice(0, bi).concat(inner) : inner.concat(kids.slice(bi + 1));
  }
  if (M_SCRIPT.test(mKind(g)) && bi === 0 && part === 'prefix') return mPart(kids[0], leaf, part);
  return [g];
}
function edgeNodes(e) { const root = e.box.querySelector('g[data-mml-node="math"]'); return root ? mPart(root, e.leaf, e.part) : []; }
function edgeTex(e) { return edgeNodes(e).map(mLin).join(' ').replace(/ +/g, ' ').trim(); }
function edgeDraw() {
  mHiClear('msel-edge');
  [EDGE.start, EDGE.end].forEach(e => {
    if (!e || !document.contains(e.box)) return;
    edgeNodes(e).forEach(g => {
      const r = g.getBoundingClientRect(); if (!r.width && !r.height) return;
      mHi(e.box, r, 'msel-edge');
    });
  });
}
/* while the browser drags an ordinary selection, watch for the pointer entering a formula */
document.addEventListener('pointermove', e => { if (!mDrag && (e.buttons & 1) && e.pointerType !== 'touch') edgeTrack(e); });
function edgeTrack(e) {
  const s = window.getSelection(); if (!s || !s.rangeCount || !s.anchorNode) return;
  const box = mBoxOf(e.target) || (() => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && mBoxOf(el); })();
  if (!box || box.contains(s.anchorNode) || (EDGE.start && EDGE.start.box === box)) { if (EDGE.end) { EDGE.end = null; edgeDraw(); askMarkSel(); } return; }
  const leaf = mLeafAt(e.clientX, e.clientY, box); if (!leaf) return;
  const r = document.createRange(); r.selectNode(box);
  const fwd = r.comparePoint(s.anchorNode, s.anchorOffset) < 0;
  EDGE.end = { box, leaf, part: fwd ? 'prefix' : 'suffix' };
  askMarkSel();
}
document.addEventListener('pointerdown', e => { if (!e.target.closest || !e.target.closest('.ask-chip, .ask-panel, #ask-btn')) { EDGE.end = null; if (!mBoxOf(e.target)) EDGE.start = null; edgeDraw(); } }, true);
window.addEventListener('resize', () => requestAnimationFrame(edgeDraw));
if (window.ResizeObserver) new ResizeObserver(() => edgeDraw()).observe(document.querySelector('.page') || document.body);
let askEdgeTex = null;  /* box -> partial TeX, read by askTex while a selection is being packed */
function askTarget() {
  if (MSEL && document.contains(MSEL.box)) { const r = document.createRange(); r.selectNode(MSEL.box); return { range: r, sel: mselText(), pick: mselTex() }; }
  const r0 = askSelRange(); if (!r0) return null;
  const edges = [EDGE.start, EDGE.end].filter(e => e && document.contains(e.box));
  if (!edges.length) return { range: r0 };
  /* stretch the range over the partly selected formulas, and write each of those as just its selected part */
  const r = r0.cloneRange();
  edges.forEach(e => { if (e.part === 'prefix') { if (r.comparePoint(e.box, 0) >= 0) r.setEndAfter(e.box); } else if (r.comparePoint(e.box, 0) <= 0) r.setStartBefore(e.box); });
  askEdgeTex = new Map(edges.map(e => [e.box, edgeTex(e)]));
  const root = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
  let sel = askTex(root, r);
  askEdgeTex = null;
  sel += '\n(Where the highlight starts or ends inside a formula, only the highlighted part of it is given, written back as LaTeX' +
    edges.map(e => '; the whole formula there is $' + (e.box.dataset.tex || '').trim() + '$').join('') + '.)';
  return { range: r, sel };
}

/* ---------- the conversation ---------- */
const ASK_RULES = 'You are helping David, a third-year Oxford Mathematics and Computer Science student, while he reads his illustrated study notes (built from his lecturers’ notes). ' +
  'Each message from him comes with the passage he is looking at, the text around it in the notes, and possibly the exact text he highlighted, with maths written in LaTeX. ' +
  'Answer his question about that material. Explain in plain language and step by step; justify every step and say where a trick comes from; use the notation and the result numbers of the notes; ' +
  'do not rely on later chapters without saying so. Be concise: answer what he asked, usually in a few short paragraphs, not an essay. If he highlighted something, focus on it. ' +
  'If the passage is a problem-sheet question, do not solve it outright: give hints, explain the ideas, or check his reasoning. If you notice an error in the notes, say so plainly. ' +
  'Format maths with $...$ inline and $$...$$ on its own line for display (never \\( \\) or \\[ \\]). You may use **bold**, short bulleted lists and short headings; no tables.';
function askPack(c, q) {
  if (!c) return q;
  let s = 'WHERE: ' + c.where + '\n';
  if (c.before) s += '\nTEXT JUST BEFORE THE PASSAGE:\n' + c.before + '\n';
  if (c.unit) s += '\nTHE PASSAGE HE IS LOOKING AT:\n' + c.unit + '\n';
  if (c.after) s += '\nTEXT JUST AFTER:\n' + c.after + '\n';
  if (c.sel) s += '\nHE HIGHLIGHTED:\n«' + askClip(c.sel, 3000) + '»\n';
  return s + '\nHIS QUESTION:\n' + q;
}
function askBubble(role, text) {
  const d = document.createElement('div'); d.className = 'ask-msg ask-' + role;
  if (role === 'user') { d.textContent = text; }
  askLog.appendChild(d); askLog.scrollTop = askLog.scrollHeight;
  return d;
}
function askNote(text, cls) { const p = document.createElement('p'); p.className = 'ask-note ' + (cls || ''); p.textContent = text; askLog.appendChild(p); askLog.scrollTop = askLog.scrollHeight; }
const ASK_ERR = {
  not_granted: 'Claude isn’t allowed for this page. You can change that in the page’s permissions.',
  sampling_disabled: 'Claude isn’t available for this account.', not_declared: 'This page can no longer ask Claude.',
  capability_disabled: 'Claude isn’t available in this view.', capability_removed: 'This Claude app is too old for this feature.',
  rate_limited: 'Too many questions at once, or a usage limit was reached. Try again in a little while.',
  session_expired: 'Your Claude session expired: sign in again, then retry.', refused: 'Claude declined to answer that. Try rephrasing.',
  empty_completion: 'Claude returned nothing. Try asking differently.', prompt_too_large: 'Too much text was attached. Clear the attachment or highlight less.',
  upstream_error: 'The connection dropped. Try again.'
};
async function askSend() {
  const q = askTa.value.trim(); if (!q || ASK.busy) return;
  const sample = await askSample();
  if (!sample) { askNote('Asking Claude only works when this page is opened in Claude (claude.ai or the Claude app).', 'err'); return; }
  const c = ASK.ctx;
  askTa.value = '';
  const hint = $('.ask-hint', askLog); if (hint) hint.remove();
  const ub = askBubble('user', q);
  const tag = c ? (c.sel ? 'highlight · ' : '') + c.label : '';
  if (c) { const t = document.createElement('span'); t.className = 'ask-tag'; t.textContent = tag; ub.prepend(t); }
  ASK.turns.push({ role: 'user', content: askPack(c, q) });
  ASK.msgs.push({ role: 'user', q, tag });
  ASK.ctx = null; askShowCtx();
  const out = askBubble('assistant', ''); out.innerHTML = '<span class="ask-think">Thinking…</span>';
  ASK.busy = true; ASK.ctl = new AbortController();
  $('.ask-stop', ASKP).hidden = false; $('.ask-send', ASKP).disabled = true;
  let raw = '', rT = 0;
  const turns = [{ role: 'user', content: ASK_RULES }].concat(ASK.turns.slice(-12));
  if (turns[1] && turns[1].role !== 'user') turns.splice(1, 1);
  try {
    const res = await sample(turns, {
      cache: false, signal: ASK.ctl.signal, model: ASK.model, modelTier: ASK_TIER[ASK.model], effort: ASK.effort,
      onText: ({ text }) => { raw = text; const now = Date.now(); if (now - rT > 120) { rT = now; askRender(out, raw, false); } }
    });
    raw = res.text; askRender(out, raw, true);
    if (!res.modelApplied && res.modelTierApplied) askNote('(' + ASK_MNAME[ASK.model] + ' wasn’t available here, so Claude’s ' + ({ quick: 'fast', default: 'standard', complex: 'most capable' }[res.modelTierApplied] || res.modelTierApplied) + ' model answered instead.)');
    if (res.truncated) askNote('(The answer was cut short.)');
    ASK.turns.push({ role: 'assistant', content: raw }); ASK.msgs.push({ role: 'assistant', text: raw }); histSave();
  } catch (e) {
    const code = e && e.code;
    if (e && e.text) { raw = e.text; askRender(out, raw, true); ASK.turns.push({ role: 'assistant', content: raw }); ASK.msgs.push({ role: 'assistant', text: raw }); histSave(); }
    else out.remove();
    if (code === 'refused') out.remove();
    if (code !== 'cancelled') askNote(ASK_ERR[code] || ASK_ERR.upstream_error, 'err');
    if (!(e && e.text)) { ASK.turns.pop(); ASK.msgs.pop(); }
  } finally {
    ASK.busy = false; ASK.ctl = null; $('.ask-stop', ASKP).hidden = true; $('.ask-send', ASKP).disabled = false;
  }
}

/* Markdown-lite with maths: protect the TeX, format the rest, hand the TeX to MathJax at the end. */
function askEsc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function askMd(src) {
  const math = [];
  const keep = (tex, disp) => { math.push([tex, disp]); return '\u0000' + (math.length - 1) + '\u0000'; };
  let s = src.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keep(t, true)).replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => keep(t, true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => keep(t, false)).replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_, a, t) => a + keep(t, false));
  s = askEsc(s);
  const inline = t => t.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(?=\S)([\s\S]+?)\*\*/g, '<b>$1</b>').replace(/__(?=\S)([\s\S]+?)__/g, '<b>$1</b>').replace(/(^|[^*\w])\*(?=\S)([^*\n]+?)\*(?!\w)/g, '$1<i>$2</i>').replace(/(^|[^\w])_(?=\S)([^_\n]+?)_(?!\w)/g, '$1<i>$2</i>');
  const lines = s.split('\n'), html = []; let list = null, para = [];
  const flushP = () => { if (para.length) { html.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushL = () => { if (list) { html.push('<' + list.t + '>' + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + '</' + list.t + '>'); list = null; } };
  lines.forEach(line => {
    const t = line.trim();
    let m;
    if (!t) { flushP(); flushL(); return; }
    if ((m = /^#{1,4}\s+(.*)$/.exec(t))) { flushP(); flushL(); html.push('<p class="ask-h">' + inline(m[1]) + '</p>'); return; }
    if ((m = /^[-*•]\s+(.*)$/.exec(t))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); return; }
    if ((m = /^\d+[.)]\s+(.*)$/.exec(t))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); return; }
    if (/^\u0000\d+\u0000$/.test(t)) { flushP(); flushL(); html.push('<div class="ask-disp">' + t + '</div>'); return; }
    if (list && /^\s{2,}/.test(line)) { list.items[list.items.length - 1] += ' ' + t; return; }
    flushL(); para.push(t);
  });
  flushP(); flushL();
  return html.join('').replace(/\u0000(\d+)\u0000/g, (_, i) => { const [tex, disp] = math[+i]; return disp ? '\\[' + askEsc(tex) + '\\]' : '\\(' + askEsc(tex) + '\\)'; });
}
function askRender(el, raw, final) {
  el.innerHTML = askMd(raw);
  if (final) typeset([el]);
  const nearBottom = askLog.scrollHeight - askLog.scrollTop - askLog.clientHeight < 140;
  if (nearBottom || final) askLog.scrollTop = askLog.scrollHeight;
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !ASKP.hidden && document.activeElement && ASKP.contains(document.activeElement)) askClose();
});
window.__askDebug = { mselTex: () => mselTex(), ctx: () => ASK.ctx, drag: () => mDrag && { native: mDrag.native, moved: mDrag.moved, box: mDrag.box.dataset.tex } };
