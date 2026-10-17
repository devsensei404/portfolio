/* Buddy: starts asleep on the nav bar. Scroll and it wakes up, then tags along
   behind your cursor. Rest the cursor on a project or row and it hops over to
   sit beside it while you read; move on and it follows you again. Scroll back
   to the top and it goes home to sleep. */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Touch phones/tablets have no hover, so Buddy works differently there:
  // it follows your finger while you touch, rests in the bottom-right corner otherwise,
  // and perches by whatever is in the middle of the screen as you scroll.
  var touchMode = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------------------------------------------------------
     Things it can say. {t} becomes the project title. Edit freely.
     --------------------------------------------------------------- */
  var LINES = {
    wake:    ['mm… morning', 'oh! hi', 'okay, okay, I\u2019m up', 'five more minutes… no, fine', 'ah, company', 'oh, we\u2019re moving'],
    home:    ['back to bed', 'nap time', 'wake me later', 'that\u2019s enough for now', 'night night'],
    project: ['ooh, {t}', 'so this is {t}', '{t}, huh. nice', 'this one looks fun', 'mm, I like this one', 'okay, reading…', 'someone\u2019s been busy', 'tell me more', 'I\u2019d click that'],
    row:     ['the story so far', 'ooh, a good chapter', 'so that\u2019s where', 'okay, I\u2019m following', 'nicely put', 'mm, that\u2019s solid', 'I see, I see', 'keep going'],
    reading: ['still reading?', 'take your time', 'I\u2019m not going anywhere', 'you read carefully', 'worth a second look?', 'I\u2019ll wait', 'good stuff, right?'],
    idle:    ['hello?', 'psst. you there?', 'I\u2019m still here', 'did you fall asleep?', 'boop?', 'just us two'],
    jump:    ['hup!', 'wheee', 'one sec', 'coming!', 'on my way'],

    // Photo card (front, then the flip side)
    photo:     ['looking cool', 'okay, nice photo', 'sharp', 'good shot', 'now that\u2019s a portrait', 'camera-ready'],
    photoBack: ['ooh, the flip side', 'a second look, nice', 'plot twist', 'two sides, I like it'],

    // About the person: kept short, true to what the page says, and not shouty
    interests: ['animal lover, clearly', 'a proper pet person', 'adopt, don\u2019t shop. good motto', 'speedcuber? no way', 'anime, cubes, sketches… busy mind', 'kind-hearted, I\u2019d say', 'plants and animals, a gentle streak'],
    volunteer: ['rescues, feeding, vaccines… real work', 'since 2024, that\u2019s commitment', 'steady, quiet kindness', 'animals are in good hands', 'that\u2019s a lot of heart'],
    lead:      ['trusted with real responsibility', 'organising a fest takes grit', 'leading already, nice', 'people clearly rely on this one', 'doing, not just attending'],
    nit:       ['this seat took real work', 'NIT Durgapur isn\u2019t luck', 'worked hard for this one, clearly', 'a 9.05 in year one, too', 'earned, not handed'],
    school12:  ['95.6%, that\u2019s serious marks', '99 in CS, okay then', 'PCM and CS, and still 95.6%', 'such good marks, honestly', 'strong board result'],
    school10:  ['a perfect 100 in CS', 'full marks in CS, noted', '95.6% in ICSE, strong start', '95.6% twice. that\u2019s consistency', 'sharp from early on']
  };

  var SELECTOR = '.project, .row, .interests-text, #portrait';

  // Tuning
  var WAKE_AT = 24, SLEEP_AT = 6;      // scrollY thresholds (px)
  var ENTER_DELAY = 300, LEAVE_DELAY = 350;  // ms of hovering before it hops over / follows again
  var CURSOR_OFFSET = { x: 20, y: 16 };      // where it trails relative to the cursor
  var SIZE = 44;
  var navH = 56;               // measured below

  /* ---------------------------------------------------------------
     Build the character
     --------------------------------------------------------------- */
  var SVG =
    '<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false">' +
      '<path class="b-ant" d="M22 9 C22 5 24 4 26 3"/><circle class="b-dot" cx="26.5" cy="3" r="2.2"/>' +
      '<path class="b-feet" d="M14 40 v2 M30 40 v2"/>' +
      '<path class="b-body" d="M22 9 C33 9 39 17 39 26 C39 35 32 41 22 41 C12 41 5 35 5 26 C5 17 11 9 22 9Z"/>' +
      '<g class="b-eyes">' +
        '<circle class="b-eye" cx="15" cy="24" r="5.5"/><circle class="b-eye" cx="29" cy="24" r="5.5"/>' +
        '<circle class="b-pupil" id="buddyL" cx="15" cy="24" r="2.6"/><circle class="b-pupil" id="buddyR" cx="29" cy="24" r="2.6"/>' +
      '</g>' +
      '<path class="b-shut" d="M10 25 Q15 29 20 25 M24 25 Q29 29 34 25"/>' +
      '<circle class="b-cheek" cx="9" cy="31" r="2.6"/><circle class="b-cheek" cx="35" cy="31" r="2.6"/>' +
      '<path class="b-mouth" d="M19 32 Q22 35 25 32"/>' +
    '</svg>';

  var el = document.createElement('div');
  el.className = 'buddy is-asleep';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<div class="buddy-bubble"></div>' +
    '<span class="buddy-z">z</span><span class="buddy-z">z</span><span class="buddy-z">z</span>' +
    '<div class="buddy-tilt"><div class="buddy-body">' + SVG + '</div></div>';
  document.body.appendChild(el);

  var tilt = el.querySelector('.buddy-tilt');
  var bubble = el.querySelector('.buddy-bubble');
  var pupils = [el.querySelector('#buddyL'), el.querySelector('#buddyR')];

  /* ---------------------------------------------------------------
     State
     --------------------------------------------------------------- */
  var mode = 'sleep';            // sleep | waking | follow | jump | perch | homing
  var pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 };
  var home = { x: 0, y: 0 };
  var mouse = { x: window.innerWidth * 0.6, y: window.innerHeight * 0.5 };
  var mouseSpeed = 0, lastMoveAt = 0, lastMoveT = 0, touching = false;
  var hoverTarget = null, perchTarget = null;
  var enterTimer = 0, leaveTimer = 0, sayTimer = 0, wakeTimer = 0;
  var jump = null;
  var lastFrame = 0, raf = 0;
  var lastSayAt = 0, perchedAt = 0, nextReadingSay = 8000;

  /* ---------------------------------------------------------------
     Helpers
     --------------------------------------------------------------- */
  function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }
  function now() { return performance.now(); }

  // Pick lines without immediate repeats
  var lastPick = {};
  function pick(cat) {
    var list = LINES[cat], i;
    do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === lastPick[cat]);
    lastPick[cat] = i;
    return list[i];
  }

  // Which set of lines fits this target
  function categoryFor(target) {
    if (target.id === 'portrait') return target.classList.contains('is-flipped') ? 'photoBack' : 'photo';
    if (target.matches('.interests-text')) return 'interests';
    if (target.matches('.project')) return 'project';
    var h = target.querySelector('h3'), name = h ? h.textContent : '';
    if (/NIT/i.test(name)) return 'nit';
    if (/Beachwood/i.test(name)) return 'school12';
    if (/Pranavananda/i.test(name)) return 'school10';
    if (/Volunteer/i.test(name)) return 'volunteer';
    if (/Coordinator/i.test(name)) return 'lead';
    return 'row';
  }

  function commentFor(target) {
    return pick(categoryFor(target)).replace('{t}', titleOf(target));
  }

  function titleOf(target) {
    var h = target.querySelector('h3, h2');
    var t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    return t.length > 24 ? t.slice(0, 22) + '\u2026' : t;
  }

  function say(text, ms) {
    bubble.textContent = text;
    el.classList.add('is-talking');
    lastSayAt = now();
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () { el.classList.remove('is-talking'); }, ms || 2600);
  }
  function hush() { clearTimeout(sayTimer); el.classList.remove('is-talking'); }

  function pulse(cls) {
    el.classList.remove('is-hop', 'is-land');
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // Bed: sitting on the nav bar's bottom edge, in the gap between the name and the links
  function measureHome() {
    var nav = document.querySelector('.nav');
    var name = document.querySelector('.nav-name');
    var links = document.querySelector('.nav ul');
    if (!nav || !name || !links) { home = { x: window.innerWidth - 120, y: 12 }; return; }
    var n = nav.getBoundingClientRect(), a = name.getBoundingClientRect(), l = links.getBoundingClientRect();
    var gap = l.left - a.right;
    var x = gap > SIZE + 40 ? a.right + gap / 2 - SIZE / 2 : l.left - SIZE - 16;
    navH = nav.offsetHeight;
    home = { x: x, y: nav.offsetHeight - SIZE + 3 };   // offsetHeight: unaffected by the nav's slide-in animation
  }

  // Where to sit when reading: just after the last line of the target's heading
  function anchor(target) {
    if (target.id === 'portrait') {                       // perch on the top edge of the photo card
      var c = target.getBoundingClientRect();
      return { x: c.right - SIZE - 18, y: c.top - SIZE + 8 };
    }
    if (touchMode) {                                      // phones: sit on the card's top-right edge, stay below the nav
      var b = target.getBoundingClientRect();
      return {
        x: clamp(b.right - SIZE - 6, 8, window.innerWidth - SIZE - 8),
        y: clamp(b.top - SIZE + 12, navH + 6, Math.max(navH + 6, b.bottom - SIZE - 4))
      };
    }
    var h = target.querySelector('h3, h2') || target;
    if (target.matches('.interests-text')) {              // beside the first line of the paragraph
      var pr = document.createRange();
      pr.selectNodeContents(target);
      var f = pr.getClientRects()[0] || target.getBoundingClientRect();
      return { x: Math.min(f.right + 14, window.innerWidth - SIZE - 16), y: f.top + f.height / 2 - SIZE / 2 };
    }
    var range = document.createRange();
    range.selectNodeContents(h);
    var rects = range.getClientRects();
    var r = rects.length ? rects[rects.length - 1] : h.getBoundingClientRect();
    return {
      x: Math.min(r.right + 14, window.innerWidth - SIZE - 16),
      y: r.top + r.height / 2 - SIZE / 2
    };
  }

  function render(dt) {
    el.style.transform = 'translate3d(' + pos.x.toFixed(2) + 'px,' + pos.y.toFixed(2) + 'px,0)';

    // Lean into motion, stretch with speed
    var speed = Math.hypot(vel.x, vel.y);
    var rot = clamp(vel.x / 55, -16, 16);
    var s = clamp(speed / 3500, 0, 0.14);
    tilt.style.transform = 'rotate(' + rot.toFixed(1) + 'deg) scale(' + (1 - s * 0.5).toFixed(3) + ',' + (1 + s).toFixed(3) + ')';

    // Bubble placement
    el.classList.toggle('is-below', pos.y < 80);
    el.classList.toggle('is-left', pos.x > window.innerWidth - 150);

    // Eyes look at the cursor
    var dx = mouse.x - (pos.x + SIZE / 2), dy = mouse.y - (pos.y + SIZE / 2);
    var d = Math.hypot(dx, dy) || 1;
    var k = Math.min(d / 70, 1) * 2.2;
    var tx = (dx / d) * k, ty = (dy / d) * k;
    for (var i = 0; i < pupils.length; i++) pupils[i].style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px)';
  }

  // Critically-ish damped spring toward a point (slight overshoot keeps it lively)
  function spring(tx, ty, dt, K, C) {
    vel.x += ((tx - pos.x) * K - vel.x * C) * dt;
    vel.y += ((ty - pos.y) * K - vel.y * C) * dt;
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
  }

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ---------------------------------------------------------------
     Main loop (runs only while awake)
     --------------------------------------------------------------- */
  function ensureLoop() {
    if (raf) return;
    lastFrame = now();
    raf = requestAnimationFrame(frame);
  }

  function frame(t) {
    raf = 0;
    var dt = Math.min((t - lastFrame) / 1000, 0.033) || 0.016;
    lastFrame = t;

    if (mode === 'follow') {
      var tx, ty;
      if (touchMode && !touching) {                  // nobody is touching: wait in the bottom-right corner
        tx = window.innerWidth - SIZE - 12;
        ty = window.innerHeight - SIZE - 16;
      } else {
        tx = clamp(mouse.x + CURSOR_OFFSET.x, 8, window.innerWidth - SIZE - 8);
        ty = clamp(mouse.y + CURSOR_OFFSET.y, 8, window.innerHeight - SIZE - 8);
      }
      spring(tx, ty, dt, 110, 14);

      if (t - lastMoveAt > 6000 && t - lastSayAt > 12000) say(pick('idle'));

    } else if (mode === 'homing') {
      spring(home.x, home.y, dt, 70, 15);
      if (Math.hypot(home.x - pos.x, home.y - pos.y) < 2 && Math.hypot(vel.x, vel.y) < 25) fallAsleep();

    } else if (mode === 'jump') {
      var end = anchor(perchTarget);
      var s = clamp((t - jump.t0) / jump.dur, 0, 1);
      var e = ease(s);
      var px = pos.x, py = pos.y;
      pos.x = jump.sx + (end.x - jump.sx) * e;
      pos.y = jump.sy + (end.y - jump.sy) * e - Math.sin(Math.PI * s) * jump.h;
      vel.x = (pos.x - px) / dt; vel.y = (pos.y - py) / dt;
      if (s >= 1) land();

    } else if (mode === 'perch') {
      var a = anchor(perchTarget);
      pos.x = a.x; pos.y = a.y; vel.x = vel.y = 0;
      if (t - perchedAt > nextReadingSay && t - lastSayAt > 6000) {
        say(pick('reading'));
        nextReadingSay = (t - perchedAt) + 9000 + Math.random() * 5000;
      }
    }

    if (mode !== 'sleep') {
      render(dt);
      raf = requestAnimationFrame(frame);
    }
  }

  /* ---------------------------------------------------------------
     Transitions
     --------------------------------------------------------------- */
  function wake() {
    if (mode !== 'sleep') return;
    mode = 'waking';
    vel.x = vel.y = 0;
    el.classList.remove('is-asleep');
    pulse('is-hop');
    say(pick('wake'), 2400);
    ensureLoop();
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(function () {
      mode = 'follow';
      vel.y = -260;                                  // little hop off the ledge
      if (touchMode) hoverTarget = readingTarget();
      if (window.scrollY < SLEEP_AT && !hoverTarget) { goHome(); return; }
      if (hoverTarget) setHover(hoverTarget, true);
    }, 800);
  }

  function goHome() {
    clearTimeout(enterTimer); clearTimeout(leaveTimer); clearTimeout(wakeTimer);
    perchTarget = null;
    mode = 'homing';
    measureHome();
    say(pick('home'), 2200);
    ensureLoop();
  }

  function fallAsleep() {
    mode = 'sleep';
    pos.x = home.x; pos.y = home.y; vel.x = vel.y = 0;
    el.classList.add('is-asleep');
    render(0);
    tilt.style.transform = '';
  }

  function startJump(target) {
    clearTimeout(enterTimer); clearTimeout(leaveTimer);
    perchTarget = target;
    var end = anchor(target);
    var dist = Math.hypot(end.x - pos.x, end.y - pos.y);
    jump = {
      sx: pos.x, sy: pos.y, t0: now(),
      dur: clamp(380 + dist * 0.4, 480, 950),
      h: clamp(dist * 0.22, 36, 150)
    };
    mode = 'jump';
    pulse('is-hop');
    if (dist > 160 && Math.random() < 0.5) say(pick('jump'), 900);
    ensureLoop();
  }

  function land() {
    mode = 'perch';
    vel.x = vel.y = 0;
    perchedAt = now();
    nextReadingSay = 8000;
    pulse('is-land');
    say(commentFor(perchTarget), 2800);
    reconcile();
  }

  function unperch() {
    if (mode !== 'perch') return;
    perchTarget = null;
    if (window.scrollY < SLEEP_AT) { goHome(); return; }  // woke just for the photo: back to bed
    mode = 'follow';
    vel.x = (Math.random() < 0.5 ? -1 : 1) * 120;
    vel.y = -380;                                    // hop off toward the cursor
    hush();
    pulse('is-hop');
  }

  /* ---------------------------------------------------------------
     Hover logic: it only hops over if you actually dwell, not on the way past
     --------------------------------------------------------------- */
  function reconcile() {
    if (mode !== 'perch') return;
    clearTimeout(enterTimer); clearTimeout(leaveTimer);
    if (hoverTarget === perchTarget) return;
    if (hoverTarget) scheduleEnter(hoverTarget);
    else leaveTimer = setTimeout(unperch, LEAVE_DELAY);
  }

  function scheduleEnter(target) {
    clearTimeout(enterTimer);
    enterTimer = setTimeout(function fire() {
      if (hoverTarget !== target) return;
      if (now() - lastMoveT > 120) mouseSpeed = 0;
      if (!touchMode && mouseSpeed > 1.1) { enterTimer = setTimeout(fire, 120); return; }   // still sweeping through
      startJump(target);
    }, ENTER_DELAY);
  }

  function setHover(target, force) {
    if (target === hoverTarget && !force) return;
    hoverTarget = target;
    clearTimeout(enterTimer); clearTimeout(leaveTimer);
    if (mode === 'sleep') {
      if (target && target.id === 'portrait') {        // the photo is at the top, so let it wake for that
        enterTimer = setTimeout(function () { if (hoverTarget === target && mode === 'sleep') wake(); }, ENTER_DELAY);
      }
    }
    else if (mode === 'follow') { if (target) scheduleEnter(target); }
    else if (mode === 'perch') reconcile();
  }

  // Touch: the thing crossing the middle of the screen counts as "being read"
  function readingTarget() {
    var y = window.innerHeight * 0.5;
    var list = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) return list[i];
    }
    return null;
  }

  /* ---------------------------------------------------------------
     Events
     --------------------------------------------------------------- */
  document.addEventListener('pointerover', function (e) {
    if (touchMode) return;
    setHover(e.target.closest ? e.target.closest(SELECTOR) : null);
  });
  document.documentElement.addEventListener('mouseleave', function () { if (!touchMode) setHover(null); });
  document.addEventListener('focusin', function (e) {
    if (touchMode) return;
    var t = e.target.closest ? e.target.closest(SELECTOR) : null;
    if (t) setHover(t);
  });

  window.addEventListener('pointermove', function (e) {
    var t = e.timeStamp;
    if (lastMoveT) {
      var dt = t - lastMoveT;
      if (dt > 0) mouseSpeed = mouseSpeed * 0.7 + (Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y) / dt) * 0.3;
    }
    lastMoveT = t;
    lastMoveAt = now();
    mouse.x = e.clientX; mouse.y = e.clientY;
  }, { passive: true });

  function touchAt(e) {
    var t = e.touches && e.touches[0];
    if (!t) return;
    mouse.x = t.clientX; mouse.y = t.clientY;
    lastMoveAt = now();
    touching = true;
  }
  function touchDone() { touching = false; lastMoveAt = now(); }
  if (touchMode) {
    window.addEventListener('touchstart', touchAt, { passive: true });
    window.addEventListener('touchmove', touchAt, { passive: true });
    window.addEventListener('touchend', touchDone, { passive: true });
    window.addEventListener('touchcancel', touchDone, { passive: true });
  }

  var card = document.getElementById('portrait');
  if (card) card.addEventListener('click', function () {
    setTimeout(function () {
      if (mode === 'perch' && perchTarget === card) { pulse('is-hop'); say(commentFor(card), 2600); }
    }, 350);
  });

  var scrollTick = false;
  window.addEventListener('scroll', function () {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function () {
      scrollTick = false;
      var y = window.scrollY;
      if (mode === 'sleep' && y > WAKE_AT) wake();
      else if (mode === 'homing' && y > WAKE_AT) { mode = 'follow'; hush(); }
      else if ((mode === 'follow' || mode === 'perch' || mode === 'jump') && y < SLEEP_AT) goHome();
      else if (mode === 'perch' || mode === 'follow') {
        // Content moved under a stationary cursor: refresh what's being hovered
        if (touchMode) setHover(readingTarget());
        else {
          var under = document.elementFromPoint(mouse.x, mouse.y);
          setHover(under && under.closest ? under.closest(SELECTOR) : null);
        }
      }
    });
  }, { passive: true });

  function layout() {
    if (mode === 'sleep') { measureHome(); pos.x = home.x; pos.y = home.y; render(0); }
    else measureHome();
  }
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  /* ---------------------------------------------------------------
     Start asleep on the nav bar
     --------------------------------------------------------------- */
  layout();
  requestAnimationFrame(function () { el.classList.add('is-visible'); });
  if (window.scrollY > WAKE_AT) wake();   // reloaded mid-page: just wake up
})();
