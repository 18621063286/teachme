// 第 3 课的度量对比组件。依赖 ca.js 里的 ECA，须在它之后加载。
//
// 1) 可点的一行：<div class="m-row" data-width="24"></div>
//    点格子翻转 0/1，实时显示单格熵 H 和转换次数 T；「打乱」「排序」按钮演示 H 对置换不变而 T 会变。
// 2) 手算转换次数：<div class="m-calc" data-row="0011101001100010"></div>
// 3) 两条度量随时间：<div class="m-time" data-rule="30" data-width="100" data-steps="100"></div>
//    画 H(t) 和 T(t)/(N−1)，两者都归一化到 [0, 1]。
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const plogp = p => (p > 0 ? p * Math.log2(p) : 0);
  const H = row => { const p = row.reduce((a, b) => a + b, 0) / row.length; return -plogp(p) - plogp(1 - p); };
  const T = row => row.slice(1).reduce((s, v, i) => s + (v !== row[i] ? 1 : 0), 0);

  function svgEl(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function cellRow(row, editable, onFlip) {
    const r = document.createElement('div');
    r.className = 'ca-row';
    const cells = row.map((v, i) => {
      const c = document.createElement('div');
      c.className = 'ca-cell' + (v ? ' on' : '') + (editable ? ' edit' : '');
      if (editable) c.addEventListener('click', () => onFlip(i));
      r.appendChild(c);
      return c;
    });
    return { el: r, cells };
  }

  function setupRow(host) {
    const w = Number(host.dataset.width || 24);
    const row = new Array(w).fill(0);
    const { el, cells } = cellRow(row, true, i => { row[i] ^= 1; paint(); });
    host.appendChild(el);
    const bar = document.createElement('div');
    bar.style.marginTop = '.6rem';
    const set = f => () => { row.forEach((_, i) => { row[i] = f(i); }); paint(); };
    const buttons = [
      ['全 0', set(() => 0)],
      ['交替 0101', set(i => i % 2)],
      ['左半 1', set(i => (i < w / 2 ? 1 : 0))],
      ['随机', set(() => (Math.random() < 0.5 ? 1 : 0))],
      ['打乱', () => {
        for (let i = w - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [row[i], row[j]] = [row[j], row[i]]; }
        paint();
      }],
      ['排序', () => { row.sort((a, b) => b - a); paint(); }],
    ];
    buttons.forEach(([name, f]) => {
      const b = document.createElement('button');
      b.textContent = name;
      b.onclick = f;
      bar.appendChild(b);
    });
    host.appendChild(bar);
    const out = document.createElement('p');
    out.className = 'h-readout';
    host.appendChild(out);

    function paint() {
      row.forEach((v, i) => cells[i].classList.toggle('on', !!v));
      const n1 = row.reduce((a, b) => a + b, 0);
      out.innerHTML = `1 的个数 ${n1}/${w}　·　<strong>单格熵 H = ${H(row).toFixed(4)} bit</strong>　·　<strong>转换次数 T = ${T(row)}</strong>（最多 ${w - 1}）`;
    }
    paint();
  }

  function setupCalc(host) {
    const row = host.dataset.row.split('').map(Number);
    host.appendChild(cellRow(row, false).el);
    const bar = document.createElement('div');
    bar.style.marginTop = '.7rem';
    const input = document.createElement('input');
    Object.assign(input, { type: 'text', inputMode: 'numeric', placeholder: 'T = ?' });
    input.className = 'h-input';
    const check = document.createElement('button');
    check.textContent = '检查';
    const reveal = document.createElement('button');
    reveal.textContent = '看答案';
    bar.append(input, check, reveal);
    const fb = document.createElement('p');
    fb.className = 'feedback';
    host.append(bar, fb);
    const ans = T(row);
    const why = `相邻两格不同就记 1，共 ${row.length - 1} 对，其中 ${ans} 对不同，所以 T = ${ans}`;
    check.onclick = () => {
      const g = parseInt(input.value, 10);
      if (Number.isNaN(g)) { fb.className = 'feedback bad'; fb.textContent = '先填一个整数。'; return; }
      fb.className = 'feedback ' + (g === ans ? 'ok' : 'bad');
      fb.textContent = g === ans ? `对。${why}。`
        : g > row.length - 1 ? `${row.length} 格只有 ${row.length - 1} 对相邻格，T 不会超过 ${row.length - 1}。`
        : '还不对。数「颜色变化的地方」，不是数黑格。不用绕回首尾，notebook 的 diff 不是周期的。';
    };
    reveal.onclick = () => { fb.className = 'feedback'; fb.textContent = why + '。'; };
  }

  function setupTime(host) {
    const rule = Number(host.dataset.rule), w = Number(host.dataset.width || 100), steps = Number(host.dataset.steps || 100);
    let row = new Array(w).fill(0);
    row[Math.floor(w / 2)] = 1;
    const hs = [], ts = [];
    for (let t = 0; t < steps; t++) { hs.push(H(row)); ts.push(T(row) / (w - 1)); row = ECA.step(row, rule); }

    const W = 520, Hpx = 210, L = 38, R = 10, Tp = 10, B = 30;
    const X = x => L + (x / steps) * (W - L - R);
    const Y = y => Tp + (1 - y) * (Hpx - Tp - B);
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${Hpx}`, class: 'h-svg', role: 'img', 'aria-label': `Rule ${rule} 的单格熵和归一化转换次数随时间变化` });
    svg.appendChild(svgEl('line', { x1: L, y1: Y(0), x2: W - R, y2: Y(0), class: 'axis' }));
    svg.appendChild(svgEl('line', { x1: L, y1: Y(0), x2: L, y2: Y(1), class: 'axis' }));
    svg.appendChild(svgEl('line', { x1: L, y1: Y(1), x2: W - R, y2: Y(1), class: 'grid' }));
    const text = (x, y, s, anchor) => { const t = svgEl('text', { x, y, class: 'tick', 'text-anchor': anchor || 'start' }); t.textContent = s; svg.appendChild(t); };
    [[0, '0'], [0.5, '0.5'], [1, '1']].forEach(([y, s]) => text(L - 6, Y(y) + 4, s, 'end'));
    [0, steps / 2, steps].forEach(x => text(X(x), Hpx - 12, String(x), 'middle'));
    text(W - R, Hpx - 1, '时间步 t', 'end');
    const line = (vals, cls) => svgEl('polyline', { points: vals.map((v, t) => `${X(t)},${Y(v)}`).join(' '), class: cls });
    svg.appendChild(line(hs, 'curve'));
    svg.appendChild(line(ts, 'curve m-alt'));
    host.appendChild(svg);
    const legend = document.createElement('p');
    legend.className = 'h-readout';
    legend.innerHTML = '<span class="m-key"></span>单格熵 H(t)　　<span class="m-key alt"></span>转换次数 T(t) ⁄ (N−1)';
    host.appendChild(legend);
  }

  document.querySelectorAll('.m-row').forEach(setupRow);
  document.querySelectorAll('.m-calc').forEach(setupCalc);
  document.querySelectorAll('.m-time').forEach(setupTime);
})();
