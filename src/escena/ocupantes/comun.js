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
