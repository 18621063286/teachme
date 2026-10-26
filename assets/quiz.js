// 选择题组件。用法：
// <div class="quiz" data-answer="2">           // 正确选项的下标，从 0 开始
//   <p class="q">题干</p>
//   <ol><li>选项</li>…</ol>
//   <p class="explain">答完后显示的解析</p>
// </div>
// 选错会划掉该项并允许再试；选对后锁定并显示解析。
(function () {
  function setup(quiz) {
    const answer = Number(quiz.dataset.answer);
    const items = Array.from(quiz.querySelectorAll('ol > li'));
    items.forEach((li, i) => {
      li.addEventListener('click', () => {
        if (quiz.classList.contains('done')) return;
        if (i === answer) {
          li.classList.add('right');
          quiz.classList.add('done');
        } else {
          li.classList.add('wrong');
        }
      });
    });
  }
  document.querySelectorAll('.quiz').forEach(setup);
})();
