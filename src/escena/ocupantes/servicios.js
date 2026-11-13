// Objetos de la sala servicios: un noren de cuatro paños colgado de una barra de bambú, con el
// emblema de la tienda (un círculo con 商) calado en la tela y partido por la abertura central,
// como en los noren de verdad. Desde el pasillo solo se ve su sombra: la luz de la linterna
// pasa por el calado y dibuja el emblema claro dentro de la sombra de la tela.
import * as THREE from 'three';
import { madera, papel, tinta, fusionar, hiloEntre } from './comun.js';

const BARRA_Y = 1.8;
const BARRA_Z = -0.75;
const TECHO = 2.85;
const LARGO = 0.9;        // caída de la tela bajo la barra
const ANCHO = 0.36;       // cada paño
const MEDIA_ABERTURA = 0.01; // la abertura central mide 2 cm y cruza el emblema
const RANURA = 0.016;     // entre los dos paños de cada lado
const MON_Y = -0.3;       // centro del emblema, relativo a la barra
const MON_R = 0.19;       // radio del hueco: un anillo de luz
const ISLA_R = 0.155;     // disco de tela que queda dentro, con el kanji calado
const MARGEN = 0.005;     // tela que queda entre los trazos y la abertura

// Mitad derecha de 商 en unidades del disco (x desde el eje, y hacia arriba). El kanji es
// simétrico: la mitad izquierda es su espejo. El punto de 亠 lo hace la propia abertura.
const MEDIO_KANJI = [
  [[0, 0.58], [0.45, 0.58], [0.45, 0.72], [0, 0.72]],                                                      // 亠
  [[0.16, 0.47], [0.28, 0.5], [0.36, 0.33], [0.24, 0.3]],                                                 // ソ
  [[0, 0.24], [0.66, 0.24], [0.66, -0.55], [0.54, -0.55], [0.54, 0.12], [0, 0.12]],                       // 冂
  [[0.14, 0.04], [0.26, 0.04], [0.42, -0.12], [0.3, -0.12]],                                              // 八
  [[0, -0.18], [0.36, -0.18], [0.36, -0.52], [0, -0.52], [0, -0.42], [0.24, -0.42], [0.24, -0.3], [0, -0.3]], // 口
];

const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
const suave = (v) => v * v * (3 - 2 * v);

// Ráfagas suaves e irregulares: tres senos de periodos que no se repiten entre sí.
function rafaga(t) {
  const n = Math.sin(t * 0.53) * 0.55 + Math.sin(t * 0.31 + 1.7) * 0.35 + Math.sin(t * 1.27 + 0.4) * 0.2;
  return 0.3 + 0.7 * suave(limitar((n + 0.45) / 1.25, 0, 1));
}

function formaDesde(puntos) {
  const f = new THREE.Shape();
  puntos.forEach(([x, y], i) => (i ? f.lineTo(x, y) : f.moveTo(x, y)));
  return f;
}

// Un paño. lado: +1 derecha, -1 izquierda. interior: el que toca la abertura y lleva medio emblema.
function geometriaPano(lado, interior) {
  const x0 = interior ? MEDIA_ABERTURA : MEDIA_ABERTURA + ANCHO + RANURA;
  const x1 = x0 + ANCHO;
  const arriba = 0.03; // la tela envuelve la barra
  const pasos = 18;
  const puntos = [[x0, arriba], [x1, arriba]];
  for (let i = 1; i <= pasos; i++) puntos.push([x1, arriba - (LARGO + arriba) * (i / pasos)]);
  for (let i = 1; i <= 5; i++) puntos.push([x1 + (x0 - x1) * (i / 5), -LARGO]);
  // Borde interior, de abajo hacia arriba; en el paño central rodea el hueco del emblema.
  const h = Math.sqrt(MON_R * MON_R - x0 * x0);
  let arcoHecho = !interior;
  for (let i = pasos - 1; i >= 1; i--) {
    const y = arriba - (LARGO + arriba) * (i / pasos);
    if (!arcoHecho && y > MON_Y - h) {
      const f0 = Math.acos(x0 / MON_R);
      for (let k = 0; k <= 14; k++) {
        const f = -f0 + (2 * f0 * k) / 14;
        puntos.push([MON_R * Math.cos(f), MON_Y + MON_R * Math.sin(f)]);
      }
      arcoHecho = true;
    }
    if (interior && Math.abs(y - MON_Y) <= h) continue;
    puntos.push([x0, y]);
  }
  const formas = [formaDesde(puntos.map(([x, y]) => [x * lado, y]))];

  if (interior) {
    // Isla: medio disco de tela pegado a la abertura, con medio kanji calado.
    const f0 = Math.acos(MEDIA_ABERTURA / ISLA_R);
    const borde = [];
    for (let k = 0; k <= 16; k++) {
      const f = -f0 + (2 * f0 * k) / 16;
      borde.push([ISLA_R * Math.cos(f) * lado, MON_Y + ISLA_R * Math.sin(f)]);
    }
    const isla = formaDesde(borde);
    for (const trazo of MEDIO_KANJI) {
      const p = trazo.map(([u, v]) => [Math.max(u * ISLA_R, MEDIA_ABERTURA + MARGEN) * lado, MON_Y + v * ISLA_R]);
      isla.holes.push(new THREE.Path(p.map(([x, y]) => new THREE.Vector2(x, y))));
    }
    formas.push(isla);
  }
  return new THREE.ShapeGeometry(formas);
}

// Caña de bambú con nudos irregulares, abierta en las puntas.
function geometriaBambu(largo, r) {
  const nudos = [-0.74, -0.41, -0.07, 0.29, 0.63];
  const perfil = [];
  for (let i = 0; i <= 34; i++) {
    const y = -largo / 2 + (largo * i) / 34;
    const cerca = Math.min(...nudos.map((n) => Math.abs(y - n)));
    perfil.push(new THREE.Vector2(r * (1 + 0.22 * Math.exp(-((cerca / 0.014) ** 2))), y));
  }
  return new THREE.LatheGeometry(perfil, 8);
}

// Farolillo chōchin: papel sobre costillas de bambú (se notan en el contorno de la sombra).
function chochin() {
  const pivote = new THREE.Group();
  const perfil = [];
  for (let i = 0; i <= 22; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 22;
    const r = Math.max(0.075, 0.125 * Math.cos(a)) * (i % 2 ? 0.972 : 1);
    perfil.push(new THREE.Vector2(r, 0.19 * Math.sin(a)));
  }
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 14), papel());
  cuerpo.position.y = -1.3;
  const tapa = (y) => new THREE.CylinderGeometry(0.08, 0.08, 0.035, 12).translate(0, y, 0);
  const herrajes = new THREE.Mesh(fusionar([tapa(-1.3 + 0.168), tapa(-1.3 - 0.168), hiloEntre([0, 0, 0], [0, -1.3 + 0.185, 0], 0.003)]), tinta());
  pivote.add(cuerpo, herrajes);
  return pivote;
}

export function servicios() {
  const g = new THREE.Group();

  const barra = new THREE.Mesh(geometriaBambu(1.78, 0.019), madera());
  barra.rotation.z = Math.PI / 2;
  barra.position.set(0, BARRA_Y, BARRA_Z);
  const cuerdas = new THREE.Mesh(fusionar([-0.72, 0.72].map((x) => hiloEntre([x, TECHO, BARRA_Z], [x, BARRA_Y, BARRA_Z]))), tinta());
  g.add(barra, cuerdas);

  const tela = new THREE.MeshStandardMaterial({ color: 0x1f1c19, roughness: 1, side: THREE.DoubleSide });
  const panos = [];
  [[-1, false], [-1, true], [1, true], [1, false]].forEach(([lado, interior], i) => {
    const geo = geometriaPano(lado, interior);
    const pano = new THREE.Mesh(geo, tela);
    pano.position.set(0, BARRA_Y, BARRA_Z);
    pano.userData.base = geo.attributes.position.array.slice();
    pano.userData.fase = i * 0.83;
    panos.push(pano);
    g.add(pano);
  });

  const farol = chochin();
  farol.position.set(-1.15, TECHO, -0.4);
  g.add(farol);

  const animar = (t) => {
    for (const p of panos) {
      const pos = p.geometry.attributes.position;
      const a = pos.array;
      const base = p.userData.base;
      const fase = p.userData.fase;
      for (let k = 0; k < pos.count; k++) {
        const x = base[k * 3];
        const y = base[k * 3 + 1];
        const d = limitar(-y / LARGO, 0, 1);       // 0 en la barra, 1 en el dobladillo
        const r = rafaga(t - d * 0.7);             // la ráfaga baja por la tela con retraso
        const amp = d * Math.sqrt(d);
        // Onda que baja desde la barra + empuje hacia dentro de la sala cuando sopla
        const dz = amp * (0.075 * r * Math.sin(2.2 * t - d * 4.2 + x * 1.6 + fase) + 0.018 * Math.sin(3.7 * t + x * 5 - d * 3) - 0.09 * r);
        const dx = d * d * 0.03 * r * Math.sin(1.1 * t - d * 2.5 + fase * 1.6);
        a[k * 3] = x + dx;
        a[k * 3 + 1] = y + (dz * dz + dx * dx) / (2 * Math.max(d * LARGO, 0.05)); // la tela sube al apartarse: no se estira
        a[k * 3 + 2] = base[k * 3 + 2] + dz;
      }
      pos.needsUpdate = true;
      p.geometry.computeVertexNormals();
    }
    const r = rafaga(t - 0.4);
    farol.rotation.z = Math.sin(t * 0.9) * 0.025 * r;
    farol.rotation.x = -0.035 * r + Math.sin(t * 0.7 + 1) * 0.01;
    farol.rotation.y = Math.sin(t * 0.21) * 0.4;
  };
  return { grupo: g, animar, sombraViva: true };
}
