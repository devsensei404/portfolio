(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Profile card: tilt toward the cursor, click to flip */
  var card = document.getElementById('portrait');
  if (card) {
    var link = card.querySelector('.face-back a');
    var MAX_TILT = 14;

    if (!reduceMotion) {
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', (x * MAX_TILT).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-y * MAX_TILT).toFixed(2) + 'deg');
      });

      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    }

    function flip() {
      var flipped = card.classList.toggle('is-flipped');
      if (link) link.tabIndex = flipped ? 0 : -1;
    }

    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      flip();
    });

    card.addEventListener('keydown', function (e) {
      if (e.target !== card) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flip();
      }
    });
  }

  /* Copy email button */
  var copyBtn = document.getElementById('copy-email');
  if (copyBtn) {
    var label = copyBtn.textContent;
    var timer;

    function done(text) {
      copyBtn.textContent = text;
      clearTimeout(timer);
      timer = setTimeout(function () { copyBtn.textContent = label; }, 1800);
    }

    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }

    copyBtn.addEventListener('click', function () {
      var email = copyBtn.getAttribute('data-email');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(
          function () { done('Copied'); },
          function () { done(fallbackCopy(email) ? 'Copied' : 'Copy failed'); }
        );
      } else {
        done(fallbackCopy(email) ? 'Copied' : 'Copy failed');
      }
    });
  }
  /* Scribble underline: draws as you scroll down, retracts to the doodle as you scroll back up */
  var line = document.querySelector('.scribble-line');
  if (line) {
    var len = 100; // matches pathLength on the path, so it is independent of screen size
    var DISTANCE = 260;
    var ticking = false;

    line.style.strokeDasharray = len + ' ' + len;

    function draw() {
      var p = reduceMotion ? 1 : Math.min(Math.max(window.scrollY / DISTANCE, 0), 1);
      line.style.strokeDashoffset = String(len * (1 - p));
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(draw);
      }
    }, { passive: true });

    draw();
  }
})();
