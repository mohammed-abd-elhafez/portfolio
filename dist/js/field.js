// Mouse-reactive dot field behind the page. Plain WebGL points.
// Dots sit on a loose grid, breathe slowly, and are pushed away (and tinted blue) near the pointer.
const VERT = `
precision highp float;
attribute vec2 aPos;
attribute float aRand;
uniform vec2 uRes, uMouse;
uniform float uTime, uScroll, uDpr, uActive;
varying float vNear;
void main() {
  vec2 p = aPos;
  p.y = mod(p.y - uScroll * 0.25, uRes.y + 40.0) - 20.0;
  p += vec2(sin(uTime * 0.5 + aRand * 6.28), cos(uTime * 0.4 + aRand * 6.28)) * 2.0;
  vec2 d = p - uMouse;
  float dist = length(d);
  float near = smoothstep(170.0, 0.0, dist) * uActive;
  p += normalize(d + 0.0001) * near * 26.0;
  vNear = near;
  vec2 clip = (p / uRes) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = (1.6 + near * 2.4) * uDpr;
}`;
const FRAG = `
precision highp float;
varying float vNear;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.35, length(c));
  vec3 ink = vec3(0.055, 0.059, 0.071);
  vec3 blue = vec3(0.165, 0.208, 0.910);
  gl_FragColor = vec4(mix(ink, blue, vNear), 1.0) * a * mix(0.16, 0.8, vNear);
}`;

export function mountField(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const U = {};
  for (const n of ['uRes', 'uMouse', 'uTime', 'uScroll', 'uDpr', 'uActive']) U[n] = gl.getUniformLocation(prog, n);
  const posBuf = gl.createBuffer(), rndBuf = gl.createBuffer();
  const aPos = gl.getAttribLocation(prog, 'aPos'), aRand = gl.getAttribLocation(prog, 'aRand');
  let count = 0, W = 0, H = 0, dpr = 1;

  const layout = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const gap = 26, pos = [], rnd = [];
    for (let y = -20; y < H + 20; y += gap)
      for (let x = 0; x < W + gap; x += gap) {
        pos.push(x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6);
        rnd.push(Math.random());
      }
    count = rnd.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, rndBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rnd), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aRand); gl.vertexAttribPointer(aRand, 1, gl.FLOAT, false, 0, 0);
  };
  layout();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });

  const mouse = { x: -999, y: -999, tx: -999, ty: -999, active: 0, target: 0 };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.target = 1;
    if (mouse.x < -900) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    wake();
  }, { passive: true });
  document.addEventListener('pointerleave', () => (mouse.target = 0));

  let raf = 0, idleSince = performance.now();
  const frame = (t) => {
    raf = 0;
    if (document.hidden) return;
    mouse.x += (mouse.tx - mouse.x) * 0.14; mouse.y += (mouse.ty - mouse.y) * 0.14;
    mouse.active += (mouse.target - mouse.active) * 0.08;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, W, H); gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform1f(U.uTime, t / 1000); gl.uniform1f(U.uScroll, window.scrollY);
    gl.uniform1f(U.uDpr, dpr); gl.uniform1f(U.uActive, mouse.active);
    gl.drawArrays(gl.POINTS, 0, count);
    // keep drawing while the pointer moves or the page scrolls; rest after 4s idle
    if (t - idleSince < 4000) raf = requestAnimationFrame(frame);
  };
  const wake = () => { idleSince = performance.now(); if (!raf) raf = requestAnimationFrame(frame); };
  window.addEventListener('scroll', wake, { passive: true });
  document.addEventListener('visibilitychange', wake);
  wake();
  canvas.classList.add('on');
}
