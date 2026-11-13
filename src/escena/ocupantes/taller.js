// Objetos de la sala taller: un tsukue con la laptop y el juego de shodō, y una taza de té
// con su hilo de vapor. Solo proyectan sombra hasta que la puerta se abre.
// Lo estático va fusionado por material (≈7 draw calls, ≈4k triángulos).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { madera, tinta, papel } from './comun.js';

const SUPERFICIE = 0.35; // altura de la cara superior del escritorio

// Aplica posición, giro y escala a una geometría (en ese orden: escala, giro, posición).
const _m = new THREE.Matrix4();
function pon(geo, [x, y, z], [rx, ry, rz] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1]) {
  _m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  return geo.applyMatrix4(_m);
}

// Fusiona geometrías de un mismo material en una sola (solo posición y normal).
function fusionar(geos) {
  const limpias = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
    return n;
  });
  return mergeGeometries(limpias);
}

// Tabla con los extremos levantados (fudegaeshi), vista de frente; se extruye en z.
function tablaConPuntas(largo, grueso, subida, fondo) {
  const m = largo / 2;
  const s = new THREE.Shape();
  s.moveTo(-m + 0.03, 0);
  s.lineTo(m - 0.03, 0);
  s.quadraticCurveTo(m + 0.012, 0, m + 0.02, grueso + subida);
  s.lineTo(m + 0.006, grueso + subida + 0.004);
  s.quadraticCurveTo(m - 0.004, grueso, m - 0.04, grueso);
  s.lineTo(-m + 0.04, grueso);
  s.quadraticCurveTo(-m + 0.004, grueso, -m - 0.006, grueso + subida + 0.004);
  s.lineTo(-m - 0.02, grueso + subida);
  s.quadraticCurveTo(-m - 0.012, 0, -m + 0.03, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: fondo, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -fondo / 2);
  return g;
}

function escritorio(geosMadera) {
  // Tablero de 1,3 × 0,56 con fudegaeshi en los extremos
  geosMadera.push(pon(tablaConPuntas(1.3, 0.03, 0.026, 0.56), [0, SUPERFICIE - 0.03, -1.0]));
  for (const lado of [-1, 1]) {
    const x = lado * 0.54;
    // Faldón bajo el tablero, travesaño alto y patín en el piso: cada extremo es un marco
    geosMadera.push(pon(new THREE.BoxGeometry(0.022, 0.045, 0.5), [x, SUPERFICIE - 0.055, -1.0]));
    geosMadera.push(pon(new THREE.BoxGeometry(0.05, 0.022, 0.6), [x, 0.011, -1.0]));
    for (const z of [-0.76, -1.24]) {
      // Pata ahusada de sección cuadrada, levemente abierta hacia fuera
      geosMadera.push(pon(new THREE.CylinderGeometry(0.014, 0.019, SUPERFICIE - 0.05, 4), [x, (SUPERFICIE - 0.03) / 2 + 0.01, z], [0, Math.PI / 4, lado * -0.035]));
    }
  }
  // Travesaño fino atrás, a ras de piso: una línea delgada en la sombra
  geosMadera.push(pon(new THREE.BoxGeometry(1.08, 0.012, 0.016), [0, 0.07, -1.24]));
}

function laptop(geosTinta) {
  const lugar = new THREE.Matrix4().compose(new THREE.Vector3(-0.3, 0, -0.96), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.14, 0)), new THREE.Vector3(1, 1, 1));
  const y = SUPERFICIE;
  const bisagraZ = -0.1075;
  const apertura = -0.3; // la tapa se inclina hacia atrás desde la vertical
  const base = pon(new THREE.BoxGeometry(0.31, 0.012, 0.215), [0, y + 0.006, 0]);
  const teclado = pon(new THREE.BoxGeometry(0.27, 0.002, 0.09), [0, y + 0.012, -0.035]);
  const bisagra = pon(new THREE.CylinderGeometry(0.006, 0.006, 0.27, 8), [0, y + 0.012, bisagraZ], [0, 0, Math.PI / 2]);
  const tapa = new THREE.BoxGeometry(0.31, 0.205, 0.006).translate(0, 0.1025, -0.003);
  pon(tapa, [0, y + 0.012, bisagraZ], [apertura, 0, 0]);
  for (const g of [base, teclado, bisagra, tapa]) geosTinta.push(g.applyMatrix4(lugar));
  // Pantalla: un plano en la cara delantera de la tapa
  const pantalla = new THREE.PlaneGeometry(0.284, 0.18).translate(0, 0.108, 0.0008);
  pon(pantalla, [0, y + 0.012, bisagraZ], [apertura, 0, 0]);
  pantalla.applyMatrix4(lugar);
  const brillo = new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 0.35, emissive: 0x9fb4d6, emissiveIntensity: 0.16 });
  return new THREE.Mesh(pantalla, brillo);
}

function shodo(geosMadera, geosTinta, geosCeramica) {
  const y = SUPERFICIE;
  // Fieltro (shitajiki), papel hanshi y pisapapeles (bunchin)
  const px = 0.16, pz = -0.93;
  geosTinta.push(pon(new THREE.BoxGeometry(0.3, 0.003, 0.4), [px, y + 0.0015, pz]));
  const hoja = new THREE.Mesh(pon(new THREE.PlaneGeometry(0.243, 0.334), [px, y + 0.0035, pz], [-Math.PI / 2, 0, 0]), papel());
  geosTinta.push(pon(new THREE.BoxGeometry(0.21, 0.013, 0.02), [px, y + 0.0035 + 0.0065, pz - 0.15]));
  geosTinta.push(pon(new THREE.BoxGeometry(0.03, 0.008, 0.012), [px, y + 0.0035 + 0.017, pz - 0.15]));
  // Un ensō sobre el papel: grueso al empezar, se adelgaza y se abre al final (kasure)
  const enso = new THREE.RingGeometry(0.07, 0.08, 48, 1, 1.1, 5.5);
  const pos = enso.attributes.position;
  for (let i = 49; i < 98; i++) {
    const j = i - 49;
    const a = 1.1 + (j / 48) * 5.5;
    const r = 0.07 + 0.004 + 0.015 * Math.pow(Math.sin(Math.PI * Math.pow(1 - j / 48, 0.65)), 0.8);
    pos.setXY(i, Math.cos(a) * r, Math.sin(a) * r);
  }
  geosTinta.push(pon(enso, [px - 0.005, y + 0.0042, pz + 0.03], [-Math.PI / 2, 0, 0]));

  // Suzuri: piedra rectangular de esquinas redondeadas, con el pozo (umi) al fondo
  const sx = 0.43, sz = -0.86;
  const rect = new THREE.Shape();
  const a = 0.048, b = 0.085, rr = 0.012;
  rect.moveTo(-a + rr, -b); rect.lineTo(a - rr, -b); rect.quadraticCurveTo(a, -b, a, -b + rr);
  rect.lineTo(a, b - rr); rect.quadraticCurveTo(a, b, a - rr, b); rect.lineTo(-a + rr, b);
  rect.quadraticCurveTo(-a, b, -a, b - rr); rect.lineTo(-a, -b + rr); rect.quadraticCurveTo(-a, -b, -a + rr, -b);
  const piedra = new THREE.ExtrudeGeometry(rect, { depth: 0.022, bevelEnabled: false, curveSegments: 3 });
  geosTinta.push(pon(piedra, [sx, y, sz], [-Math.PI / 2, 0.08, 0]));
  geosTinta.push(pon(new THREE.CircleGeometry(0.03, 16), [sx - 0.005, y + 0.0225, sz - 0.05], [-Math.PI / 2, 0, 0], [1, 0.7, 1]));
  // Barra de sumi apoyada en la piedra
  geosTinta.push(pon(new THREE.BoxGeometry(0.017, 0.011, 0.075), [sx + 0.004, y + 0.028, sz + 0.03], [0, 0.55, 0.06]));
  // Suiteki (gotero de agua)
  geosCeramica.push(pon(new THREE.SphereGeometry(0.022, 12, 8), [sx + 0.08, y + 0.014, sz + 0.12], [0, 0, 0], [1, 0.65, 1]));
  geosCeramica.push(pon(new THREE.CylinderGeometry(0.003, 0.004, 0.012, 6), [sx + 0.08, y + 0.031, sz + 0.12]));

  // Fudekake: base, dos postes y un travesaño con las puntas levantadas (como un torii)
  const fx = 0.44, fz = -1.17, alto = 0.27;
  geosMadera.push(pon(new THREE.BoxGeometry(0.25, 0.012, 0.065), [fx, y + 0.006, fz]));
  for (const lado of [-1, 1]) {
    geosMadera.push(pon(new THREE.CylinderGeometry(0.0055, 0.0065, alto, 6), [fx + lado * 0.105, y + 0.012 + alto / 2, fz]));
  }
  geosMadera.push(pon(tablaConPuntas(0.27, 0.009, 0.012, 0.014), [fx, y + 0.012 + alto, fz]));
  geosMadera.push(pon(new THREE.BoxGeometry(0.22, 0.007, 0.01), [fx, y + alto - 0.03, fz]));

  // Pinceles colgados por su lazo: [radio del mango, largo, largo del pelo, x]
  const barra = y + 0.012 + alto;
  const pinceles = [[0.0068, 0.165, 0.05, -0.072], [0.0056, 0.158, 0.042, -0.034], [0.0047, 0.15, 0.035, 0.002], [0.0038, 0.142, 0.028, 0.036], [0.003, 0.132, 0.021, 0.068]];
  for (const [rh, largo, pelo, dx] of pinceles) {
    const x = fx + dx;
    const arriba = barra - 0.012;
    geosTinta.push(pon(new THREE.TorusGeometry(0.0075, 0.0012, 4, 12), [x, barra + 0.001, fz], [0, Math.PI / 2, 0]));
    geosMadera.push(pon(new THREE.CylinderGeometry(rh, rh, largo, 7), [x, arriba - largo / 2, fz]));
    geosTinta.push(pon(new THREE.CylinderGeometry(rh * 1.25, rh * 1.15, 0.012, 7), [x, arriba - largo - 0.006, fz]));
    // Pelo: abultado y terminado en punta
    const perfil = [];
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      const r = rh * (1.1 + 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u)) * Math.pow(1 - u, 0.6);
      perfil.push(new THREE.Vector2(Math.max(r, 0.0002), -u * pelo));
    }
    geosTinta.push(pon(new THREE.LatheGeometry(perfil, 7), [x, arriba - largo - 0.012, fz]));
  }
  return hoja;
}

// Yunomi sobre su chataku; devuelve el punto donde nace el vapor.
function te(geosMadera, geosTinta, geosCeramica) {
  const x = -0.03, z = -0.8, y = SUPERFICIE;
  geosMadera.push(pon(new THREE.CylinderGeometry(0.05, 0.046, 0.008, 18), [x, y + 0.004, z]));
  const perfil = [[0, 0], [0.025, 0], [0.026, 0.006], [0.023, 0.008], [0.029, 0.014], [0.033, 0.05], [0.035, 0.08], [0.033, 0.082], [0.031, 0.078], [0.029, 0.03], [0, 0.026]]
    .map(([r, h]) => new THREE.Vector2(r, h));
  geosCeramica.push(pon(new THREE.LatheGeometry(perfil, 20), [x, y + 0.008, z]));
  geosTinta.push(pon(new THREE.CircleGeometry(0.03, 16), [x, y + 0.008 + 0.068, z], [-Math.PI / 2, 0, 0]));
  return new THREE.Vector3(x, y + 0.008 + 0.078, z);
}

// Zabuton: un cojín mullido frente al escritorio.
function zabuton() {
  const g = new THREE.BoxGeometry(0.5, 0.06, 0.48, 8, 1, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / 0.25, v = p.getZ(i) / 0.24;
    const borde = Math.max(Math.abs(u), Math.abs(v));
    p.setY(i, p.getY(i) > 0 ? 0.06 * (1 - 0.6 * Math.pow(borde, 4)) : 0.002);
  }
  g.computeVertexNormals();
  pon(g, [-0.12, 0.0, -0.58], [0, 0.06, 0]);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x26262a, roughness: 1 }));
}

// Alfa del vapor: se desvanece en los bordes, nace suave y se disuelve arriba.
function texturaVapor() {
  const an = 16, al = 64;
  const datos = new Uint8Array(an * al * 4);
  for (let j = 0; j < al; j++) {
    const v = j / (al - 1);
    const vertical = Math.min(1, v / 0.12) * Math.pow(1 - v, 1.6);
    for (let i = 0; i < an; i++) {
      const u = i / (an - 1);
      const a = Math.round(255 * 0.75 * Math.sin(Math.PI * u) * vertical);
      datos.set([a, a, a, 255], (j * an + i) * 4);
    }
  }
  const t = new THREE.DataTexture(datos, an, al);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// Dos hilos de vapor: cintas finas que ondulan y suben. Se actualizan ~120 vértices por cuadro.
function vapor(origen) {
  const HILOS = 2, N = 28, ALTO = 0.3;
  const porHilo = (N + 1) * 2;
  const posiciones = new Float32Array(HILOS * porHilo * 3);
  const uvs = new Float32Array(HILOS * porHilo * 2);
  const indices = [];
  for (let h = 0; h < HILOS; h++) {
    for (let i = 0; i <= N; i++) {
      const k = h * porHilo + i * 2;
      uvs.set([0, i / N, 1, i / N], k * 2);
      if (i < N) indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const alfa = texturaVapor();
  const mat = new THREE.MeshBasicMaterial({ color: 0xd9d4ca, transparent: true, opacity: 0.4, alphaMap: alfa, depthWrite: false, side: THREE.DoubleSide });
  const malla = new THREE.Mesh(geo, mat);
  malla.frustumCulled = false;
  // En la sombra el vapor se tramita con alphaHash: un tramado que el desenfoque vuelve humo
  malla.customDepthMaterial = new THREE.MeshDepthMaterial({ alphaHash: true, alphaMap: alfa, side: THREE.DoubleSide });

  const fases = [0, 2.4];
  const desvio = [-0.006, 0.008];
  const animar = (t) => {
    for (let h = 0; h < HILOS; h++) {
      const f = fases[h];
      const respiro = 0.85 + 0.15 * Math.sin(t * 0.6 + f);
      for (let i = 0; i <= N; i++) {
        const s = i / N;
        const amp = 0.003 + 0.04 * Math.pow(s, 1.4);
        const cx = origen.x + desvio[h] * (1 - s)
          + amp * (0.7 * Math.sin(8.5 * s - 1.7 * t + f) + 0.3 * Math.sin(17 * s - 2.9 * t + f * 1.9));
        const cy = origen.y + s * ALTO * respiro;
        const cz = origen.z + 0.012 * Math.sin(5 * s - 1.1 * t + f) * s;
        const ancho = (0.003 + 0.018 * s) * (0.75 + 0.25 * Math.sin(11 * s - 2.2 * t + f));
        const k = (h * porHilo + i * 2) * 3;
        posiciones[k] = cx - ancho; posiciones[k + 1] = cy; posiciones[k + 2] = cz;
        posiciones[k + 3] = cx + ancho; posiciones[k + 4] = cy; posiciones[k + 5] = cz;
      }
    }
    geo.attributes.position.needsUpdate = true;
  };
  animar(0);
  return { malla, animar };
}

export function taller() {
  const g = new THREE.Group();
  const geosMadera = [], geosTinta = [], geosCeramica = [];
  escritorio(geosMadera);
  const pantalla = laptop(geosTinta);
  const hoja = shodo(geosMadera, geosTinta, geosCeramica);
  const boca = te(geosMadera, geosTinta, geosCeramica);
  const humo = vapor(boca);

  const ceramica = new THREE.MeshStandardMaterial({ color: 0xd6d0c4, roughness: 0.45 });
  g.add(
    new THREE.Mesh(fusionar(geosMadera), madera()),
    new THREE.Mesh(fusionar(geosTinta), tinta()),
    new THREE.Mesh(fusionar(geosCeramica), ceramica),
    pantalla, hoja, zabuton(), humo.malla,
  );
  return { grupo: g, animar: (t) => humo.animar(t) };
}
