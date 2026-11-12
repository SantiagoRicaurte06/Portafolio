// Objetos de la sala servicios. Solo proyectan sombra hasta que la puerta se abre.
import * as THREE from 'three';
import { madera } from './comun.js';

export function servicios() {
  const g = new THREE.Group();
  const m = madera();
  const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.7, 8), m);
  barra.rotation.z = Math.PI / 2; barra.position.set(0, 1.95, -0.7);
  g.add(barra);
  const tela = new THREE.MeshStandardMaterial({ color: 0x24201c, roughness: 1, side: THREE.DoubleSide });
  const panos = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(0.52, 1.05, 6, 14);
    geo.translate(0, -0.525, 0);
    const pano = new THREE.Mesh(geo, tela);
    pano.position.set((i - 1) * 0.55, 1.94, -0.7);
    pano.userData.base = geo.attributes.position.array.slice();
    panos.push(pano);
    g.add(pano);
  }
  const animar = (t) => {
    panos.forEach((p, i) => {
      const pos = p.geometry.attributes.position;
      const base = p.userData.base;
      for (let k = 0; k < pos.count; k++) {
        const y = base[k * 3 + 1];
        const caida = -y; // 0 arriba, ~1 abajo
        pos.array[k * 3 + 2] = base[k * 3 + 2] + Math.sin(t * 1.4 + i * 0.9 + base[k * 3] * 3) * 0.07 * caida * caida;
        pos.array[k * 3] = base[k * 3] + Math.sin(t * 0.9 + i) * 0.025 * caida;
      }
      pos.needsUpdate = true;
    });
  };
  return { grupo: g, animar, sombraViva: true };
}
