(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

  /* ------------------------------------------------------------------
     Profile card: tilt toward the cursor, glare follows, click to flip
     ------------------------------------------------------------------ */
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
        card.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
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

  /* ------------------------------------------------------------------
     Copy email button
     ------------------------------------------------------------------ */
  var copyBtn = document.getElementById('copy-email');
  if (copyBtn) {
    var label = copyBtn.textContent;
    var timer;

    // Lock the width so the label swap never shifts the layout
    var lockWidth = function () { copyBtn.style.minWidth = copyBtn.offsetWidth + 'px'; };
    lockWidth();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockWidth);

    function done(text) {
      copyBtn.textContent = text;
      copyBtn.classList.remove('is-done');
      void copyBtn.offsetWidth;
      copyBtn.classList.add('is-done');
      clearTimeout(timer);
      timer = setTimeout(function () {
        copyBtn.textContent = label;
        copyBtn.classList.remove('is-done');
      }, 1800);
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

  /* ------------------------------------------------------------------
     Text splitting helpers (screen readers get the plain text)
     ------------------------------------------------------------------ */
  function srCopy(el, label) {
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = label;
    return sr;
  }

  // mode 'words': each word in its own mask, inline elements (strong, span) are preserved
  // mode 'chars': whole text in one mask, each character staggered
  function split(el, mode) {
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    var n = 0;

    function unit(text) {
      var mask = document.createElement('span');
      mask.className = 'sm';
      var s = document.createElement('span');
      s.className = 'si';
      s.style.setProperty('--i', n++);
      s.textContent = text;
      mask.appendChild(s);
      return mask;
    }

    function walk(src, dest) {
      Array.prototype.forEach.call(src.childNodes, function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) dest.appendChild(document.createTextNode(' '));
            else dest.appendChild(unit(part));
          });
        } else if (node.nodeType === 1) {
          var clone = node.cloneNode(false);
          walk(node, clone);
          dest.appendChild(clone);
        }
      });
    }

    if (mode === 'chars') {
      var mask = document.createElement('span');
      mask.className = 'sm';
      label.split('').forEach(function (ch, i) {
        var s = document.createElement('span');
        s.className = 'si';
        s.style.setProperty('--i', i);
        s.textContent = ch;
        mask.appendChild(s);
      });
      vis.appendChild(mask);
    } else {
      walk(el, vis);
    }

    el.textContent = '';
    el.appendChild(srCopy(el, label));
    el.appendChild(vis);
  }

  // Plain word spans for the scroll-lit paragraph
  function splitLit(el) {
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var parts = label.split(' ');
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    var words = parts.map(function (w, i) {
      var s = document.createElement('span');
      s.className = 'lw';
      s.textContent = w;
      vis.appendChild(s);
      if (i < parts.length - 1) vis.appendChild(document.createTextNode(' '));
      return s;
    });
    el.textContent = '';
    el.appendChild(srCopy(el, label));
    el.appendChild(vis);
    return { el: el, words: words, lit: 0 };
  }

  function reveal(els, onIn, opts) {
    if (!els.length) return;
    if (!hasIO) { els.forEach(function (el) { onIn(el, 0); }); return; }
    var io = new IntersectionObserver(function (entries) {
      var k = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        onIn(entry.target, k++);
        io.unobserve(entry.target);
      });
    }, opts || { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function markIn(el) { el.classList.add('is-in'); }

  /* ------------------------------------------------------------------
     Entrances
     ------------------------------------------------------------------ */
  var litParas = [];
  var counters = [];

  if (!reduceMotion) {
    // Hero headline: masked word-by-word rise
    var h1 = document.querySelector('.hero h1');
    if (h1) {
      split(h1, 'words');
      h1.style.setProperty('--base', '0.25s');
      h1.classList.add('is-split');
      void h1.offsetWidth;
      markIn(h1);
    }

    // Section headings: masked characters
    var heads = all('.grid > div:first-child h2');
    heads.forEach(function (h) { split(h, 'chars'); });
    reveal(heads, markIn);

    // Closing line
    var closingTitle = document.querySelector('.closing-title');
    if (closingTitle) {
      split(closingTitle, 'words');
      reveal([closingTitle], markIn);
    }

    // Hairlines draw in from the left
    var lines = all('.grid, .stats');
    lines.forEach(function (el) { el.classList.add('line'); });
    reveal(lines, markIn);

    // Content blocks rise in, with their separators drawing alongside
    ['.project', '.row', '.skills > div', '.interests-text', '.closing-nav', '.closing-block'].forEach(function (sel) {
      all(sel).forEach(function (el) {
        el.classList.add('rv');
        var separated = /project|row|skills/.test(sel) && el.previousElementSibling;
        if (separated) el.classList.add('ln');
      });
    });

    // Stat strip: staggered, numbers count up
    all('.stats > div').forEach(function (el, i) {
      el.classList.add('rv');
      el.setAttribute('data-d', (0.85 + i * 0.09).toFixed(2));
    });

    all('.stats dt').forEach(function (dt, i) {
      var txt = dt.textContent.trim();
      if (!/^\d+(\.\d+)?$/.test(txt)) return;
      var dec = (txt.split('.')[1] || '').length;
      dt.classList.add('num');
      dt.textContent = (0).toFixed(dec);
      counters.push({ el: dt, target: parseFloat(txt), dec: dec, delay: 900 + i * 90 });
    });

    reveal(all('.rv'), function (el, k) {
      var d = el.getAttribute('data-d');
      el.style.setProperty('--d', (d !== null ? d : (k * 0.09).toFixed(2)) + 's');
      markIn(el);
    });

    function runCounter(c) {
      setTimeout(function () {
        var t0 = performance.now();
        var DUR = 1400;
        (function step(now) {
          var p = clamp((now - t0) / DUR, 0, 1);
          var e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
          c.el.textContent = (c.target * e).toFixed(c.dec);
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      }, c.delay);
    }
    reveal(all('.stats'), function () { counters.forEach(runCounter); }, { threshold: 0.2 });

    // About: words light up as you read down the page
    litParas = all('.about-text').map(splitLit);

    // Magnetic buttons
    if (finePointer) {
      all('.btn, .btn-icon, .icon-btn, .copy-btn').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var x = e.clientX - (r.left + r.width / 2);
          var y = e.clientY - (r.top + r.height / 2);
          el.style.setProperty('--mx', (x * 0.28).toFixed(1) + 'px');
          el.style.setProperty('--my', (y * 0.35).toFixed(1) + 'px');
        });
        el.addEventListener('pointerleave', function () {
          el.style.setProperty('--mx', '0px');
          el.style.setProperty('--my', '0px');
        });
      });
    }
  }

  /* ------------------------------------------------------------------
     Nav: sliding active indicator
     ------------------------------------------------------------------ */
  var nav = document.querySelector('.nav');
  var navList = document.querySelector('.nav ul');
  var navLinks = all('.nav ul a');
  var navTargets = navLinks.map(function (a) {
    var h = a.getAttribute('href');
    return h === '#top' ? null : document.querySelector(h);
  });
  var ind = null;
  var current = -1;
  var indPlaced = false;

  if (navList) {
    ind = document.createElement('span');
    ind.className = 'nav-ind';
    ind.setAttribute('aria-hidden', 'true');
    navList.appendChild(ind);
  }

  function moveInd() {
    var a = navLinks[current];
    if (!ind || !a) return;
    if (a.offsetParent === null) { ind.style.opacity = '0'; return; }
    if (!indPlaced) {
      ind.style.transition = 'none';
      ind.style.width = a.offsetWidth + 'px';
      ind.style.transform = 'translate3d(' + a.offsetLeft + 'px,0,0)';
      void ind.offsetWidth;
      ind.style.transition = '';
      indPlaced = true;
    } else {
      ind.style.width = a.offsetWidth + 'px';
      ind.style.transform = 'translate3d(' + a.offsetLeft + 'px,0,0)';
    }
    ind.style.opacity = '1';
  }

  /* ------------------------------------------------------------------
     Scroll-driven pieces, one rAF loop
     ------------------------------------------------------------------ */
  var line = document.querySelector('.scribble-line');
  var len = 100; // matches pathLength on the path, so it is independent of screen size
  var DISTANCE = 260;
  var closing = document.querySelector('.closing');
  var rings = document.querySelector('.rings');
  var ticking = false;

  if (line) line.style.strokeDasharray = len + ' ' + len;

  function frame() {
    ticking = false;
    var y = window.scrollY;
    var vh = window.innerHeight;
    var docH = document.documentElement.scrollHeight;

    // Nav chrome and progress
    if (nav) {
      var max = docH - vh;
      nav.style.setProperty('--sp', max > 0 ? clamp(y / max, 0, 1).toFixed(4) : '0');
      nav.classList.toggle('is-scrolled', y > 12);
    }

    // Active section
    var idx = 0;
    navTargets.forEach(function (t, i) {
      if (t && t.getBoundingClientRect().top <= vh * 0.4) idx = i;
    });
    if (y + vh >= docH - 4) idx = navLinks.length - 1;
    if (idx !== current) {
      current = idx;
      navLinks.forEach(function (a, i) {
        if (i === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        a.classList.toggle('is-active', i === idx);
      });
      moveInd();
    }

    // Scribble underline
    if (line) {
      var p = reduceMotion ? 1 : clamp(y / DISTANCE, 0, 1);
      line.style.strokeDashoffset = String(len * (1 - p));
    }

    if (reduceMotion) return;

    // Rings drift
    if (closing && rings) {
      var cr = closing.getBoundingClientRect();
      rings.style.setProperty('--rp', clamp((vh - cr.top) / (vh + cr.height), 0, 1).toFixed(4));
    }

    // About words
    litParas.forEach(function (item) {
      var r = item.el.getBoundingClientRect();
      var start = vh * 0.9;
      var end = vh * 0.35;
      var prog = clamp((start - r.top) / (start - end), 0, 1);
      var target = Math.round(prog * item.words.length);
      if (target === item.lit) return;
      var from = Math.min(target, item.lit);
      var to = Math.max(target, item.lit);
      for (var i = from; i < to; i++) item.words[i].classList.toggle('is-lit', target > item.lit);
      item.lit = target;
    });
  }

  function request() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(frame);
    }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', function () { moveInd(); request(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveInd(); request(); });
  frame();

  /* ------------------------------------------------------------------
     Eased anchor scrolling
     ------------------------------------------------------------------ */
  var scrollRaf = 0;

  function glideTo(to) {
    cancelAnimationFrame(scrollRaf);
    var from = window.scrollY;
    var dist = to - from;
    if (Math.abs(dist) < 2) return;
    var dur = clamp(Math.abs(dist) * 0.45, 650, 1300);
    var t0 = performance.now();
    (function step(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo({ top: from + dist * e, behavior: 'instant' });
      if (p < 1) scrollRaf = requestAnimationFrame(step);
    })(t0);
  }

  if (!reduceMotion) {
    ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
      window.addEventListener(evt, function () { cancelAnimationFrame(scrollRaf); }, { passive: true });
    });

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var id = a.getAttribute('href');
      var target = id === '#top' ? null : document.querySelector(id);
      if (id !== '#top' && !target) return;
      e.preventDefault();
      var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      var maxY = document.documentElement.scrollHeight - window.innerHeight;
      var dest = target ? target.getBoundingClientRect().top + window.scrollY - pad : 0;
      glideTo(clamp(dest, 0, maxY));
      if (history.pushState) history.pushState(null, '', id);
    });
  }
})();
