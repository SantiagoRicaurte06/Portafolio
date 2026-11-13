// Koi bajo el agua del estanque: siluetas oscuras dibujadas en el shader del agua (sin geometría).
// Aquí vive su nado (curvas suaves, se apartan de las ondas recientes) y la forma en GLSL.
import * as THREE from 'three';

export const MAX_KOI = 3;

// Zona donde nadan (z del agua visible desde la cámara del pasillo) y cuánto se alejan del centro.
const Z_MIN = 2.4;
const Z_MAX = 3.8;
const ANCHO = 2.6;

export const KOI_GLSL = /* glsl */`
uniform vec4 uKoi[${MAX_KOI}];   // x, z, rumbo, curva del cuerpo
uniform vec4 uKoiB[${MAX_KOI}];  // largo, tancho (mancha roja), fase de la cola, opacidad
// Silueta de un koi visto desde arriba (máscara 0..1); mancha = la mancha roja de la cabeza.
float siluetaKoi(vec2 p, vec4 a, vec4 b, out float mancha){
  mancha = 0.0;
  vec2 d = p - a.xy;
  float L = b.x;
  if (dot(d, d) > L * L * 0.5) return 0.0;
  vec2 f = vec2(cos(a.z), sin(a.z));
  float u = dot(d, f) / L;
  float v = dot(d, vec2(-f.y, f.x)) / L;
  // el cuerpo se curva al girar y la cola se mece
  float cola = 1.0 - smoothstep(-0.6, 0.15, u);
  v -= a.w * (u - 0.15) * (u - 0.15) + sin(b.z) * 0.07 * cola * cola;
  float s = 0.03; // borde difuso: está bajo el agua
  float e = (u - 0.08) / 0.42;
  float w = 0.11 * sqrt(max(0.0, 1.0 - e * e));
  float cuerpo = smoothstep(-s, s, w - abs(v));
  // aleta caudal en abanico, con la horquilla atrás
  float wc = 0.025 + 0.1 * (1.0 - smoothstep(-0.6, -0.36, u));
  float fin = -0.56 - 0.08 * min(abs(v) / 0.13, 1.0);
  float caudal = smoothstep(-s, s, wc - abs(v)) * smoothstep(-s, s, u - fin) * step(u, -0.2);
  // aletas pectorales
  vec2 q = vec2(u - 0.16, abs(v) - 0.11);
  q = vec2(q.x * 0.8 + q.y * 0.6, -q.x * 0.6 + q.y * 0.8);
  float pecho = 1.0 - smoothstep(0.75, 1.25, length(q / vec2(0.075, 0.03)));
  if (b.y > 0.5) mancha = (1.0 - smoothstep(0.03, 0.06, length(vec2(u - 0.3, v)))) * cuerpo * b.w;
  return max(cuerpo, max(caudal * 0.6, pecho * 0.45)) * b.w;
}
`;

export function crearKoi(ondas) {
  const a = Array.from({ length: MAX_KOI }, () => new THREE.Vector4(0, -99, 0, 0));
  const b = Array.from({ length: MAX_KOI }, () => new THREE.Vector4(0.5, 0, 0, 0));
  const uniformes = { uKoi: { value: a }, uKoiB: { value: b } };
  // Posiciones relativas al centro de la vista; el primero es un tancho (blanco con la mancha roja).
  const peces = [
    { x: -1.3, z: 2.9, rumbo: 0.3, vel: 0.15, largo: 0.5, tancho: 1, semilla: 1.3 },
    { x: 0.9, z: 3.3, rumbo: 2.8, vel: 0.12, largo: 0.42, tancho: 0, semilla: 4.1 },
    { x: 2.2, z: 2.6, rumbo: -2.6, vel: 0.17, largo: 0.34, tancho: 0, semilla: 7.7 },
  ].map((p) => ({ ...p, giro: 0, fase: p.semilla }));
  let centro = null;

  function escribir(opacidad) {
    peces.forEach((p, i) => {
      a[i].set(p.x, p.z, p.rumbo, THREE.MathUtils.clamp(p.giro * 0.25, -0.35, 0.35));
      b[i].set(p.largo, p.tancho, p.fase, opacidad);
    });
  }

  // centroX: hacia dónde mira el visitante (la linterna de la sala activa)
  function actualizar(t, dt, centroX, quieto) {
    if (centro === null) {
      centro = centroX;
      peces.forEach((p) => { p.x += centroX; });
    }
    if (quieto) { escribir(0.55); return; }
    centro += (centroX - centro) * (1 - Math.exp(-dt * 0.6));
    for (const p of peces) {
      // Si el visitante se fue lejos, el pez entra por el lado hacia donde camina
      const lejos = p.x - centro;
      if (Math.abs(lejos) > 7) {
        const lado = lejos > 0 ? -1 : 1;
        p.x = centro + lado * 4.5;
        p.z = Z_MIN + Math.random() * (Z_MAX - Z_MIN);
        p.rumbo = lado > 0 ? Math.PI : 0;
        p.giro = 0;
      }
      let sx = Math.cos(p.rumbo);
      let sz = Math.sin(p.rumbo);
      // vagar: un empuje lateral que cambia lento
      const vagar = Math.sin(t * 0.21 + p.semilla) * 0.5 + Math.sin(t * 0.07 + p.semilla * 2.3) * 0.35;
      sx -= Math.sin(p.rumbo) * vagar;
      sz += Math.cos(p.rumbo) * vagar;
      // límites suaves
      const ox = p.x - centro;
      if (ox > ANCHO) sx -= (ox - ANCHO) * 1.5;
      if (ox < -ANCHO) sx -= (ox + ANCHO) * 1.5;
      if (p.z < Z_MIN) sz += (Z_MIN - p.z) * 4;
      if (p.z > Z_MAX) sz -= (p.z - Z_MAX) * 4;
      // apartarse de las ondas recientes
      let susto = 0;
      for (const o of ondas) {
        const edad = t - o.z;
        if (edad < 0 || edad > 2.5) continue;
        const ex = p.x - o.x;
        const ez = p.z - o.y;
        const d2 = ex * ex + ez * ez;
        if (d2 > 1.44) continue;
        const d = Math.sqrt(d2) + 1e-3;
        const k = o.w * (1 - d / 1.2) * (1 - edad / 2.5) * 2.5;
        sx += (ex / d) * k;
        sz += (ez / d) * k;
        susto = Math.max(susto, k);
      }
      let dif = Math.atan2(sz, sx) - p.rumbo;
      dif = Math.atan2(Math.sin(dif), Math.cos(dif));
      const giro = THREE.MathUtils.clamp(dif, -1, 1) * (0.55 + Math.min(susto, 1.5) * 1.2);
      p.giro += (giro - p.giro) * (1 - Math.exp(-dt * 2));
      p.rumbo += p.giro * dt;
      const v = p.vel * (1 + Math.min(susto, 1.5) * 1.6) + Math.max(0, Math.abs(ox) - 3) * 0.25;
      p.x += Math.cos(p.rumbo) * v * dt;
      p.z += Math.sin(p.rumbo) * v * dt;
      p.fase += dt * (2.0 + v * 10);
    }
    escribir(1);
  }

  return { uniformes, actualizar };
}
