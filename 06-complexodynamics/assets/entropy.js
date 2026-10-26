// Shannon 熵组件，第 2 课起使用。约定：熵一律以 bit 为单位，0·log 0 记为 0。
//
// 1) 二元熵曲线：<div class="h-curve"></div>
//    画 h(p) = −p log₂p − (1−p) log₂(1−p)，拖滑块看 h(p) 和两种结果各自的「惊讶度」。
// 2) 可点的一行：<div class="h-row" data-width="16"></div>
//    点格子翻转 0/1，实时显示 1 的比例 p 和这一行的熵（notebook 的 measure_entropy）。
// 3) 手算练习：<div class="h-calc" data-row="01000100"></div>
//    给出一行，学习者填熵的数值，误差 0.005 以内算对。
// 4) 熵随时间：<div class="h-time" data-rule="30" data-width="100" data-steps="100"></div>
//    从中间单个 1 演化，画每一行的熵 H(t)。依赖 ca.js 里的 ECA，须在它之后加载。
const Entropy = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  const plogp = p => (p > 0 ? p * Math.log2(p) : 0);
  const h = p => -plogp(p) - plogp(1 - p);
  const rowH = row => h(row.reduce((a, b) => a + b, 0) / row.length);
  const fmt = (x, d = 4) => x.toFixed(d);

  function svgEl(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // 在 W×H 的画布上画坐标轴，返回把数据坐标映射到像素的函数。
  function axes(svg, W, H, xMax, xLabel, yLabel) {
    const L = 38, R = 10, T = 10, B = 30;
    const X = x => L + (x / xMax) * (W - L - R);
    const Y = y => T + (1 - y) * (H - T - B);
    svg.appendChild(svgEl('line', { x1: L, y1: Y(0), x2: W - R, y2: Y(0), class: 'axis' }));
    svg.appendChild(svgEl('line', { x1: L, y1: Y(0), x2: L, y2: Y(1), class: 'axis' }));
    svg.appendChild(svgEl('line', { x1: L, y1: Y(1), x2: W - R, y2: Y(1), class: 'grid' }));
    [[0, '0'], [0.5, '0.5'], [1, '1']].forEach(([y, s]) => {
      const t = svgEl('text', { x: L - 6, y: Y(y) + 4, class: 'tick', 'text-anchor': 'end' });
      t.textContent = s; svg.appendChild(t);
    });
    [0, xMax / 2, xMax].forEach(x => {
      const t = svgEl('text', { x: X(x), y: H - 12, class: 'tick', 'text-anchor': 'middle' });
      t.textContent = String(x); svg.appendChild(t);
    });
    const xl = svgEl('text', { x: W - R, y: H - 1, class: 'tick', 'text-anchor': 'end' });
    xl.textContent = xLabel; svg.appendChild(xl);
    const yl = svgEl('text', { x: L + 4, y: T + 10, class: 'tick' });
    yl.textContent = yLabel; svg.appendChild(yl);
    return { X, Y };
  }

  function polyline(points, X, Y) {
    return svgEl('polyline', { points: points.map(([x, y]) => `${X(x)},${Y(y)}`).join(' '), class: 'curve' });
  }

  function readout(host) {
    const p = document.createElement('p');
    p.className = 'h-readout';
    host.appendChild(p);
    return p;
  }

  function setupCurve(host) {
    const W = 520, H = 220;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'h-svg', role: 'img', 'aria-label': '二元熵函数 h(p) 的曲线' });
    const { X, Y } = axes(svg, W, H, 1, 'p', 'h(p) / bit');
    const pts = [];
    for (let i = 0; i <= 200; i++) pts.push([i / 200, h(i / 200)]);
    svg.appendChild(polyline(pts, X, Y));
    const guide = svgEl('line', { class: 'guide' });
    const dot = svgEl('circle', { r: 5, class: 'dot' });
    svg.append(guide, dot);
    host.appendChild(svg);

    const slider = document.createElement('input');
    Object.assign(slider, { type: 'range', min: 0, max: 1000, value: 100 });
    slider.className = 'h-slider';
    slider.setAttribute('aria-label', 'p：取 1 的概率');
    host.appendChild(slider);
    const out = readout(host);

    function draw() {
      const p = slider.value / 1000, v = h(p);
      dot.setAttribute('cx', X(p)); dot.setAttribute('cy', Y(v));
      guide.setAttribute('x1', X(p)); guide.setAttribute('x2', X(p));
      guide.setAttribute('y1', Y(0)); guide.setAttribute('y2', Y(v));
      const s1 = p > 0 ? fmt(-Math.log2(p), 3) : '∞';
      const s0 = p < 1 ? fmt(-Math.log2(1 - p), 3) : '∞';
      out.innerHTML = `p = ${fmt(p, 3)}　·　看到 1 的惊讶度 −log₂p = ${s1}　·　看到 0 的惊讶度 = ${s0}　·　<strong>平均惊讶度 h(p) = ${fmt(v)} bit</strong>`;
    }
    slider.addEventListener('input', draw);
    draw();
  }

  function setupRow(host) {
    const w = Number(host.dataset.width || 16);
    const row = new Array(w).fill(0);
    const r = document.createElement('div');
    r.className = 'ca-row';
    const cells = row.map((_, i) => {
      const c = document.createElement('div');
      c.className = 'ca-cell edit';
      c.addEventListener('click', () => { row[i] ^= 1; c.classList.toggle('on', !!row[i]); draw(); });
      r.appendChild(c);
      return c;
    });
    host.appendChild(r);

    const bar = document.createElement('div');
    bar.style.marginTop = '.6rem';
    const presets = [['全 0', () => 0], ['交替 0101', i => i % 2], ['左半 1', i => (i < w / 2 ? 1 : 0)], ['随机', () => (Math.random() < 0.5 ? 1 : 0)]];
    presets.forEach(([name, f]) => {
      const b = document.createElement('button');
      b.textContent = name;
      b.onclick = () => { row.forEach((_, i) => { row[i] = f(i); cells[i].classList.toggle('on', !!row[i]); }); draw(); };
      bar.appendChild(b);
    });
    host.appendChild(bar);
    const out = readout(host);

    function draw() {
      const n1 = row.reduce((a, b) => a + b, 0);
      out.innerHTML = `1 的个数 ${n1}/${w}　·　p = ${fmt(n1 / w, 3)}　·　<strong>H = ${fmt(rowH(row))} bit</strong>`;
    }
    draw();
  }

  function setupCalc(host) {
    const row = host.dataset.row.split('').map(Number);
    const r = document.createElement('div');
    r.className = 'ca-row';
    row.forEach(v => {
      const c = document.createElement('div');
      c.className = 'ca-cell' + (v ? ' on' : '');
      r.appendChild(c);
    });
    host.appendChild(r);

    const bar = document.createElement('div');
    bar.style.marginTop = '.7rem';
    const input = document.createElement('input');
    Object.assign(input, { type: 'text', inputMode: 'decimal', placeholder: 'H = ? bit' });
    input.className = 'h-input';
    const check = document.createElement('button');
    check.textContent = '检查';
    const reveal = document.createElement('button');
    reveal.textContent = '看答案';
    bar.append(input, check, reveal);
    const fb = document.createElement('p');
    fb.className = 'feedback';
    host.append(bar, fb);

    const n1 = row.reduce((a, b) => a + b, 0), n = row.length, ans = rowH(row);
    const steps = `p = ${n1}/${n}，H = −(${n1}/${n})·log₂(${n1}/${n}) − (${n - n1}/${n})·log₂(${n - n1}/${n}) = ${fmt(ans)} bit`;
    check.onclick = () => {
      const g = parseFloat(input.value);
      if (Number.isNaN(g)) { fb.className = 'feedback bad'; fb.textContent = '先填一个数。'; return; }
      const ok = Math.abs(g - ans) < 0.005;
      fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
      fb.textContent = ok ? `对。${steps}。`
        : g > 1 ? '两种状态的熵最多 1 bit，超过 1 一定算错了。检查一下对数的底是不是 2。'
        : '还不对。先数 1 的个数得到 p，再分别算两项 −p·log₂p。';
    };
    reveal.onclick = () => { fb.className = 'feedback'; fb.textContent = steps + '。'; };
  }

  function setupTime(host) {
    const rule = Number(host.dataset.rule), w = Number(host.dataset.width || 100), T = Number(host.dataset.steps || 100);
    let row = new Array(w).fill(0);
    row[Math.floor(w / 2)] = 1;
    const pts = [];
    for (let t = 0; t < T; t++) { pts.push([t, rowH(row)]); row = ECA.step(row, rule); }
    const W = 520, H = 200;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'h-svg', role: 'img', 'aria-label': `Rule ${rule} 每一行的熵随时间变化` });
    const { X, Y } = axes(svg, W, H, T, '时间步 t', 'H(t) / bit');
    svg.appendChild(polyline(pts, X, Y));
    host.appendChild(svg);
  }

  document.querySelectorAll('.h-curve').forEach(setupCurve);
  document.querySelectorAll('.h-row').forEach(setupRow);
  document.querySelectorAll('.h-calc').forEach(setupCalc);
  document.querySelectorAll('.h-time').forEach(setupTime);
  return { h, rowH };
})();
