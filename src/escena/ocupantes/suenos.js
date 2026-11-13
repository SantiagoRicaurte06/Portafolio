// Objetos de la sala suenos: los Alpes como un teatro de papel recortado, en tres capas a
// distintas profundidades, y una grulla que vuela entre ellas. Una sombra no suma grises (o hay
// sombra o no la hay), así que las dos capas de atrás son franjas colgadas de hilos con un hueco
// de "niebla" debajo: en el papel se leen tres cordilleras separadas por bandas de luz.
// La de atrás, más cerca de la linterna, sale más grande, más alta y de perfil más suave; la
// de delante, pegada al papel, es la más nítida y la más dentada. Al mover la linterna, las capas
// se desplazan a distinto ritmo (paralaje).
import * as THREE from 'three';
import { tinta, fusionar, hiloEntre } from './comun.js';

const TECHO = 2.85;

// Silueta de una cordillera entre x0 y x1: picos dados como [x, altura, anchura] sobre una base,
// más un serrucho fino que da las crestas (más fuerte en la capa cercana).
function cresta(x, picos, base, dentado, semilla) {
  let y = base;
  for (const [px, alto, ancho] of picos) {
    const d = Math.abs(x - px) / ancho;
    y = Math.max(y, base + alto * Math.max(0, 1 - d) ** 1.35);
  }
  return y + dentado * (Math.sin(x * 37 + semilla) * 0.6 + Math.sin(x * 83 + semilla * 2) * 0.4);
}

// Capa colgada: franja entre la cresta y un borde inferior ondulado (la niebla).
// Si grosor es null, la capa baja hasta el suelo.
function capa({ x0, x1, picos, base, dentado, semilla, grosor, pasos }) {
  const forma = new THREE.Shape();
  const arriba = [];
  for (let i = 0; i <= pasos; i++) {
    const x = x0 + ((x1 - x0) * i) / pasos;
    arriba.push([x, cresta(x, picos, base, dentado, semilla)]);
  }
  arriba.forEach(([x, y], i) => (i ? forma.lineTo(x, y) : forma.moveTo(x, y)));
  if (grosor === null) {
    forma.lineTo(x1, 0);
    forma.lineTo(x0, 0);
  } else {
    for (let i = pasos; i >= 0; i -= 2) {
      const [x, y] = arriba[i];
      const niebla = grosor * (0.75 + 0.25 * Math.sin(x * 4.1 + semilla)) + (y - base) * 0.35;
      forma.lineTo(x, y - niebla);
    }
  }
  return new THREE.ShapeGeometry(forma);
}

// Ala de dos segmentos: el brazo (ancho, con las secundarias) y la mano (las primarias en dedos).
// Se dibujan en el plano XZ, hacia +z; el ala izquierda es su espejo.
function alaGeo(puntos, lado) {
  const f = new THREE.Shape();
  puntos.forEach(([x, z], i) => (i ? f.lineTo(x, z * lado) : f.moveTo(x, z * lado)));
  const geo = new THREE.ShapeGeometry(f);
  geo.rotateX(Math.PI / 2); // (x, y) de la forma → (x, z) del mundo
  return geo;
}
// Con rotateX(π/2) la y de la forma pasa a z = +y. Brazo: de 0 a 0.15 hacia fuera.
const BRAZO = [[0.07, 0], [0.05, 0.15], [-0.05, 0.15], [-0.11, 0.1], [-0.12, 0.04], [-0.09, 0]];
// Mano: de 0 a 0.2 hacia fuera, con cinco primarias separadas en la punta.
const MANO = [[0.05, 0], [0.03, 0.12], [0.0, 0.2], [-0.02, 0.165], [-0.035, 0.19], [-0.045, 0.15], [-0.06, 0.165], [-0.065, 0.125], [-0.08, 0.13], [-0.075, 0.08], [-0.05, 0]];

function grulla(material) {
  const ave = new THREE.Group();
  // Cuerpo, cuello en S suave, cabeza con pico, cola corta y patas largas estiradas atrás: una sola malla.
  const cuerpo = new THREE.SphereGeometry(1, 10, 6).scale(0.13, 0.045, 0.05);
  const cuello = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, 0.01, 0), new THREE.Vector3(0.2, 0.035, 0), new THREE.Vector3(0.3, 0.03, 0), new THREE.Vector3(0.37, 0.045, 0),
  ]), 10, 0.011, 5, false);
  const cabeza = new THREE.SphereGeometry(0.02, 6, 4).scale(1.3, 1, 1).translate(0.38, 0.048, 0);
  const pico = new THREE.ConeGeometry(0.008, 0.08, 4).rotateZ(-Math.PI / 2).translate(0.435, 0.044, 0);
  const cola = new THREE.ConeGeometry(0.03, 0.08, 4).rotateZ(Math.PI / 2).scale(1, 0.6, 1).translate(-0.15, 0.005, 0);
  const pata = (z) => fusionar([
    hiloEntre([-0.06, -0.02, z], [-0.26, -0.035, z], 0.005),
    hiloEntre([-0.26, -0.035, z], [-0.43, -0.04, z], 0.0035),
    hiloEntre([-0.43, -0.04, z], [-0.47, -0.03, z], 0.003),
  ]);
  ave.add(new THREE.Mesh(fusionar([cuerpo, cuello, cabeza, pico, cola, pata(0.012), pata(-0.012)]), material));

  // Alas: hombro (gira sobre el eje del cuerpo) y codo (la mano sigue al brazo con retraso).
  const alas = [1, -1].map((lado) => {
    const hombro = new THREE.Group();
    hombro.position.set(0.02, 0.025, 0.03 * lado);
    hombro.add(new THREE.Mesh(alaGeo(BRAZO, lado), material));
    const codo = new THREE.Group();
    codo.position.set(0, 0, 0.15 * lado);
    codo.add(new THREE.Mesh(alaGeo(MANO, lado), material));
    hombro.add(codo);
    return { lado, hombro, codo };
  });
  for (const a of alas) ave.add(a.hombro);
  return { ave, alas };
}

export function suenos() {
  const g = new THREE.Group();
  const roca = new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 1, side: THREE.DoubleSide });

  // Alturas pensadas para la linterna a ~0.95 m: en el papel las crestas caen a ~1.6 m (atrás),
  // ~1.2 m (en medio) y ~0.75 m (delante), con bandas de luz entre ellas.
  const atras = new THREE.Mesh(capa({ x0: -0.95, x1: 0.95, base: 1.13, grosor: 0.04, dentado: 0.0015, semilla: 1.1, pasos: 40,
    picos: [[-0.7, 0.07, 0.3], [-0.3, 0.12, 0.28], [0.12, 0.09, 0.25], [0.55, 0.13, 0.3], [0.85, 0.06, 0.2]] }), roca);
  atras.position.z = -1.45;
  const medio = new THREE.Mesh(capa({ x0: -1.5, x1: 1.5, base: 0.95, grosor: 0.06, dentado: 0.003, semilla: 2.7, pasos: 56,
    picos: [[-1.2, 0.08, 0.35], [-0.65, 0.14, 0.32], [-0.1, 0.1, 0.3], [0.4, 0.15, 0.28], [1.0, 0.11, 0.35]] }), roca);
  medio.position.z = -0.95;
  // Delante: un Matterhorn torcido y sus vecinos, hasta el suelo.
  const cerca = new THREE.Mesh(capa({ x0: -1.95, x1: 1.95, base: 0.42, grosor: null, dentado: 0.006, semilla: 4.2, pasos: 80,
    picos: [[-1.5, 0.16, 0.45], [-0.75, 0.24, 0.4], [0.32, 0.4, 0.3], [0.5, 0.22, 0.35], [1.35, 0.18, 0.4]] }), roca);
  cerca.position.z = -0.42;
  // Las dos capas de atrás cuelgan del techo con hilos casi invisibles.
  const hilos = new THREE.Mesh(fusionar([
    ...[-0.6, 0.6].map((x) => hiloEntre([x, TECHO, -1.45], [x, 1.18, -1.45], 0.0015)),
    ...[-1.4, 1.4].map((x) => hiloEntre([x, TECHO, -0.95], [x, 1.0, -0.95], 0.0015)),
  ]), tinta());
  g.add(atras, medio, cerca, hilos);

  // Grulla en vuelo: da vueltas por la sala en un óvalo, gira con alabeo, alterna aleteos y planeos.
  const { ave, alas } = grulla(roca);
  g.add(ave);

  ave.rotation.order = 'YXZ'; // rumbo, luego alabeo (x) y cabeceo (z) sobre el eje del cuerpo
  const A = 1.25;
  const B = 0.3;
  let ang = 0;
  let fase = 0;
  let altura = 1.5;
  let vy = 0;
  const animar = (t, dt = 0.016) => {
    // Energía del aleteo: ráfagas de aletazos irregulares y planeos largos
    const n = Math.sin(t * 0.43) * 0.6 + Math.sin(t * 0.71 + 2.1) * 0.4 + Math.sin(t * 1.9) * 0.15;
    const energia = THREE.MathUtils.smoothstep(n, -0.15, 0.35);
    fase += dt * (5.2 + 1.6 * energia) * (0.25 + 0.75 * energia);
    const amp = 0.95 * energia;
    const golpe = Math.sin(fase);
    const planeo = (1 - energia) * 0.12; // en planeo las alas quedan algo levantadas, en V abierta
    for (const a of alas) {
      a.hombro.rotation.x = -a.lado * (golpe * amp * 0.55 + planeo);
      a.codo.rotation.x = -a.lado * (Math.sin(fase - 0.9) * amp * 0.5 - planeo * 0.6);
    }
    // Sube cuando aletea, baja despacio planeando
    vy += ((energia - 0.42) * 0.12 - vy) * Math.min(1, dt * 1.5);
    altura = THREE.MathUtils.clamp(altura + vy * dt, 1.36, 1.66);
    // Recorrido en óvalo a velocidad constante (sin saltos): largo en x para que en el papel
    // cruce la puerta de lado a lado; en los extremos gira hacia el fondo de la sala.
    const vx0 = Math.cos(ang) * A;
    const vz0 = -Math.sin(ang) * B;
    const rapidez = Math.hypot(vx0, vz0);
    ang += (dt * (0.11 + 0.03 * energia)) / rapidez;
    ave.position.set(Math.sin(ang) * A, altura + golpe * amp * 0.012, -1.0 + Math.cos(ang) * B);
    ave.rotation.y = Math.atan2(-vz0, vx0);
    // Alabeo hacia dentro del giro (casi nulo en las rectas) y cabeceo con la subida
    const curvatura = (A * B) / rapidez ** 3;
    ave.rotation.x = -0.55 * (curvatura / (curvatura + 2));
    ave.rotation.z = vy * 1.2 - 0.04;
  };
  return { grupo: g, animar, sombraViva: true };
}
