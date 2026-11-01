// Floating project preview for the work list. The screenshot trails the cursor,
// bends against its motion like the gallery panels, and cross-fades between projects.
const VERT = `
precision highp float;
attribute vec2 aPos;
uniform vec2 uCanvas, uSize, uVel;
uniform float uShow;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x + 0.5, 0.5 - aPos.y);
  vec2 p = aPos * uSize;
  // the middle lags behind the edges, so the image bends against the motion
  p.x -= sin((aPos.y + 0.5) * 3.14159) * uVel.x * 0.9;
  p.y += sin((aPos.x + 0.5) * 3.14159) * uVel.y * 0.9;
  float a = clamp(uVel.x * 0.006, -0.12, 0.12);
  p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  p *= mix(0.72, 1.0, uShow);
  gl_Position = vec4(p / (uCanvas * 0.5), 0.0, 1.0);
}`;
const FRAG = `
precision highp float;
uniform sampler2D uA, uB;
uniform float uMix, uShow, uSpeed;
uniform vec2 uSize;
varying vec2 vUv;
float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
vec3 tex(sampler2D t, vec2 uv, float s) {
  return vec3(texture2D(t, uv + vec2(s, 0.0)).r, texture2D(t, uv).g, texture2D(t, uv - vec2(s, 0.0)).b);
}
void main() {
  vec2 px = (vUv - 0.5) * uSize;
  float d = rbox(px, uSize * 0.5, 12.0);
  float mask = 1.0 - smoothstep(-1.0, 1.0, d);
  float s = uSpeed * 0.006;
  // wipe the next project in from the bottom with a soft edge
  float w = smoothstep(uMix * 1.3 - 0.3, uMix * 1.3, 1.0 - vUv.y);
  vec3 c = mix(tex(uA, vUv, s), tex(uB, vUv, s), 1.0 - w);
  float a = mask * uShow;
  gl_FragColor = vec4(c * a, a);
}`;

export function mountPeek(canvas, list) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!gl) return;
  const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const S = 24, v = [];
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x0 = i / S - 0.5, x1 = (i + 1) / S - 0.5, y0 = j / S - 0.5, y1 = (j + 1) / S - 0.5;
    v.push(x0, y0, x1, y0, x1, y1, x0, y0, x1, y1, x0, y1);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['uCanvas', 'uSize', 'uVel', 'uShow', 'uA', 'uB', 'uMix', 'uSpeed']) U[n] = gl.getUniformLocation(prog, n);

  // textures, one per project
  const cache = new Map();
  const texFor = (src) => {
    if (cache.has(src)) return cache.get(src);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([220, 222, 228, 255]));
    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, val);
      wake();
    };
    img.src = src;
    cache.set(src, t);
    return t;
  };
  const rows = [...list.querySelectorAll('a[data-tex]')];
  rows.forEach((a) => texFor(a.dataset.tex));

  const CW = 440, CH = 340, IW = 384, IH = 240;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = CW * dpr; canvas.height = CH * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
  document.documentElement.classList.add('peek-on');

  const rtl = document.documentElement.dir === 'rtl';
  const st = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, show: 0, target: 0, mix: 1, a: null, b: null };
  let raf = 0;

  list.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    st.tx = e.clientX; st.ty = e.clientY;
    if (st.show < 0.02) { st.x = st.tx; st.y = st.ty; }
    wake();
  });
  list.addEventListener('pointerover', (e) => {
    const a = e.target.closest('a[data-tex]');
    if (!a || e.pointerType !== 'mouse') return;
    const t = texFor(a.dataset.tex);
    st.target = 1;
    if (t === st.b) return;
    if (st.show < 0.05) { st.a = st.b = t; st.mix = 1; }
    else { st.a = st.b || t; st.b = t; st.mix = 0; }
    wake();
  });
  list.addEventListener('pointerleave', () => { st.target = 0; wake(); });
  // a click carries the screenshot away with the page transition
  rows.forEach((a) => a.addEventListener('click', () => { st.target = 0; }));

  const frame = () => {
    raf = 0;
    const px = st.x, py = st.y;
    st.x += (st.tx - st.x) * 0.16; st.y += (st.ty - st.y) * 0.16;
    st.vx += ((st.x - px) - st.vx) * 0.3; st.vy += ((st.y - py) - st.vy) * 0.3;
    st.show += (st.target - st.show) * 0.14;
    st.mix += (1 - st.mix) * 0.12;

    // follow the cursor, but keep to the empty half of the list so the text stays readable
    const box = list.getBoundingClientRect();
    let left = rtl ? st.x - CW - 24 : st.x + 24;
    left = rtl ? Math.min(left, box.right - box.width * 0.6 - CW) : Math.max(left, box.left + box.width * 0.6);
    canvas.style.translate = `${left}px ${st.y - CH / 2}px`;

    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (st.b && st.show > 0.002) {
      gl.uniform2f(U.uCanvas, CW, CH); gl.uniform2f(U.uSize, IW, IH);
      gl.uniform2f(U.uVel, Math.max(-60, Math.min(60, st.vx)), Math.max(-60, Math.min(60, st.vy)));
      gl.uniform1f(U.uShow, st.show); gl.uniform1f(U.uMix, st.mix);
      gl.uniform1f(U.uSpeed, Math.min(Math.hypot(st.vx, st.vy), 40) / 40);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, st.a); gl.uniform1i(U.uA, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, st.b); gl.uniform1i(U.uB, 1);
      gl.drawArrays(gl.TRIANGLES, 0, v.length / 2);
    }
    const moving = Math.abs(st.tx - st.x) + Math.abs(st.ty - st.y) > 0.2 || Math.abs(st.target - st.show) > 0.002 || 1 - st.mix > 0.002;
    if (moving) raf = requestAnimationFrame(frame);
  };
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }
}
