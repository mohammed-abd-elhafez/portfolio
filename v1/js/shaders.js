// GLSL for the particle field. Edit the palette line in `vertex` to change the colors.
export const vertex = `
uniform float uTime;
uniform vec3 uMouse;
uniform float uScroll;
uniform float uPx;
attribute float aRand;
varying vec3 vCol;
varying float vA;

vec3 pal(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0) * t + vec3(0.80, 0.12, 0.47)));
}

void main() {
  vec3 p = position;
  float t = uTime;
  float y = sin(p.x * 0.45 + t * 0.55) * 0.55
          + cos(p.z * 0.55 - t * 0.45) * 0.55
          + sin((p.x + p.z) * 0.28 + t * 0.8) * 0.45;
  float d = distance(p.xz, uMouse.xz);
  float ring = exp(-d * d * 0.16) * sin(d * 2.6 - t * 3.2);
  y += ring * 1.5 + exp(-d * d * 0.5) * 1.1;
  p.y = y;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float depth = clamp(-mv.z / 30.0, 0.0, 1.0);
  gl_PointSize = (1.1 + aRand * 1.7) * uPx * (15.0 / -mv.z);

  float c = y * 0.22 + p.x * 0.028 + uScroll * 0.9 + t * 0.025 + aRand * 0.06;
  vCol = pal(c);
  vA = (0.28 + 0.72 * smoothstep(-1.2, 1.8, y)) * (1.0 - depth * 0.75) + abs(ring) * 0.35;
}
`;

export const fragment = `
precision mediump float;
varying vec3 vCol;
varying float vA;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(vCol * vA, a * vA);
}
`;
