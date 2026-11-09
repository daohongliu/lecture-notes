/* ---------- GT Ch1 · Fig 1.1: timeline ---------- */
reg('gt-ch1', 'timeline', function () {
  const svg = $('#gt-hist-svg'); if (!svg) return;
  const L = 30, R = 690, Y = 34, X = yr => L + (yr - 1910) / (2010 - 1910) * (R - L);
  const g = el('g', {}, svg);
  [[1928, 1954, 'blue'], [1954, 1980, 'ochre'], [1980, 2010, 'red']].forEach(([a, b, c], k) => {
    el('rect', { x: X(a), y: Y - 9, width: X(b) - X(a), height: 18, class: 'f-' + c + 'w' }, g);
    text(g, (X(a) + X(b)) / 2, Y + 4, ['zero-sum games', 'Nash equilibrium', 'evolution & computation'][k], 'lbl-' + c, { 'text-anchor': 'middle', 'font-size': 11 });
  });
  path(SK.line(L, Y + 9, R, Y + 9, { seed: 3, rough: .3 }), 's-soft', g, { 'stroke-width': 1.1 });
  [1910, 1930, 1950, 1970, 1990, 2010].forEach(yr => text(g, X(yr), Y - 14, String(yr), '', { 'text-anchor': 'middle', 'font-size': 11 }));
  const ev = [[1913, 'Zermelo: chess', '(5)'], [1928, 'von Neumann: minimax', '(6)'], [1944, 'von Neumann & Morgenstern', '(2)'], [1950, 'Nash equilibrium', '(3, 4)'], [1965, 'Selten: subgame perfection', '(5)'],
    [1973, 'Maynard Smith & Price: ESS', '(5)'], [1984, 'Axelrod’s tournaments', '(5)'], [1994, 'Nobel: Nash, Selten, Harsanyi', ''], [2000, 'UK 3G spectrum auction', '(1)'], [2006, 'Nash equilibria PPAD-complete', '(4)']];
  const gL = el('g', {}, g), gT = el('g', {}, g);
  ev.forEach(([yr, s, ch], k) => {
    const y2 = Y + 44 + k * 19, x = X(yr), right = x > 470;
    path('M' + x + ' ' + (Y + 10) + 'V' + (y2 - 4), 's-soft', gL, { 'stroke-dasharray': '2 3' });
    el('circle', { cx: x, cy: Y + 10, r: 3, class: 'f-ink' }, gL);
    const t = text(gT, x + (right ? -6 : 6), y2, yr + '  ' + s, 'lbl-ink', { 'text-anchor': right ? 'end' : 'start', 'font-size': 11.5, style: 'paint-order:stroke;stroke:var(--paper);stroke-width:5px;stroke-linejoin:round' });
    if (ch) { const sp = el('tspan', { class: 'lbl' }, t); sp.textContent = ' ' + ch; }
});
});

/* ---------- GT Ch2 · Fig 2.1: utility of money ---------- */
reg('gt-ch2', 'money', function () {
  const svg = $('#gt-mon-svg'); if (!svg) return;
  const sa = $('#gt-mon-a'), sb = $('#gt-mon-b'), out = $('#gt-mon-out');
  let shape = 'concave';
  const U = { concave: x => Math.sqrt(x / 100), linear: x => x / 100, convex: x => (x / 100) ** 2 };
  const Ui = { concave: u => 100 * u * u, linear: u => 100 * u, convex: u => 100 * Math.sqrt(u) };
  const L = 70, R = 470, B = 260, T = 20, X = x => L + x / 100 * (R - L), Y = u => B - u * (B - T);
  const gA = el('g', {}, svg), g = el('g', {}, svg);
  axisLine(gA, L, R + 6, B, [0, 25, 50, 75, 100].map(x => [X(x), '£' + x]), { dy: 17, fs: 11 });
  vAxis(gA, L, B, T - 4, [0, .5, 1].map(u => [Y(u), String(u)]));
  text(gA, L + 6, T + 2, 'utility', 'lbl', {});
  function render() {
    let a = +sa.value, b = +sb.value; $('#gt-mon-av').textContent = a; $('#gt-mon-bv').textContent = b;
    clear(g); const u = U[shape];
    const pts = []; for (let k = 0; k <= 100; k++) pts.push([X(k), Y(u(k))]);
    path(poly(pts), 's-blue', g, { 'stroke-width': 2.4, fill: 'none' });
    path('M' + X(a) + ' ' + Y(u(a)) + 'L' + X(b) + ' ' + Y(u(b)), 's-red', g, { 'stroke-width': 1.5, 'stroke-dasharray': '6 4' });
    const em = (a + b) / 2, eu = (u(a) + u(b)) / 2, ce = Ui[shape](eu);
    [a, b].forEach(x => el('circle', { cx: X(x), cy: Y(u(x)), r: 4, class: 'f-red' }, g));
    el('circle', { cx: X(em), cy: Y(eu), r: 5.5, class: 'f-ochre' }, g);
    path('M' + X(em) + ' ' + B + 'V' + Y(eu), 's-soft', g, { 'stroke-dasharray': '2 3' });
    path('M' + X(ce) + ' ' + Y(eu) + 'H' + X(em), 's-ochre', g, { 'stroke-width': 1.6 });
    path('M' + X(ce) + ' ' + B + 'V' + Y(eu), 's-blue', g, { 'stroke-dasharray': '3 3', 'stroke-width': 1.3 });
    el('circle', { cx: X(ce), cy: Y(eu), r: 4, class: 'f-blue' }, g);
    text(g, X(em), B + 32, 'E[money]', 'lbl-ochre', { 'text-anchor': 'middle', 'font-size': 11 });
    text(g, X(ce), B + 46, 'cert. equiv.', 'lbl-blue', { 'text-anchor': 'middle', 'font-size': 11 });
    const x0 = 510; text(g, x0, 60, 'gamble: ½ £' + a + ' + ½ £' + b, 'lbl-ink', { 'font-size': 13 });
    text(g, x0, 88, 'expected money  £' + em.toFixed(1), 'lbl-ochre', { 'font-size': 12.5 });
    text(g, x0, 112, 'expected utility  ' + eu.toFixed(3), 'lbl-ink', { 'font-size': 12.5 });
    text(g, x0, 136, 'certainty equiv.  £' + ce.toFixed(1), 'lbl-blue', { 'font-size': 12.5 });
    const prem = em - ce;
    out.innerHTML = Math.abs(a - b) < .5 ? 'No risk: both prizes are equal.' :
      shape === 'concave' ? 'Risk-averse: this agent would take <b>£' + ce.toFixed(1) + '</b> for certain instead of the gamble, giving up £' + prem.toFixed(1) + ' of expected money to avoid the risk.'
      : shape === 'linear' ? 'Risk-neutral: the certainty equivalent equals the expected money, £' + em.toFixed(1) + '.'
      : 'Risk-seeking: the agent would need <b>£' + ce.toFixed(1) + '</b> for certain, more than the expected £' + em.toFixed(1) + ', to give up the gamble.';
  }
  $$('[data-shape]', svg.parentNode).forEach(b => b.addEventListener('click', () => { shape = b.dataset.shape; pressGroup($$('[data-shape]', svg.parentNode), shape, 'data-shape'); render(); }));
  sa.addEventListener('input', render); sb.addEventListener('input', render); render();
});

/* ---------- GT Ch2 · Fig 2.2: the robot's lotteries ---------- */
reg('gt-ch2', 'robot', function () {
  const svg = $('#gt-rob-svg'); if (!svg) return;
  const out = $('#gt-rob-out'), S = 58, X0 = 40, Y0 = 34;
  const dist = (x, y) => Math.max(0, 4 - Math.abs(x - 2) - Math.abs(y));
  let U;
  const reset = f => { U = []; for (let y = 0; y < 4; y++) { U.push([]); for (let x = 0; x < 4; x++) U[y].push(f(x, y)); } };
  reset(dist);
  const acts = [['north', [[2, 1, .6], [1, 2, .2], [3, 2, .2]]], ['west', [[1, 2, .6], [2, 1, .2], [2, 3, .2]]], ['east', [[3, 2, .6], [2, 1, .2], [2, 3, .2]]]];
  const g = el('g', {}, svg);
  function render() {
    clear(g);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const r = el('rect', { x: X0 + x * S, y: Y0 + y * S, width: S, height: S, class: 'f-paper s s-soft', 'stroke-width': 1.2, tabindex: 0, role: 'button', 'aria-label': 'cell ' + x + ',' + y + ', utility ' + U[y][x], style: 'cursor:pointer' }, g);
      const hit = () => { U[y][x] = (U[y][x] + 1) % 6; render(); };
      r.addEventListener('click', hit); r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(); } });
      el('rect', { x: X0 + x * S + 3, y: Y0 + y * S + 3, width: S - 6, height: S - 6, fill: 'var(--ochre)', opacity: U[y][x] / 5 * .35, 'pointer-events': 'none' }, g);
      text(g, X0 + x * S + S - 6, Y0 + y * S + 15, String(U[y][x]), 'lbl-ink', { 'text-anchor': 'end', 'font-size': 12, 'pointer-events': 'none' });
      text(g, X0 + x * S + 5, Y0 + y * S + S - 5, '(' + x + ',' + y + ')', 'lbl', { 'font-size': 9, 'pointer-events': 'none' });
    }
    text(g, X0 + 2 * S + S / 2, Y0 + S / 2 + 7, '£', 'lbl-ochre lbl-serif', { 'text-anchor': 'middle', 'font-size': 22, 'pointer-events': 'none' });
    el('circle', { cx: X0 + 2.5 * S, cy: Y0 + 2.5 * S, r: 12, class: 'f-blue', 'pointer-events': 'none' }, g);
    text(g, X0 + 2.5 * S, Y0 + 2.5 * S + 4, 'R', 'lbl', { 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--paper)', 'pointer-events': 'none' });
    const eus = acts.map(([n, L]) => L.reduce((s, [x, y, p]) => s + p * U[y][x], 0)), best = Math.max(...eus);
    acts.forEach(([n, L], k) => {
      const y0 = 50 + k * 80, x0 = 330;
      text(g, x0, y0, n, 'lbl-ink', { 'font-size': 14, 'font-weight': 600 });
      text(g, x0, y0 + 20, L.map(([x, y, p]) => p + '·u(' + x + ',' + y + ')').join(' + '), 'lbl', { 'font-size': 11.5 });
      text(g, x0, y0 + 40, '= ' + L.map(([x, y, p]) => p + '·' + U[y][x]).join(' + ') + ' = ' + eus[k].toFixed(2), eus[k] === best ? 'lbl-ochre' : 'lbl', { 'font-size': 12.5, 'font-weight': eus[k] === best ? 700 : 400 });
    });
    const L = acts[eus.indexOf(best)][1];
    L.forEach(([x, y, p]) => {
      const sx = X0 + 2.5 * S, sy = Y0 + 2.5 * S, tx = X0 + (x + .5) * S, ty = Y0 + (y + .5) * S, d = Math.hypot(tx - sx, ty - sy);
      path('M' + (sx + (tx - sx) / d * 14) + ' ' + (sy + (ty - sy) / d * 14) + 'L' + (tx - (tx - sx) / d * 8) + ' ' + (ty - (ty - sy) / d * 8), 's-ochre', g, { 'stroke-width': 1 + p * 5 });
    });
    out.innerHTML = 'Best move: <b>' + acts.filter((a, k) => eus[k] === best).map(a => a[0]).join(' or ') + '</b>, expected utility ' + best.toFixed(2) + '. Arrows show its lottery (thicker = likelier).';
  }
  $('#gt-rob-reset').addEventListener('click', () => { reset(dist); render(); });
  $('#gt-rob-only').addEventListener('click', () => { const Rn = rng(Date.now() & 0xffff); reset(() => Math.floor(Rn() * 6)); render(); });
  render();
});

/* ---------- GT Ch2 · Fig 2.3: Allais ---------- */
reg('gt-ch2', 'allais', function () {
  const svg = $('#gt-al-svg'); if (!svg) return;
  const sy = $('#gt-al-y'), out = $('#gt-al-out');
  const lots = [['ℓA', [0, 1, 0]], ['ℓB', [.01, .89, .1]], ['ℓC', [.89, .11, 0]], ['ℓD', [.9, 0, .1]]]; /* P($0), P($2m), P($10m) */
  const cls = ['f-soft', 'f-ochre', 'f-blue'], names = ['$0', '$2m', '$10m'];
  const g = el('g', {}, svg), H = 190, B = 220, W = 70;
  function render() {
    const y = +sy.value; $('#gt-al-yv').textContent = y.toFixed(2); clear(g);
    const us = [0, y, 1], eu = lots.map(l => l[1].reduce((s, p, k) => s + p * us[k], 0));
    lots.forEach(([n, ps], k) => {
      const x = 60 + k * 120 + (k > 1 ? 40 : 0); let top = B;
      ps.forEach((p, j) => { if (p <= 0) return; const h = p * H; el('rect', { x, y: top - h, width: W, height: h, class: cls[j], opacity: j === 0 ? .35 : .75 }, g); if (h > 13) text(g, x + W / 2, top - h / 2 + 4, Math.round(p * 100) + '%', 'lbl', { 'text-anchor': 'middle', 'font-size': 10.5, fill: j ? 'var(--paper)' : 'var(--ink)' }); top -= h; });
      text(g, x + W / 2, B + 18, n, 'lbl-ink lbl-serif', { 'text-anchor': 'middle', 'font-size': 15 });
      text(g, x + W / 2, B + 36, 'EU ' + eu[k].toFixed(3), 'lbl', { 'text-anchor': 'middle', 'font-size': 11.5 });
    });
    names.forEach((n, j) => { el('rect', { x: 560, y: 40 + j * 22, width: 14, height: 14, class: cls[j], opacity: j ? .75 : .35 }, g); text(g, 580, 52 + j * 22, n + '  u = ' + us[j].toFixed(2), 'lbl', { 'font-size': 12 }); });
    const d1 = eu[0] - eu[1], d2 = eu[2] - eu[3];
    out.innerHTML = 'EU(ℓA) − EU(ℓB) = <b>' + d1.toFixed(3) + '</b>,   EU(ℓC) − EU(ℓD) = <b>' + d2.toFixed(3) + '</b>. ' + (Math.abs(d1) < 1e-9 ? 'Indifferent in both pairs.' : d1 > 0 ? 'An expected utility maximiser prefers A to B <i>and</i> C to D.' : 'An expected utility maximiser prefers B to A <i>and</i> D to C.') + ' The common answer "A and D" is never produced.';
  }
  sy.addEventListener('input', render); render();
});
