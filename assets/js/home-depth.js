/* Nuages Polaires — a quiet descent through the public landscape. */
(function () {
  'use strict';

  var home = document.getElementById('s-home');
  var hero = home && home.querySelector('.np-hero');
  var depths = home && home.querySelector('.np-world-depths');
  if (!home || !hero || !depths) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrowViewport = window.matchMedia('(max-width: 760px)');
  var pendingFrame = 0;
  var previous = Object.create(null);
  // Several legacy UI observers watch every style attribute under body.
  // Updating a scoped CSS rule keeps scrolling from waking those observers.
  var motionStyle = document.createElement('style');
  motionStyle.id = 'np-home-depth-motion';
  motionStyle.textContent = 'html[data-np-design="polar"] #s-home {}';
  document.head.appendChild(motionStyle);
  var motionProperties = motionStyle.sheet.cssRules[0].style;

  function visible() {
    return !document.hidden && home.isConnected && !home.hidden && home.classList.contains('active');
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function setShift(name, value) {
    var next = (Math.round(value * 10) / 10) + 'px';
    if (previous[name] === next) return;
    previous[name] = next;
    motionProperties.setProperty(name, next);
  }

  function render() {
    pendingFrame = 0;
    if (!visible()) return;

    var skyShift = 0;
    var depthShift = 0;
    var mistShift = 0;
    if (!reducedMotion.matches) {
      // Read geometry together, before updating the three inherited transforms.
      var heroRect = hero.getBoundingClientRect();
      var depthRect = depths.getBoundingClientRect();
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      var mobile = narrowViewport.matches;
      var skyProgress = clamp(-heroRect.top / Math.max(1, heroRect.height), 0, 1);
      var depthProgress = clamp(
        (viewportHeight - 2 * depthRect.top - depthRect.height) / Math.max(1, viewportHeight + depthRect.height),
        -1, 1
      );
      skyShift = skyProgress * (mobile ? 45 : 90);
      depthShift = depthProgress * (mobile ? 45 : 90);
      mistShift = depthProgress * (mobile ? -28 : -55);
    }

    setShift('--np-sky-shift', skyShift);
    setShift('--np-depth-shift', depthShift);
    setShift('--np-mist-shift', mistShift);
  }

  function schedule() {
    if (!visible()) {
      if (pendingFrame) window.cancelAnimationFrame(pendingFrame);
      pendingFrame = 0;
      return;
    }
    if (!pendingFrame) pendingFrame = window.requestAnimationFrame(render);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);

  // A return from another SPA screen needs fresh geometry after display:none.
  new MutationObserver(schedule).observe(home, { attributes: true, attributeFilter: ['class', 'hidden'] });
  if (typeof ResizeObserver === 'function') {
    var resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(home);
    resizeObserver.observe(hero);
    resizeObserver.observe(depths);
  }

  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', schedule);
  } else {
    reducedMotion.addListener(schedule);
  }

  schedule();
})();
