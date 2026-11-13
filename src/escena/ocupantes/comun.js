// Materiales y utilidades compartidas por los objetos de las salas.
import * as THREE from 'three';

export const madera = () => new THREE.MeshStandardMaterial({ color: 0x2a211a, roughness: 0.85 });
export const tinta = () => new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.9 });
export const papel = () => new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.95, side: THREE.DoubleSide });

export function caja(an, al, fo, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(an, al, fo), mat);
}

// Hoja de momiji: siete puntas.
export function formaHojaMomiji(r = 0.06) {
  const forma = new THREE.Shape();
  const puntas = 7;
  for (let i = 0; i <= puntas * 2; i++) {
    const a = Math.PI / 2 + (i / (puntas * 2)) * Math.PI * 2 * 0.86 - Math.PI * 0.86;
    const radio = i % 2 === 0 ? r * (i === puntas ? 1 : 0.82) : r * 0.42;
    const x = Math.cos(a) * radio;
    const y = Math.sin(a) * radio;
    if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
  }
  forma.lineTo(0, -r * 0.2);
  return new THREE.ShapeGeometry(forma);
}

// ── Modelado fino con pocas llamadas de dibujo ───────────────────────────────
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Una caja ya colocada.
export function cajaEn(an, al, fo, mat, x = 0, y = 0, z = 0) {
  const m = caja(an, al, fo, mat);
  m.position.set(x, y, z);
  return m;
}

// Cualquier geometría colocada y girada.
export function pieza(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

// Varilla fina entre dos puntos (costillas de paraguas, palitos, patas).
export function varilla(a, b, r, mat, lados = 4) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const largo = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, largo, lados, 1, true), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// Cuerda o cinta que pasa por unos puntos (lazos, tiras, colgantes).
export function cuerda(puntos, r, mat, tramos = 20, lados = 4, cerrada = false) {
  const curva = new THREE.CatmullRomCurve3(puntos, cerrada, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(curva, tramos, r, lados, cerrada), mat);
}

// Fusiona todo un subárbol estático en una malla por material: muchas piezas finas,
// pocas llamadas de dibujo (también en el pase de sombra). Devuelve un grupo nuevo.
export function fusionarPorMaterial(raiz) {
  raiz.updateMatrixWorld(true);
  const inversa = raiz.matrixWorld.clone().invert();
  const cubos = new Map();
  const usadas = new Set();
  const matriz = new THREE.Matrix4();
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    usadas.add(o.geometry);
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const nombre of Object.keys(geo.attributes)) {
      if (nombre !== 'position' && nombre !== 'normal') geo.deleteAttribute(nombre);
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.clearGroups();
    geo.applyMatrix4(matriz.multiplyMatrices(inversa, o.matrixWorld));
    if (!cubos.has(o.material)) cubos.set(o.material, []);
    cubos.get(o.material).push(geo);
  });
  const salida = new THREE.Group();
  for (const [mat, geos] of cubos) {
    salida.add(new THREE.Mesh(mergeGeometries(geos, false), mat));
    geos.forEach((geo) => geo.dispose());
  }
  usadas.forEach((geo) => geo.dispose());
  return salida;
}

// Une varias geometrías (ya transformadas) en una sola: un draw call en vez de varios.
// Solo conserva posiciones y normales, que es lo que usan estos materiales lisos.
export function fusionar(geos) {
  const partes = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = partes.reduce((n, g) => n + g.attributes.position.array.length, 0);
  const pos = new Float32Array(total);
  let k = 0;
  for (const g of partes) { pos.set(g.attributes.position.array, k); k += g.attributes.position.array.length; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

// Hilo (cilindro de 3 lados) entre dos puntos [x, y, z].
export function hiloEntre(a, b, r = 0.0025) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const geo = new THREE.CylinderGeometry(r, r, dir.length(), 3, 1, true);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  geo.translate((va.x + vb.x) / 2, (va.y + vb.y) / 2, (va.z + vb.z) / 2);
  return geo;
}
