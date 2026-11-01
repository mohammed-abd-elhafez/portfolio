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

// Mouse users: custom cursor and the reactive dot field.
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (finePointer) {
  const cur = document.querySelector('.cur');
  const label = cur && cur.querySelector('span');
  if (cur) {
    root.classList.add('has-cur');
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
    const move = () => {
      cx += (x - cx) * (reducedMotion ? 1 : 0.3); cy += (y - cy) * (reducedMotion ? 1 : 0.3);
      cur.style.transform = `translate(${cx}px, ${cy}px)`;
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(move) : 0;
    };
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!cur.classList.contains('on')) { cx = x; cy = y; }
      cur.classList.add('on');
      if (!raf) raf = requestAnimationFrame(move);
      const t = e.target.closest && e.target.closest('a, button, .gl');
      const isGl = t && t.classList.contains('gl');
      const isRow = t && t.closest('.work-row');
      const text = isGl ? cur.dataset.drag : isRow ? cur.dataset.open : '';
      label.textContent = text;
      cur.classList.toggle('label', !!text);
      cur.classList.toggle('big', !!t && !text);
    }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('on'));
    addEventListener('pointerdown', () => cur.animate && cur.animate([{ scale: 1 }, { scale: 0.85 }, { scale: 1 }], { duration: 260, easing: 'ease-out' }));
  }
  const field = document.querySelector('.field');
  if (field && !reducedMotion) import('./field.js').then((m) => m.mountField(field)).catch(() => {});
}

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
