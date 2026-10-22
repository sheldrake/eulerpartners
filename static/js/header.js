const header = document.getElementById('header');
const navToggle = document.getElementById('nav-toggle');
const nav = document.getElementById('site-nav');

function closeNav() {
  if (!navToggle || !nav) return;

  nav.classList.remove('nav-open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Open menu');
}

if (header) {
  let lastScrollPosition = 0;

  window.addEventListener('scroll', () => {
    const currentScrollPosition = window.scrollY;

    if (currentScrollPosition <= 0) {
      header.classList.remove('hidden');
    } else if (
      currentScrollPosition > lastScrollPosition &&
      currentScrollPosition > 100
    ) {
      header.classList.add('hidden');
      closeNav();
    } else if (currentScrollPosition < lastScrollPosition) {
      header.classList.remove('hidden');
    }

    lastScrollPosition = currentScrollPosition;
  }, { passive: true });
}

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('nav-open');

    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeNav();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeNav();
  });
}
