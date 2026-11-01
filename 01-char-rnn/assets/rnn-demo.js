// 微型 RNN 演示：V=4、H=3，权重用 torch 在 "hello" 上训练后取两位小数。
// 用法：<div class="rnn-demo"></div>。每点一次读入一个字符；勾选后把 W_hh 置零。
(function () {
  const VOCAB = 'helo';
  const W = {"W_xh": [[0.74, 1.1, -0.67, 0.31], [-1.29, -0.59, 0.48, 0.19], [0.9, -1.16, -2.63, -0.03]], "W_hh": [[1.26, -0.58, 1.21], [2.22, -0.59, 1.17], [-1.86, 0.64, 2.29]], "W_hy": [[-1.42, 1.62, 0.67], [1.73, -2.77, 2.66], [3.43, 3.16, -2.43], [-2.59, -1.98, -1.76]], "b_h": [[0.41], [-0.74], [1.06]], "b_y": [[-1.31], [0.64], [1.51], [0.95]]};
  const INPUT = 'hell', TARGET = 'ello';
  const mv = (M, v) => M.map((r) => r.reduce((s, a, j) => s + a * v[j], 0));

  function forward(memory) {
    let h = [0, 0, 0];
    return [...INPUT].map((ch) => {
      const x = [...VOCAB].map((c) => (c === ch ? 1 : 0));
      const a = mv(W.W_xh, x);
      const b = memory ? mv(W.W_hh, h) : [0, 0, 0];
      h = a.map((v, i) => Math.tanh(v + b[i] + W.b_h[i][0]));
      const y = mv(W.W_hy, h).map((v, i) => v + W.b_y[i][0]);
      const m = Math.max(...y);
      const e = y.map((v) => Math.exp(v - m));
      const z = e.reduce((s, v) => s + v, 0);
      return { h, p: e.map((v) => v / z) };
    });
  }

  function setup(box) {
    let n = 0;
    box.innerHTML =
      '<button class="next">读入下一个字符</button><button class="reset">重置</button>' +
      '<label><input type="checkbox" class="cut"> 切断记忆（W_hh = 0）</label>' +
      '<table><thead><tr><th>t</th><th>输入</th><th>隐藏状态 h<sub>t</sub></th><th class="l">下一个字符的概率</th><th>目标</th></tr></thead><tbody></tbody></table>' +
      '<p class="msg" aria-live="polite"></p>';
    const body = box.querySelector('tbody'), msg = box.querySelector('.msg'), cut = box.querySelector('.cut');
    const next = box.querySelector('.next');

    function shade(v) {
      const pct = Math.round(Math.abs(v) * 45);
      const color = v >= 0 ? 'var(--accent)' : '#3f7cac';
      return 'background:color-mix(in srgb,' + color + ' ' + pct + '%,transparent)';
    }
    function render() {
      const rows = forward(!cut.checked).slice(0, n);
      body.innerHTML = rows.map((r, t) => {
        const vec = r.h.map((v) => '<span style="' + shade(v) + '">' + v.toFixed(2) + '</span>').join('');
        const bars = [...VOCAB].map((c, i) => {
          const hit = c === TARGET[t];
          return '<span class="' + (hit ? 'hit' : '') + '">' + c + '</span>' +
            '<span><span class="bar' + (hit ? ' hit-bar' : '') + '" style="display:block;width:' + (r.p[i] * 100).toFixed(1) + '%"></span></span>' +
            '<span class="' + (hit ? 'hit' : '') + '">' + r.p[i].toFixed(3) + '</span>';
        }).join('');
        return '<tr><td>' + t + '</td><td class="mono">' + INPUT[t] + '</td><td><span class="vec">' + vec + '</span></td><td class="l"><div class="bars">' + bars + '</div></td><td class="mono">' + TARGET[t] + '</td></tr>';
      }).join('');
      next.disabled = n >= 4;
      if (n < 3) msg.textContent = '';
      else if (n === 3) msg.textContent = '现在输入的是第一个 l。先猜：读入第二个 l 后，h 会和这一行一样吗？';
      else {
        const same = rows[2].h.every((v, i) => Math.abs(v - rows[3].h[i]) < 1e-9);
        msg.textContent = same
          ? '两个 l 的 h 一模一样，预测也一样。这组权重是带着记忆训练的，切断后第一个 l 也答错了；重新训练也救不回来，下一节推导原因。'
          : '输入同样是 l，h 却不同，因为 W_hh 带进来的旧状态不同。一个预测 l，一个预测 o。';
      }
    }
    next.addEventListener('click', () => { if (n < 4) { n++; render(); } });
    box.querySelector('.reset').addEventListener('click', () => { n = 0; render(); });
    cut.addEventListener('change', render);
    render();
  }
  document.querySelectorAll('.rnn-demo').forEach(setup);
})();
