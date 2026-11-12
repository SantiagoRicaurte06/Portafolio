// Lo que vive dentro de cada sala. Desde el pasillo solo se ve su sombra en el papel;
// cuando la puerta se abre, se ven a contraluz. Todo es geometría procedural (sin descargas).
import * as THREE from 'three';

const madera = () => new THREE.MeshStandardMaterial({ color: 0x2a211a, roughness: 0.85 });
const tinta = () => new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.9 });
const papel = () => new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.95, side: THREE.DoubleSide });

function caja(an, al, fo, mat) {
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

function genkan() {
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

function obras() {
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

function taller() {
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

function camino() {
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

function servicios() {
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

function suenos() {
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

function contacto() {
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

const FABRICAS = { genkan, obras, taller, camino, servicios, suenos, contacto };

export function crearOcupantes(id) {
  const fabrica = FABRICAS[id];
  if (!fabrica) return null;
  const ocupantes = fabrica();
  ocupantes.grupo.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
      o.layers.set(1); // solo los ve la sombra; la cámara los ve cuando la puerta se abre
    }
  });
  return ocupantes;
}

export function mostrarOcupantes(ocupantes, visibles) {
  ocupantes.grupo.traverse((o) => {
    if (o.isMesh) { if (visibles) o.layers.enable(0); else o.layers.disable(0); }
  });
}
