// Objetos de la sala taller. Solo proyectan sombra hasta que la puerta se abre.
import * as THREE from 'three';
import { madera, tinta, caja } from './comun.js';

export function taller() {
  const g = new THREE.Group();
  const m = madera();
  const tablero = caja(1.4, 0.04, 0.62, m); tablero.position.set(0, 0.36, -0.95); g.add(tablero);
  for (const [x, z] of [[-0.64, -0.7], [0.64, -0.7], [-0.64, -1.2], [0.64, -1.2]]) {
    const pata = caja(0.05, 0.34, 0.05, m); pata.position.set(x, 0.17, z); g.add(pata);
  }
  // Laptop abierta
  const base = caja(0.36, 0.015, 0.25, tinta()); base.position.set(-0.2, 0.39, -0.92);
  const pantalla = caja(0.36, 0.24, 0.012, tinta());
  pantalla.position.set(-0.2, 0.51, -1.05); pantalla.rotation.x = -0.25;
  g.add(base, pantalla);
  // Portapinceles con pinceles
  const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.12, 10), tinta());
  vaso.position.set(0.38, 0.44, -1.0); g.add(vaso);
  [[-0.12, 0.3], [0, 0.38], [0.1, 0.33], [0.05, 0.42]].forEach(([inc, largo], i) => {
    const pincel = new THREE.Group();
    const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, largo, 6), m);
    mango.position.y = largo / 2;
    const pelo = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 8), tinta());
    pelo.rotation.x = Math.PI; pelo.position.y = -0.02;
    pincel.add(mango, pelo);
    pincel.position.set(0.38 + (i - 1.5) * 0.015, 0.42, -1.0);
    pincel.rotation.z = inc;
    g.add(pincel);
  });
  // Piedra de tinta (suzuri)
  const suzuri = caja(0.14, 0.03, 0.22, tinta()); suzuri.position.set(0.15, 0.395, -0.85); g.add(suzuri);
  return { grupo: g };
}
