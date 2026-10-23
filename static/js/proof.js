// Euler Partners - proof section accordion.
// Titles stay visible; clicking a title reveals its content and collapses
// the previously open item. One item is always open (the first by default),
// and the figure photo crossfades to the one paired with that item.
// Without this script every item renders expanded in full, as plain content,
// with the first photo showing.
(function () {
  'use strict';

  var section = document.querySelector('.proof-section');
  var list = section ? section.querySelector('.proof-list') : null;
  if (!section || !list) return;

  var items = Array.prototype.slice.call(
    list.querySelectorAll('.proof-item')
  );
  if (items.length < 2) return;

  var figures = Array.prototype.slice.call(
    section.querySelectorAll('.proof-figure img')
  );

  var panels = items.map(function (item, i) {
    return {
      toggle: item.querySelector('.proof-toggle'),
      panel: item.querySelector('.proof-item__panel'),
      content: item.querySelector('.proof-content'),
      inner: item.querySelector('.proof-content__inner'),
      figure: figures[i] || null
    };
  }).filter(function (p) {
    return p.toggle && p.panel && p.content && p.inner;
  });
  if (panels.length < 2) return;

  function isOpen(p) {
    return p.toggle.getAttribute('aria-expanded') === 'true';
  }

  function open(p) {
    p.toggle.setAttribute('aria-expanded', 'true');
    p.panel.classList.add('is-open');
    p.content.style.height = p.inner.offsetHeight + 'px';
    if (p.figure) p.figure.classList.add('is-active');
  }

  function close(p) {
    p.toggle.setAttribute('aria-expanded', 'false');
    p.panel.classList.remove('is-open');
    p.content.style.height = '0px';
    if (p.figure) p.figure.classList.remove('is-active');
  }

  function settle() {
    // Keep the open panel's explicit height in step after font/image load
    // or viewport changes; collapsed panels stay at 0.
    panels.forEach(function (p) {
      if (isOpen(p)) open(p);
    });
  }

  panels.forEach(function (p) {
    p.toggle.addEventListener('click', function () {
      if (isOpen(p)) return;
      panels.forEach(function (other) {
        if (other !== p && isOpen(other)) close(other);
      });
      open(p);
    });
  });

  section.classList.add('proof-js');
  panels.forEach(function (p, i) {
    if (i === 0) open(p);
    else close(p);
  });

  window.addEventListener('resize', settle);
  window.addEventListener('load', settle);
})();
