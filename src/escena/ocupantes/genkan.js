// Objetos de la sala genkan (la entrada). Solo proyectan sombra hasta que la puerta se abre.
// Pensado para la silueta: el andon de pie se lee como celosía (su papel no tapa la luz),
// las geta sobre la piedra de descalzarse muestran de perfil sus dos dientes y la tira en V,
// y los wagasa (uno cerrado en su cubo, otro abierto secándose) dibujan pliegues y varillas.
import * as THREE from 'three';
import { madera, tinta, papel, cajaEn, pieza, varilla, cuerda, fusionarPorMaterial } from './comun.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const P = (x, y) => new THREE.Vector2(x, y);

// Andon de pie, apagado: base con patas, postes, celosía kumiko y asa arriba.
function marcoAndon(mMadera, mTinta) {
  const marco = new THREE.Group();
  const A = 0.14;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    marco.add(cajaEn(0.035, 0.05, 0.035, mMadera, sx * 0.155, 0.025, sz * 0.155));
    marco.add(cajaEn(0.02, 0.6, 0.02, mMadera, sx * A, 0.375, sz * A));
  }
  marco.add(cajaEn(0.36, 0.025, 0.36, mMadera, 0, 0.0625, 0));
  for (const y of [0.125, 0.665]) for (const s of [-1, 1]) {
    marco.add(cajaEn(2 * A + 0.02, 0.018, 0.016, mMadera, 0, y, s * A));
    marco.add(cajaEn(0.016, 0.018, 2 * A + 0.02, mMadera, s * A, y, 0));
  }
  // Kumiko: cada cara partida en 2 × 3
  for (const s of [-1, 1]) {
    marco.add(cajaEn(0.008, 0.53, 0.008, mMadera, 0, 0.395, s * A));
    marco.add(cajaEn(0.008, 0.53, 0.008, mMadera, s * A, 0.395, 0));
    for (const y of [0.305, 0.485]) {
      marco.add(cajaEn(2 * A, 0.008, 0.008, mMadera, 0, y, s * A));
      marco.add(cajaEn(0.008, 0.008, 2 * A, mMadera, s * A, y, 0));
    }
    // Montantes del asa
    marco.add(cajaEn(0.018, 0.26, 0.022, mMadera, s * (A + 0.021), 0.73, 0));
  }
  marco.add(cajaEn(2 * A + 0.14, 0.022, 0.026, mMadera, 0, 0.86, 0));
  // Dentro, el candelero con su plato de aceite (se ve a través del papel)
  marco.add(varilla(V(0, 0.075), V(0, 0.33), 0.006, mMadera, 6));
  marco.add(pieza(new THREE.CylinderGeometry(0.045, 0.028, 0.014, 12), mTinta, 0, 0.335, 0));
  marco.add(pieza(new THREE.CylinderGeometry(0.003, 0.004, 0.03, 4), mTinta, 0.02, 0.355, 0, 0, 0, -0.5));
  return marco;
}

// Piedra de descalzarse (kutsunugi-ishi): losa irregular con canto redondeado.
function losa(mat) {
  const forma = new THREE.Shape();
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ruido = 1 + 0.07 * Math.sin(a * 3 + 0.6) + 0.04 * Math.sin(a * 5 + 1.9);
    const x = Math.cos(a) * 0.27 * ruido;
    const y = Math.sin(a) * 0.14 * ruido;
    if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 2, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.035, 0);
  return new THREE.Mesh(geo, mat); // cara de arriba en y = 0.23
}

// Una geta: tabla, dos dientes y la tira hanao en V. Largo en x, punta hacia +x.
function geta(mMadera, mTinta) {
  const s = new THREE.Group();
  s.add(cajaEn(0.235, 0.024, 0.098, mMadera, 0, 0.067, 0));
  for (const x of [-0.068, 0.07]) s.add(cajaEn(0.02, 0.055, 0.094, mMadera, x, 0.0275, 0));
  const y = 0.079;
  for (const lado of [-1, 1]) {
    s.add(cuerda([V(0.082, y, 0), V(0.064, y + 0.03, lado * 0.006), V(0.018, y + 0.04, lado * 0.03), V(-0.022, y + 0.022, lado * 0.043), V(-0.032, y, lado * 0.046)], 0.0062, mTinta, 18, 5));
  }
  s.add(pieza(new THREE.SphereGeometry(0.011, 8, 5), mTinta, 0.084, y + 0.006, 0)); // nudo de la punta
  return s;
}

// Wagasa cerrado: haz de papel plegado en espiral, mango de bambú con nudos. Base en y = 0.
function wagasaCerrado(mPapel, mMadera, mTinta, mBambu) {
  const w = new THREE.Group();
  const perfil = [P(0.014, 0.3), P(0.03, 0.305), P(0.036, 0.33), P(0.046, 0.43), P(0.055, 0.58), P(0.058, 0.7), P(0.052, 0.8), P(0.036, 0.9), P(0.02, 0.955), P(0.015, 0.97)];
  const lona = new THREE.LatheGeometry(perfil, 56);
  const pos = lona.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(x, z) + y * 1.2; // los pliegues giran un poco a lo largo
    const f = 0.8 + 0.2 * Math.abs(Math.cos(a * 7));
    pos.setX(i, x * f); pos.setZ(i, z * f);
  }
  lona.computeVertexNormals();
  w.add(new THREE.Mesh(lona, mPapel));
  // Puntas de las varillas asomando bajo el haz
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.36;
    w.add(varilla(V(Math.sin(a) * 0.026, 0.31, Math.cos(a) * 0.026), V(Math.sin(a) * 0.034, 0.288, Math.cos(a) * 0.034), 0.0025, mMadera, 3));
  }
  w.add(pieza(new THREE.CylinderGeometry(0.016, 0.02, 0.05, 10), mMadera, 0, 0.275, 0)); // rokuro
  w.add(pieza(new THREE.CylinderGeometry(0.0105, 0.0105, 0.3, 7), mBambu, 0, 0.15, 0));
  for (const y of [0.11, 0.2]) w.add(pieza(new THREE.TorusGeometry(0.012, 0.0032, 4, 10), mBambu, 0, y, 0, Math.PI / 2, 0, 0));
  w.add(pieza(new THREE.CylinderGeometry(0.0145, 0.0145, 0.075, 8), mTinta, 0, 0.04, 0)); // empuñadura forrada
  w.add(pieza(new THREE.CylinderGeometry(0.012, 0.0155, 0.012, 8), mBambu, 0, 0.004, 0));
  w.add(pieza(new THREE.TorusGeometry(0.052, 0.0045, 4, 20), mTinta, 0, 0.62, 0, Math.PI / 2, 0, 0)); // cinta que lo ata
  // Cabeza (atama), remate y el aro para colgarlo
  w.add(pieza(new THREE.LatheGeometry([P(0.016, 0.965), P(0.021, 0.975), P(0.019, 0.995), P(0.011, 1.008), P(0, 1.012)], 12), mTinta));
  w.add(pieza(new THREE.CylinderGeometry(0.004, 0.006, 0.03, 6), mTinta, 0, 1.025, 0));
  w.add(pieza(new THREE.TorusGeometry(0.013, 0.0025, 4, 12), mTinta, 0, 1.052, 0));
  return w;
}

// Wagasa abierto. Origen en el ápice, eje +y; el mango baja a y = -largo.
const R = 0.38, HONDO = 0.11, LARGO = 0.8, VARILLAS = 32;
function wagasaAbierto(mPapel, mMadera, mTinta, mBambu) {
  const w = new THREE.Group();
  const yLona = (r) => -HONDO * Math.pow(r / R, 1.25);
  const perfil = [0, 0.02, 0.06, 0.12, 0.19, 0.26, 0.32, 0.36, R].map((r) => P(r, yLona(r)));
  const lona = new THREE.LatheGeometry(perfil, VARILLAS * 4);
  const hueco = (Math.PI * 2) / VARILLAS;
  const pos = lona.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-5) continue;
    const a = Math.atan2(x, z);
    const u = (((a % hueco) + hueco) % hueco) / hueco;
    const comba = Math.sin(Math.PI * u); // el papel se tensa entre varilla y varilla
    const k = r / R;
    const escala = 1 - 0.02 * k * k * comba;
    pos.setX(i, x * escala); pos.setZ(i, z * escala);
    pos.setY(i, pos.getY(i) + 0.016 * k * k * k * comba);
  }
  lona.computeVertexNormals();
  w.add(new THREE.Mesh(lona, mPapel));
  // Varillas (hone) bajo el papel y tirantes (shita-bone) desde el rokuro
  const yRokuro = -0.255, rTirante = 0.171;
  for (let i = 0; i < VARILLAS; i++) {
    const s = Math.sin(i * hueco), c = Math.cos(i * hueco);
    w.add(varilla(V(0.02 * s, yLona(0.02) - 0.004, 0.02 * c), V((R + 0.01) * s, yLona(R) - 0.006, (R + 0.01) * c), 0.0032, mMadera, 3));
    w.add(varilla(V(0.016 * s, yRokuro, 0.016 * c), V(rTirante * s, yLona(rTirante) - 0.006, rTirante * c), 0.0026, mMadera, 3));
  }
  // Hilo kagari que teje los tirantes
  const t = 0.38;
  const rHilo = 0.016 + t * (rTirante - 0.016);
  const yHilo = yRokuro + t * (yLona(rTirante) - 0.006 - yRokuro);
  w.add(pieza(new THREE.TorusGeometry(rHilo, 0.004, 4, 32), mTinta, 0, yHilo, 0, Math.PI / 2, 0, 0));
  w.add(varilla(V(0, 0.03), V(0, -LARGO), 0.0105, mBambu, 7));
  w.add(pieza(new THREE.CylinderGeometry(0.014, 0.021, 0.06, 10), mMadera, 0, yRokuro, 0));
  for (const y of [-0.42, -0.6]) w.add(pieza(new THREE.TorusGeometry(0.012, 0.0032, 4, 10), mBambu, 0, y, 0, Math.PI / 2, 0, 0));
  w.add(pieza(new THREE.CylinderGeometry(0.0145, 0.0145, 0.11, 8), mTinta, 0, -LARGO + 0.055, 0));
  w.add(pieza(new THREE.LatheGeometry([P(0.036, -0.003), P(0.03, 0.01), P(0.014, 0.026), P(0.006, 0.034), P(0, 0.036)], 16), mTinta));
  w.add(pieza(new THREE.CylinderGeometry(0.004, 0.006, 0.025, 6), mTinta, 0, 0.045, 0));
  return w;
}

export function genkan() {
  const g = new THREE.Group();
  const mMadera = madera();
  const mTinta = tinta();
  const mPapel = papel();
  const mPiedra = new THREE.MeshStandardMaterial({ color: 0x4b4842, roughness: 1 });
  const mBambu = new THREE.MeshStandardMaterial({ color: 0x6b5a3e, roughness: 0.7 });
  const fijo = new THREE.Group();

  // Agari-kamachi: el escalón de madera oscura que separa el doma de la casa
  fijo.add(cajaEn(4.4, 0.32, 0.7, mMadera, 0, 0.16, -1.57));
  fijo.add(cajaEn(4.46, 0.1, 0.1, mTinta, 0, 0.27, -1.2));

  // Andon de pie sobre la tarima. Su papel no proyecta sombra: en el shōji solo queda la celosía.
  const andon = marcoAndon(mMadera, mTinta);
  andon.position.set(-0.85, 0.32, -1.45);
  andon.rotation.y = 0.18;
  fijo.add(andon);
  const papelAndon = papel();
  papelAndon.alphaTest = 0.001; // visible a la cámara; el material de sombra (opacidad 0) se descarta
  const pantalla = new THREE.Mesh(new THREE.CylinderGeometry(0.192, 0.192, 0.53, 4, 1, true), papelAndon);
  pantalla.customDepthMaterial = new THREE.MeshDepthMaterial({ opacity: 0 });
  pantalla.position.set(-0.85, 0.32 + 0.395, -1.45);
  pantalla.rotation.y = 0.18 + Math.PI / 4;
  g.add(pantalla);

  // Piedra con el par de geta, dejadas al descalzarse
  const piedra = losa(mPiedra);
  piedra.position.set(-0.45, 0, -0.5);
  piedra.rotation.y = 0.15;
  fijo.add(piedra);
  const g1 = geta(mMadera, mTinta);
  g1.position.set(-0.52, 0.23, -0.46); g1.rotation.y = Math.PI;
  const g2 = geta(mMadera, mTinta);
  g2.position.set(-0.33, 0.23, -0.56); g2.rotation.y = Math.PI - 0.4;
  fijo.add(g1, g2);

  // Cubo para paraguas (kasa-tate) con el wagasa cerrado apoyado
  const cubo = new THREE.LatheGeometry([P(0, 0), P(0.085, 0), P(0.092, 0.015), P(0.1, 0.42), P(0.091, 0.42), P(0.083, 0.03), P(0, 0.03)], 16);
  fijo.add(pieza(cubo, mMadera, 0.08, 0, -0.62));
  fijo.add(pieza(new THREE.TorusGeometry(0.096, 0.006, 4, 20), mTinta, 0.08, 0.07, -0.62, Math.PI / 2, 0, 0));
  fijo.add(pieza(new THREE.TorusGeometry(0.102, 0.006, 4, 20), mTinta, 0.08, 0.37, -0.62, Math.PI / 2, 0, 0));
  const cerrado = wagasaCerrado(mPapel, mMadera, mTinta, mBambu);
  cerrado.position.set(0.08, 0.03, -0.62);
  cerrado.rotation.set(-0.06, 0, 0.13);
  fijo.add(cerrado);
  fijo.updateMatrixWorld(true);

  // La punta suelta de la cinta, que se mece
  const cola = new THREE.Group();
  cola.position.copy(cerrado.localToWorld(V(-0.055, 0.62, 0.01)));
  const colaPiezas = new THREE.Group();
  colaPiezas.add(cuerda([V(0, 0), V(-0.006, -0.04, 0.004), V(-0.004, -0.09, 0.006), V(0, -0.13, 0.004)], 0.003, mTinta, 14, 4));
  colaPiezas.add(pieza(new THREE.ConeGeometry(0.009, 0.03, 6), mTinta, 0, -0.14, 0.004)); // borla
  cola.add(fusionarPorMaterial(colaPiezas));
  g.add(cola);

  // Wagasa abierto secándose: el aro apoyado en el suelo y el mango también
  const inclinacion = Math.atan2(LARGO - HONDO, R);
  const abierto = new THREE.Group();
  abierto.position.set(0.5, LARGO * Math.cos(inclinacion), -0.76);
  abierto.rotation.z = inclinacion;
  const giro = new THREE.Group();
  giro.add(fusionarPorMaterial(wagasaAbierto(mPapel, mMadera, mTinta, mBambu)));
  abierto.add(giro);
  g.add(abierto);

  g.add(fusionarPorMaterial(fijo));

  return {
    grupo: g,
    animar(t) {
      giro.rotation.y = Math.sin(t * 0.32) * 0.22;
      cola.rotation.z = Math.sin(t * 1.1) * 0.12;
      cola.rotation.x = Math.sin(t * 0.77 + 1) * 0.07;
    },
  };
}
