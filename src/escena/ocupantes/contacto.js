// Objetos de la sala contacto. Solo proyectan sombra hasta que la puerta se abre.
import * as THREE from 'three';
import { tinta } from './comun.js';

export function contacto() {
  const g = new THREE.Group();
  const p = new THREE.MeshStandardMaterial({ color: 0xece5d6, roughness: 0.9, side: THREE.DoubleSide, flatShading: true });
  // Grulla de origami: triángulos planos
  const tri = (pts) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, p);
  };
  const origami = (escala) => {
    const o = new THREE.Group();
    o.add(
      tri([[0, 0, 0], [-0.35, 0.42, 0.02], [-0.05, 0.12, 0.06]]),   // ala izquierda
      tri([[0, 0, 0], [0.38, 0.5, -0.02], [0.06, 0.12, 0.06]]),     // ala derecha
      tri([[-0.2, -0.05, 0], [0.2, -0.05, 0], [0, 0.1, 0.08]]),     // cuerpo
      tri([[0.2, -0.05, 0], [0.42, 0.22, 0], [0.24, -0.02, 0.02]]), // cuello
      tri([[0.42, 0.22, 0], [0.5, 0.2, 0], [0.43, 0.17, 0.01]]),    // cabeza
      tri([[-0.2, -0.05, 0], [-0.42, 0.16, 0], [-0.24, -0.02, 0.02]]), // cola
    );
    o.scale.setScalar(escala);
    return o;
  };
  const grande = origami(1.4); grande.position.set(-0.2, 1.1, -0.85);
  const chica = origami(0.8); chica.position.set(0.55, 1.55, -1.05);
  const hilo = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.9, 3), tinta());
  hilo.position.set(0.55, 2.0, -1.05);
  g.add(grande, chica, hilo);
  const animar = (t) => {
    grande.rotation.y = Math.sin(t * 0.5) * 0.5;
    grande.position.y = 1.1 + Math.sin(t * 0.8) * 0.05;
    chica.rotation.y = t * 0.4;
  };
  return { grupo: g, animar, sombraViva: true };
}
