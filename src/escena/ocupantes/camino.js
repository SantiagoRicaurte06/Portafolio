// Objetos de la sala camino. Solo proyectan sombra hasta que la puerta se abre.
import * as THREE from 'three';
import { formaHojaMomiji } from './comun.js';

export function camino() {
  const g = new THREE.Group();
  const corteza = new THREE.MeshStandardMaterial({ color: 0x1d1714, roughness: 1 });
  // Tronco y ramas como tubos sobre curvas
  const rama = (puntos, r) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p))), 20, r, 6, false), corteza);
  g.add(rama([[0, 0, -1.2], [0.08, 0.5, -1.15], [-0.05, 1.0, -1.1], [0.1, 1.45, -1.0]], 0.055));
  g.add(rama([[0.0, 0.95, -1.1], [-0.4, 1.25, -1.0], [-0.75, 1.45, -0.9]], 0.025));
  g.add(rama([[0.05, 1.2, -1.05], [0.45, 1.5, -0.95], [0.8, 1.62, -0.9]], 0.022));
  g.add(rama([[0.1, 1.4, -1.0], [0.1, 1.75, -0.95]], 0.018));
  // Copa: cientos de hojas instanciadas
  const geo = formaHojaMomiji(0.065);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8e2a22, roughness: 0.8, side: THREE.DoubleSide });
  const cuantas = 520;
  const copa = new THREE.InstancedMesh(geo, mat, cuantas);
  const o = new THREE.Object3D();
  const centros = [[-0.6, 1.5, -0.95, 0.45], [0.6, 1.65, -0.95, 0.5], [0.05, 1.85, -1.0, 0.5], [-0.15, 1.35, -1.0, 0.35], [0.35, 1.35, -0.95, 0.35]];
  for (let i = 0; i < cuantas; i++) {
    const [cx, cy, cz, r] = centros[i % centros.length];
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    const d = r * Math.cbrt(Math.random());
    o.position.set(cx + d * Math.sin(b) * Math.cos(a), cy + d * Math.cos(b) * 0.55, cz + d * Math.sin(b) * Math.sin(a) * 0.4);
    o.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    o.scale.setScalar(0.7 + Math.random() * 0.6);
    o.updateMatrix();
    copa.setMatrixAt(i, o.matrix);
  }
  g.add(copa);
  // Hojas que caen dentro de la sala (su sombra cruza el papel)
  const caen = new THREE.InstancedMesh(geo, mat, 14);
  const estado = Array.from({ length: 14 }, () => ({ x: (Math.random() - 0.5) * 1.8, y: 1 + Math.random() * 1.2, z: -0.5 - Math.random() * 0.7, v: 0.12 + Math.random() * 0.1, f: Math.random() * 6 }));
  g.add(caen);
  const animar = (t, dt) => {
    estado.forEach((h, i) => {
      h.y -= h.v * dt;
      if (h.y < 0) { h.y = 1.9 + Math.random() * 0.4; h.x = (Math.random() - 0.5) * 1.8; }
      o.position.set(h.x + Math.sin(t * 1.3 + h.f) * 0.18, h.y, h.z);
      o.rotation.set(t * 1.7 + h.f, t * 1.1 + h.f, t * 0.6);
      o.scale.setScalar(1);
      o.updateMatrix();
      caen.setMatrixAt(i, o.matrix);
    });
    caen.instanceMatrix.needsUpdate = true;
  };
  return { grupo: g, animar, sombraViva: true };
}
