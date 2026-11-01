// Entry point for every page.
import { initCursor } from './cursor.js';
import { initCopy } from './copy.js';

initCursor();
initCopy();

// The WebGL field loads after first paint so the page is readable immediately.
const canvas = document.getElementById('gl');
if (canvas) {
  const start = () =>
    import('./particles.js')
      .then((m) => m.initParticles(canvas, { fade: document.body.dataset.page === 'home' }))
      .catch(() => document.documentElement.classList.add('no-gl'));
  'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 800 }) : setTimeout(start, 100);
}
