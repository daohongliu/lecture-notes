/* ---------- GT Ch3: shared presets ---------- */
const GT_GAMES = {
  'Prisoner’s Dilemma': { r: ['D', 'C'], c: ['d', 'c'], p1: '-2,0;-3,-1', p2: '-2,-3;0,-1' },
  'chicken': { r: ['Hard', 'Soft'], c: ['hard', 'soft'], p1: '0,4;2,3', p2: '0,2;4,3' },
  'coordination': { r: ['A', 'B'], c: ['a', 'b'], p1: '1,0;0,1', p2: '1,0;0,1' },
  'stag hunt': { r: ['Deer', 'Hare'], c: ['deer', 'hare'], p1: '7,0;4,4', p2: '7,4;0,4' },
  'hawk–dove': { r: ['Hawk', 'Dove'], c: ['hawk', 'dove'], p1: '-1,2;0,1', p2: '-1,0;2,1', note: 'V = 2, C = 2 in the convention of Example 3.19' },
  'matching pennies': { r: ['H', 'T'], c: ['h', 't'], p1: '1,-1;-1,1', p2: '-1,1;1,-1' },
  'running example': { r: ['T', 'B'], c: ['l', 'r'], p1: '1,1;0,0', p2: '1,0;0,1' },
  '3 × 3 (Ex. 3.24)': { r: ['T', 'M', 'B'], c: ['l', 'c', 'r'], p1: '4,5,6;2,8,3;3,9,2', p2: '3,1,2;1,4,6;0,6,8' }
};
function gtButtons(host, names, cur, onPick) {
  host.innerHTML = '';
  const bs = names.map(n => { const b = document.createElement('button'); b.textContent = n; b.dataset.g = n; b.addEventListener('click', () => { pressGroup(bs, n, 'data-g'); onPick(n); }); host.appendChild(b); return b; });
  pressGroup(bs, cur, 'data-g'); return bs;
}
const gtList = (xs, f) => xs.length ? xs.map(f).join(', ') : 'none';

/* ---------- GT Ch3 · Fig 3.1: Pareto frontier and welfare ---------- */
reg('gt-ch3', 'pareto', function () {
  const svg = $('#gt-par-svg'); if (!svg) return;
  const out = $('#gt-par-out'), g = el('g', {}, svg);
  const names = ['Prisoner’s Dilemma', 'chicken', 'stag hunt', '3 × 3 (Ex. 3.24)'];
  function render(name) {
    const G = GT_GAMES[name], P1 = gtParse(G.p1), P2 = gtParse(G.p2), A = gtAnalyse(P1, P2); clear(g);
    const pts = []; P1.forEach((r, i) => r.forEach((v, j) => pts.push({ i, j, x: v, y: P2[i][j] })));
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y), lo = Math.min(...xs, ...ys) - 1, hi = Math.max(...xs, ...ys) + 1;
    const L = 70, R = 400, B = 290, T = 20, X = v => L + (v - lo) / (hi - lo) * (R - L), Y = v => B - (v - lo) / (hi - lo) * (B - T);
    const ticks = []; for (let v = Math.ceil(lo); v <= hi; v++) ticks.push(v);
    const step = ticks.length > 10 ? 2 : 1;
    axisLine(g, L, R, B, ticks.filter(v => v % step === 0).map(v => [X(v), String(v)]), { dy: 16, fs: 10.5 });
    vAxis(g, L, B, T, ticks.filter(v => v % step === 0).map(v => [Y(v), String(v)]), { fs: 10.5 });
    text(g, R, B - 8, 'u₁', 'lbl-blue', { 'text-anchor': 'end', 'font-size': 13 }); text(g, L + 8, T + 4, 'u₂', 'lbl-red', { 'font-size': 13 });
    const sw = Math.max(...pts.map(p => p.x + p.y)), eg = Math.max(...pts.map(p => Math.min(p.x, p.y)));
    const clipX = v => clamp(v, lo, hi);
    path('M' + X(clipX(sw - hi)) + ' ' + Y(sw - clipX(sw - hi)) + 'L' + X(clipX(sw - lo)) + ' ' + Y(sw - clipX(sw - lo)), 's-ochre', g, { 'stroke-dasharray': '7 5', 'stroke-width': 1.4 });
    path('M' + X(hi) + ' ' + Y(eg) + 'H' + X(eg) + 'V' + Y(hi), 's-soft', g, { 'stroke-dasharray': '2 3', 'stroke-width': 1.4 });
    const par = new Set(A.par.map(([i, j]) => i + ',' + j)), ne = new Set(A.ne.map(([i, j]) => i + ',' + j));
    const frontier = pts.filter(p => par.has(p.i + ',' + p.j)).sort((a, b) => a.x - b.x);
    if (frontier.length > 1) path(poly(frontier.map(p => [X(p.x), Y(p.y)])), 's-blue', g, { 'stroke-width': 1.2, 'stroke-dasharray': '1 4' });
    const seen = {};
    pts.forEach(p => {
      const k = p.x + ',' + p.y, n = seen[k] = (seen[k] || 0) + 1, cx = X(p.x), cy = Y(p.y);
      if (ne.has(p.i + ',' + p.j)) el('circle', { cx, cy, r: 10, class: 's s-ochre', fill: 'none', 'stroke-width': 2 }, g);
      el('circle', { cx, cy, r: 5, class: par.has(p.i + ',' + p.j) ? 'f-blue' : 'f-paper s s-blue', 'stroke-width': 1.6 }, g);
      text(g, cx + 9, cy - 7 + (n - 1) * 13, '(' + G.r[p.i] + ',' + G.c[p.j] + ')', 'lbl', { 'font-size': 11 });
    });
    const x0 = 440;
    [['filled: Pareto optimal', 'lbl-blue'], ['ringed: Nash equilibrium', 'lbl-ochre'], ['dashed: max u₁+u₂ = ' + sw, 'lbl-ochre'], ['dotted: max min = ' + eg, 'lbl']].forEach(([s, c], k) => text(g, x0, 40 + k * 22, s, c, { 'font-size': 12 }));
    const nm = ([i, j]) => '(' + G.r[i] + ',' + G.c[j] + ')';
    out.innerHTML = 'Pareto optimal: ' + gtList(A.par, nm) + '.   Nash equilibria: ' + gtList(A.ne, nm) + '.   Utilitarian maximum: ' + pts.filter(p => p.x + p.y === sw).map(p => nm([p.i, p.j])).join(', ') + '.   Egalitarian maximum: ' + pts.filter(p => Math.min(p.x, p.y) === eg).map(p => nm([p.i, p.j])).join(', ') + '.';
  }
  gtButtons($('#gt-par-btns'), names, names[0], render); render(names[0]);
});

/* ---------- GT Ch3 · Fig 3.2: classic games ---------- */
reg('gt-ch3', 'classic', function () {
  const host = $('#gt-cg-tab'); if (!host) return;
  const out = $('#gt-cg-out'), names = Object.keys(GT_GAMES).filter(n => n.indexOf('3 ×') < 0);
  let G, P1, P2, cur;
  function load(n) { cur = n; G = GT_GAMES[n]; P1 = gtParse(G.p1); P2 = gtParse(G.p2); render(); }
  function render() {
    const { A } = gtTable(host, { rows: G.r, cols: G.c, P1, P2, edit: true, onChange: render });
    const nm = ([i, j]) => '(' + G.r[i] + ',' + G.c[j] + ')';
    out.innerHTML = (G.note ? '<span class="dim">' + G.note + '.</span><br>' : '') +
      'Dominant strategies: player 1 ' + gtList(A.dom1, i => G.r[i]) + '; player 2 ' + gtList(A.dom2, j => G.c[j]) + '.<br>' +
      'Pure Nash equilibria: <b>' + gtList(A.ne, nm) + '</b>' + (A.ne.length ? '' : ' (look for a mixed one, Chapter 4)') + '.<br>' +
      'Pareto optimal: ' + gtList(A.par, nm) + '.';
  }
  gtButtons($('#gt-cg-btns'), names, names[0], load); load(names[0]);
});

/* ---------- GT Ch3 · Fig 3.3: IEDS ---------- */
reg('gt-ch3', 'ieds', function () {
  const host = $('#gt-ieds-tab'); if (!host) return;
  const out = $('#gt-ieds-out'), names = ['3 × 3 (Ex. 3.24)', 'Prisoner’s Dilemma', 'running example', 'stag hunt'];
  let G, P1, P2, R, C, log;
  function load(n) { G = GT_GAMES[n]; P1 = gtParse(G.p1); P2 = gtParse(G.p2); R = G.r.map(() => true); C = G.c.map(() => true); log = []; render(); }
  const live = a => a.map((v, k) => v ? k : -1).filter(k => k >= 0);
  function nextDel() {
    const rs = live(R), cs = live(C);
    for (const i of rs) for (const k of rs) if (k !== i && cs.every(j => P1[k][j] > P1[i][j])) return [1, i, k];
    for (const j of cs) for (const k of cs) if (k !== j && rs.every(i => P2[i][k] > P2[i][j])) return [2, j, k];
    return null;
  }
  function render() {
    gtTable(host, { rows: G.r, cols: G.c, P1, P2, br: false, ne: false, dim: (i, j) => !R[i] || !C[j] });
    const nx = nextDel(), rs = live(R), cs = live(C);
    $('#gt-ieds-step').disabled = !nx;
    out.innerHTML = (log.length ? log.map((s, k) => (k + 1) + '. ' + s).join('<br>') + '<br>' : 'Nothing deleted yet.<br>') +
      (nx ? '<span class="dim">Next: ' + (nx[0] === 1 ? 'row ' + G.r[nx[1]] + ' is strictly dominated by ' + G.r[nx[2]] : 'column ' + G.c[nx[1]] + ' is strictly dominated by ' + G.c[nx[2]]) + '.</span>'
        : rs.length === 1 && cs.length === 1 ? '<b>Dominance-solvable:</b> only (' + G.r[rs[0]] + ',' + G.c[cs[0]] + ') survives.' : '<b>Stuck:</b> no strictly dominated strategies remain; ' + rs.length + ' × ' + cs.length + ' outcomes survive.');
  }
  $('#gt-ieds-step').addEventListener('click', () => {
    const nx = nextDel(); if (!nx) return;
    if (nx[0] === 1) { R[nx[1]] = false; log.push('delete row <b>' + G.r[nx[1]] + '</b>: ' + G.r[nx[2]] + ' is better for player 1 in every remaining column'); }
    else { C[nx[1]] = false; log.push('delete column <b>' + G.c[nx[1]] + '</b>: ' + G.c[nx[2]] + ' is better for player 2 in every remaining row'); }
    render();
  });
  let curName = names[0];
  $('#gt-ieds-reset').addEventListener('click', () => load(curName));
  gtButtons($('#gt-ieds-btns'), names, names[0], n => { curName = n; load(n); }); load(names[0]);
});

/* ---------- GT Ch3 · Fig 3.4: myopic best response ---------- */
reg('gt-ch3', 'mbr', function () {
  const host = $('#gt-mbr-tab'); if (!host) return;
  const out = $('#gt-mbr-out'), rows = ['T', 'M', 'B'], cols = ['l', 'c', 'r'];
  const P1 = gtParse('-1,1,-2;1,-1,-2;-2,-2,2'), P2 = gtParse('1,-1,-2;-1,1,-2;-2,-2,2');
  let cur, turn, trail, seen, done, msg;
  function start(i, j) { cur = [i, j]; turn = 1; trail = [[i, j]]; seen = {}; done = false; msg = 'Start at (' + rows[i] + ',' + cols[j] + ').'; render(); }
  function step() {
    if (done) return false;
    const [i, j] = cur;
    for (let tries = 0; tries < 2; tries++) {
      const p = turn; turn = 3 - turn;
      if (p === 1) { const col = P1.map(r => r[j]), b = col.indexOf(Math.max(...col)); if (P1[b][j] > P1[i][j]) { cur = [b, j]; msg = 'Player 1 switches to ' + rows[b] + ' (' + P1[b][j] + ' > ' + P1[i][j] + ').'; break; } }
      else { const row = P2[i], b = row.indexOf(Math.max(...row)); if (P2[i][b] > P2[i][j]) { cur = [i, b]; msg = 'Player 2 switches to ' + cols[b] + ' (' + P2[i][b] + ' > ' + P2[i][j] + ').'; break; } }
      if (tries === 1) { done = true; msg = 'Neither player wants to move: (' + rows[i] + ',' + cols[j] + ') is a Nash equilibrium.'; render(); return false; }
    }
    trail.push(cur.slice());
    const key = cur + '|' + turn;
    if (seen[key]) { done = true; msg += ' We have been here before with the same player to move: <b>the process cycles for ever</b>.'; }
    seen[key] = true; render(); return !done;
  }
  function render() {
    const onTrail = new Set(trail.map(c => c + ''));
    gtTable(host, { rows, cols, P1, P2, ne: true, click: (i, j) => start(i, j), mark: (i, j) => onTrail.has(i + ',' + j) });
    const tds = $$('tbody tr', host).map(tr => $$('td', tr)); tds[cur[0]][cur[1]].classList.add('cur');
    out.innerHTML = msg + '<br><span class="dim">path: ' + trail.map(([i, j]) => '(' + rows[i] + ',' + cols[j] + ')').join(' → ') + '</span>';
  }
  $('#gt-mbr-step').addEventListener('click', step);
  $('#gt-mbr-reset').addEventListener('click', () => start(0, 0));
  playButton($('#gt-mbr-play'), step, '▸ play', 700);
  start(0, 0);
});
