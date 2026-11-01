// Small page behaviours, plus the WebGL gallery on the home page when the device can run it.
const root = document.documentElement;

// Header hairline once the page scrolls.
const onScroll = () => root.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// Copy the email address.
for (const btn of document.querySelectorAll('[data-copy]')) {
  const label = btn.textContent;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = btn.dataset.done;
    } catch {
      window.location.href = `mailto:${btn.dataset.copy}`;
      return;
    }
    setTimeout(() => (btn.textContent = label), 1800);
  });
}

// Lists that arrive once, as lists.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion && 'IntersectionObserver' in window) {
  for (const sec of document.querySelectorAll('.work, .how')) {
    sec.querySelectorAll('.work-row, .how-line li').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 5)));
    if (sec.getBoundingClientRect().top < window.innerHeight * 0.9) continue;
    sec.classList.add('pending');
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      sec.classList.remove('pending');
      io.disconnect();
    }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(sec);
  }
}

// The clicked project image becomes the case-study cover (cross-document view transition).
document.addEventListener('click', (e) => {
  const link = e.target.closest('.work-row a, .next');
  if (!link) return;
  const im = link.querySelector('img');
  if (im) im.style.viewTransitionName = 'cover';
});
window.addEventListener('pageshow', () => document.querySelectorAll('img[style*="view-transition"]').forEach((im) => (im.style.viewTransitionName = '')));

// Gallery: WebGL only when it will run well. The image strip is the fallback.
const gallery = document.querySelector('[data-gallery]');
if (gallery) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const probe = document.createElement('canvas');
  const hasGL = !!(probe.getContext('webgl2') || probe.getContext('webgl'));
  if (hasGL && !reduced && !saveData) {
    import('./gallery.js')
      .then((m) => m.mount(gallery))
      .catch(() => root.classList.remove('gl-on'));
  }
}
