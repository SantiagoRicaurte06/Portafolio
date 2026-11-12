// Objetos de la sala suenos. Solo proyectan sombra hasta que la puerta se abre.
import * as THREE from 'three';

export function suenos() {
  const g = new THREE.Group();
  const roca = new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 1, side: THREE.DoubleSide });
  // Cordillera recortada, cerca del papel
  const forma = new THREE.Shape();
  const perfil = [[-1.6, 0], [-1.6, 0.35], [-1.1, 0.75], [-0.85, 0.6], [-0.4, 1.15], [-0.1, 0.8], [0.2, 0.95], [0.55, 0.55], [0.9, 0.8], [1.3, 0.45], [1.6, 0.55], [1.6, 0]];
  perfil.forEach(([x, y], i) => (i ? forma.lineTo(x, y) : forma.moveTo(x, y)));
  const montes = new THREE.Mesh(new THREE.ShapeGeometry(forma), roca);
  montes.position.set(0, 0, -0.45);
  g.add(montes);
  // Grulla en vuelo: cuerpo, cuello y dos alas que aletean
  const grulla = new THREE.Group();
  const cuerpo = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.36, 6), roca);
  cuerpo.rotation.z = -Math.PI / 2;
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.3, 5), roca);
  cuello.rotation.z = -Math.PI / 2.3; cuello.position.set(0.28, 0.06, 0);
  const patas = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.32, 4), roca);
  patas.rotation.z = Math.PI / 2.1; patas.position.set(-0.32, -0.01, 0);
  const ala = (lado) => {
    const f = new THREE.Shape(); f.moveTo(-0.12, 0); f.lineTo(0.12, 0); f.lineTo(0.02, 0.42 * lado); f.lineTo(-0.16, 0.36 * lado); f.lineTo(-0.12, 0);
    const a = new THREE.Mesh(new THREE.ShapeGeometry(f), roca);
    a.rotation.x = Math.PI / 2;
    const pivote = new THREE.Group(); pivote.add(a);
    return pivote;
  };
  const izq = ala(1); const der = ala(-1);
  grulla.add(cuerpo, cuello, patas, izq, der);
  grulla.position.set(-0.6, 1.5, -1.0);
  g.add(grulla);
  const animar = (t) => {
    const aleteo = Math.sin(t * 3.2) * 0.75;
    izq.rotation.x = aleteo; der.rotation.x = -aleteo;
    grulla.position.x = -0.9 + ((t * 0.09) % 1) * 1.9;
    grulla.position.y = 1.5 + Math.sin(t * 1.2) * 0.08;
  };
  return { grulla: grulla, grupo: g, animar, sombraViva: true };
}
