// La casa (sukiya-zukuri): un muro de shōji a lo largo del pasillo, una sala detrás de cada par de
// puertas, pilares achaflanados sobre piedras base, vigas, el alero con sus canecillos y el borde de
// tejas, la cadena de lluvia, el engawa sobre el agua y el jardín (jardin.js).
// Lo fijo se funde por material en pocas mallas (lote.js): la casa entera son ~60 draw calls.
import * as THREE from 'three';
import { SEPARACION as S, ALTO_PUERTA, ANCHO_HOJA, FONDO_SALA, NIVEL_AGUA as AGUA, ORILLA } from './constantes.js';
import { crearMaterialPapel } from './papel.js';
import { crearOcupantes } from './ocupantes.js';
import { WASHI_GLSL } from './washi.js';
import { Lote, matriz, geoChaflan, geoPiedra } from './lote.js';
import { geoCalado } from './calado.js';
import { poblarJardin } from './jardin.js';

export const MAX_SALAS = 10;

// Luz que sale de cada sala, para el piso y el agua (sin luces reales: solo matemática).
export const BRILLO_GLSL = /* glsl */`
uniform float uSalasX[${MAX_SALAS}];
uniform float uSalasP[${MAX_SALAS}];
uniform float uSalasA[${MAX_SALAS}];
float brilloMuro(float x){
  float b = 0.0;
  for (int i = 0; i < ${MAX_SALAS}; i++){
    float d = (x - uSalasX[i]);
    b += uSalasP[i] * (exp(-d * d / 7.0) * 0.8 + exp(-d * d / 0.9) * uSalasA[i] * 1.6);
  }
  return b;
}
`;

// Materiales: B/N, madera oscura y piedra. El único color es el ámbar del fuego.
const maderaOscura = new THREE.MeshStandardMaterial({ color: 0x1b1612, roughness: 0.82 });
const MAT = {
  madera: maderaOscura,
  piedra: new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.97 }),
  tejas: new THREE.MeshStandardMaterial({ color: 0x242526, roughness: 0.5, metalness: 0.15 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x35312c, roughness: 0.4, metalness: 0.35 }),
  verde: new THREE.MeshStandardMaterial({ color: 0x0f100f, roughness: 1 }),
  bambu: new THREE.MeshStandardMaterial({ color: 0x2b2a26, roughness: 0.6 }),
  hojasBambu: new THREE.MeshStandardMaterial({ color: 0x1b1c1a, roughness: 0.9, side: THREE.DoubleSide }),
  primerPlano: new THREE.MeshBasicMaterial({ color: 0x040404, side: THREE.DoubleSide }),
  fuego: new THREE.MeshBasicMaterial({ color: 0xc98445 }),
};

const caja = new THREE.BoxGeometry(1, 1, 1);

// Alero: baja hacia fuera desde el muro (z=0) hasta el borde de tejas.
const ALERO_Y = 3.52;
const ALERO_PENDIENTE = 0.165;
const ALERO_FIN = 2.85;
const ALERO_ANG = Math.atan(ALERO_PENDIENTE);
const alero = (z) => ALERO_Y - z * ALERO_PENDIENTE;

// Marco de un panel (dos montantes, travesaño arriba y zócalo abajo) en un lote, sobre la matriz `base`.
function ponerMarco(lote, ancho, alto, base, grosor = 0.045, fondo = 0.05) {
  const lados = [
    [grosor, alto, -ancho / 2 + grosor / 2, alto / 2],
    [grosor, alto, ancho / 2 - grosor / 2, alto / 2],
    [ancho, grosor, 0, alto - grosor / 2],
    [ancho, grosor * 1.6, 0, grosor * 0.8],
  ];
  for (const [an, al, x, y] of lados) lote.poner(caja, base.clone().multiply(matriz(x, y, 0, 0, 0, 0, an, al, fondo)));
}

function planoPapel(ancho, alto) {
  const geo = new THREE.PlaneGeometry(ancho, alto);
  geo.translate(0, alto / 2, 0);
  return geo;
}

// Hoja corredera: papel y marco (el marco fundido en una sola malla).
function hojaShoji(ancho, alto, material) {
  const g = new THREE.Group();
  const hoja = new THREE.Mesh(planoPapel(ancho, alto), material);
  hoja.receiveShadow = true;
  const marco = new Lote();
  ponerMarco(marco, ancho, alto, new THREE.Matrix4());
  g.add(hoja, marco.malla(maderaOscura));
  return g;
}

const pisoVertex = 'varying vec3 vMundo; void main(){ vec4 m = modelMatrix * vec4(position,1.0); vMundo = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }';

// Cede el hilo principal entre salas: varias tareas cortas en vez de una larga
const ceder = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

export async function crearCasa({ salas, washi, calidad }) {
  const casa = new THREE.Group();
  const total = salas.length;
  const largo = total * S;
  const inicio = -S / 2 - 2;
  const fin = (total - 1) * S + S / 2 + 2;
  const L = fin - inicio, cx = (inicio + fin) / 2;

  const uniformesBrillo = {
    uSalasX: { value: new Array(MAX_SALAS).fill(-999) },
    uSalasP: { value: new Array(MAX_SALAS).fill(0) },
    uSalasA: { value: new Array(MAX_SALAS).fill(0) },
  };

  const lotes = Object.fromEntries(Object.keys(MAT).map((k) => [k, new Lote()]));
  const { madera, piedra, tejas, metal } = lotes;
  const viga = (largoV, alto, fondo, x, y, z, rx = 0) => madera.poner(caja, matriz(x, y, z, rx, 0, 0, largoV, alto, fondo));

  // ── Piso del engawa: tablas a lo largo, con juntas de testa escalonadas ──
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(L, 1.9, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: { ...uniformesBrillo, uTiempo: { value: 0 } },
      vertexShader: pisoVertex,
      fragmentShader: `varying vec3 vMundo; ${WASHI_GLSL} ${BRILLO_GLSL}
        void main(){
          float fila = vMundo.z / 0.19;
          float tabla = floor(fila);
          // cada tabla mide 3,6 m y empieza en otro sitio que su vecina
          const float LARGO = 3.6;
          float sx = (vMundo.x + hashW(vec2(tabla, 7.0)) * LARGO) / LARGO;
          float pieza = floor(sx);
          float tono = hashW(vec2(tabla, pieza + 3.0));
          float veta = sin((vMundo.x * 0.9 + fbmW(vec2(vMundo.x * 0.25, tabla * 4.0 + pieza * 1.7)) * 2.5) * 9.0) * 0.5 + 0.5;
          float fz = fract(fila);
          float fx = fract(sx) * LARGO;
          float aa = fwidth(vMundo.z) * 1.5 + 0.004;
          float junta = smoothstep(0.0, aa, fz * 0.19) * smoothstep(0.0, aa, (1.0 - fz) * 0.19);
          float aax = fwidth(vMundo.x) * 1.5 + 0.003;
          junta *= smoothstep(0.0, aax, fx) * smoothstep(0.0, aax, LARGO - fx);
          // canto redondeado de cada tabla: un filo más claro hacia la luz
          float canto = smoothstep(0.75, 0.97, fz) * (1.0 - smoothstep(0.97, 1.0, fz));
          vec3 base = vec3(0.085, 0.068, 0.055) * (0.8 + 0.35 * tono) * (0.85 + 0.25 * veta) * mix(0.3, 1.0, junta);
          float luz = brilloMuro(vMundo.x) * exp(-vMundo.z * 1.1);
          vec3 color = base * (0.35 + luz * vec3(1.9, 1.45, 1.0)) * (1.0 + canto * 0.18);
          // brillo pulido: el muro se refleja en la madera
          color += vec3(1.0, 0.75, 0.45) * luz * 0.05 * smoothstep(0.4, 1.0, veta);
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(cx, 0, 0.95);
  casa.add(piso);

  // Engawa: larguero de borde (kamachi), postes cortos (tsuka) sobre piedras y el hueco oscuro debajo
  viga(L, 0.12, 0.12, cx, -0.064, ORILLA - 0.08);
  const tsuka = geoChaflan(0.085, 0.085, 0.36, 0.012);
  const tsukaIshi = geoPiedra(11, { plano: 0.35 });
  for (let x = inicio + S / 8; x < fin; x += S / 4) {
    madera.poner(tsuka, matriz(x, -0.48, ORILLA - 0.17));
    piedra.poner(tsukaIshi, matriz(x, -0.5, ORILLA - 0.17, 0, x, 0, 0.11, 0.06, 0.1));
  }
  const hueco = new THREE.PlaneGeometry(1, 1);
  lotes.primerPlano.poner(hueco, matriz(cx, -0.35, 1.45, 0, 0, 0, L, 0.5, 1));

  // ── Pilares achaflanados sobre piedras base (soseki) ─────────────────────
  const pilarFrente = geoChaflan(0.15, 0.15, 3.06, 0.022);
  const pilarAtras = geoChaflan(0.16, 0.16, 3.56, 0.024);
  for (let i = 0; i <= total; i++) {
    const x = (i - 0.5) * S;
    madera.poner(pilarAtras, matriz(x, -0.06, 0.06));
    madera.poner(pilarFrente, matriz(x, -0.14, 1.98));
    piedra.poner(geoPiedra(20 + i, { plano: 0.35, rugosidad: 0.15 }), matriz(x, -0.22, 1.99, 0, i * 1.3, 0, 0.21, 0.1, 0.19));
    viga(0.1, 0.14, 1.9, x, 3.0, 1.02); // tsunagi: une el pilar del muro con el del borde
  }

  // ── Vigas ────────────────────────────────────────────────────────────────
  viga(L, 0.13, 0.14, cx, ALTO_PUERTA + 0.065, 0.03); // kamoi (riel alto de las puertas)
  viga(L, 0.16, 0.16, cx, 3.0, 0.05);                 // nageshi
  viga(L, 0.16, 0.16, cx, 3.0, 1.98);                 // keta: la viga del borde que carga el alero

  // ── Alero: tablas del techo, canecillos (taruki) en ritmo, testero y tejas ──
  const zm = ALERO_FIN / 2, largoAlero = ALERO_FIN / Math.cos(ALERO_ANG);
  viga(L, 0.025, largoAlero, cx, alero(zm), zm, ALERO_ANG);
  for (let x = inicio + 0.12; x < fin; x += 0.42) {
    madera.poner(caja, matriz(x, alero(zm) - 0.055, zm + 0.02, ALERO_ANG, 0, 0, 0.06, 0.085, largoAlero + 0.04));
  }
  viga(L, 0.1, 0.05, cx, alero(ALERO_FIN) - 0.03, ALERO_FIN + 0.035); // kayaoi (testero)
  const zt = ALERO_FIN - 0.2;
  tejas.poner(caja, matriz(cx, alero(zt) + 0.04, zt, ALERO_ANG, 0, 0, L, 0.04, 0.55));
  const teja = new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8);
  const tomoe = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10);
  const rxTeja = Math.PI / 2 + ALERO_ANG;
  for (let x = inicio + 0.1; x < fin; x += 0.27) {
    tejas.poner(teja, matriz(x, alero(zt) + 0.085, zt, rxTeja));
    tejas.poner(tomoe, matriz(x, alero(zt + 0.29) + 0.085, zt + 0.29, rxTeja)); // tapa redonda de la teja
  }

  // Canalón y cadenas de lluvia (kusari-doi) que bajan a una piedra en el agua
  const zCanal = ALERO_FIN + 0.1, yCanal = alero(ALERO_FIN) - 0.1;
  metal.poner(new THREE.CylinderGeometry(0.045, 0.045, 1, 8), matriz(cx, yCanal, zCanal, 0, 0, Math.PI / 2, 1, L, 1));
  const copa = new THREE.CylinderGeometry(0.034, 0.02, 0.062, 8);
  const eslabon = new THREE.BoxGeometry(0.008, 0.06, 0.008);
  const cadenas = [1, total - 2].filter((i, k, a) => i > 0 && a.indexOf(i) === k).map((i) => (i - 0.5) * S + 0.45);
  for (const x of cadenas) {
    metal.poner(caja, matriz(x, yCanal - 0.06, zCanal, 0, 0, 0, 0.05, 0.05, 0.05));
    for (let y = yCanal - 0.12; y > AGUA + 0.12; y -= 0.115) {
      metal.poner(copa, matriz(x, y, zCanal));
      metal.poner(eslabon, matriz(x, y - 0.06, zCanal));
    }
    piedra.poner(geoPiedra(31, { plano: 0.4 }), matriz(x, AGUA - 0.03, zCanal, 0, 0.6, 0, 0.26, 0.15, 0.24));
  }

  // ── Salas ────────────────────────────────────────────────────────────────
  let k = 0;
  const lugares = [];
  const construirSala = (sala, i) => {
    const x = i * S;
    const grupo = new THREE.Group();
    grupo.position.x = x;
    casa.add(grupo);
    uniformesBrillo.uSalasX.value[i] = x;

    if (sala.tipo === 'ma') {
      // Un hueco en la casa: el jardincito de atrás (jardin.js). Contrahuella oscura del escalón.
      viga(S - 0.2, 0.3, 0.04, x, -0.15, -0.02);
      lugares.push({ x, tipo: 'ma', k: -1 });
      return { sala, x, tipo: 'ma', grupo, potencia: 0.35 };
    }
    const kSala = k++;
    lugares.push({ x, tipo: 'sala', k: kSala });

    const material = crearMaterialPapel(washi);
    const materialRanma = crearMaterialPapel(washi, { kumiko: [9, 2], escala: [3, 0.6] });
    material.uniforms.uLuz.value.set(x, 1.0, -2.2);
    materialRanma.uniforms.uLuz.value.set(x, 1.0, -2.2);

    // Paneles fijos a los lados (un solo papel y marcos al lote de madera) y las dos hojas que se abren
    const anchoFijo = (S / 2 - 0.1 - ANCHO_HOJA) / 2;
    const papelFijo = new Lote();
    for (const lado of [-1, 1]) {
      for (let n = 0; n < 2; n++) {
        const px = lado * (ANCHO_HOJA + anchoFijo * (n + 0.5));
        papelFijo.poner(planoPapel(anchoFijo, ALTO_PUERTA), matriz(px, 0, 0));
        ponerMarco(madera, anchoFijo, ALTO_PUERTA, matriz(x + px, 0, 0));
      }
    }
    const fijos = papelFijo.malla(material);
    fijos.receiveShadow = true;
    grupo.add(fijos);
    const hojas = [-1, 1].map((lado) => {
      const h = hojaShoji(ANCHO_HOJA, ALTO_PUERTA, material);
      h.userData.cerrada = lado * ANCHO_HOJA / 2;
      h.userData.lado = lado;
      h.position.set(h.userData.cerrada, 0, 0.05);
      grupo.add(h);
      return h;
    });

    // Ranma: el panel alto sobre el dintel. En algunas salas, tabla calada con olas o nubes delante.
    const ranma = new THREE.Mesh(planoPapel(S - 0.2, 0.52), materialRanma);
    ranma.receiveShadow = true;
    ranma.position.set(0, ALTO_PUERTA + 0.13, 0);
    grupo.add(ranma);
    ponerMarco(madera, S - 0.2, 0.52, matriz(x, ALTO_PUERTA + 0.13, 0));
    if (kSala % 2 === 1) {
      const motivo = kSala % 4 === 1 ? 'olas' : 'nubes';
      madera.poner(geoCalado(motivo, S - 0.29, 0.405, 0.025, 3 + kSala), matriz(x, ALTO_PUERTA + 0.2, 0.026));
    }
    // Kokabe: el muro de tierra entre el nageshi y el alero
    piedra.poner(caja, matriz(x, (3.08 + ALERO_Y) / 2, -0.02, 0, 0, 0, S - 0.16, ALERO_Y - 3.08, 0.04));

    // Interior: tatami, pared del fondo, paredes laterales y techo
    const interior = new THREE.Group();
    const tatami = new THREE.Mesh(new THREE.PlaneGeometry(S - 0.2, FONDO_SALA), new THREE.MeshStandardMaterial({ color: 0x5b5236, roughness: 0.95 }));
    tatami.rotation.x = -Math.PI / 2; tatami.position.set(0, 0.002, -FONDO_SALA / 2);
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(S - 0.2, 2.9), new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 1 }));
    fondo.position.set(0, 1.45, -FONDO_SALA);
    const techo = new THREE.Mesh(new THREE.PlaneGeometry(S - 0.2, FONDO_SALA), new THREE.MeshStandardMaterial({ color: 0x16120f, roughness: 1 }));
    techo.rotation.x = Math.PI / 2; techo.position.set(0, 2.85, -FONDO_SALA / 2);
    interior.add(tatami, fondo, techo);
    for (const lado of [-1, 1]) {
      const pared = new THREE.Mesh(new THREE.PlaneGeometry(FONDO_SALA, 2.9), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 }));
      pared.rotation.y = -lado * Math.PI / 2;
      pared.position.set(lado * (S / 2 - 0.1), 1.45, -FONDO_SALA / 2);
      interior.add(pared);
    }
    interior.visible = false;
    grupo.add(interior);

    const ocupantes = crearOcupantes(sala.id);
    if (ocupantes) grupo.add(ocupantes.grupo);

    return { sala, x, tipo: 'sala', grupo, material, materialRanma, hojas, interior, ocupantes, potencia: 0.6, apertura: 0 };
  };
  const registro = [];
  for (let i = 0; i < salas.length; i++) {
    registro.push(construirSala(salas[i], i));
    await ceder();
  }

  // El jardín y luego cada lote fundido en una malla
  const { halos } = poblarJardin({ lotes, salas: lugares, inicio, fin, calidad });
  await ceder();
  for (const [nombre, lote] of Object.entries(lotes)) {
    const m = lote.malla(MAT[nombre]);
    if (m) { m.name = nombre; casa.add(m); }
  }
  casa.add(halos);

  return { casa, registro, uniformesBrillo, inicio, fin, largo };
}
