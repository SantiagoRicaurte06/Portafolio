// Utilidades de geometría para la casa y el jardín: juntar muchas piezas con el mismo material
// en una sola malla (un draw call) y formas que se repiten (piedras, prismas con chaflán).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();

// Matriz de posición, rotación (XYZ) y escala. Nunca escalas negativas: invertirían las caras.
export function matriz(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

const normalizadas = new WeakMap();

// Deja la geometría sin índice y solo con position, normal y uv, para poder fundirla con cualquier otra.
function normalizar(geo) {
  let lista = normalizadas.get(geo);
  if (lista) return lista;
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const nombre of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv'].includes(nombre)) g.deleteAttribute(nombre);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.clearGroups();
  g.morphAttributes = {};
  normalizadas.set(geo, g);
  return g;
}

// Un lote: piezas que comparten material y se dibujan juntas.
export class Lote {
  constructor() { this.partes = []; }

  poner(geo, m) {
    const g = normalizar(geo).clone();
    if (m) g.applyMatrix4(m);
    this.partes.push(g);
    return this;
  }

  malla(material) {
    if (!this.partes.length) return null;
    const geo = mergeGeometries(this.partes, false);
    this.partes.forEach((g) => g.dispose());
    this.partes = [];
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const m = new THREE.Mesh(geo, material);
    m.matrixAutoUpdate = false;
    return m;
  }
}

// Pseudoaleatorio con semilla: la casa sale igual en cada visita.
export function azar(semilla = 1) {
  let s = semilla >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// Piedra natural: icosaedro deformado con caras planas. `plano` aplana la cara de arriba
// (piedras de paso, piedras base de los pilares).
export function geoPiedra(semilla, { detalle = 1, rugosidad = 0.22, plano = 0 } = {}) {
  const geo = new THREE.IcosahedronGeometry(1, detalle);
  const pos = geo.attributes.position;
  const ruido = (x, y, z) => {
    const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + semilla * 4.13) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // mismo vértice → mismo desplazamiento: sin grietas entre caras
    const k = 1 + (ruido(Math.round(x * 1e3), Math.round(y * 1e3), Math.round(z * 1e3)) - 0.5) * 2 * rugosidad;
    let ny = y * k;
    if (plano > 0 && ny > 1 - plano) ny = 1 - plano + (ny - (1 - plano)) * 0.15;
    if (ny < -0.55) ny = -0.55 + (ny + 0.55) * 0.3; // asentada: base ancha
    pos.setXYZ(i, x * k, ny, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

// Prisma de sección cuadrada con las aristas achaflanadas (mentori), de y=0 a y=alto.
export function geoChaflan(ancho, fondo, alto, chaflan) {
  const a = ancho / 2, f = fondo / 2, c = chaflan;
  const forma = new THREE.Shape();
  forma.moveTo(-a + c, -f);
  forma.lineTo(a - c, -f);
  forma.lineTo(a, -f + c);
  forma.lineTo(a, f - c);
  forma.lineTo(a - c, f);
  forma.lineTo(-a + c, f);
  forma.lineTo(-a, f - c);
  forma.lineTo(-a, -f + c);
  forma.closePath();
  const geo = new THREE.ExtrudeGeometry(forma, { depth: alto, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // la extrusión (+z) pasa a ser la altura (+y)
  return geo;
}

// Lámina fina con forma de hoja o brizna, de la base (0,0,0) hacia +y, en el plano XY.
// Antihorario visto desde +z. Se curva hacia +z según `curva`.
export function geoBrizna(largo, ancho, tramos = 4, curva = 0.2) {
  const pos = [];
  const uv = [];
  const punto = (t, lado) => {
    const w = ancho * (1 - t) * (t < 0.15 ? 0.7 + t * 2 : 1);
    return [lado * w * 0.5, t * largo, curva * t * t * largo];
  };
  for (let i = 0; i < tramos; i++) {
    const t0 = i / tramos, t1 = (i + 1) / tramos;
    const a = punto(t0, -1), b = punto(t0, 1), c = punto(t1, 1), d = punto(t1, -1);
    if (i === tramos - 1) {
      const p = [0, largo, curva * largo];
      pos.push(...a, ...b, ...p);
      uv.push(0, t0, 1, t0, 0.5, 1);
    } else {
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);
      uv.push(0, t0, 1, t0, 1, t1, 0, t0, 1, t1, 0, t1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}
