// Objetos de la sala contacto: dos grullas de origami (orizuru) colgadas de hilos que giran
// despacio, y una mesita baja con una carta cerrada con un sello rojo. Las grullas están
// plegadas de verdad: cuerpo en diamante, cuello y cola en punta, la cabeza doblada hacia abajo
// y cada ala con su pliegue central en V invertida. Al girar, su sombra pasa del perfil (cuello
// y cola alzados) a las alas abiertas.
import * as THREE from 'three';
import { madera, tinta, fusionar, hiloEntre } from './comun.js';

const TECHO = 2.85;
const SELLO = 0xb3262c;

function triangulos(lista) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(lista.flat(2), 3));
  geo.computeVertexNormals();
  return geo;
}

// Puntos del cuerpo (x hacia el cuello, y arriba, z a un lado). Escala 1 ≈ 52 cm de punta a punta.
const espejo = ([x, y, z]) => [x, y, -z];
const F = [0.075, 0, 0];      // arista delantera del cuerpo
const K = [-0.075, 0, 0];     // arista trasera
const T = [0, 0.025, 0];      // lomo, donde nacen las alas (y de donde cuelga el hilo)
const B = [0, -0.07, 0];      // vientre en punta
const L = [0, -0.015, 0.042]; // flanco
const NB = [0.03, -0.05, 0.006];   // base del cuello (doble capa: un lado de la V)
const NT = [0.22, 0.155, 0];       // donde el cuello se dobla en cabeza
const NH = [0.205, 0.14, 0.004];   // el pliegue invertido de la cabeza
const H = [0.27, 0.122, 0];        // pico
const CB = [-0.03, -0.05, 0.006];  // base de la cola
const CT = [-0.25, 0.165, 0];      // punta de la cola

function cuerpoGeo() {
  const lado = [
    [F, T, L], [F, L, B], [K, L, T], [K, B, L],     // cuerpo en diamante
    [NB, F, NT], [NB, NT, NH], [NH, NT, H],         // cuello y cabeza doblada
    [CB, K, CT],                                     // cola
  ];
  const otro = lado.map((tri) => tri.map(espejo).reverse());
  return triangulos([...lado, ...otro]);
}

// Ala: dos triángulos que comparten el pliegue central (de la raíz a la punta) y caen hacia
// los bordes de ataque y de salida. Relativa al lomo T, que es el eje del aleteo.
function alaGeo(lado) {
  const r = (p) => [p[0] - T[0], p[1] - T[1], (p[2] - T[2]) * lado];
  const W1 = r([0.065, 0.012, 0.006]);
  const W2 = r([-0.065, 0.012, 0.006]);
  const C0 = r([0, 0.034, 0.006]);
  const M = r([-0.012, 0.072, 0.15]);   // segundo pliegue a media ala: la punta sube un poco más
  const M1 = r([0.03, 0.05, 0.14]);
  const M2 = r([-0.06, 0.052, 0.15]);
  const P = r([-0.035, 0.1, 0.27]);     // punta, algo hacia atrás
  const tris = [[W1, C0, M], [W1, M, M1], [C0, W2, M], [W2, M2, M], [M1, M, P], [M, M2, P]];
  return triangulos(lado > 0 ? tris : tris.map((t) => [...t].reverse()));
}

function orizuru(material, escala, largoHilo) {
  const pivote = new THREE.Group();   // en el techo: se mece apenas
  const hilo = new THREE.Mesh(hiloEntre([0, 0, 0], [0, -largoHilo, 0], 0.0015), tinta());
  const ave = new THREE.Group();
  ave.add(new THREE.Mesh(cuerpoGeo(), material));
  const alas = [1, -1].map((lado) => {
    const ala = new THREE.Mesh(alaGeo(lado), material);
    ala.position.set(...T);
    ala.userData.lado = lado;
    ave.add(ala);
    return ala;
  });
  ave.scale.setScalar(escala);
  ave.position.y = -largoHilo - T[1] * escala;
  pivote.add(hilo, ave);
  return { pivote, ave, alas };
}

export function contacto() {
  const g = new THREE.Group();
  const papelOrigami = new THREE.MeshStandardMaterial({ color: 0xece5d6, roughness: 0.9, side: THREE.DoubleSide, flatShading: true });

  const grande = orizuru(papelOrigami, 1.3, TECHO - 1.3);
  grande.pivote.position.set(-0.35, TECHO, -1.0);
  const chica = orizuru(papelOrigami, 0.65, TECHO - 1.45);
  chica.pivote.position.set(0.55, TECHO, -1.2);
  g.add(grande.pivote, chica.pivote);

  // Mesita baja con una carta: el sobre con la solapa entreabierta y el sello.
  const m = madera();
  const pata = (x, z) => new THREE.BoxGeometry(0.03, 0.27, 0.03).translate(x, 0.135, z);
  const mesa = new THREE.Mesh(fusionar([
    new THREE.BoxGeometry(0.5, 0.03, 0.32).translate(0, 0.285, 0),
    pata(-0.22, -0.13), pata(0.22, -0.13), pata(-0.22, 0.13), pata(0.22, 0.13),
  ]), m);
  mesa.position.set(0.72, 0, -0.75);
  const sobre = new THREE.Group();
  const papelCarta = new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.95, side: THREE.DoubleSide });
  const solapa = new THREE.BufferGeometry();
  solapa.setAttribute('position', new THREE.Float32BufferAttribute([-0.1, 0, 0, 0.1, 0, 0, 0, 0, 0.065], 3));
  solapa.rotateX(-0.6);       // entreabierta, girando sobre el borde de atrás
  solapa.translate(0, 0.003, -0.06);
  sobre.add(new THREE.Mesh(fusionar([new THREE.BoxGeometry(0.2, 0.004, 0.12), solapa]), papelCarta));
  const sello = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.002, 12), new THREE.MeshStandardMaterial({ color: SELLO, roughness: 0.7 }));
  sello.position.set(0, 0.004, 0.01);
  sobre.add(sello);
  sobre.position.set(0.68, 0.302, -0.72);
  sobre.rotation.y = 0.25;
  g.add(mesa, sobre);

  let respiro = 0;
  const ocupantes = {
    grupo: g,
    sombraViva: true,
    animar(t, dt = 0.016) {
      // Giran despacio sobre el hilo, en sentidos opuestos, y se mecen apenas
      grande.ave.rotation.y = t * 0.16 + Math.sin(t * 0.37) * 0.35;
      chica.ave.rotation.y = -t * 0.22 + Math.sin(t * 0.51 + 2) * 0.3;
      grande.pivote.rotation.z = Math.sin(t * 0.6) * 0.012;
      grande.pivote.rotation.x = Math.sin(t * 0.45 + 1) * 0.01;
      chica.pivote.rotation.z = Math.sin(t * 0.8 + 3) * 0.015;
      // Con la puerta abierta la grulla grande "respira": un aleteo muy leve
      respiro += ((ocupantes.visibles ? 1 : 0.2) - respiro) * Math.min(1, dt * 1.5);
      const ala = respiro * (Math.sin(t * 1.7) * 0.07 + Math.sin(t * 0.9) * 0.03);
      for (const a of grande.alas) a.rotation.x = -a.userData.lado * ala;
    },
  };
  return ocupantes;
}
