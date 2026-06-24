/* Winning-moments carousel — works for any number of .winreel blocks.
   No dependencies. Keyboard, touch-swipe, dots, and gentle auto-advance
   that pauses on interaction and respects prefers-reduced-motion. */
(function () {
  document.querySelectorAll('.winreel').forEach(setup);

  function setup(reel) {
    const track  = reel.querySelector('.winreel-track');
    const slides = Array.from(reel.querySelectorAll('.winreel-slide'));
    const dotsEl = reel.querySelector('.winreel-dots');
    const cur    = reel.querySelector('.winreel-count b');
    const n = slides.length;
    if (!track || n === 0) return;

    let i = 0;
    let timer = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dots = slides.map(function (_, idx) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', 'Photo ' + (idx + 1) + ' of ' + n);
      b.addEventListener('click', function () { go(idx, true); });
      if (dotsEl) dotsEl.appendChild(b);
      return b;
    });

    function go(idx, user) {
      i = (idx + n) % n;
      track.style.transform = 'translateX(' + (-i * 100) + '%)';
      dots.forEach(function (d, k) { d.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      if (cur) cur.textContent = String(i + 1);
      if (user) restartAuto();
    }

    const prev = reel.querySelector('.winreel-btn.prev');
    const next = reel.querySelector('.winreel-btn.next');
    if (prev) prev.addEventListener('click', function () { go(i - 1, true); });
    if (next) next.addEventListener('click', function () { go(i + 1, true); });

    reel.setAttribute('tabindex', '0');
    reel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(i - 1, true); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1, true); }
    });

    let x0 = null;
    reel.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    reel.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1, true);
      x0 = null;
    }, { passive: true });

    function startAuto() { if (!reduce && n > 1 && !timer) timer = setInterval(function () { go(i + 1, false); }, 5500); }
    function stopAuto()  { if (timer) { clearInterval(timer); timer = null; } }
    function restartAuto() { stopAuto(); startAuto(); }
    reel.addEventListener('mouseenter', stopAuto);
    reel.addEventListener('focusin', stopAuto);
    reel.addEventListener('mouseleave', startAuto);
    reel.addEventListener('focusout', startAuto);

    go(0, false);
    startAuto();
  }
})();
