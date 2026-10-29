// Euler Partners - services card stack.
// Pins the card stage and drives each card's travel from the scroll
// position, so the cards seat with a brief dwell (--stack-dwell) and
// then leave the viewport together, without collapsing further.
// Without this script the cards fall back to plain position: sticky.
(function () {
  'use strict';

  var section = document.querySelector('.services-section');
  var stage = section ? section.querySelector('.services-stage') : null;
  var container = section ? section.querySelector('.services-container') : null;
  if (!section || !stage || !container) return;

  var cards = Array.prototype.slice.call(
    stage.querySelectorAll('.service-card-cohere')
  );
  if (cards.length < 2) return;

  var desktop = window.matchMedia('(min-width: 768px)');
  var STAGE_TOP = 40; // px; matches .services-stage { top } in homepage.css
  var travel = [];
  var pinSpan = 0;
  var ticking = false;

  function seatOffset(index) {
    // Matches the per-card top rules under .stack-js in homepage.css
    return index * 100;
  }

  function setup() {
    if (!desktop.matches) {
      teardown();
      return;
    }

    cards.forEach(function (card) {
      card.style.transform = '';
    });
    section.classList.add('stack-js');

    var dwell = parseFloat(
      getComputedStyle(stage).getPropertyValue('--stack-dwell')
    );
    if (isNaN(dwell)) dwell = 120;

    var heights = cards.map(function (card) {
      return card.offsetHeight;
    });

    // Each card starts where normal flow would put it (below the
    // previous card) and travels up to its seat at the top of the stage.
    var flowTop = 0;
    travel = cards.map(function (card, i) {
      var t = Math.max(0, flowTop - seatOffset(i));
      flowTop += heights[i];
      return t;
    });

    var stageHeight =
      seatOffset(cards.length - 1) + heights[heights.length - 1];
    stage.style.height = stageHeight + 'px';

    pinSpan = travel[travel.length - 1];
    container.style.height = stageHeight + pinSpan + dwell + 'px';

    update();
  }

  function teardown() {
    section.classList.remove('stack-js');
    stage.style.height = '';
    container.style.height = '';
    cards.forEach(function (card) {
      card.style.transform = '';
    });
  }

  function update() {
    var top = container.getBoundingClientRect().top;
    // Distance scrolled since the stage pinned, clamped to the pin span.
    var scrolled = pinSpan > 0
      ? Math.min(pinSpan, Math.max(0, STAGE_TOP - top))
      : pinSpan;

    cards.forEach(function (card, i) {
      card.style.transform = travel[i] > 0
        ? 'translateY(' + offset(i, scrolled) + 'px)'
        : '';
    });
  }

  // Cards close on their predecessor one at a time: card i only starts
  // moving once card i-1 has seated, keeping the flow gap between them
  // until then. Before its phase, a card simply rides along with its
  // predecessor; during its phase it travels the remaining distance.
  function offset(i, d) {
    if (i === 0) return 0;

    var phaseLen = travel[i] - travel[i - 1];
    if (phaseLen <= 0) return offset(i - 1, d);

    var base = offset(i - 1, d) + phaseLen;
    if (d <= travel[i - 1]) return base;

    var progress = Math.min(1, (d - travel[i - 1]) / phaseLen);
    return base * (1 - progress);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (section.classList.contains('stack-js')) update();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', setup);
  window.addEventListener('load', setup);
  desktop.addEventListener('change', setup);

  setup();
})();

// Euler Partners - service card deliverables disclosure.
// Below 768px each card's Deliverables list starts collapsed behind its
// title button; tapping expands it in place. On desktop the lists are
// always expanded and the chevron is hidden. Without this script every
// list renders expanded in full, as plain content.
(function () {
  'use strict';

  var toggles = Array.prototype.slice.call(
    document.querySelectorAll('.service-deliverables-toggle')
  );

  var panels = toggles
    .map(function (toggle) {
      return {
        toggle: toggle,
        content: document.getElementById(
          toggle.getAttribute('aria-controls')
        )
      };
    })
    .filter(function (p) {
      return p.content;
    });
  if (!panels.length) return;

  var desktop = window.matchMedia('(min-width: 768px)');

  function isOpen(p) {
    return p.toggle.getAttribute('aria-expanded') === 'true';
  }

  function open(p) {
    p.toggle.setAttribute('aria-expanded', 'true');
    p.content.style.height = p.content.scrollHeight + 'px';
  }

  function close(p) {
    p.toggle.setAttribute('aria-expanded', 'false');
    p.content.style.height = '0px';
  }

  function settle() {
    // Keep the open panel's explicit height in step after font/image load
    // or viewport changes; collapsed panels stay at 0.
    if (desktop.matches) return;
    panels.forEach(function (p) {
      if (isOpen(p)) open(p);
    });
  }

  function applyMode() {
    if (desktop.matches) {
      panels.forEach(function (p) {
        p.toggle.setAttribute('aria-expanded', 'true');
        p.content.style.height = '';
      });
    } else {
      panels.forEach(close);
    }
  }

  panels.forEach(function (p) {
    p.toggle.addEventListener('click', function () {
      if (desktop.matches) return;
      if (isOpen(p)) close(p);
      else open(p);
    });
  });

  desktop.addEventListener('change', applyMode);
  window.addEventListener('resize', settle);
  window.addEventListener('load', settle);

  applyMode();
})();
