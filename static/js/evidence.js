const cards = document.querySelectorAll('.evidence-card');

if (cards.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
  );

  for (const card of cards) {
    card.classList.add('evidence-armed');
    io.observe(card);
  }
}

/* PREVIOUSLY
const list = document.querySelector('.evidence-list');

if (list && 'IntersectionObserver' in window) {
  list.classList.add('evidence-armed'); // cards become hidden *now*

  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      list.classList.remove('evidence-armed'); // un-hide; base transition animates it
      list.classList.add('is-visible');        // carries the stagger delays
      io.disconnect();
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );

  io.observe(list);
} */

