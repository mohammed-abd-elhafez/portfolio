// Curved WebGL project gallery. Plain WebGL, no libraries.
// Panels sit on the inside of a cylinder around the camera. Dragging spins it;
// speed bends the panels and splits their colour channels, then they settle.

const VERT = `
precision highp float;
attribute vec2 aPos;
uniform float uAngle, uRadius, uVel, uFocus, uIntro;
uniform vec2 uSize;
uniform mat4 uProj;
varying vec2 vUv;
varying float vFocus;
void main() {
  vUv = vec2(aPos.x + 0.5, 0.5 - aPos.y);
  float theta = uAngle + aPos.x * uSize.x / uRadius;
  float y = aPos.y * uSize.y;
  // speed bends the panel into a shallow wave and pulls it back a touch
  y += sin((aPos.x + 0.5) * 3.14159) * uVel * 0.22;
  float r = uRadius + abs(uVel) * 0.6 * (1.0 - uFocus * 0.5);
  // intro: panels arrive from deeper in the room and flatten onto the curve
  r += (1.0 - uIntro) * 3.0;
  y *= mix(0.92, 1.0, uIntro);
  vec3 p = vec3(r * sin(theta), y, -r * cos(theta));
  vFocus = uFocus;
  gl_Position = uProj * vec4(p, 1.0);
}`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform float uVel, uReady;
uniform vec2 uSize;
varying vec2 vUv;
varying float vFocus;
float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 px = (vUv - 0.5) * uSize;
  float d = rbox(px, uSize * 0.5, 0.06);
  float aa = fwidth(d);
  float mask = 1.0 - smoothstep(-aa, aa, d);
  float s = uVel * 0.012;
  vec3 c;
  c.r = texture2D(uTex, vUv + vec2(s, 0.0)).r;
  c.g = texture2D(uTex, vUv).g;
  c.b = texture2D(uTex, vUv - vec2(s, 0.0)).b;
  float grey = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 paper = vec3(0.906, 0.910, 0.925);
  float f = smoothstep(0.0, 1.0, vFocus);
  c = mix(mix(vec3(grey), c, 0.25), c, f);
  c = mix(paper * 0.92, c, mix(0.55, 1.0, f));
  c = mix(paper * 0.85, c, uReady);
  gl_FragColor = vec4(c * mask, mask);
}`;

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

export function mount(host) {
  const canvas = host.querySelector('.gl');
  const ui = host.querySelector('.gallery-ui');
  const items = JSON.parse(host.querySelector('#gallery-data').textContent);
  const rtl = document.documentElement.dir === 'rtl';
  const dirSign = rtl ? -1 : 1;
  const N = items.length;

  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) throw new Error('no webgl');
  gl.getExtension('OES_standard_derivatives');

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, type === gl.FRAGMENT_SHADER ? `#extension GL_OES_standard_derivatives : enable\n${src}` : src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  // tessellated unit plane
  const SX = 40, SY = 10;
  const verts = [];
  for (let j = 0; j < SY; j++)
    for (let i = 0; i < SX; i++) {
      const x0 = i / SX - 0.5, x1 = (i + 1) / SX - 0.5, y0 = j / SY - 0.5, y1 = (j + 1) / SY - 0.5;
      verts.push(x0, y0, x1, y0, x1, y1, x0, y0, x1, y1, x0, y1);
    }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const count = verts.length / 2;

  const U = {};
  for (const n of ['uAngle', 'uRadius', 'uVel', 'uFocus', 'uSize', 'uProj', 'uTex', 'uReady', 'uIntro']) U[n] = gl.getUniformLocation(prog, n);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // textures
  const tex = items.map(() => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([220, 222, 228, 255]));
    return { t, ready: 0, loaded: false };
  });
  let loadedCount = 0;
  items.forEach((it, i) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex[i].t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      tex[i].loaded = true;
      if (++loadedCount === 1) start();
    };
    img.src = it.tex;
  });

  // layout
  const R = 6;
  const FOV = (30 * Math.PI) / 180;
  let W = 0, H = 0, panelW = 2.4, panelH = 1.5, step = 0.5, proj;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.75 : 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const aspect = W / Math.max(H, 1);
    const visH = 2 * R * Math.tan(FOV / 2);
    const visW = visH * aspect;
    panelH = Math.min(visH * 0.86, (visW * 0.8) / 1.6);
    panelW = panelH * 1.6;
    step = (panelW * 1.12) / R; // radians between panel centres
    proj = perspective(FOV, aspect, 0.1, 50);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // motion state (offset is measured in panels)
  let offset = -1.4, target = 0, vel = 0, shown = 0;
  let dragging = false, lastX = 0, downX = 0, moved = 0, lastT = 0, dragVel = 0;
  const wrap = (p) => ((((p + N / 2) % N) + N) % N) - N / 2;
  const current = () => ((Math.round(target) % N) + N) % N;

  // caption + links
  const capN = ui.querySelector('.cap-n');
  const capTitle = ui.querySelector('.cap-title');
  const capSub = ui.querySelector('.cap-sub');
  const openBtn = ui.querySelector('.open');
  const show = (i) => {
    if (i === shown && capTitle.textContent) return;
    shown = i;
    const it = items[i];
    capN.textContent = `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    capTitle.textContent = it.title;
    capTitle.href = it.href;
    capSub.textContent = it.status ? `${it.sub} · ${it.status}` : it.sub;
    openBtn.href = it.href;
    if (capTitle.animate) {
      const o = { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };
      capTitle.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], o);
      capSub.animate([{ opacity: 0 }, { opacity: 1 }], { ...o, delay: 60, fill: 'backwards' });
    }
  };
  show(0);

  const go = (d) => { target = Math.round(target) + d; };
  ui.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.step))));
  ui.addEventListener('keydown', (e) => {
    if (e.target !== ui) return;
    if (e.key === 'ArrowRight') { go(dirSign); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(-dirSign); e.preventDefault(); }
    else if (e.key === 'Enter') { window.location.href = items[current()].href; }
  });

  // pointer: horizontal drags spin the strip, vertical drags scroll the page
  const pxPerPanel = () => Math.max(W * 0.45, 220);
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; lastX = downX = e.clientX; lastT = performance.now(); dragVel = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const now = performance.now();
    const d = (-dx / pxPerPanel()) * dirSign;
    target += d;
    dragVel = d / Math.max(now - lastT, 8) * 16;
    moved += Math.abs(dx);
    lastX = e.clientX; lastT = now;
  });
  const release = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('dragging');
    if (moved < 6) {
      // a tap: open the centre panel, or bring a side panel to the centre
      const rel = (e.clientX - canvas.getBoundingClientRect().left) / W - 0.5;
      const half = (panelW / (2 * R * Math.tan(FOV / 2) * (W / H))) ;
      if (Math.abs(rel) < half) window.location.href = items[current()].href;
      else go(Math.sign(rel) * dirSign);
      return;
    }
    target = Math.round(target + dragVel * 6);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // leave vertical scrolling to the page
    e.preventDefault();
    target += (e.deltaX / pxPerPanel()) * dirSign;
    clearTimeout(canvas._snap);
    canvas._snap = setTimeout(() => (target = Math.round(target)), 140);
  }, { passive: false });

  // render loop, paused off-screen or in a hidden tab
  let running = false, visible = true, raf = 0, t0 = 0, intro = 0, introStart = 0;
  const frame = (t) => {
    raf = 0;
    if (!running) return;
    const dt = Math.min((t - (t0 || t)) / 16.67, 3);
    t0 = t;
    const prev = offset;
    offset += (target - offset) * (1 - Math.pow(1 - (dragging ? 0.35 : 0.085), dt));
    vel += ((offset - prev) / Math.max(dt, 0.001) * 6 - vel) * 0.25;
    vel = Math.max(-1.6, Math.min(1.6, vel));
    show(current());

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(U.uProj, false, proj);
    gl.uniform1f(U.uRadius, R);
    gl.uniform2f(U.uSize, panelW, panelH);
    gl.uniform1f(U.uVel, vel);
    if (!introStart) introStart = t;
    const k = Math.min((t - introStart) / 1400, 1);
    intro = 1 - Math.pow(1 - k, 4);
    gl.uniform1f(U.uIntro, intro);
    for (let i = 0; i < N; i++) {
      const p = wrap(i - offset);
      const angle = p * step * dirSign;
      if (Math.abs(angle) > 1.6) continue;
      tex[i].ready += ((tex[i].loaded ? 1 : 0) - tex[i].ready) * 0.08 * dt;
      gl.uniform1f(U.uAngle, angle);
      gl.uniform1f(U.uFocus, Math.max(0, 1 - Math.abs(p) * 0.9));
      gl.uniform1f(U.uReady, tex[i].ready);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex[i].t);
      gl.uniform1i(U.uTex, 0);
      gl.drawArrays(gl.TRIANGLES, 0, count);
    }
    raf = requestAnimationFrame(frame);
  };
  const play = () => { running = visible && !document.hidden; if (running && !raf) { t0 = 0; raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; play(); }).observe(canvas);
  document.addEventListener('visibilitychange', play);

  function start() {
    document.documentElement.classList.add('gl-on');
    play();
  }
}
