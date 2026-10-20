const header = document.getElementById('header');

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
    } else if (currentScrollPosition < lastScrollPosition) {
      header.classList.remove('hidden');
    }

    lastScrollPosition = currentScrollPosition;
  }, { passive: true });
}
