// Shared pointer position in normalized device coordinates (-1 to 1).
export const pointer = { x: 0, y: 0, last: -9999 };

addEventListener(
  'pointermove',
  (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / innerHeight) * 2 - 1);
    pointer.last = performance.now();
  },
  { passive: true }
);
