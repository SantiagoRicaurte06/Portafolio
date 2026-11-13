// Objetos de la sala obras. Solo proyectan sombra hasta que la puerta se abre.
// Un tana asimétrico (chigaidana: repisas escalonadas unidas por un ebizuka, con el borde
// curvo fudegaeshi), cajas de kiri atadas con lazo, pergaminos enrollados con sus remates,
// y un kakejiku desenrollado en su atril, con el peso del jiku abajo, que se mece apenas.
import * as THREE from 'three';
import { madera, tinta, papel, cajaEn, pieza, cuerda, fusionarPorMaterial } from './comun.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const P = (x, y) => new THREE.Vector2(x, y);

// Remate del rodillo (jikusaki), torneado. Crece hacia +y desde el origen.
function remate(r) {
  return new THREE.LatheGeometry([P(0, 0), P(r * 0.8, 0), P(r, 0.008), P(r * 1.05, 0.026), P(r * 0.75, 0.04), P(0, 0.042)], 8);
}

// Pergamino enrollado: eje y, centrado; remates a ambos lados y una vuelta de cordón.
function rollo(largo, r, m, banda = 0.1) {
  const gr = new THREE.Group();
  gr.add(pieza(new THREE.CylinderGeometry(r, r, largo, 12), m.papel));
  for (const s of [-1, 1]) gr.add(pieza(new THREE.CylinderGeometry(r * 1.03, r * 1.03, 0.03, 12, 1, true), m.seda, 0, s * (largo / 2 - 0.015), 0));
  const rem = remate(r * 0.62);
  gr.add(pieza(rem, m.tinta, 0, largo / 2, 0));
  gr.add(pieza(rem, m.tinta, 0, -largo / 2, 0, Math.PI, 0, 0));
  if (banda !== null) gr.add(pieza(new THREE.TorusGeometry(r + 0.0025, 0.0028, 4, 16), m.tinta, 0, banda, 0, Math.PI / 2, 0, 0));
  return gr;
}

// Lazo en el plano xy: dos orejas hacia arriba y dos puntas que caen.
function lazo(m) {
  const gr = new THREE.Group();
  for (const k of [-1, 1]) {
    gr.add(cuerda([V(0, 0), V(k * 0.014, 0.012, 0.002), V(k * 0.036, 0.02, 0.003), V(k * 0.045, 0.008, 0.002), V(k * 0.03, -0.002), V(k * 0.008, 0.001)], 0.003, m.tinta, 16, 4));
    gr.add(cuerda([V(0, 0), V(k * 0.008, -0.018, 0.003), V(k * 0.016, -0.04, 0.004), V(k * 0.021, -0.056, 0.003)], 0.0028, m.tinta, 10, 4));
  }
  gr.add(pieza(new THREE.SphereGeometry(0.0065, 6, 4), m.tinta));
  return gr;
}

// Caja de kiri para kakejiku: largo en x, base en y = 0, cordón con lazo arriba al frente.
function cajaAtada(largo, lado, m) {
  const gr = new THREE.Group();
  gr.add(cajaEn(largo, lado, lado, m.kiri, 0, lado / 2, 0));
  gr.add(cajaEn(largo + 0.006, lado * 0.28, lado + 0.006, m.kiri, 0, lado * 0.86, 0)); // tapa
  const e = 0.0035, c = 0.01;
  const y0 = -e, y1 = lado + e, z0 = -lado / 2 - e, z1 = lado / 2 + e;
  gr.add(cuerda([V(0, y1, 0), V(0, y1, z1 - c), V(0, y1 - c, z1), V(0, y0 + c, z1), V(0, y0, z1 - c), V(0, y0, z0 + c), V(0, y0 + c, z0), V(0, y1 - c, z0), V(0, y1, z0 + c)], 0.003, m.tinta, 36, 4, true));
  const l = lazo(m);
  l.position.set(0, y1, z1 - 0.004);
  l.rotation.x = -0.35;
  gr.add(l);
  return gr;
}

export function obras() {
  const g = new THREE.Group();
  const m = {
    madera: madera(),
    tinta: tinta(),
    papel: papel(),
    kiri: new THREE.MeshStandardMaterial({ color: 0x8c7a62, roughness: 0.8 }),
    seda: new THREE.MeshStandardMaterial({ color: 0x6f695f, roughness: 0.9 }),
    sello: new THREE.MeshStandardMaterial({ color: 0xb3262c, roughness: 0.8 }),
  };
  const M = m.madera;
  const fijo = new THREE.Group();

  // ── Tana asimétrico ────────────────────────────────────────────────────────
  const tana = new THREE.Group();
  tana.position.set(-0.62, 0, -1.0);
  fijo.add(tana);
  // Jibukuro: el armario bajo, sobre patitas para que pase una línea de luz
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) tana.add(cajaEn(0.05, 0.04, 0.05, M, sx * 0.51, 0.02, sz * 0.1));
  tana.add(cajaEn(1.1, 0.34, 0.28, M, 0, 0.21, 0));
  tana.add(cajaEn(1.14, 0.03, 0.3, M, 0, 0.395, 0)); // tapa, arriba en 0.41
  for (const x of [-0.08, 0.08]) tana.add(pieza(new THREE.CylinderGeometry(0.013, 0.013, 0.004, 10), m.tinta, x, 0.22, 0.141, Math.PI / 2, 0, 0));
  // Costados de distinta altura: la silueta queda escalonada
  tana.add(cajaEn(0.025, 1.05, 0.28, M, -0.5375, 0.935, 0));
  tana.add(cajaEn(0.025, 0.75, 0.28, M, 0.5375, 0.785, 0));
  // Chigaidana: dos repisas desfasadas, unidas por el ebizuka
  tana.add(cajaEn(0.6, 0.022, 0.26, M, -0.225, 0.78, 0)); // arriba en 0.791
  tana.add(cajaEn(0.6, 0.022, 0.26, M, 0.225, 1.0, 0)); // arriba en 1.011
  tana.add(cajaEn(0.018, 0.198, 0.018, M, 0, 0.89, 0.11));
  // Fudegaeshi: el borde que se enrosca en la punta libre de la repisa alta
  const borde = new THREE.Shape();
  borde.moveTo(0, 0);
  borde.lineTo(0.06, 0);
  borde.quadraticCurveTo(0.018, 0.002, 0.008, 0.026);
  borde.quadraticCurveTo(0.004, 0.036, -0.006, 0.033);
  borde.quadraticCurveTo(-0.004, 0.014, 0, 0);
  const geoBorde = new THREE.ExtrudeGeometry(borde, { depth: 0.26, bevelEnabled: false, curveSegments: 6 });
  geoBorde.translate(0, 0, -0.13);
  tana.add(pieza(geoBorde, M, -0.075, 1.011, 0));
  // Tabla corrida y el tenbukuro (armarito alto) solo a la izquierda
  tana.add(cajaEn(1.13, 0.025, 0.3, M, 0.0225, 1.1675, 0)); // arriba en 1.18
  tana.add(cajaEn(0.49, 0.25, 0.28, M, -0.28, 1.305, 0));
  tana.add(cajaEn(0.6, 0.03, 0.31, M, -0.27, 1.445, 0));
  for (const x of [-0.33, -0.23]) tana.add(pieza(new THREE.CylinderGeometry(0.01, 0.01, 0.004, 10), m.tinta, x, 1.3, 0.141, Math.PI / 2, 0, 0));

  // Cajas de kiri atadas
  const caja1 = cajaAtada(0.52, 0.085, m);
  caja1.position.set(-0.24, 0.41, 0); caja1.rotation.y = 0.04;
  const caja2 = cajaAtada(0.36, 0.068, m);
  caja2.position.set(0.3, 1.011, -0.01); caja2.rotation.y = -0.06;
  const caja3 = cajaAtada(0.32, 0.072, m); // de pie, con el lazo hacia afuera
  caja3.rotation.set(0, Math.PI, Math.PI / 2);
  caja3.position.set(0.364, 1.34, 0);
  tana.add(caja1, caja2, caja3);

  // Cesto con pergaminos de pie, abiertos en abanico
  const cesto = new THREE.LatheGeometry([P(0, 0), P(0.06, 0), P(0.066, 0.015), P(0.074, 0.2), P(0.067, 0.2), P(0.06, 0.02), P(0, 0.02)], 14);
  tana.add(pieza(cesto, M, 0.3, 0.41, 0));
  tana.add(pieza(new THREE.TorusGeometry(0.074, 0.004, 4, 18), m.tinta, 0.3, 0.61, 0, Math.PI / 2, 0, 0));
  tana.add(pieza(new THREE.TorusGeometry(0.068, 0.0035, 4, 18), m.tinta, 0.3, 0.47, 0, Math.PI / 2, 0, 0));
  for (const [largo, inc, dx, dz] of [[0.46, 0.2, -0.015, 0.012], [0.4, -0.06, 0.012, -0.018], [0.44, -0.24, 0.02, 0.02]]) {
    const ro = rollo(largo, 0.026, m, largo * 0.2);
    const d = largo / 2 + 0.042;
    ro.rotation.z = inc;
    ro.position.set(0.3 + dx - Math.sin(inc) * d, 0.43 + Math.cos(inc) * d, dz);
    tana.add(ro);
  }

  // Repisa baja: pila de rollos con los remates desparejos
  for (const [x, y, z, largo, giro] of [[-0.25, 0.823, -0.045, 0.44, 0], [-0.19, 0.823, 0.05, 0.4, 0.03], [-0.23, 0.866, 0.003, 0.46, -0.05]]) {
    const ro = rollo(largo, 0.032, m, 0.1);
    ro.rotation.set(0, giro, Math.PI / 2);
    ro.position.set(x, y, z);
    tana.add(ro);
  }
  // El cordón suelto de un rollo cae por el canto de la repisa
  tana.add(cuerda([V(-0.29, 0.823, 0.084), V(-0.288, 0.81, 0.1), V(-0.286, 0.797, 0.128), V(-0.285, 0.786, 0.139), V(-0.284, 0.75, 0.142), V(-0.282, 0.7, 0.141), V(-0.28, 0.672, 0.139)], 0.003, m.tinta, 24, 4));
  tana.add(pieza(new THREE.ConeGeometry(0.008, 0.026, 6), m.tinta, -0.28, 0.662, 0.139));

  // Sobre la tabla corrida, un rollo acostado
  const suelto = rollo(0.34, 0.028, m, -0.08);
  suelto.rotation.set(0, 0.1, Math.PI / 2);
  suelto.position.set(0.18, 1.208, 0.08);
  tana.add(suelto);

  // ── Atril del kakejiku ─────────────────────────────────────────────────────
  const atril = new THREE.Group();
  atril.position.set(0.8, 0, -0.95);
  fijo.add(atril);
  for (const s of [-1, 1]) {
    atril.add(cajaEn(0.03, 1.66, 0.03, M, s * 0.29, 0.83, 0));
    atril.add(cajaEn(0.04, 0.035, 0.32, M, s * 0.29, 0.0175, 0));
  }
  atril.add(cajaEn(0.58, 0.022, 0.02, M, 0, 0.2, 0));
  // Travesaño de arriba con las puntas levantadas
  const kasagi = new THREE.Shape();
  kasagi.moveTo(-0.38, 0);
  kasagi.lineTo(0.38, 0);
  kasagi.quadraticCurveTo(0.41, 0.012, 0.43, 0.045);
  kasagi.quadraticCurveTo(0.3, 0.028, 0, 0.026);
  kasagi.quadraticCurveTo(-0.3, 0.028, -0.43, 0.045);
  kasagi.quadraticCurveTo(-0.41, 0.012, -0.38, 0);
  const geoKasagi = new THREE.ExtrudeGeometry(kasagi, { depth: 0.04, bevelEnabled: false, curveSegments: 6 });
  geoKasagi.translate(0, 0, -0.02);
  atril.add(pieza(geoKasagi, M, 0, 1.66, 0));
  atril.add(pieza(new THREE.TorusGeometry(0.011, 0.0028, 4, 12), m.tinta, 0, 1.652, 0)); // gancho

  g.add(fusionarPorMaterial(fijo));

  // ── Kakejiku colgado: cuelga del gancho y se mece ─────────────────────────
  const colgante = new THREE.Group();
  colgante.position.set(0.8, 1.642, -0.95);
  g.add(colgante);
  const kake = new THREE.Group();
  kake.add(cuerda([V(-0.125, -0.118), V(-0.07, -0.06), V(-0.012, -0.006), V(0, 0), V(0.012, -0.006), V(0.07, -0.06), V(0.125, -0.118)], 0.0028, m.tinta, 28, 4));
  kake.add(cajaEn(0.38, 0.016, 0.012, M, 0, -0.124, 0)); // hassō, la varilla de arriba
  kake.add(cajaEn(0.36, 1.058, 0.004, m.seda, 0, -0.661, 0)); // montaje de seda
  kake.add(pieza(new THREE.PlaneGeometry(0.26, 0.56), m.papel, 0, -0.72, 0.0025)); // la obra
  kake.add(pieza(new THREE.RingGeometry(0.068, 0.082, 40, 1, 0.5, Math.PI * 1.8), m.tinta, 0, -0.62, 0.0032)); // ensō
  kake.add(cajaEn(0.006, 0.09, 0.0008, m.tinta, 0.095, -0.83, 0.0032));
  kake.add(cajaEn(0.006, 0.03, 0.0008, m.tinta, 0.095, -0.9, 0.0032));
  kake.add(cajaEn(0.02, 0.02, 0.0008, m.sello, 0.095, -0.935, 0.0032)); // el sello rojo, mínimo
  // Jiku: el rodillo de abajo que da el peso, con sus remates
  kake.add(pieza(new THREE.CylinderGeometry(0.015, 0.015, 0.37, 10), M, 0, -1.19, 0, 0, 0, Math.PI / 2));
  const rem = remate(0.02);
  kake.add(pieza(rem, m.tinta, -0.185, -1.19, 0, 0, 0, Math.PI / 2));
  kake.add(pieza(rem, m.tinta, 0.185, -1.19, 0, 0, 0, -Math.PI / 2));
  colgante.add(fusionarPorMaterial(kake));
  // Fūtai: las dos tiras que cuelgan delante y aletean
  const futai = [-1, 1].map((s) => {
    const f = new THREE.Group();
    f.position.set(s * 0.06, -0.132, 0.0035);
    f.add(cajaEn(0.022, 0.32, 0.0015, m.seda, 0, -0.16, 0));
    colgante.add(f);
    return f;
  });

  return {
    grupo: g,
    animar(t) {
      colgante.rotation.z = Math.sin(t * 0.62) * 0.022 + Math.sin(t * 1.7) * 0.004;
      colgante.rotation.y = Math.sin(t * 0.41) * 0.07;
      futai.forEach((f, i) => {
        f.rotation.x = -(0.03 + 0.03 * (1 + Math.sin(t * 1.3 + i * 1.1)));
        f.rotation.z = Math.sin(t * 0.9 + i) * 0.03;
      });
    },
  };
}
