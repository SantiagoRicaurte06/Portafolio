// Objetos de la sala obras. Solo proyectan sombra hasta que la puerta se abre.
import * as THREE from 'three';
import { madera, papel, caja } from './comun.js';

export function obras() {
  const g = new THREE.Group();
  const m = madera();
  for (const x of [-0.75, 0.75]) { const lado = caja(0.04, 1.5, 0.32, m); lado.position.set(x, 0.75, -1.1); g.add(lado); }
  for (const y of [0.04, 0.55, 1.05, 1.5]) { const tabla = caja(1.54, 0.03, 0.32, m); tabla.position.set(0, y, -1.1); g.add(tabla); }
  const rollo = (largo, r) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, largo, 10), papel());
  const pila = [[0.06, 0.62, 0.05, -0.3], [0.06, 0.66, 0.05, 0.25], [0.57, 0.58, 0.045, -0.2], [0.57, 0.7, 0.045, 0.3], [0.62, 0.5, 0.04, 0.05], [1.07, 0.66, 0.05, 0]];
  for (const [y, largo, r, x] of pila) {
    const ro = rollo(largo, r); ro.rotation.z = Math.PI / 2; ro.position.set(x, y + 0.03 + r, -1.05); g.add(ro);
  }
  // Un kakejiku colgado a un lado, a medio desenrollar
  const colgado = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.9), papel());
  colgado.position.set(1.25, 1.35, -0.75);
  const vara = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 6), m);
  vara.rotation.z = Math.PI / 2; vara.position.set(1.25, 0.9, -0.75);
  g.add(colgado, vara);
  return { grupo: g };
}
