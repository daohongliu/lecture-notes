
/* ---------- Ask Claude: a side panel that sees the selection and its context ---------- */
const ASK = { sample: undefined, turns: [], ctx: null, ctl: null, busy: false, deep: false };
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
ASKP.innerHTML = '<div class="ask-head"><span class="ask-title">Ask Claude</span><button type="button" class="ask-new" title="Start a new conversation">new chat</button><button type="button" class="ask-x" aria-label="Close">×</button></div>' +
  '<div class="ask-log" aria-live="polite"><p class="ask-hint">Highlight anything on the page and press <b>Ask</b>, or just type: Claude sees the passage you are reading, the section around it, and your highlight.</p></div>' +
  '<div class="ask-ctx" hidden><div class="ask-ctx-l"></div><button type="button" class="ask-ctx-x" title="Don’t attach this">×</button></div>' +
  '<form class="ask-form"><textarea rows="3" placeholder="Ask about this…" aria-label="Your question"></textarea><div class="ask-row"><label class="ask-deep"><input type="checkbox"> think harder</label><span class="ask-sp"></span><button type="button" class="ask-stop" hidden>stop</button><button type="submit" class="ask-send">ask</button></div></form>';
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
  if (c.sel) { const q = document.createElement('div'); q.className = 'ask-ctx-sel'; q.textContent = '“' + askClip(c.sel.replace(/\s+/g, ' '), 160) + '”'; $('.ask-ctx-l', ASKP).appendChild(q); }
}
function askOpen(range) {
  ASKP.hidden = false; document.body.classList.add('ask-open'); askBtn.setAttribute('aria-pressed', 'true');
  ASK.ctx = askContext(range || null);
  askShowCtx();
  askChip.hidden = true;
  setTimeout(() => askTa.focus({ preventScroll: true }), 30);
  askSample();
}
function askClose() { ASKP.hidden = true; document.body.classList.remove('ask-open'); askBtn.setAttribute('aria-pressed', 'false'); }
askBtn.addEventListener('click', () => {
  if (!ASKP.hidden && !askSelRange()) { askClose(); return; }
  askOpen(askSelRange());
});
$('.ask-x', ASKP).addEventListener('click', askClose);
$('.ask-ctx-x', ASKP).addEventListener('click', () => { ASK.ctx = null; askShowCtx(); });
$('.ask-new', ASKP).addEventListener('click', () => {
  if (ASK.ctl) ASK.ctl.abort();
  ASK.turns = []; askLog.innerHTML = ''; ASK.ctx = askContext(null); askShowCtx(); askTa.focus();
});
$('.ask-deep input', ASKP).addEventListener('change', e => { ASK.deep = e.target.checked; });
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
let askSelT = null;
document.addEventListener('selectionchange', () => {
  clearTimeout(askSelT);
  askSelT = setTimeout(() => {
    const r = askSelRange();
    if (!r) { askChip.hidden = true; return; }
    const rects = r.getClientRects(), last = rects[rects.length - 1] || r.getBoundingClientRect();
    askChip.hidden = false;
    const w = askChip.offsetWidth || 90;
    askChip.style.left = Math.max(8, Math.min(innerWidth - w - 8, last.right - w / 2)) + 'px';
    askChip.style.top = Math.min(innerHeight - 44, last.bottom + 8) + 'px';
  }, 180);
});
askChip.addEventListener('mousedown', e => e.preventDefault());
askChip.addEventListener('click', () => {
  const r = askSelRange();
  if (!ASKP.hidden && ASK.turns.length && r) { ASK.ctx = askContext(r); askShowCtx(); askChip.hidden = true; askTa.focus(); return; }
  askOpen(r);
});
window.addEventListener('scroll', () => { if (!askChip.hidden) askChip.hidden = true; }, { passive: true });

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
  if (c) { const t = document.createElement('span'); t.className = 'ask-tag'; t.textContent = (c.sel ? 'highlight · ' : '') + c.label; ub.prepend(t); }
  ASK.turns.push({ role: 'user', content: askPack(c, q) });
  ASK.ctx = null; askShowCtx();
  const out = askBubble('assistant', ''); out.innerHTML = '<span class="ask-think">Thinking…</span>';
  ASK.busy = true; ASK.ctl = new AbortController();
  $('.ask-stop', ASKP).hidden = false; $('.ask-send', ASKP).disabled = true;
  let raw = '', rT = 0;
  const turns = [{ role: 'user', content: ASK_RULES }].concat(ASK.turns.slice(-12));
  if (turns[1] && turns[1].role !== 'user') turns.splice(1, 1);
  try {
    const res = await sample(turns, {
      cache: false, signal: ASK.ctl.signal, modelTier: ASK.deep ? 'complex' : 'default',
      onText: ({ text }) => { raw = text; const now = Date.now(); if (now - rT > 120) { rT = now; askRender(out, raw, false); } }
    });
    raw = res.text; askRender(out, raw, true);
    if (res.truncated) askNote('(The answer was cut short.)');
    ASK.turns.push({ role: 'assistant', content: raw });
  } catch (e) {
    const code = e && e.code;
    if (e && e.text) { raw = e.text; askRender(out, raw, true); ASK.turns.push({ role: 'assistant', content: raw }); }
    else out.remove();
    if (code === 'refused') out.remove();
    if (code !== 'cancelled') askNote(ASK_ERR[code] || ASK_ERR.upstream_error, 'err');
    if (!(e && e.text)) ASK.turns.pop();
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
  const inline = t => t.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
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
