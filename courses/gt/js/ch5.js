/* ---------- GT Ch5 · Fig 5.1: backward induction ---------- */
const GT_TREES = (function () {
  let id = 0; const N = (p, ch) => ({ id: 'n' + (id++), p, ch }), Lf = u => ({ id: 'n' + (id++), u });
  return {
    'running example': N(1, [['L', N(2, [['l', Lf([4, 1])], ['r', Lf([0, 2])]])], ['R', N(2, [['l', Lf([3, 1])], ['r', Lf([1, 2])]])]]),
    'empty threat (Ex. 5.7)': N(1, [['L', Lf([0, 0])], ['R', N(2, [['l', Lf([0, 0])], ['r', Lf([2, 2])]])]]),
    'entry game': N(1, [['Out', Lf([1, 3])], ['In', N(2, [['Fight', Lf([0, 0])], ['Acc.', Lf([2, 1])]])]]),
    'centipede (Ex. 5.10)': N(1, [['R', Lf([1, 1])], ['D', N(2, [['R', Lf([0, 3])], ['D', N(1, [['R', Lf([2, 2])], ['D', N(2, [['R', Lf([1, 4])], ['D', Lf([3, 3])]])]])]])]]),
    'win-lose (Ex. 7.3)': N('E', [['L', N('A', [['l', Lf([1])], ['r', Lf([1])]])], ['R', N('A', [['l', Lf([1])], ['r', Lf([-1])]])]])
  };
})();
function gtCentipedePos(root) { /* a staircase layout for the centipede */
  const pos = {}; let n = root, k = 0;
  while (n.ch) { pos[n.id] = [70 + k * 140, 70]; pos[n.ch[0][1].id] = [70 + k * 140, 180]; n = n.ch[1][1]; k++; }
  pos[n.id] = [70 + k * 140, 70]; return pos;
}
reg('gt-ch5', 'bi', function () {
  const svg = $('#gt-bi-svg'); if (!svg) return;
  const out = $('#gt-bi-out'), g = el('g', {}, svg);
  let root, cur, val, hi, order, log;
  function load(n) {
    cur = n; root = GT_TREES[n]; val = {}; hi = {}; log = []; order = [];
    (function post(v) { if (!v.ch) return; v.ch.forEach(c => post(c[1])); order.push(v); })(root);
    render();
  }
  const util = v => v.u || val[v.id];
  const pIdx = p => (p === 1 || p === 'E') ? 0 : 1, sgn = p => p === 'A' ? -1 : 1;
  function step() {
    const v = order.find(x => !val[x.id] && x.ch.every(c => util(c[1]))); if (!v) return false;
    const i = pIdx(v.p); let best = -Infinity, bk = 0;
    v.ch.forEach((c, k) => { const s = sgn(v.p) * util(c[1])[v.p === 'A' ? 0 : i]; if (s > best) { best = s; bk = k; } });
    val[v.id] = util(v.ch[bk][1]).slice(); hi[v.id] = bk;
    log.push('Player ' + v.p + ' chooses <b>' + v.ch[bk][0] + '</b> (' + v.ch.map(c => c[0] + ': ' + util(c[1]).join(', ')).join(';  ') + ')');
    render(); return true;
  }
  function render() {
    clear(g);
    const pos = cur.startsWith('centipede') ? gtCentipedePos(root) : null;
    gtDrawTree(g, root, { pos, x0: 30, x1: 690, y0: 60, dy: root.ch.length && cur.startsWith('entry') ? 110 : 110, hi, val });
    const doneAll = !!val[root.id];
    out.innerHTML = (log.length ? log.slice(-4).join('<br>') : 'Press "one step" to process the first node whose children are all labelled.') +
      (doneAll ? '<br><b>Root labelled ' + val[root.id].join(', ') + '</b>: the thick edges are the subgame perfect equilibrium.' : '');
    $('#gt-bi-step').disabled = doneAll; $('#gt-bi-all').disabled = doneAll;
  }
  $('#gt-bi-step').addEventListener('click', step);
  $('#gt-bi-all').addEventListener('click', () => { while (step()); });
  $('#gt-bi-reset').addEventListener('click', () => load(cur));
  const names = Object.keys(GT_TREES);
  gtButtons($('#gt-bi-btns'), names, names[0], load); load(names[0]);
});

/* ---------- GT Ch5 · Fig 5.2: forgetful driver ---------- */
function gtDriverTree(g, x0, y0, sc) {
  sc = sc || 1;
  const P = { a: [x0, y0], b: [x0 + 90 * sc, y0 + 70 * sc], l0: [x0 - 60 * sc, y0 + 70 * sc], l4: [x0 + 30 * sc, y0 + 140 * sc], l1: [x0 + 150 * sc, y0 + 140 * sc] };
  const ln = (p, q, lab, side) => { path(SK.line(p[0], p[1], q[0], q[1], { rough: .3, seed: p[0] | 0 }), 's-ink', g, { 'stroke-width': 1.4 }); text(g, (p[0] + q[0]) / 2 + side * 8, (p[1] + q[1]) / 2 - 4, lab, 'lbl-serif', { 'text-anchor': side < 0 ? 'end' : 'start', 'font-size': 12.5, 'font-style': 'italic' }); };
  ln(P.a, P.l0, 'exit', -1); ln(P.a, P.b, 'straight', 1); ln(P.b, P.l4, 'exit', -1); ln(P.b, P.l1, 'straight', 1);
  path('M' + (P.a[0] + 4) + ' ' + (P.a[1] + 12) + 'Q' + (P.a[0] + 10) + ' ' + (P.b[1] - 6) + ' ' + (P.b[0] - 12) + ' ' + (P.b[1] - 2), 's-ink', g, { 'stroke-dasharray': '4 4', fill: 'none', 'stroke-width': 1.3 });
  [P.a, P.b].forEach((p, k) => { el('circle', { cx: p[0], cy: p[1], r: 11, class: 'f-paper s s-blue', 'stroke-width': 1.6 }, g); text(g, p[0], p[1] + 4, k ? 'B' : 'A', 'lbl-blue', { 'text-anchor': 'middle', 'font-size': 11 }); });
  [[P.l0, 0], [P.l4, 4], [P.l1, 1]].forEach(([p, u]) => text(g, p[0], p[1] + 16, String(u), 'lbl-ink', { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 600 }));
}
reg('gt-ch5', 'driver', function () {
  const svg = $('#gt-fd-svg'); if (!svg) return;
  const ss = $('#gt-fd-s'), out = $('#gt-fd-out'), g = el('g', {}, svg), gA = el('g', {}, svg);
  gtDriverTree(gA, 110, 50, 1.15);
  const L = 380, R = 690, B = 260, T = 30, EU = s => 4 * s * (1 - s) + s * s, X = s => L + s * (R - L), Y = u => B - u / 1.6 * (B - T);
  axisLine(gA, L, R, B, [0, .25, .5, .75, 1].map(s => [X(s), String(s)]), { dy: 16, fs: 11 });
  vAxis(gA, L, B, T, [0, .5, 1, 1.5].map(u => [Y(u), String(u)]));
  text(gA, R, B + 32, 's = P(straight)', 'lbl', { 'text-anchor': 'end', 'font-size': 11.5 }); text(gA, L + 6, T - 6, 'expected utility', 'lbl', { 'font-size': 11.5 });
  path('M' + X(0) + ' ' + Y(1) + 'H' + X(1), 's-soft', gA, { 'stroke-dasharray': '3 4' }); text(gA, X(1) - 4, Y(1) + 15, 'best pure or mixed: 1', 'lbl', { 'font-size': 10.5, 'text-anchor': 'end' });
  const pts = []; for (let k = 0; k <= 100; k++) pts.push([X(k / 100), Y(EU(k / 100))]);
  path(poly(pts), 's-blue', gA, { 'stroke-width': 2.4, fill: 'none' });
  function render() {
    const s = +ss.value; $('#gt-fd-sv').textContent = s.toFixed(2); clear(g);
    el('circle', { cx: X(s), cy: Y(EU(s)), r: 6, class: 'f-ochre' }, g);
    path('M' + X(s) + ' ' + B + 'V' + Y(EU(s)), 's-soft', g, { 'stroke-dasharray': '2 3' });
    out.innerHTML = 'Exit at A with probability ' + (1 - s).toFixed(2) + ' (utility 0); reach B and exit with probability ' + (s * (1 - s)).toFixed(3) + ' (utility 4); go straight twice with probability ' + (s * s).toFixed(3) + ' (utility 1).<br>Expected utility <b>' + EU(s).toFixed(3) + '</b>' + (EU(s) > 1 + 1e-9 ? ', better than any pure or mixed strategy.' : '.');
  }
  ss.addEventListener('input', render); render();
});

/* ---------- GT Ch5 · Fig 5.3: automata playing each other ---------- */
reg('gt-ch5', 'fsm', function () {
  const svg = $('#gt-fsm-svg'); if (!svg) return;
  const sa = $('#gt-fsm-a'), sb = $('#gt-fsm-b'), out = $('#gt-fsm-out'), g = el('g', {}, svg);
  Object.keys(GT_FSM).forEach(k => [sa, sb].forEach(s => { const o = document.createElement('option'); o.value = k; o.textContent = GT_FSM[k].name; s.appendChild(o); }));
  sa.value = 'GRIM'; sb.value = 'ALLD';
  function render() {
    clear(g);
    const m1 = GT_FSM[sa.value], m2 = GT_FSM[sb.value];
    text(g, 30, 22, 'player 1', 'lbl-blue', { 'font-size': 12, 'font-weight': 600 }); text(g, 390, 22, 'player 2', 'lbl-red', { 'font-size': 12, 'font-weight': 600 });
    gtDrawFSM(g, m1, 120, 80, { label: m1.name }); gtDrawFSM(g, m2, 480, 80, { label: m2.name });
    const { run, k } = gtRun(m1, m2), n = 13, x0 = 96, w = 46, y0 = 222;
    const rep = run.slice(k), avg = i => rep.reduce((s, o) => s + GT_PD[o][i], 0) / rep.length;
    text(g, x0 - 10, y0 - 12, 'round', 'lbl', { 'text-anchor': 'end', 'font-size': 11 });
    text(g, x0 - 10, y0 + 14, m1.name, 'lbl-blue', { 'text-anchor': 'end', 'font-size': 11 }); text(g, x0 - 10, y0 + 40, m2.name, 'lbl-red', { 'text-anchor': 'end', 'font-size': 11 });
    text(g, x0 - 10, y0 + 66, 'payoffs', 'lbl', { 'text-anchor': 'end', 'font-size': 11 });
    for (let t = 0; t < n; t++) {
      const o = t < run.length ? run[t] : run[k + (t - k) % rep.length], x = x0 + t * w, inRep = t >= k;
      if (inRep && (t - k) < rep.length) el('rect', { x: x + 2, y: y0 - 2, width: w - 4, height: 76, class: 'f-ochrew' }, g);
      else if (inRep) el('rect', { x: x + 2, y: y0 - 2, width: w - 4, height: 76, class: 'f-ochrew', opacity: .35 }, g);
      text(g, x + w / 2, y0 - 12, String(t + 1), 'lbl', { 'text-anchor': 'middle', 'font-size': 10.5 });
      text(g, x + w / 2, y0 + 15, o[0], 'lbl-blue lbl-serif', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600 });
      text(g, x + w / 2, y0 + 41, o[1], 'lbl-red lbl-serif', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600 });
      text(g, x + w / 2, y0 + 66, GT_PD[o].join(','), 'lbl', { 'text-anchor': 'middle', 'font-size': 10.5 });
    }
    text(g, x0 + n * w + 6, y0 + 30, '…', 'lbl-ink', { 'font-size': 16 });
    out.innerHTML = 'Prefix: ' + (k ? run.slice(0, k).join(' ') : '(empty)') + '.   Repeating block: <b>' + rep.join(' ') + '</b> (length ' + rep.length + ').<br>Limit-of-means utility: ' + m1.name + ' <b>' + gtFrac(avg(0)) + '</b>, ' + m2.name + ' <b>' + gtFrac(avg(1)) + '</b>.';
  }
  sa.addEventListener('change', render); sb.addEventListener('change', render); render();
});

/* ---------- GT Ch5 · Fig 5.4: replicator dynamics ---------- */
reg('gt-ch5', 'replicator', function () {
  const svg = $('#gt-rep-svg'); if (!svg) return;
  const sv = $('#gt-rep-v'), sc = $('#gt-rep-c'), sp = $('#gt-rep-p'), out = $('#gt-rep-out'), g = el('g', {}, svg), gA = el('g', {}, svg);
  const L = 60, R = 690, B = 250, T = 20, NG = 60, X = t => L + t / NG * (R - L), Y = p => B - p * (B - T);
  axisLine(gA, L, R, B, [0, 10, 20, 30, 40, 50, 60].map(t => [X(t), String(t)]), { dy: 16, fs: 11 });
  vAxis(gA, L, B, T, [0, .25, .5, .75, 1].map(p => [Y(p), String(p)]));
  text(gA, R, B + 32, 'generation', 'lbl', { 'text-anchor': 'end', 'font-size': 11.5 }); text(gA, L + 6, T - 6, 'proportion', 'lbl', { 'font-size': 11.5 });
  function render() {
    const V = +sv.value, C = +sc.value, p0 = +sp.value; $('#gt-rep-vv').textContent = V; $('#gt-rep-cv').textContent = C; $('#gt-rep-pv').textContent = p0.toFixed(2);
    clear(g);
    const F0 = Math.max(0, (C - V) / 2) + 1; /* baseline keeps every payoff ≥ 1 */
    let p = p0; const H = [[X(0), Y(p)]], D = [[X(0), Y(1 - p)]];
    for (let t = 1; t <= NG; t++) {
      const FH = F0 + p * (V - C) / 2 + (1 - p) * V, FD = F0 + (1 - p) * V / 2, A = p * FH + (1 - p) * FD;
      p = p * FH / A; H.push([X(t), Y(p)]); D.push([X(t), Y(1 - p)]);
    }
    if (C > V) { path('M' + L + ' ' + Y(V / C) + 'H' + R, 's-ochre', g, { 'stroke-dasharray': '6 4', 'stroke-width': 1.4 }); text(g, L + 8, Y(V / C) - 6, 'V/C = ' + (V / C).toFixed(3), 'lbl-ochre', { 'font-size': 11.5 }); }
    path(poly(D), 's-red', g, { 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '7 4' });
    path(poly(H), 's-blue', g, { 'stroke-width': 2.6, fill: 'none' });
    text(g, X(NG) - 4, H[NG][1] + (H[NG][1] > Y(.5) ? -8 : 16), 'hawks', 'lbl-blue', { 'text-anchor': 'end', 'font-size': 12, 'font-weight': 600 });
    text(g, X(NG) - 4, D[NG][1] + (D[NG][1] > Y(.5) ? -8 : 16), 'doves', 'lbl-red', { 'text-anchor': 'end', 'font-size': 12, 'font-weight': 600 });
    out.innerHTML = 'Baseline fitness F₀ = ' + F0.toFixed(1) + '. After ' + NG + ' generations hawks make up <b>' + p.toFixed(3) + '</b> of the population. ' +
      (C > V ? 'Since C > V, the stable mixture has a proportion V/C = ' + (V / C).toFixed(3) + ' of hawks.' : C === V ? 'With C = V, hawks take over, but slowly: their advantage vanishes as they approach 1.' : 'Since C < V, hawks are always fitter and take over.');
  }
  [sv, sc, sp].forEach(s => s.addEventListener('input', render));
  const bs = gtButtons($('#gt-rep-btns'), ['C = 2', 'C = 3', 'C = 4', 'C = 10', 'C = 100'], 'C = 10', n => { sv.value = 4; sc.value = n.slice(4); render(); });
  sc.addEventListener('input', () => pressGroup(bs, 'C = ' + sc.value, 'data-g'));
  render();
});

/* ---------- Sheet 3 figures ---------- */
reg('gt-sheet3', 'figs', function () {
  const a = $('#gt-s3a-svg');
  if (a) {
    let id = 0; const N = (p, ch) => ({ id: 's' + (id++), p, ch }), E = () => ({ id: 's' + (id++), end: true }), Lf = u => ({ id: 's' + (id++), u });
    const g = el('g', {}, a);
    const n1 = N(1, [['G', E()], ['H', E()]]), n2 = N(1, [['G', E()], ['H', E()]]);
    const ta = N(1, [['A', N(2, [['C', E()], ['D', n1]])], ['B', N(2, [['E', n2], ['F', E()]])]]);
    gtDrawTree(g, ta, { x0: 10, x1: 350, y0: 30, dy: 62, sets: [[n1.id, n2.id]] });
    text(g, 180, 230, '(a)', 'lbl-ink', { 'text-anchor': 'middle', 'font-size': 13 });
    const r = N(1, null), last = N(1, [['A', Lf([3, 4])], ['B', Lf([1, 2])]]);
    r.ch = [['A', Lf([7, 8])], ['B', N(2, [['C', Lf([5, 0])], ['D', last]])]];
    const posb = { [r.id]: [450, 30], [r.ch[0][1].id]: [400, 92], [r.ch[1][1].id]: [510, 92], [r.ch[1][1].ch[0][1].id]: [460, 154], [last.id]: [570, 154], [last.ch[0][1].id]: [530, 216], [last.ch[1][1].id]: [620, 216] };
    gtDrawTree(g, r, { pos: posb, sets: [[r.id, last.id, true]] });
    text(g, 510, 262, '(b)', 'lbl-ink', { 'text-anchor': 'middle', 'font-size': 13 });
    const c1 = N(1, [['K', E()], ['L', E()]]), c2 = N(1, [['K', E()], ['L', E()]]);
    const tc = N(2, [['A', N(1, [['C', E()], ['D', N(2, [['G', E()], ['H', c1]])]])], ['B', N(1, [['E', N(2, [['I', c2], ['J', E()]])], ['F', E()]])]]);
    gtDrawTree(g, tc, { x0: 120, x1: 600, y0: 300, dy: 62, sets: [[c1.id, c2.id]] });
    text(g, 360, 552, '(c)', 'lbl-ink', { 'text-anchor': 'middle', 'font-size': 13 });
  }
  const b = $('#gt-s3b-svg');
  if (b) { const g = el('g', {}, b); [['GRIM', 60], ['TFT', 300], ['TFTT', 540]].forEach(([k, x]) => gtDrawFSM(g, GT_FSM[k], x, 90, { label: GT_FSM[k].name })); }
  const c = $('#gt-s3c-svg');
  if (c) gtDriverTree(el('g', {}, c), 300, 20, 1);
});
