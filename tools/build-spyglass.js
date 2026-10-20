/* Builds assets/models/spyglass.glb: a flat-shaded low-poly cartoon spyglass (no stand).
   Usage: node tools/build-spyglass.js   (no dependencies) */
const fs = require('fs');
const path = require('path');

const lin = (h) => [0, 2, 4].map((i) => {
  const c = parseInt(h.slice(1 + i, 3 + i), 16) / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
});
const MATS = {
  yellow: { color: '#ffd21f', rough: 0.42, metal: 0.08 },
  orange: { color: '#ff9f1c', rough: 0.45, metal: 0.1 },
  coral: { color: '#ff5d8f', rough: 0.4, metal: 0.05 },
  navy: { color: '#10224a', rough: 0.5, metal: 0.2 },
  violet: { color: '#8b5cf6', rough: 0.35, metal: 0.1, emissive: '#3b1d8f' },
  cyan: { color: '#22e5d4', rough: 0.3, metal: 0.1, emissive: '#0a8f86' },
  lens: { color: '#7ff6ff', rough: 0.15, metal: 0.0, emissive: '#25c5d8' },
};
const names = Object.keys(MATS);
const tris = Object.fromEntries(names.map((n) => [n, []]));

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };

/* tri() keeps flat normals; winding is made outward by checking against `out` hint */
function tri(mat, a, b, c, out) {
  let n = norm(cross(sub(b, a), sub(c, a)));
  if (out && n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) { [b, c] = [c, b]; n = n.map((x) => -x); }
  tris[mat].push(a, b, c, n);
}

/* frustum along +Z from z0 (radius r0) to z1 (radius r1); `map` places it in model space */
function frustum(mat, r0, r1, z0, z1, sides, map, caps) {
  const ring = (r, z, i) => { const t = (i / sides) * Math.PI * 2 + Math.PI / sides; return map([Math.cos(t) * r, Math.sin(t) * r, z]); };
  const c0 = map([0, 0, z0]), c1 = map([0, 0, z1]);
  for (let i = 0; i < sides; i++) {
    const a = ring(r0, z0, i), b = ring(r0, z0, i + 1), c = ring(r1, z1, i + 1), d = ring(r1, z1, i);
    const mid = [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4, (a[2] + b[2] + c[2] + d[2]) / 4];
    const axis = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2, (c0[2] + c1[2]) / 2];
    const out = sub(mid, axis);
    tri(mat, a, b, c, out); tri(mat, a, c, d, out);
    if (caps !== 'none' && r0 > 0.001) tri(mat, c0, a, b, sub(c0, c1));
    if (caps !== 'none' && r1 > 0.001) tri(mat, c1, d, c, sub(c1, c0));
  }
}

const S = 10;
const id = (p) => p;
const spec = [
  ['navy', 0.30, 0.34, -1.95, -1.80], ['navy', 0.34, 0.34, -1.80, -1.62],
  ['coral', 0.34, 0.42, -1.62, -1.46],
  ['yellow', 0.40, 0.48, -1.46, -1.38], ['yellow', 0.48, 0.48, -1.38, -0.34], ['yellow', 0.48, 0.44, -0.34, -0.30],
  ['coral', 0.50, 0.57, -0.30, -0.24], ['coral', 0.57, 0.57, -0.24, -0.14], ['coral', 0.57, 0.50, -0.14, -0.08],
  ['orange', 0.58, 0.64, -0.08, 0.0], ['orange', 0.64, 0.64, 0.0, 0.80], ['orange', 0.64, 0.58, 0.80, 0.86],
  ['violet', 0.68, 0.74, 0.86, 0.90], ['violet', 0.74, 0.74, 0.90, 0.98], ['violet', 0.74, 0.68, 0.98, 1.02],
  ['yellow', 0.76, 0.84, 1.02, 1.12], ['yellow', 0.84, 0.84, 1.12, 1.68], ['yellow', 0.84, 0.80, 1.68, 1.74],
  ['coral', 0.82, 1.02, 1.74, 1.98],
  ['navy', 1.02, 1.04, 1.98, 2.12], ['navy', 1.04, 0.98, 2.12, 2.18],
  ['cyan', 0.96, 0.86, 2.18, 2.22],
];
spec.forEach(([m, r0, r1, z0, z1]) => frustum(m, r0, r1, z0, z1, S, id, 'ends'));
/* faceted lens dome */
frustum('lens', 0.86, 0.62, 2.22, 2.34, S, id, 'ends');
frustum('lens', 0.62, 0.0, 2.34, 2.44, S, id, 'none');
/* focus knob on top (+Y): stem + chunky hexagonal knob */
const up = ([x, y, z]) => [x, z, -y];
frustum('navy', 0.12, 0.12, 0.45, 0.70, 6, (p) => { const q = up(p); return [q[0], q[1] + 0.05, q[2] + 0.2 * 0]; }, 'ends');
const knob = (p) => { const q = up(p); return [q[0], q[1], q[2]]; };
frustum('coral', 0.26, 0.22, 0.72, 0.95, 6, knob, 'ends');
frustum('violet', 0.22, 0.12, 0.95, 1.02, 6, knob, 'ends');

/* ---- pack GLB ---- */
const bins = []; const accessors = []; const bufferViews = []; const primitives = [];
let off = 0;
names.forEach((n, mi) => {
  const t = tris[n]; if (!t.length) return;
  const pos = [], nor = [];
  for (let i = 0; i < t.length; i += 4) { for (let k = 0; k < 3; k++) { pos.push(...t[i + k]); nor.push(...t[i + 3]); } }
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pos[i + k]); mx[k] = Math.max(mx[k], pos[i + k]); }
  const pb = Buffer.from(new Float32Array(pos).buffer), nb = Buffer.from(new Float32Array(nor).buffer);
  const base = accessors.length;
  bufferViews.push({ buffer: 0, byteOffset: off, byteLength: pb.length, target: 34962 }); bins.push(pb); off += pb.length;
  bufferViews.push({ buffer: 0, byteOffset: off, byteLength: nb.length, target: 34962 }); bins.push(nb); off += nb.length;
  accessors.push({ bufferView: base, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: mn, max: mx });
  accessors.push({ bufferView: base + 1, componentType: 5126, count: nor.length / 3, type: 'VEC3' });
  primitives.push({ attributes: { POSITION: base, NORMAL: base + 1 }, material: names.indexOf(n) });
});
const materials = names.map((n) => {
  const m = MATS[n];
  const o = { name: n, pbrMetallicRoughness: { baseColorFactor: [...lin(m.color), 1], metallicFactor: m.metal, roughnessFactor: m.rough } };
  if (m.emissive) o.emissiveFactor = lin(m.emissive);
  return o;
});
const json = { asset: { version: '2.0', generator: 'build-spyglass.js' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'spyglass', mesh: 0 }], meshes: [{ name: 'spyglass', primitives }], materials, accessors, bufferViews, buffers: [{ byteLength: off }] };
const pad = (b, ch) => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4, ch)]);
const jb = pad(Buffer.from(JSON.stringify(json)), 0x20), bb = pad(Buffer.concat(bins), 0);
const head = Buffer.alloc(12); head.write('glTF'); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + jb.length + 8 + bb.length, 8);
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
const out = path.join(__dirname, '..', 'assets', 'models', 'spyglass.glb');
fs.writeFileSync(out, Buffer.concat([head, ch(jb.length, 0x4e4f534a), jb, ch(bb.length, 0x004e4942), bb]));
console.log('wrote', out, fs.statSync(out).size, 'bytes,', primitives.length, 'primitives');
