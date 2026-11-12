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
