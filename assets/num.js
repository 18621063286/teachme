// 填空题组件。用法：
// <div class="num" data-answer="2.5" data-tol="0.01" data-placeholder="…" data-hint="…" data-explain="…"></div>
// 数字题用 data-answer（可选 data-tol，默认 0.005）；形状这类文本题用 data-text="3x4"，
// 比较时忽略空格、括号，并把 × * , 都当成 x。
// 答错显示提示，答对显示解析。
(function () {
  const norm = (s) => s.toLowerCase().replace(/[\s()（）]/g, '').replace(/[×*,，]/g, 'x');
  function setup(box) {
    const d = box.dataset;
    const input = document.createElement('input');
    input.className = 'h-input';
    input.placeholder = d.placeholder || '';
    input.setAttribute('aria-label', d.placeholder || '答案');
    const btn = document.createElement('button');
    btn.textContent = '检查';
    const fb = document.createElement('p');
    fb.className = 'feedback';
    fb.setAttribute('aria-live', 'polite');
    function check() {
      const raw = input.value.trim();
      const ok = d.text !== undefined
        ? norm(raw) === norm(d.text)
        : raw !== '' && Math.abs(Number(raw) - Number(d.answer)) <= Number(d.tol || 0.005);
      fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
      fb.textContent = ok ? '对。' + (d.explain || '') : '还不对。' + (d.hint || '');
    }
    btn.addEventListener('click', check);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    box.append(input, btn, fb);
  }
  document.querySelectorAll('.num').forEach(setup);
})();
