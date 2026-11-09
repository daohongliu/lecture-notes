/* ---------- Computational Game Theory: shared helpers ---------- */
const gtF = (v, d) => { if (!Number.isFinite(v)) return '∞'; const s = (Math.abs(v) < 5e-10 ? 0 : v).toFixed(d == null ? 2 : d); return s.replace(/\.?0+$/, '') || '0'; };
function gtFrac(v) { /* small fractions as a/b, else decimal */
  for (let b = 1; b <= 60; b++) { const a = Math.round(v * b); if (Math.abs(a / b - v) < 1e-9) return b === 1 ? String(a) : a + '/' + b; }
  return gtF(v, 3);
}
/* Best responses, pure Nash equilibria, Pareto optimal cells of a bimatrix game (P1[i][j], P2[i][j]) */
function gtAnalyse(P1, P2) {
  const m = P1.length, n = P1[0].length, br1 = [], br2 = [], ne = [], par = [];
  for (let i = 0; i < m; i++) { br1.push([]); br2.push([]); }
  for (let j = 0; j < n; j++) { let mx = -Infinity; for (let i = 0; i < m; i++) mx = Math.max(mx, P1[i][j]); for (let i = 0; i < m; i++) br1[i][j] = P1[i][j] === mx; }
  for (let i = 0; i < m; i++) { const mx = Math.max(...P2[i]); for (let j = 0; j < n; j++) br2[i][j] = P2[i][j] === mx; }
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    if (br1[i][j] && br2[i][j]) ne.push([i, j]);
    let dom = false;
    for (let k = 0; k < m; k++) for (let l = 0; l < n; l++) if (P1[k][l] >= P1[i][j] && P2[k][l] >= P2[i][j] && (P1[k][l] > P1[i][j] || P2[k][l] > P2[i][j])) dom = true;
    if (!dom) par.push([i, j]);
  }
  const dom1 = []; for (let i = 0; i < m; i++) if (P1[0].every((_, j) => br1[i][j])) dom1.push(i);
  const dom2 = []; for (let j = 0; j < n; j++) if (P2.every((_, i) => br2[i][j])) dom2.push(j);
  return { br1, br2, ne, par, dom1, dom2 };
}
/* An editable (or read-only) payoff table in the style of <pm>. opts: rows, cols, P1, P2 (null for zero-sum), edit, onChange, mm */
function gtTable(host, o) {
  host.innerHTML = '';
  const zs = !o.P2, wrap = document.createElement('div'); wrap.className = 'pmw';
  const t = document.createElement('table'); t.className = 'pm' + (zs ? ' zs' : '') + (o.edit ? ' pm-edit' : ''); wrap.appendChild(t);
  const A = zs ? null : gtAnalyse(o.P1, o.P2.map(r => r.slice()));
  let br1, br2;
  if (zs) { /* row player: column maxima; column player: row minima */
    br1 = o.P1.map((r, i) => r.map((v, j) => v === Math.max(...o.P1.map(rr => rr[j]))));
    br2 = o.P1.map(r => r.map(v => v === Math.min(...r)));
  } else { br1 = A.br1; br2 = A.br2; }
  const th = (txt, cls) => { const e = document.createElement('th'); e.className = cls; e.textContent = txt; return e; };
  const hr = document.createElement('tr'); const c0 = document.createElement('th'); c0.className = 'pm-c'; c0.innerHTML = '<span class="pl2">2</span><span class="pl1">1</span>'; hr.appendChild(c0);
  o.cols.forEach(c => hr.appendChild(th(c, 'pm-h2'))); if (zs && o.mm) hr.appendChild(th('row min', 'pm-x'));
  const thead = document.createElement('thead'); thead.appendChild(hr); t.appendChild(thead);
  const tb = document.createElement('tbody'); t.appendChild(tb);
  const cell = (pl, i, j, v, b) => {
    const s = document.createElement('span'); s.className = (pl === 0 ? 'u0' : 'u' + pl) + (b && o.br !== false ? ' br' : '');
    if (o.edit) {
      const inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.value = gtF(v, 3); inp.size = 3;
      inp.setAttribute('aria-label', 'payoff to player ' + (pl || 1) + ' at ' + o.rows[i] + ', ' + o.cols[j]);
      inp.addEventListener('change', () => { const x = parseFloat(inp.value); if (Number.isFinite(x)) { (pl === 2 ? o.P2 : o.P1)[i][j] = x; o.onChange && o.onChange(); } else inp.value = gtF(v, 3); });
      s.appendChild(inp);
    } else s.textContent = gtF(v, 3);
    return s;
  };
  o.rows.forEach((r, i) => {
    const tr = document.createElement('tr'); tr.appendChild(th(r, 'pm-h1'));
    o.cols.forEach((c, j) => {
      const td = document.createElement('td');
      const isNe = br1[i][j] && br2[i][j]; if (isNe && o.ne !== false) td.classList.add('ne');
      if (o.mark && o.mark(i, j)) td.classList.add('mk');
      if (o.dim && o.dim(i, j)) td.classList.add('dim');
      if (zs) td.appendChild(cell(0, i, j, o.P1[i][j], false));
      else { td.appendChild(cell(2, i, j, o.P2[i][j], br2[i][j])); td.appendChild(cell(1, i, j, o.P1[i][j], br1[i][j])); }
      if (o.click) { td.tabIndex = 0; td.classList.add('pm-click'); td.addEventListener('click', e => { if (e.target.tagName !== 'INPUT') o.click(i, j); }); td.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.click(i, j); } }); }
      tr.appendChild(td);
    });
    if (zs && o.mm) { const x = document.createElement('td'); x.className = 'pm-x'; x.textContent = gtF(Math.min(...o.P1[i]), 3); tr.appendChild(x); }
    tb.appendChild(tr);
  });
  if (zs && o.mm) { const tr = document.createElement('tr'); tr.className = 'pm-xr'; tr.appendChild(th('col max', 'pm-x')); o.cols.forEach((c, j) => { const x = document.createElement('td'); x.className = 'pm-x'; x.textContent = gtF(Math.max(...o.P1.map(r => r[j])), 3); tr.appendChild(x); }); const e = document.createElement('td'); e.className = 'pm-x'; tr.appendChild(e); tb.appendChild(tr); }
  host.appendChild(wrap);
  return { br1, br2, A };
}
const gtParse = s => s.split(';').map(r => r.split(',').map(Number));

/* ---------- game trees ----------
   node: { id, p (player 1/2, or 'E'/'A'), ch: [[action, node], ...] }  leaf: { id, u: [..] } or { id, end: true } (unlabelled arrow)
   returns positions; draws into g. opts: x0, x1, y0, dy, sets: [[idA, idB, 'curve'?]], hi: {nodeId: actionIndex}, val: {nodeId: [..]} */
function gtLayout(root, x0, x1, y0, dy) {
  let leaves = 0; (function cnt(n) { if (!n.ch) { leaves++; return; } n.ch.forEach(c => cnt(c[1])); })(root);
  const pos = {}; let k = 0; const w = (x1 - x0) / Math.max(1, leaves);
  (function place(n, d) {
    if (!n.ch) { pos[n.id] = [x0 + w * (k + .5), y0 + d * dy]; k++; return; }
    n.ch.forEach(c => place(c[1], d + 1));
    const xs = n.ch.map(c => pos[c[1].id][0]); pos[n.id] = [(Math.min(...xs) + Math.max(...xs)) / 2, y0 + d * dy];
  })(root, 0);
  return pos;
}
function gtPlayerCls(p) { return p === 1 || p === 'E' ? 'blue' : p === 2 || p === 'A' ? 'red' : 'ink'; }
function gtDrawTree(g, root, o) {
  o = o || {};
  const pos = o.pos || gtLayout(root, o.x0 || 20, o.x1 || 700, o.y0 || 30, o.dy || 70), R = o.r || 13;
  const gE = el('g', {}, g), gN = el('g', {}, g);
  (function walk(n) {
    if (!n.ch) return;
    const [x, y] = pos[n.id];
    n.ch.forEach(([a, c], k) => {
      const [cx, cy] = pos[c.id], on = o.hi && o.hi[n.id] === k;
      const dx = cx - x, dyy = cy - y, L = Math.hypot(dx, dyy), ux = dx / L, uy = dyy / L;
      const x2 = c.ch ? cx - ux * R : cx - ux * (c.end ? 2 : R * .9), y2 = c.ch ? cy - uy * R : cy - uy * (c.end ? 2 : R * .9);
      path(SK.line(x + ux * R, y + uy * R, x2, y2, { seed: (x * 3 + cx) | 0, rough: .35 }), on ? 's-ochre' : 's-ink', gE, { 'stroke-width': on ? 3.2 : 1.4 });
      if (c.end) arrowHeadTo(gE, x2, y2, ux, uy);
      const mx = x + dx * .48, my = y + dyy * .48, side = dx < -1 ? -1 : dx > 1 ? 1 : (k ? 1 : -1);
      text(gE, mx + side * 9, my - 2, a, 'lbl-ink lbl-serif', { 'text-anchor': side < 0 ? 'end' : 'start', 'font-size': 15, 'font-style': 'italic' });
      walk(c);
    });
  })(root);
  (o.sets || []).forEach(([a, b, curved]) => {
    const [ax, ay] = pos[a], [bx, by] = pos[b];
    if (curved) path('M' + (ax + R) + ' ' + ay + 'Q' + (bx + 60) + ' ' + (ay - 10) + ' ' + (bx + 4) + ' ' + (by - R), 's-ink', gE, { 'stroke-dasharray': '5 4', 'stroke-width': 1.4, fill: 'none' });
    else path('M' + (Math.min(ax, bx) + R) + ' ' + ay + 'H' + (Math.max(ax, bx) - R), 's-ink', gE, { 'stroke-dasharray': '5 4', 'stroke-width': 1.4 });
  });
  (function walk(n) {
    const [x, y] = pos[n.id];
    if (n.ch) {
      const c = gtPlayerCls(n.p);
      el('circle', { cx: x, cy: y, r: R, class: 'f-paper s s-' + c, 'stroke-width': 1.6 }, gN);
      text(gN, x, y + 4.5, String(n.p), 'lbl-' + c, { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600 });
      if (o.val && o.val[n.id]) gtPayoff(gN, x, y - R - 6, o.val[n.id], { boxed: true });
      n.ch.forEach(c2 => walk(c2[1]));
    } else if (n.u) gtPayoff(gN, x, y + 6, n.u, { leaf: true });
  })(root);
  return pos;
}
function arrowHeadTo(g, x, y, ux, uy) {
  const s = 7, px = -uy, py = ux;
  path('M' + r1(x - ux * s + px * s * .55) + ' ' + r1(y - uy * s + py * s * .55) + 'L' + r1(x) + ' ' + r1(y) + 'L' + r1(x - ux * s - px * s * .55) + ' ' + r1(y - uy * s - py * s * .55), 's-ink', g, { 'stroke-width': 1.4, fill: 'none' });
}
function gtPayoff(g, x, y, u, o) {
  o = o || {};
  const t = el('text', { x, y: o.leaf ? y + 8 : y, class: 'lbl', 'text-anchor': 'middle', 'font-size': o.fs || 13 }, g);
  if (u.length === 1) { const s = el('tspan', { class: 'lbl-ink' }, t); s.textContent = gtF(u[0]); }
  else u.forEach((v, i) => { if (i) { const c = el('tspan', {}, t); c.textContent = ', '; } const s = el('tspan', { class: 'lbl-' + (i ? 'red' : 'blue'), 'font-weight': 600 }, t); s.textContent = gtF(v); });
  if (o.boxed) t.setAttribute('class', 'lbl gt-val');
  return t;
}

/* ---------- automaton strategies for the iterated Prisoner's Dilemma ----------
   machine: { name, start, st: [{a: 'C'|'D', C: next, D: next}] } (transitions read the opponent's action) */
const GT_FSM = {
  ALLD: { name: 'ALLD', start: 0, st: [{ a: 'D', C: 0, D: 0 }] },
  ALLC: { name: 'ALLC', start: 0, st: [{ a: 'C', C: 0, D: 0 }] },
  GRIM: { name: 'GRIM', start: 0, st: [{ a: 'C', C: 0, D: 1 }, { a: 'D', C: 1, D: 1 }] },
  TFT: { name: 'TIT-FOR-TAT', start: 0, st: [{ a: 'C', C: 0, D: 1 }, { a: 'D', C: 0, D: 1 }] },
  TFTT: { name: 'TAT-FOR-TIT', start: 0, st: [{ a: 'D', C: 0, D: 1 }, { a: 'C', C: 1, D: 0 }] }
};
const GT_PD = { CC: [-1, -1], CD: [-3, 0], DC: [0, -3], DD: [-2, -2] };
function gtRun(m1, m2, max) {
  let s1 = m1.start, s2 = m2.start; const seen = {}, run = [];
  for (let t = 0; t < (max || 200); t++) {
    const key = s1 + ',' + s2;
    if (key in seen) return { run, k: seen[key] };
    seen[key] = t;
    const a1 = m1.st[s1].a, a2 = m2.st[s2].a; run.push(a1 + a2);
    s1 = m1.st[s1][a2]; s2 = m2.st[s2][a1];
  }
  return { run, k: 0 };
}
function gtDrawFSM(g, m, x, y, o) {
  o = o || {}; const R = 17, gap = o.gap || 92, n = m.st.length;
  const P = m.st.map((_, i) => [x + i * gap, y]);
  el('path', { d: 'M' + (P[m.start][0] - R - 22) + ' ' + y + 'H' + (P[m.start][0] - R - 2), class: 's s-ink', 'stroke-width': 1.4 }, g);
  arrowHeadTo(g, P[m.start][0] - R - 2, y, 1, 0);
  m.st.forEach((s, i) => {
    const [cx, cy] = P[i];
    const self = ['C', 'D'].filter(a => s[a] === i), other = ['C', 'D'].filter(a => s[a] !== i);
    if (self.length) {
      const up = i === 0 || n === 1 ? -1 : 1;
      path('M' + (cx - 7) + ' ' + (cy + up * R * .8) + 'C' + (cx - 20) + ' ' + (cy + up * 46) + ' ' + (cx + 20) + ' ' + (cy + up * 46) + ' ' + (cx + 7) + ' ' + (cy + up * R * .9), 's-soft', g, { fill: 'none', 'stroke-width': 1.3 });
      arrowHeadTo(g, cx + 7, cy + up * R * .9, -.3, -up);
      text(g, cx, cy + up * 46 + (up < 0 ? -3 : 12), self.join(','), 'lbl', { 'text-anchor': 'middle', 'font-size': 11.5 });
    }
    if (other.length) {
      const j = s[other[0]], [tx] = P[j], dir = tx > cx ? 1 : -1, bend = dir > 0 ? -16 : 16;
      path('M' + (cx + dir * R) + ' ' + (cy + bend * .35) + 'Q' + ((cx + tx) / 2) + ' ' + (cy + bend * 1.6) + ' ' + (tx - dir * R) + ' ' + (cy + bend * .35), 's-soft', g, { fill: 'none', 'stroke-width': 1.3 });
      arrowHeadTo(g, tx - dir * R, cy + bend * .35, dir, 0);
      text(g, (cx + tx) / 2, cy + bend * 1.6 + (bend < 0 ? -3 : 12), other.join(','), 'lbl', { 'text-anchor': 'middle', 'font-size': 11.5 });
    }
    el('circle', { cx, cy, r: R, class: (s.a === 'C' ? 'f-ochrew s-ochre' : 'f-redw s-red') + ' s', 'stroke-width': 1.6 }, g);
    text(g, cx, cy + 5, s.a, 'lbl-ink lbl-serif', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 600 });
  });
  if (o.label) text(g, x + (n - 1) * gap / 2, y + 82, o.label, 'lbl-ink', { 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600 });
}
