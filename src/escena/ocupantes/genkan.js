// Objetos de la sala genkan. Solo proyectan sombra hasta que la puerta se abre.
import * as THREE from 'three';
import { madera, tinta, papel, caja } from './comun.js';

export function genkan() {
  const g = new THREE.Group();
  // Paraguas wagasa cerrado, apoyado
  const paraguas = new THREE.Group();
  const lona = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.82, 12, 1, true), papel());
  lona.position.y = 0.62;
  const baston = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6), madera());
  baston.position.y = 0.55;
  const punta = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.02, 0.08, 6), madera());
  punta.position.y = 1.08;
  paraguas.add(lona, baston, punta);
  paraguas.rotation.z = -0.22;
  paraguas.position.set(0.75, 0, -0.9);
  // Par de geta
  const geta = (x, giro) => {
    const s = new THREE.Group();
    const base = caja(0.13, 0.025, 0.24, madera());
    base.position.y = 0.075;
    const d1 = caja(0.12, 0.06, 0.02, madera()); d1.position.set(0, 0.03, -0.06);
    const d2 = caja(0.12, 0.06, 0.02, madera()); d2.position.set(0, 0.03, 0.07);
    const tira = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 4, 10, Math.PI), tinta());
    tira.rotation.y = Math.PI / 2; tira.position.set(0, 0.09, 0.02);
    s.add(base, d1, d2, tira);
    s.position.set(x, 0, -0.55);
    s.rotation.y = giro;
    return s;
  };
  g.add(paraguas, geta(-0.55, 0.12), geta(-0.36, -0.08));
  return { grupo: g };
}
