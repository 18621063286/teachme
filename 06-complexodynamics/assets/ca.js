// 初等元胞自动机（ECA）组件，后续讲 Rule 30 / 熵 / 度量的课都会复用。
//
// 约定（与 Wolfram 编号一致）：邻域 (l, c, r) 读成二进制数 k = 4l + 2c + r，
// 新状态 = 规则号 n 的第 k 位，即 (n >> k) & 1。边界是周期的，与 torch.roll 相同。
//
// 1) 下一行练习：<div class="ca-step" data-rule="30" data-row="0010110100"></div>
//    显示给定的一行，下面一行由学习者点击填写，“检查”后标出错格。
// 2) 规则表练习：<div class="ca-rule" data-rule="90"></div>
//    显示 8 种邻域（111 → 000），学习者点击填写每种邻域的新状态。
// 3) 演化图：<div class="ca-evolve" data-rule="30" data-width="31" data-steps="16"></div>
//    从中间单个 1 开始，画出 steps 行。
const ECA = (function () {
  const bit = (n, k) => (n >> k) & 1;
  const roll = (x, s) => x.map((_, i) => x[((i - s) % x.length + x.length) % x.length]);

  function step(row, rule) {
    const left = roll(row, 1), right = roll(row, -1);   // left[i] = row[i-1]
    return row.map((c, i) => bit(rule, 4 * left[i] + 2 * c + right[i]));
  }

  function cell(v, opts = {}) {
    const d = document.createElement('div');
    d.className = 'ca-cell' + (v ? ' on' : '') + (opts.edit ? ' edit' : '');
    if (opts.label !== undefined) d.textContent = opts.label;
    return d;
  }

  function rowEl(values, opts = {}) {
    const r = document.createElement('div');
    r.className = 'ca-row';
    values.forEach((v, i) => r.appendChild(cell(v, { edit: opts.edit, label: opts.index ? i : undefined })));
    return r;
  }

  function editable(rowDiv, state) {
    Array.from(rowDiv.children).forEach((c, i) => {
      c.addEventListener('click', () => {
        state[i] ^= 1;
        c.classList.toggle('on', !!state[i]);
        c.classList.remove('mark-bad');
      });
    });
  }

  function controls(host, onCheck, onReveal) {
    const bar = document.createElement('div');
    bar.style.marginTop = '.7rem';
    const fb = document.createElement('p');
    fb.className = 'feedback';
    const check = document.createElement('button');
    check.textContent = '检查';
    check.onclick = () => onCheck(fb);
    const reveal = document.createElement('button');
    reveal.textContent = '看答案';
    reveal.onclick = () => onReveal(fb);
    bar.append(check, reveal);
    host.append(bar, fb);
  }

  function setupStep(host) {
    const rule = Number(host.dataset.rule);
    const row = host.dataset.row.split('').map(Number);
    const target = step(row, rule);
    const guess = row.map(() => 0);

    host.appendChild(Object.assign(document.createElement('div'), { className: 'ca-label', textContent: `第 t 行（已知，周期边界，格子下方是下标 i）` }));
    host.appendChild(rowEl(row, { index: true }));
    host.appendChild(Object.assign(document.createElement('div'), { className: 'ca-label', textContent: `第 t+1 行（点击格子切换 0/1）` }));
    const g = rowEl(guess, { edit: true });
    host.appendChild(g);
    editable(g, guess);

    controls(host, fb => {
      let wrong = 0;
      Array.from(g.children).forEach((c, i) => {
        const bad = guess[i] !== target[i];
        c.classList.toggle('mark-bad', bad);
        wrong += bad;
      });
      fb.className = 'feedback ' + (wrong ? 'bad' : 'ok');
      fb.textContent = wrong
        ? `有 ${wrong} 格不对（红框）。逐格算 k = 4l + 2c + r，再查规则号的第 k 位。别忘了两端是绕回来的。`
        : '全对。你刚才手算的，就是 rule(roll(x, 1), x, roll(x, -1)) 这一行代码。';
    }, fb => {
      Array.from(g.children).forEach((c, i) => {
        guess[i] = target[i];
        c.classList.toggle('on', !!target[i]);
        c.classList.remove('mark-bad');
      });
      fb.className = 'feedback';
      fb.textContent = '已填入答案。试着对红框之外的每一格说出它的 k。';
    });
  }

  function setupRule(host) {
    const rule = Number(host.dataset.rule);
    const grid = document.createElement('div');
    grid.className = 'rule-grid';
    const guess = new Array(8).fill(0);
    const outs = [];
    for (let k = 7; k >= 0; k--) {
      const box = document.createElement('div');
      box.className = 'rule-case';
      box.appendChild(rowEl([bit(k, 2), bit(k, 1), bit(k, 0)]));
      const o = document.createElement('div');
      o.className = 'ca-row';
      const oc = cell(0, { edit: true });
      oc.addEventListener('click', () => { guess[k] ^= 1; oc.classList.toggle('on', !!guess[k]); oc.classList.remove('mark-bad'); });
      o.appendChild(oc);
      box.appendChild(o);
      box.appendChild(Object.assign(document.createElement('div'), { className: 'k', textContent: `k=${k}` }));
      outs[k] = oc;
      grid.appendChild(box);
    }
    host.appendChild(grid);
    controls(host, fb => {
      let wrong = 0;
      for (let k = 0; k < 8; k++) {
        const bad = guess[k] !== bit(rule, k);
        outs[k].classList.toggle('mark-bad', bad);
        wrong += bad;
      }
      fb.className = 'feedback ' + (wrong ? 'bad' : 'ok');
      fb.textContent = wrong
        ? `有 ${wrong} 个不对。先把 ${rule} 写成 8 位二进制，最左边一位对应 k=7。`
        : `全对。${rule} = ${rule.toString(2).padStart(8, '0')}₂，从左到右正好是 k=7…0 的输出。`;
    }, fb => {
      for (let k = 0; k < 8; k++) { guess[k] = bit(rule, k); outs[k].classList.toggle('on', !!guess[k]); outs[k].classList.remove('mark-bad'); }
      fb.className = 'feedback';
      fb.textContent = `${rule} = ${rule.toString(2).padStart(8, '0')}₂`;
    });
  }

  function setupEvolve(host) {
    const rule = Number(host.dataset.rule);
    const w = Number(host.dataset.width || 31), steps = Number(host.dataset.steps || 16);
    let row = new Array(w).fill(0);
    row[Math.floor(w / 2)] = 1;
    const wrap = document.createElement('div');
    wrap.style.lineHeight = '0';
    for (let t = 0; t < steps; t++) {
      const r = rowEl(row);
      r.style.gap = '0';
      r.style.margin = '0';
      Array.from(r.children).forEach(c => { c.style.width = c.style.height = '.7rem'; c.style.border = '0'; });
      wrap.appendChild(r);
      row = step(row, rule);
    }
    host.appendChild(wrap);
  }

  document.querySelectorAll('.ca-step').forEach(setupStep);
  document.querySelectorAll('.ca-rule').forEach(setupRule);
  document.querySelectorAll('.ca-evolve').forEach(setupEvolve);
  return { step, roll, bit };
})();
