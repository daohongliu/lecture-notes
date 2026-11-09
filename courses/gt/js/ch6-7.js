/* ---------- GT Ch6 · Fig 6.1: maximin, minimax, saddle points ---------- */
reg('gt-ch6', 'maximin', function () {
  const host = $('#gt-mm-tab'); if (!host) return;
  const out = $('#gt-mm-out');
  const presets = {
    'running example': { r: ['A', 'B', 'C', 'D'], c: ['X', 'Y', 'Z'], p: '2,5,13;6,5.6,10.5;6,4.5,1;10,3,-2' },
    'Example 6.9': { r: ['T', 'C', 'B'], c: ['L', 'M', 'R'], p: '3,-2,1;-1,3,2;2,1,-3' },
    'matching pennies': { r: ['H', 'T'], c: ['h', 't'], p: '1,-1;-1,1' },
    'two fingers': { r: ['one', 'two'], c: ['one', 'two'], p: '2,-3;-3,4' }
  };
  let G, P;
  function load(n) { G = presets[n]; P = gtParse(G.p); render(); }
  function render() {
    gtTable(host, { rows: G.r, cols: G.c, P1: P, P2: null, edit: true, mm: true, onChange: render });
    const rmin = P.map(r => Math.min(...r)), cmax = P[0].map((_, j) => Math.max(...P.map(r => r[j])));
    const lo = Math.max(...rmin), hi = Math.min(...cmax), sad = [];
    P.forEach((r, i) => r.forEach((v, j) => { if (v === rmin[i] && v === cmax[j]) sad.push('(' + G.r[i] + ',' + G.c[j] + ')'); }));
    out.innerHTML = 'Maximin <span class="dim">(best row minimum)</span> = <b>' + gtF(lo, 3) + '</b>, from row ' + G.r.filter((_, i) => rmin[i] === lo).join(', ') + '.   Minimax <span class="dim">(least column maximum)</span> = <b>' + gtF(hi, 3) + '</b>, from column ' + G.c.filter((_, j) => cmax[j] === hi).join(', ') + '.<br>' +
      (sad.length ? 'Saddle point' + (sad.length > 1 ? 's' : '') + ': <b>' + sad.join(', ') + '</b>, so the game has value ' + gtF(lo, 3) + ' in pure strategies.' : 'No saddle point: the value lies strictly between ' + gtF(lo, 3) + ' and ' + gtF(hi, 3) + ', and the players must mix.');
  }
  gtButtons($('#gt-mm-btns'), Object.keys(presets), 'running example', load); load('running example');
});

/* ---------- GT Ch6 · Fig 6.2: graphical solution of 2 × n zero-sum games ---------- */
reg('gt-ch6', 'graphical', function () {
  const host = $('#gt-gr-tab'), svg = $('#gt-gr-svg'); if (!host || !svg) return;
  const out = $('#gt-gr-out'), g = el('g', {}, svg);
  const presets = {
    'matching pennies': { r: ['H', 'T'], c: ['h', 't'], p: '1,-1;-1,1' },
    '2 × 3 game': { r: ['T', 'B'], c: ['X', 'Y', 'Z'], p: '4,-1,1;-2,2,0' },
    'two fingers': { r: ['one', 'two'], c: ['one', 'two'], p: '2,-3;-3,4' },
    'saddle point': { r: ['T', 'B'], c: ['X', 'Y'], p: '3,2;1,0' }
  };
  let G, P;
  const L = 50, R = 350, B = 250, T = 20;
  function load(n) { G = presets[n]; P = gtParse(G.p); render(); }
  function render() {
    gtTable(host, { rows: G.r, cols: G.c, P1: P, P2: null, edit: true, br: false, ne: false, onChange: render });
    clear(g);
    const lines = P[0].map((_, j) => [P[0][j], P[1][j]]); /* value at p = 1 is P[0][j], at p = 0 is P[1][j] */
    const f = (ln, p) => p * ln[0] + (1 - p) * ln[1], env = p => Math.min(...lines.map(ln => f(ln, p)));
    const all = lines.flat(), lo = Math.min(...all) - .5, hi = Math.max(...all) + .5, X = p => L + p * (R - L), Y = v => B - (v - lo) / (hi - lo) * (B - T);
    const cand = [0, 1]; lines.forEach((a, i) => lines.forEach((b, k) => { if (k > i) { const d = (a[0] - a[1]) - (b[0] - b[1]); if (d !== 0) { const p = (b[1] - a[1]) / d; if (p > 0 && p < 1) cand.push(p); } } }));
    let ps = 0, v = -Infinity; cand.forEach(p => { const e = env(p); if (e > v + 1e-12) { v = e; ps = p; } });
    axisLine(g, L, R, Y(Math.max(lo, Math.min(0, hi))), [[X(0), '0'], [X(.5), '½'], [X(1), '1']], { dy: 15, fs: 10.5 });
    const vt = []; for (let k = Math.ceil(lo); k <= hi; k++) vt.push([Y(k), String(k)]);
    vAxis(g, L, B, T, vt, { fs: 10.5 });
    text(g, R, B + 30, 'p = P(' + G.r[0] + ')', 'lbl-blue', { 'text-anchor': 'end', 'font-size': 11.5 });
    lines.forEach((ln, j) => {
      path('M' + X(0) + ' ' + Y(ln[1]) + 'L' + X(1) + ' ' + Y(ln[0]), 's-red', g, { 'stroke-width': 1.3, opacity: .75 });
      text(g, X(1) + 5, Y(ln[0]) + 4, G.c[j], 'lbl-red lbl-serif', { 'font-size': 13, 'font-style': 'italic' });
    });
    const pts = []; for (let k = 0; k <= 200; k++) pts.push([X(k / 200), Y(env(k / 200))]);
    path(poly(pts), 's-blue', g, { 'stroke-width': 3.4, fill: 'none' });
    el('circle', { cx: X(ps), cy: Y(v), r: 7, class: 'f-ochre' }, g);
    path('M' + X(ps) + ' ' + B + 'V' + Y(v), 's-ochre', g, { 'stroke-dasharray': '3 3' });
    const act = lines.map((ln, j) => Math.abs(f(ln, ps) - v) < 1e-9 ? G.c[j] : null).filter(Boolean);
    out.innerHTML = 'Player 1 plays ' + G.r[0] + ' with probability <b>' + gtFrac(ps) + '</b>, guaranteeing <b>' + gtFrac(v) + '</b>, the value of the game. ' +
      'Columns through the peak: ' + act.join(', ') + (act.length < lines.length ? '; player 2 never needs ' + G.c.filter(c => act.indexOf(c) < 0).join(', ') + '.' : '.');
  }
  gtButtons($('#gt-gr-btns'), Object.keys(presets), 'matching pennies', load); load('matching pennies');
});

/* ---------- GT Ch7 · Fig 7.1: winning positions in a graph game ---------- */
reg('gt-ch7', 'graphgame', function () {
  const svg = $('#gt-gg-svg'); if (!svg) return;
  const out = $('#gt-gg-out'), g = el('g', {}, svg);
  /* player 1 = circles (even index rows), player 2 = squares */
  const V = [
    { n: 'v₀', p: 1, x: 70, y: 160 }, { n: 'a', p: 2, x: 200, y: 70 }, { n: 'b', p: 2, x: 200, y: 250 },
    { n: 'c', p: 1, x: 340, y: 40 }, { n: 'd', p: 1, x: 340, y: 160 }, { n: 'e', p: 1, x: 340, y: 280 },
    { n: 'f', p: 2, x: 490, y: 70 }, { n: 'g', p: 2, x: 490, y: 220 }, { n: 'h', p: 1, x: 630, y: 70 }, { n: 'i', p: 1, x: 630, y: 230 }
  ];
  const E = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 9], [7, 5], [8, 6], [9, 7], [5, 2]];
  let W0 = new Set([8]), W, rank, passes;
  function reset() { W = new Set(W0); rank = {}; W0.forEach(v => rank[v] = 0); passes = 0; render(); }
  function pass() {
    const add = [];
    V.forEach((v, i) => {
      if (W.has(i)) return;
      const outs = E.filter(e => e[0] === i).map(e => e[1]);
      if (v.p === 1 ? outs.some(t => W.has(t)) : outs.every(t => W.has(t))) add.push(i);
    });
    passes++; add.forEach(i => { W.add(i); rank[i] = passes; });
    render(add); return add.length > 0;
  }
  function render(added) {
    clear(g); added = added || [];
    E.forEach(([a, b]) => {
      const A = V[a], Bv = V[b], dx = Bv.x - A.x, dy = Bv.y - A.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, rev = E.some(e => e[0] === b && e[1] === a), off = rev ? 6 : 0;
      const sx = A.x + ux * 20 - uy * off, sy = A.y + uy * 20 + ux * off, ex = Bv.x - ux * 22 - uy * off, ey = Bv.y - uy * 22 + ux * off;
      path('M' + r1(sx) + ' ' + r1(sy) + 'L' + r1(ex) + ' ' + r1(ey), W.has(b) && W.has(a) ? 's-ochre' : 's-soft', g, { 'stroke-width': 1.4 });
      arrowHeadTo(g, ex, ey, ux, uy);
    });
    V.forEach((v, i) => {
      const inW = W.has(i), cls = (inW ? 'f-ochrew' : 'f-paper') + ' s ' + (v.p === 1 ? 's-blue' : 's-red'), a = { class: cls, 'stroke-width': added.indexOf(i) >= 0 ? 3.2 : 1.6, tabindex: 0, role: 'button', 'aria-label': v.n + (W0.has(i) ? ', in W0' : ''), style: 'cursor:pointer' };
      const sh = v.p === 1 ? el('circle', Object.assign({ cx: v.x, cy: v.y, r: 18 }, a), g) : el('rect', Object.assign({ x: v.x - 17, y: v.y - 17, width: 34, height: 34, rx: 3 }, a), g);
      if (W0.has(i)) { if (v.p === 1) el('circle', { cx: v.x, cy: v.y, r: 23, class: 's s-ochre', fill: 'none', 'stroke-width': 1.6, 'pointer-events': 'none' }, g); else el('rect', { x: v.x - 22, y: v.y - 22, width: 44, height: 44, rx: 4, class: 's s-ochre', fill: 'none', 'stroke-width': 1.6, 'pointer-events': 'none' }, g); }
      text(g, v.x, v.y + 5, i in rank ? String(rank[i]) : '', 'lbl-ink', { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 600, 'pointer-events': 'none' });
      text(g, v.x, v.y + 40, v.n, 'lbl-ink lbl-serif', { 'text-anchor': 'middle', 'font-size': 14, 'font-style': 'italic', 'pointer-events': 'none' });
      const hit = () => { if (W0.has(i)) W0.delete(i); else W0.add(i); reset(); };
      sh.addEventListener('click', hit); sh.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(); } });
    });
    const stable = passes > 0 && !added.length;
    $('#gt-gg-step').disabled = stable;
    out.innerHTML = 'W₀ = {' + [...W0].map(i => V[i].n).join(', ') + '}.  Pass ' + passes + (added.length ? ' added ' + added.map(i => V[i].n).join(', ') : passes ? ' added nothing: W is complete' : '') + '.<br>' +
      (stable ? (W.has(0) ? '<b>v₀ ∈ W: player 1 can force a win.</b> From each circle in W, move to a neighbour with a smaller number.' : '<b>v₀ ∉ W: player 2 can stop player 1 for ever</b> by staying outside W.') : '<span class="dim">Player 1 (circles) needs one edge into W; player 2 (squares) is caught only if all her edges lead into W.</span>');
  }
  $('#gt-gg-step').addEventListener('click', pass);
  $('#gt-gg-reset').addEventListener('click', reset);
  reset();
});

/* ---------- GT Ch7 · Fig 7.2: Geography ---------- */
reg('gt-ch7', 'geography', function () {
  const svg = $('#gt-geo-svg'); if (!svg) return;
  const out = $('#gt-geo-out'), mv = $('#gt-geo-moves'), sb = $('#gt-geo-sol'), g = el('g', {}, svg);
  const C = { Peoria: [70, 150], Austin: [230, 50], Albany: [230, 150], Amherst: [230, 250], Nashville: [420, 50], Tucson: [420, 200], Tokyo: [420, 280], Oakland: [620, 230], Oxford: [620, 290] };
  const names = Object.keys(C), nxt = c => names.filter(d => d !== c && d[0].toLowerCase() === c[c.length - 1]);
  let path_ = ['Peoria'], show = false, over = false;
  /* win(c, used): does the player who has just named c win (the next player is stuck or loses)? */
  function win(c, used) { const ms = nxt(c).filter(d => used.indexOf(d) < 0); return ms.every(d => !win(d, used.concat(d))); }
  function moves() { const c = path_[path_.length - 1]; return nxt(c).filter(d => path_.indexOf(d) < 0); }
  function render() {
    clear(g);
    names.forEach(a => nxt(a).forEach(b => {
      const [x1, y1] = C[a], [x2, y2] = C[b], dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const on = path_.indexOf(a) >= 0 && path_.indexOf(b) === path_.indexOf(a) + 1;
      path('M' + r1(x1 + ux * 44) + ' ' + r1(y1 + uy * 16) + 'L' + r1(x2 - ux * 46) + ' ' + r1(y2 - uy * 16), on ? 's-ochre' : 's-soft', g, { 'stroke-width': on ? 3 : 1.3 });
      arrowHeadTo(g, x2 - ux * 46, y2 - uy * 16, ux, uy);
    }));
    names.forEach(c => {
      const [x, y] = C[c], k = path_.indexOf(c);
      el('rect', { x: x - 44, y: y - 15, width: 88, height: 30, rx: 15, class: (k >= 0 ? (k % 2 ? 'f-redw s-red' : 'f-bluew s-blue') : 'f-paper s-soft') + ' s', 'stroke-width': 1.5 }, g);
      text(g, x, y + 5, c, 'lbl-ink', { 'text-anchor': 'middle', 'font-size': 12.5 });
      if (k >= 0) text(g, x - 40, y - 19, (k ? (k % 2 ? 'P2' : 'P1') + ' · ' : 'start · ') + (k + 1), k % 2 ? 'lbl-red' : 'lbl-blue', { 'font-size': 10 });
      if (show && c !== 'Peoria') { /* value for whoever names c, assuming the cities named before c on the current path */ const w = win(c, ['Peoria', c]); text(g, x + 44, y + 28, w ? 'win' : 'lose', w ? 'lbl-ochre' : 'lbl', { 'text-anchor': 'end', 'font-size': 10.5, 'font-weight': 600 }); }
    });
    mv.innerHTML = '';
    const ms = moves();
    if (!over && path_.length % 2 === 1) ms.forEach(d => { const b = document.createElement('button'); b.textContent = d; b.addEventListener('click', () => play(d)); mv.appendChild(b); });
  }
  function play(d) {
    path_.push(d);
    let ms = moves();
    if (!ms.length) { over = true; out.innerHTML = 'Player 2 has no city starting with “' + d[d.length - 1] + '”. <b>You win.</b>'; render(); return; }
    const good = ms.filter(e => win(e, path_.concat(e))), e = (good[0] || ms[0]);
    path_.push(e); ms = moves();
    if (!ms.length) { over = true; out.innerHTML = 'Player 2 says ' + e + '. You have no city starting with “' + e[e.length - 1] + '”. <b>You lose.</b>'; }
    else out.innerHTML = 'Player 2 says ' + e + '. Your move.';
    render();
  }
  sb.addEventListener('click', () => { show = !show; sb.setAttribute('aria-pressed', String(show)); render(); });
  $('#gt-geo-reset').addEventListener('click', () => { path_ = ['Peoria']; over = false; out.innerHTML = 'You are player 1. Name a city after Peoria.'; render(); });
  out.innerHTML = 'You are player 1. Name a city after Peoria.'; render();
});
