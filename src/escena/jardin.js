// El jardín frente a la casa: orilla de piedras, piedras de descalzarse y de paso hacia el agua,
// el tōrō de piedra con su fuego, arbustos recortados (karikomi), el jardincito de 間 con su
// cerca de bambú, el bosquecillo y el shishi-odoshi, y lo que cruza muy cerca de la cámara
// (juncos y una rama de pino) para dar paralaje. Todo es silueta: lo que brilla es el muro.
import * as THREE from 'three';
import { SEPARACION as S, NIVEL_AGUA as AGUA, ORILLA } from './constantes.js';
import { matriz, geoPiedra, geoBrizna, azar } from './lote.js';

const caja = new THREE.BoxGeometry(1, 1, 1);
const esfera = new THREE.SphereGeometry(1, 12, 8);

// ── Tōrō (kasuga-dōrō) ─────────────────────────────────────────────────────
// Hexagonal, con una cara mirando a la cámara (ry = π/6). Base en y=0.
const hex = (rArriba, rAbajo, alto) => {
  const g = new THREE.CylinderGeometry(rArriba, rAbajo, alto, 6);
  g.rotateY(Math.PI / 6);
  g.translate(0, alto / 2, 0);
  return g;
};
const T = {
  kiso: hex(0.2, 0.24, 0.12),
  loto: hex(0.13, 0.18, 0.07),
  sao: (() => { const g = new THREE.CylinderGeometry(0.068, 0.078, 0.56, 10); g.translate(0, 0.28, 0); return g; })(),
  fushi: (() => { const g = new THREE.CylinderGeometry(0.088, 0.088, 0.035, 10); g.translate(0, 0.0175, 0); return g; })(),
  chudai: hex(0.22, 0.13, 0.12),
  placa: hex(0.17, 0.17, 0.03),
  kasa: hex(0.07, 0.36, 0.15),
  ala: hex(0.36, 0.36, 0.025),
  ukebana: hex(0.075, 0.06, 0.05),
  hoju: (() => { const g = new THREE.SphereGeometry(0.06, 10, 8); g.translate(0, 0.06, 0); return g; })(),
  punta: (() => { const g = new THREE.ConeGeometry(0.035, 0.07, 8); g.translate(0, 0.035, 0); return g; })(),
  warabite: new THREE.SphereGeometry(0.032, 8, 6),
};

function ponerToro(l, x, y, z) {
  const p = (geo, dy, m) => l.piedra.poner(geo, m || matriz(x, y + dy, z));
  let h = 0;
  p(T.kiso, h); h += 0.12;
  p(T.loto, h); h += 0.07;
  p(T.sao, h);
  p(T.fushi, h + 0.26);
  h += 0.56;
  p(T.chudai, h); h += 0.12;
  // Hibukuro: cuatro paneles y dos ventanas (delante y detrás) por donde se ve el fuego
  const hb = 0.25, r = 0.15, apo = r * Math.cos(Math.PI / 6);
  p(T.placa, h);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    // aristas: pilarcitos en las esquinas
    const ae = a + Math.PI / 6;
    l.piedra.poner(caja, matriz(x + Math.sin(ae) * r * 0.97, y + h + hb / 2, z + Math.cos(ae) * r * 0.97, 0, ae, 0, 0.035, hb, 0.035));
    if (k === 0 || k === 3) continue;
    l.piedra.poner(caja, matriz(x + Math.sin(a) * apo, y + h + hb / 2, z + Math.cos(a) * apo, 0, a, 0, r * 0.95, hb, 0.03));
  }
  l.fuego.poner(hex(0.1, 0.1, hb - 0.04), matriz(x, y + h + 0.02, z));
  const centroFuego = new THREE.Vector3(x, y + h + hb / 2, z);
  h += hb;
  p(T.placa, h - 0.01);
  // Kasa: el tejado de piedra con las puntas levantadas (warabite)
  p(T.ala, h + 0.01);
  p(T.kasa, h + 0.03);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 6; // esquinas
    l.piedra.poner(T.warabite, matriz(x + Math.sin(a) * 0.35, y + h + 0.06, z + Math.cos(a) * 0.35, 0, 0, 0, 1, 1.2, 1));
  }
  h += 0.18;
  p(T.ukebana, h);
  p(T.hoju, h + 0.04);
  p(T.punta, h + 0.15);
  return centroFuego;
}

// Halo y reflejo del fuego del tōrō: dos planos aditivos que titilan solos.
function materialHalo(intensidad) {
  const u = { uT: { value: 0 }, uI: { value: intensidad } };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uT; uniform float uI;
      void main(){
        vec2 d = vUv - 0.5;
        float g = exp(-dot(d, d) * 22.0);
        float f = 0.86 + 0.07 * sin(uT * 7.3) + 0.04 * sin(uT * 17.9 + 1.3) + 0.03 * sin(uT * 3.1);
        gl_FragColor = vec4(vec3(1.0, 0.62, 0.3) * g * f * uI, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return m;
}

function halosToro(centros) {
  const grupo = new THREE.Group();
  const halo = materialHalo(0.55);
  const reflejo = materialHalo(0.3);
  const tick = () => { const t = performance.now() / 1000; halo.uniforms.uT.value = t; reflejo.uniforms.uT.value = t + 0.4; };
  for (const c of centros) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), halo);
    a.position.copy(c).add(new THREE.Vector3(0, 0, 0.2));
    a.onBeforeRender = tick;
    // El reflejo en el agua: una estela vertical que viene hacia el espectador
    const geo = new THREE.PlaneGeometry(0.22, 2.4);
    geo.rotateX(-Math.PI / 2); // cara hacia arriba
    const b = new THREE.Mesh(geo, reflejo);
    b.position.set(c.x, AGUA + 0.006, c.z + 1.3);
    b.onBeforeRender = tick;
    grupo.add(a, b);
  }
  return grupo;
}

// ── Karikomi: arbustos recortados en almohadas ─────────────────────────────
function karikomi(l, x, z, tam, rnd) {
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const r = tam * (0.55 + rnd() * 0.45) * (i === 0 ? 1.15 : 1);
    const dx = i === 0 ? 0 : (rnd() - 0.5) * tam * 1.8;
    const dz = i === 0 ? 0 : (rnd() - 0.5) * tam * 0.8;
    l.verde.poner(esfera, matriz(x + dx, AGUA + r * 0.35, z + dz, 0, rnd() * 3, 0, r * 1.25, r * 0.62, r));
  }
}

// ── Bambú ──────────────────────────────────────────────────────────────────
const cana = new THREE.CylinderGeometry(1, 1, 1, 6);
cana.translate(0, 0.5, 0);
const nudo = new THREE.CylinderGeometry(1.22, 1.22, 1, 6);
const hojaBambu = geoBrizna(0.17, 0.026, 3, -0.15);

function tallo(l, x, y, z, radio, alto, inclinacion, rnd, conHojas) {
  const base = matriz(x, y, z, 0, rnd() * 6.28, inclinacion);
  l.bambu.poner(cana, base.clone().multiply(matriz(0, 0, 0, 0, 0, 0, radio, alto, radio)));
  const paso = 0.28 + rnd() * 0.12;
  for (let h = 0.18 + rnd() * 0.15; h < alto - 0.05; h += paso) {
    l.bambu.poner(nudo, base.clone().multiply(matriz(0, h, 0, 0, 0, 0, radio, 0.014, radio)));
  }
  if (!conHojas) return;
  // Ramitas con abanicos de hojas colgantes en la parte alta
  for (let h = Math.max(1.9, alto * 0.45); h < alto; h += 0.32 + rnd() * 0.25) {
    const lado = rnd() < 0.5 ? -1 : 1;
    const giro = rnd() * 6.28;
    const largo = 0.25 + rnd() * 0.25;
    const rama = base.clone().multiply(matriz(0, h, 0, 0, giro, lado * (0.9 + rnd() * 0.4)));
    l.bambu.poner(cana, rama.clone().multiply(matriz(0, 0, 0, 0, 0, 0, 0.005, largo, 0.005)));
    const punta = rama.clone().multiply(matriz(0, largo, 0));
    const hojas = 4 + Math.floor(rnd() * 4);
    for (let k = 0; k < hojas; k++) {
      // las hojas cuelgan: +y de la brizna apunta hacia abajo y afuera
      const a = Math.PI + (k / (hojas - 1) - 0.5) * 1.9 + (rnd() - 0.5) * 0.3;
      l.hojasBambu.poner(hojaBambu, punta.clone().multiply(matriz(0, 0, 0, (rnd() - 0.5) * 1.2, 0, a, 0.8 + rnd() * 0.5)));
    }
  }
}

// Cerca kenninji-gaki: cañas finas verticales apretadas, travesaños dobles atados y remate arriba.
function cerca(l, xm, z, ancho, alto, rnd) {
  for (let x = -ancho / 2; x <= ancho / 2; x += 0.052) {
    const h = alto - 0.04 + rnd() * 0.03;
    const r = 0.017 + rnd() * 0.005;
    l.bambu.poner(cana, matriz(xm + x, AGUA + 0.02, z + (rnd() - 0.5) * 0.01, 0, 0, 0, r, h, r));
    for (let k = 0; k < 2; k++) {
      l.bambu.poner(nudo, matriz(xm + x, AGUA + 0.25 + rnd() * (h - 0.4), z, 0, 0, 0, r, 0.012, r));
    }
  }
  const largo = ancho + 0.1;
  for (const y of [0.42, 1.0, alto - 0.38]) {
    for (const dz of [0.035, -0.035]) {
      l.bambu.poner(cana, matriz(xm - largo / 2, AGUA + y, z + dz, 0, 0, -Math.PI / 2, 0.026, largo, 0.026));
    }
    // ataduras de cuerda de palma, oscuras
    for (let x = -ancho / 2 + 0.2; x < ancho / 2; x += 0.45) l.verde.poner(caja, matriz(xm + x, AGUA + y, z, 0, 0, 0.5, 0.02, 0.06, 0.1));
  }
  // remate (tamabuchi) y postes de los extremos
  l.bambu.poner(cana, matriz(xm - largo / 2, AGUA + alto + 0.02, z, 0, 0, -Math.PI / 2, 0.04, largo, 0.05));
  for (const s of [-1, 1]) l.bambu.poner(cana, matriz(xm + s * (largo / 2), AGUA, z, 0, 0, 0, 0.045, alto + 0.12, 0.045));
}

// ── Rama de pino en almohadas (niwaki), muy cerca de la cámara ─────────────
const almohada = geoPiedra(3, { rugosidad: 0.28 });
const aguja = geoBrizna(0.13, 0.012, 1, 0);

function ramaPino(l, x, y, z, escala, rnd) {
  const pts = [
    new THREE.Vector3(x + 2.2 * escala, y + 1.0 * escala, z - 0.3),
    new THREE.Vector3(x + 1.1 * escala, y + 0.35 * escala, z - 0.1),
    new THREE.Vector3(x, y + 0.08 * escala, z),
    new THREE.Vector3(x - 1.0 * escala, y - 0.12 * escala, z + 0.15),
    new THREE.Vector3(x - 1.8 * escala, y + 0.05 * escala, z + 0.2),
  ];
  const curva = new THREE.CatmullRomCurve3(pts);
  l.primerPlano.poner(new THREE.TubeGeometry(curva, 28, 0.045 * escala, 5));
  const almohadas = [0.25, 0.48, 0.7, 0.92];
  for (const t of almohadas) {
    const c = curva.getPoint(t);
    const ancho = (0.32 + rnd() * 0.18) * escala;
    const alto = 0.1 * escala;
    const cy = c.y - 0.05 * escala;
    l.primerPlano.poner(almohada, matriz(c.x, cy, c.z, 0, rnd() * 3, 0, ancho, alto, ancho * 0.7));
    // flecos de agujas alrededor, en el plano que mira a la cámara
    for (let k = 0; k < 34; k++) {
      const a = (k / 34) * Math.PI * 2 + rnd() * 0.15;
      const px = c.x + Math.cos(a) * ancho * 0.92;
      const py = cy + Math.sin(a) * alto * 0.85;
      l.primerPlano.poner(aguja, matriz(px, py, c.z + (rnd() - 0.5) * 0.1, 0, 0, a - Math.PI / 2 + (rnd() - 0.5) * 0.5, escala * (0.7 + rnd() * 0.6)));
    }
  }
}

// Mata de juncos/hierba alta que sale del agua.
const briznas = [0, 1, 2, 3].map((i) => geoBrizna(1.0 + i * 0.16, 0.022, 5, 0.22 + i * 0.05));
function juncos(l, x, z, rnd, n = 26) {
  for (let i = 0; i < n; i++) {
    const g = briznas[Math.floor(rnd() * briznas.length)];
    const ry = (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 1.1; // nunca de canto a la cámara
    l.primerPlano.poner(g, matriz(x + (rnd() - 0.5) * 0.5, AGUA - 0.02, z + (rnd() - 0.5) * 0.35, (rnd() - 0.5) * 0.25, ry, (rnd() - 0.5) * 0.5, 0.6 + rnd() * 0.4));
  }
}

// ── El jardín completo ─────────────────────────────────────────────────────
// lotes: { piedra, verde, bambu, hojasBambu, primerPlano, fuego } (Lote de lote.js)
// salas: [{ x, tipo, k }] con k = índice entre las salas con muro
export function poblarJardin({ lotes: l, salas, inicio, fin, calidad }) {
  const rnd = azar(7);
  const baja = calidad?.sombra && calidad.sombra <= 512;
  const piedras = [1, 2, 3, 4, 5, 6].map((s) => geoPiedra(s, { plano: 0.3 }));
  const unaPiedra = () => piedras[Math.floor(rnd() * piedras.length)];
  const enMa = (x) => salas.some((s) => s.tipo === 'ma' && Math.abs(x - s.x) < S / 2);

  // Orilla: piedras redondas a lo largo del agua, bajo el engawa
  for (let x = inicio - 1.5; x < fin + 1.5; x += 0.38 + rnd() * 0.2) {
    const sx = 0.2 + rnd() * 0.14;
    l.piedra.poner(unaPiedra(), matriz(x, AGUA - 0.02 + rnd() * 0.04, ORILLA + 0.02 + rnd() * 0.07, 0, rnd() * 6.28, 0, sx, 0.11 + rnd() * 0.06, 0.16 + rnd() * 0.08));
  }

  const centrosFuego = [];
  for (const s of salas) {
    if (s.tipo === 'ma') {
      // Isla de roca con el tōrō, del lado derecho de la pausa (la cámara baja a mirar el agua)
      const tx = s.x + 1.35, tz = ORILLA + 0.85;
      l.piedra.poner(piedras[2], matriz(tx, AGUA - 0.05, tz, 0, 0.4, 0, 0.55, 0.24, 0.45));
      l.piedra.poner(piedras[4], matriz(tx + 0.55, AGUA - 0.04, tz + 0.25, 0, 1.3, 0, 0.26, 0.13, 0.22));
      l.piedra.poner(piedras[0], matriz(tx - 0.5, AGUA - 0.05, tz + 0.15, 0, 2.1, 0, 0.18, 0.09, 0.16));
      centrosFuego.push(ponerToro(l, tx, AGUA + 0.13, tz));
      karikomi(l, s.x - 1.7, ORILLA + 0.45, 0.42, rnd);
      karikomi(l, tx + 0.9, tz - 0.35, 0.3, rnd);

      // El jardincito detrás: suelo de musgo un escalón más abajo, cerca y bosquecillo
      l.verde.poner(caja, matriz(s.x, -0.29, -2.4, 0, 0, 0, S - 0.2, 0.04, 4.8));
      l.piedra.poner(piedras[1], matriz(s.x - 0.3, -0.27, -0.45, 0, 0.3, 0, 0.42, 0.16, 0.28)); // piedra de bajada
      l.piedra.poner(piedras[3], matriz(s.x + 0.45, -0.28, -1.05, 0, 1.0, 0, 0.26, 0.08, 0.2));
      cerca(l, s.x, -1.75, S - 0.25, 1.85, rnd);
      const tallos = baja ? 14 : 24;
      for (let i = 0; i < tallos; i++) {
        const x = s.x + (rnd() - 0.5) * (S - 0.6);
        tallo(l, x, -0.28, -2.3 - rnd() * 2.2, 0.024 + rnd() * 0.02, 4.0 + rnd() * 2.0, (rnd() - 0.5) * 0.1, rnd, true);
      }
      karikomi(l, s.x + 2.5, -1.15, 0.32, rnd);
      karikomi(l, s.x - 3.0, -1.2, 0.28, rnd);

      // Shishi-odoshi: el caño de bambú que se llena y golpea la piedra
      const sx = s.x - 2.15, sz = -0.95;
      l.piedra.poner(piedras[5], matriz(sx + 0.32, -0.29, sz, 0, 0.8, 0, 0.24, 0.12, 0.22));
      for (const dz of [-0.07, 0.07]) l.bambu.poner(cana, matriz(sx, -0.28, sz + dz, 0, 0, 0, 0.02, 0.48, 0.02));
      l.bambu.poner(cana, matriz(sx - 0.33, 0.1, sz, 0, 0, -Math.PI / 2 - 0.32, 0.042, 0.78, 0.042));
      l.bambu.poner(cana, matriz(sx - 0.5, 0.5, sz - 0.6, 0.85, 0, -0.25, 0.022, 0.75, 0.022)); // kakei, el caño que alimenta
      continue;
    }

    // Piedra de descalzarse (kutsunugi-ishi) y piedras de paso hacia el agua en algunas salas
    if (s.k % 3 === 0) {
      l.piedra.poner(piedras[0], matriz(s.x + 0.15, -0.3, ORILLA + 0.18, 0, 0.1, 0, 0.5, 0.17, 0.3));
      const pasos = [[0.55, 0.75], [0.0, 1.3], [0.5, 1.9], [-0.1, 2.5]];
      pasos.forEach(([dx, dz], i) => {
        l.piedra.poner(piedras[(i + s.k) % 6], matriz(s.x + dx, AGUA - 0.06, ORILLA + dz, 0, rnd() * 6.28, 0, 0.24 + rnd() * 0.06, 0.1, 0.19 + rnd() * 0.04));
      });
    }
  }

  // Karikomi en los extremos y al pie de algunos pilares
  karikomi(l, inicio + 0.9, ORILLA + 0.5, 0.45, rnd);
  karikomi(l, fin - 0.9, ORILLA + 0.5, 0.45, rnd);
  for (let i = 1; i < salas.length; i += baja ? 6 : 3) {
    const x = (i + 0.5) * S;
    if (!enMa(x)) karikomi(l, x + 0.25, ORILLA + 0.4, 0.3, rnd);
  }

  // Primer plano: juncos entre sala y sala y una rama de pino que cruza arriba (solo al caminar).
  // En calidad baja (celulares) se omite: es lo más caro del jardín y casi no se ve en vertical.
  if (baja) return { halos: halosToro(centrosFuego) };
  juncos(l, inicio + 3.2, 5.6, rnd, 30);
  for (let i = 0; i < salas.length - 1; i++) {
    const x = salas[i].x + S * 0.6;
    if (i % 2 === 0) juncos(l, x + (rnd() - 0.5) * 0.6, 5.3 + rnd() * 0.5, rnd);
    if (i % 3 === 1) ramaPino(l, x + 0.3, 2.05, 4.6, 1, rnd);
  }
  juncos(l, fin - 1.5, 5.5, rnd, 30);

  return { halos: halosToro(centrosFuego) };
}
