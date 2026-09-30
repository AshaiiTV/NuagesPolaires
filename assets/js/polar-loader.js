/* An atmospheric loading scene. No dependencies, synthetic progress or minimum wait. */
(function () {
  'use strict';

  var scene = null;
  var stories = [
    'Au-delà des nuages, une histoire attend la vôtre.',
    'Le monde n’est pas mort. Il attend.',
    'Chaque Serment est le commencement d’une histoire.',
    'Il suffit parfois d’une étoile pour retrouver son chemin.'
  ];
  var starIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 1 2.5 8.5L23 12l-8.5 2.5L12 23l-2.5-8.5L1 12l8.5-2.5Z" stroke="currentColor"/><path d="m12 6 1.4 4.6L18 12l-4.6 1.4L12 18l-1.4-4.6L6 12l4.6-1.4Z" fill="currentColor"/></svg>';

  function dial() {
    var ticks = '';
    for (var i = 0; i < 72; i++) {
      ticks += '<line x1="200" y1="10" x2="200" y2="' + (i % 6 ? 14 : 21) + '" stroke="' + (i % 6 ? '#95cdbb38' : '#c6b38b88') + '" stroke-width=".6" transform="rotate(' + i * 5 + ' 200 200)"/>';
    }
    return '<svg class="np-loader-dial" viewBox="0 0 400 400" fill="none" aria-hidden="true">'
      + '<circle cx="200" cy="200" r="174" stroke="#95cdbb22" stroke-width=".6"/>'
      + '<g class="np-loader-dial-ring">' + ticks + '<circle cx="200" cy="200" r="181" stroke="#c6b38b40" stroke-width=".6" stroke-dasharray="2 18"/></g>'
      + '<path d="M200 1v27m0 344v27M1 200h27m344 0h27" stroke="#c6b38b70" stroke-width=".8"/>'
      + '</svg>';
  }

  function markup(compass) {
    return '<div class="np-loader-sky" aria-hidden="true"><div class="np-loader-landscape"></div><div class="np-loader-aurora"></div><div class="np-loader-aurora"></div><canvas class="np-loader-stars"></canvas></div>'
      + '<div class="np-loader-cartography" aria-hidden="true">'
        + '<svg class="np-loader-constellation np-loader-constellation-a" viewBox="0 0 240 180"><path pathLength="1" d="m20 116 48-46 44 12 43-53 54 17-32 42-65-6"/><g><circle cx="20" cy="116" r="1.7"/><circle cx="68" cy="70" r="2"/><circle cx="112" cy="82" r="2.5"/><circle cx="155" cy="29" r="1.7"/><circle cx="209" cy="46" r="2"/><circle cx="177" cy="88" r="1.5"/></g><text x="35" y="151">LE FIL DES POSSIBLES</text></svg>'
        + '<svg class="np-loader-constellation np-loader-constellation-b" viewBox="0 0 200 170"><path pathLength="1" d="m18 32 39 38 36-24 52 49 35 31m-87-80 14 82 38-33"/><g><circle cx="18" cy="32" r="1.5"/><circle cx="57" cy="70" r="2"/><circle cx="93" cy="46" r="2.5"/><circle cx="145" cy="95" r="2"/><circle cx="180" cy="126" r="1.5"/><circle cx="107" cy="128" r="1.8"/></g><text x="28" y="159">PAR-DELÀ LE VOILE</text></svg>'
        + '<span class="np-loader-margin-note">CARTOGRAPHIE DE L’INCONNU</span>'
      + '</div>'
      + '<div class="np-loader-masthead"><div class="np-loader-wordmark">' + starIcon + '<div class="np-loader-brand">Nuages Polaires<span class="np-loader-edition">Le compagnon de vos aventures</span></div></div><span class="np-loader-heading-note">Une traversée commence</span></div>'
      + '<div class="np-loader-panel">'
        + '<div class="np-loader-astrolabe" aria-hidden="true">' + dial() + '<div class="np-loader-orbit"></div><div class="np-loader-orbit np-loader-orbit-b"></div>' + compass
          + '<span class="np-loader-pole np-loader-pole-n">N</span><span class="np-loader-pole np-loader-pole-e">E</span><span class="np-loader-pole np-loader-pole-s">S</span><span class="np-loader-pole np-loader-pole-w">O</span><span class="np-loader-star-north"></span>'
        + '</div>'
        + '<p class="np-loader-eyebrow">Aux portes de l’inconnu</p>'
        + '<h1 class="np-loader-title">Suivez <em>l’étoile.</em></h1>'
        + '<p class="np-loader-story">' + stories[0] + '</p>'
        + '<div class="np-loader-status" role="status" aria-live="polite" aria-atomic="true">Connexion au monde…</div>'
        + '<ol class="np-loader-route" aria-label="Étapes du chargement">'
          + '<li class="np-loader-step" data-step="world" data-state="active" aria-current="step">Le monde</li>'
          + '<li class="np-loader-step" data-step="session" data-state="pending">Votre lien</li>'
          + '<li class="np-loader-step" data-step="ready" data-state="pending">Le départ</li>'
        + '</ol>'
      + '</div>'
      + '<div class="np-loader-footer"><p class="np-loader-invitation">' + starIcon + '<span>Effleurez le ciel. Laissez une trace.</span></p>'
        + '<button class="np-loader-motion" type="button" aria-pressed="false" aria-label="Suspendre les animations">'
          + '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4 2v8M8 2v8" stroke="currentColor" stroke-width="1.4"/></svg><span>Calmer le ciel</span>'
        + '</button></div>';
  }

  function mount(compass) {
    if (scene) return;
    var el = document.createElement('div');
    el.id = 'db-loader';
    el.setAttribute('aria-label', 'Chargement de Nuages Polaires');
    el.innerHTML = markup(compass || '');
    document.body.appendChild(el);
    var media = window.matchMedia('(prefers-reduced-motion: reduce)');
    var canvas = el.querySelector('canvas');
    var context = null;
    try { context = canvas.getContext('2d'); } catch (_) { /* The CSS sky also works without canvas. */ }
    var motion = el.querySelector('.np-loader-motion');
    var story = el.querySelector('.np-loader-story');
    var invitation = el.querySelector('.np-loader-invitation span');
    var s = scene = {
      el: el, offline: false, done: false, reduced: media.matches, paused: false,
      frame: 0, timer: 0, width: 0, height: 0, stars: [], trail: [],
      lastFrame: 0, lastPointer: 0, time: 0, storyIndex: 0,
      restore: [], focus: document.activeElement
    };

    // The visual overlay also keeps keyboard focus and assistive reading out of the page beneath it.
    Array.prototype.forEach.call(document.body.children, function (child) {
      if (child === el || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(child.tagName)) return;
      s.restore.push({ el: child, inert: child.inert });
      child.inert = true;
    });
    var previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function draw() {
      if (!context || !s.width || !s.height) return;
      var ctx = context;
      ctx.clearRect(0, 0, s.width, s.height);
      s.stars.forEach(function (star) {
        var alpha = star.alpha * (.7 + .3 * Math.sin(s.time * .00055 + star.phase));
        var y = star.y + (s.reduced ? 0 : Math.sin(s.time * .00012 + star.phase) * 7);
        ctx.fillStyle = 'rgba(211,231,216,' + alpha + ')';
        ctx.beginPath(); ctx.arc(star.x, y, star.radius, 0, Math.PI * 2); ctx.fill();
        if (star.radius > 1.15) {
          ctx.strokeStyle = 'rgba(186,214,189,' + alpha * .35 + ')';
          ctx.lineWidth = .5; ctx.beginPath();
          ctx.moveTo(star.x - 4, y); ctx.lineTo(star.x + 4, y);
          ctx.moveTo(star.x, y - 4); ctx.lineTo(star.x, y + 4); ctx.stroke();
        }
      });
      s.trail = s.trail.filter(function (point) { return s.time - point.born < 1600; });
      s.trail.forEach(function (point, index) {
        var life = 1 - (s.time - point.born) / 1600;
        ctx.fillStyle = 'rgba(220,231,196,' + life * .85 + ')';
        ctx.beginPath(); ctx.arc(point.x, point.y - (1 - life) * 12, 1.8 * life, 0, Math.PI * 2); ctx.fill();
        var previous = s.trail[index - 1];
        if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 100) {
          ctx.strokeStyle = 'rgba(173,208,185,' + life * .28 + ')'; ctx.lineWidth = .7;
          ctx.beginPath(); ctx.moveTo(previous.x, previous.y - (1 - life) * 12); ctx.lineTo(point.x, point.y - (1 - life) * 12); ctx.stroke();
        }
      });
    }

    function resize() {
      s.width = el.clientWidth; s.height = el.clientHeight;
      if (!context) return;
      var ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(s.width * ratio); canvas.height = Math.round(s.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      // Deterministic positions keep the sky steady across preference changes and resizing.
      s.stars = Array.from({ length: Math.min(115, Math.round(s.width * s.height / 11500)) }, function (_, i) {
        var x = ((i * 73.317 + 19) % 100) / 100;
        var y = ((i * 37.713 + 7) % 100) / 100;
        return { x: x * s.width, y: y * s.height, radius: i % 9 === 0 ? 1.3 : .5 + (i % 3) * .2, alpha: .18 + (i % 7) * .065, phase: i * 1.71 };
      });
      draw();
    }

    function tick(now) {
      if (s.done || s.paused || s.reduced || document.hidden) { s.frame = 0; return; }
      // 30 fps is plenty for this slow sky; cap pixel density and particle count too.
      if (!s.lastFrame || now - s.lastFrame >= 32) {
        s.time += s.lastFrame ? Math.min(now - s.lastFrame, 64) : 0;
        s.lastFrame = now;
        draw();
      }
      s.frame = requestAnimationFrame(tick);
    }

    function syncMotion() {
      cancelAnimationFrame(s.frame); s.frame = 0; s.lastFrame = 0;
      clearInterval(s.timer); s.timer = 0;
      el.classList.toggle('is-paused', s.paused);
      el.classList.toggle('is-reduced', s.reduced);
      el.classList.toggle('is-hidden', document.hidden);
      motion.hidden = s.reduced;
      motion.setAttribute('aria-pressed', String(s.paused));
      motion.setAttribute('aria-label', s.paused ? 'Reprendre les animations' : 'Suspendre les animations');
      motion.querySelector('span').textContent = s.paused ? 'Éveiller le ciel' : 'Calmer le ciel';
      invitation.textContent = s.reduced || s.paused ? 'Chaque aventure commence par un premier pas.' : 'Effleurez le ciel. Laissez une trace.';
      if (s.done || s.paused || s.reduced || document.hidden) return;
      if (context) s.frame = requestAnimationFrame(tick);
      s.timer = setInterval(function () {
        s.storyIndex = (s.storyIndex + 1) % stories.length;
        story.textContent = stories[s.storyIndex];
        story.classList.remove('is-changing');
        void story.offsetWidth;
        story.classList.add('is-changing');
      }, 5600);
    }

    function toggle() { s.paused = !s.paused; syncMotion(); }
    function preference(event) { s.reduced = event.matches; s.trail = []; syncMotion(); draw(); }
    function pointer(event) {
      if (s.paused || s.reduced || s.done || event.target.closest('button')) return;
      var now = performance.now();
      if (event.type !== 'pointerdown' && now - s.lastPointer < 35) return;
      s.lastPointer = now;
      s.trail.push({ x: event.clientX, y: event.clientY, born: s.time });
      if (s.trail.length > 45) s.trail.shift();
    }
    function keydown(event) {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      if (!motion.hidden) motion.focus({ preventScroll: true });
    }

    motion.addEventListener('click', toggle);
    media.addEventListener('change', preference);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', syncMotion);
    el.addEventListener('pointermove', pointer, { passive: true });
    el.addEventListener('pointerdown', pointer, { passive: true });
    document.addEventListener('keydown', keydown);
    resize(); syncMotion();

    s.cleanup = function () {
      cancelAnimationFrame(s.frame); clearInterval(s.timer);
      s.frame = 0; s.timer = 0; s.trail = [];
      media.removeEventListener('change', preference);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', syncMotion);
      document.removeEventListener('keydown', keydown);
      motion.removeEventListener('click', toggle);
      el.removeEventListener('pointermove', pointer);
      el.removeEventListener('pointerdown', pointer);
      s.restore.forEach(function (item) { item.el.inert = item.inert; });
      document.body.style.overflow = previousOverflow;
      if (el.contains(document.activeElement) && s.focus && s.focus !== document.body && s.focus.isConnected) {
        s.focus.focus({ preventScroll: true });
      }
    };
  }

  function stage(name) {
    var s = scene;
    if (!s || s.done) return;
    if (name === 'offline') s.offline = true;
    var current = name === 'ready' ? 2 : name === 'session' ? 1 : 0;
    s.el.querySelectorAll('.np-loader-step').forEach(function (step, i) {
      step.dataset.state = name === 'ready' || i < current ? 'complete' : i === current ? 'active' : 'pending';
      if (i === current && name !== 'ready') step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    var status = s.offline ? 'Mode hors ligne — préparation du cache local…'
      : name === 'session' ? 'Le monde est là. Recherche de votre session…'
      : name === 'ready' ? 'La traversée peut commencer.' : 'Connexion au monde…';
    s.el.querySelector('.np-loader-status').textContent = status;
  }

  function finish() {
    var s = scene;
    if (!s || s.done) return;
    stage('ready');
    s.done = true;
    s.cleanup();
    s.el.classList.add('is-done');
    s.el.setAttribute('aria-hidden', 'true');
    s.el.inert = true;
    // Start revealing the app immediately; the short dissolve never gates its boot.
    setTimeout(function () {
      s.el.remove();
      if (scene === s) scene = null;
    }, s.reduced ? 0 : 600);
  }

  window.NPLoader = { mount: mount, stage: stage, finish: finish };
})();
