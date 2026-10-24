// Custom cursor dot that grows over links, buttons and project rows.
export function initCursor() {
  const cur = document.getElementById('cur');
  if (!cur || !window.matchMedia('(pointer: fine)').matches) return;

  addEventListener(
    'pointermove',
    (e) => {
      cur.classList.add('on');
      cur.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      const target = e.target.closest && e.target.closest('a, button, .row');
      cur.classList.toggle('big', !!target);
    },
    { passive: true }
  );
  document.addEventListener('pointerleave', () => cur.classList.remove('on'));
}
