// La casa: un muro de shōji a lo largo del pasillo, una sala detrás de cada par de puertas,
// pilares y vigas en primer plano, el alero y el piso del engawa.
import * as THREE from 'three';
import { SEPARACION as S, ALTO_PUERTA, ANCHO_HOJA, FONDO_SALA } from './constantes.js';
import { crearMaterialPapel } from './papel.js';
import { crearOcupantes } from './ocupantes.js';
import { WASHI_GLSL } from './washi.js';

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

const maderaOscura = new THREE.MeshStandardMaterial({ color: 0x1b1612, roughness: 0.82 });

function marco(ancho, alto, grosor = 0.045, fondo = 0.05) {
  const g = new THREE.Group();
  const lados = [
    [grosor, alto, -ancho / 2 + grosor / 2, alto / 2],
    [grosor, alto, ancho / 2 - grosor / 2, alto / 2],
    [ancho, grosor, 0, alto - grosor / 2],
    [ancho, grosor * 1.6, 0, grosor * 0.8],
  ];
  for (const [an, al, x, y] of lados) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(an, al, fondo), maderaOscura);
    m.position.set(x, y, 0);
    g.add(m);
  }
  return g;
}

function panelPapel(ancho, alto, material) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(ancho, alto);
  geo.translate(0, alto / 2, 0);
  const hoja = new THREE.Mesh(geo, material);
  hoja.receiveShadow = true;
  g.add(hoja, marco(ancho, alto));
  return g;
}

export function crearCasa({ salas, washi, calidad }) {
  const casa = new THREE.Group();
  const total = salas.length;
  const largo = total * S;
  const inicio = -S / 2 - 2;
  const fin = (total - 1) * S + S / 2 + 2;

  const uniformesBrillo = {
    uSalasX: { value: new Array(MAX_SALAS).fill(-999) },
    uSalasP: { value: new Array(MAX_SALAS).fill(0) },
    uSalasA: { value: new Array(MAX_SALAS).fill(0) },
  };

  // ── Piso del engawa: tablas procedurales iluminadas por el muro ──────────
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(fin - inicio, 1.9, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: { ...uniformesBrillo, uTiempo: { value: 0 } },
      vertexShader: 'varying vec3 vMundo; void main(){ vec4 m = modelMatrix * vec4(position,1.0); vMundo = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }',
      fragmentShader: `varying vec3 vMundo; ${WASHI_GLSL} ${BRILLO_GLSL}
        void main(){
          float tabla = floor(vMundo.z / 0.19);
          float tono = hashW(vec2(tabla, 3.0));
          float veta = sin((vMundo.x * 0.9 + fbmW(vec2(vMundo.x * 0.25, tabla * 4.0)) * 2.5) * 9.0) * 0.5 + 0.5;
          float junta = smoothstep(0.0, 0.012, fract(vMundo.z / 0.19)) * smoothstep(0.0, 0.012, 1.0 - fract(vMundo.z / 0.19));
          vec3 base = vec3(0.085, 0.068, 0.055) * (0.8 + 0.35 * tono) * (0.85 + 0.25 * veta) * mix(0.35, 1.0, junta);
          float luz = brilloMuro(vMundo.x) * exp(-vMundo.z * 1.1);
          vec3 color = base * (0.35 + luz * vec3(1.9, 1.45, 1.0));
          // brillo pulido: el muro se refleja en la madera
          color += vec3(1.0, 0.75, 0.45) * luz * 0.05 * smoothstep(0.4, 1.0, veta);
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  piso.rotation.x = -Math.PI / 2;
  piso.position.set((inicio + fin) / 2, 0, 0.95);
  casa.add(piso);

  // Borde del engawa y zócalo hasta el agua
  const borde = new THREE.Mesh(new THREE.BoxGeometry(fin - inicio, 0.12, 0.14), maderaOscura);
  borde.position.set((inicio + fin) / 2, -0.06, 1.9);
  const zocalo = new THREE.Mesh(new THREE.BoxGeometry(fin - inicio, 0.5, 0.05), new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 1 }));
  zocalo.position.set((inicio + fin) / 2, -0.35, 1.85);
  casa.add(borde, zocalo);

  // ── Vigas y alero (corren todo el pasillo) ───────────────────────────────
  const kamoi = new THREE.Mesh(new THREE.BoxGeometry(fin - inicio, 0.13, 0.14), maderaOscura);
  kamoi.position.set((inicio + fin) / 2, ALTO_PUERTA + 0.065, 0.03);
  const nageshi = new THREE.Mesh(new THREE.BoxGeometry(fin - inicio, 0.16, 0.16), maderaOscura);
  nageshi.position.set((inicio + fin) / 2, 3.0, 0.05);
  const alero = new THREE.Mesh(new THREE.PlaneGeometry(fin - inicio, 2.6), new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 1, side: THREE.DoubleSide }));
  alero.rotation.x = Math.PI / 2 - 0.16;
  alero.position.set((inicio + fin) / 2, 3.25, 1.15);
  const vigaFrente = new THREE.Mesh(new THREE.BoxGeometry(fin - inicio, 0.18, 0.18), maderaOscura);
  vigaFrente.position.set((inicio + fin) / 2, 3.02, 2.0);
  casa.add(kamoi, nageshi, alero, vigaFrente);

  // Pilares: en el muro y en el borde del engawa (pasan por delante de la cámara)
  for (let i = 0; i <= total; i++) {
    const x = (i - 0.5) * S;
    const atras = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.2, 0.16), maderaOscura);
    atras.position.set(x, 1.5, 0.06);
    const frente = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.4, 0.15), maderaOscura);
    frente.position.set(x, 1.45, 1.98);
    casa.add(atras, frente);
  }

  // ── Salas ────────────────────────────────────────────────────────────────
  const registro = salas.map((sala, i) => {
    const x = i * S;
    const grupo = new THREE.Group();
    grupo.position.x = x;
    casa.add(grupo);
    uniformesBrillo.uSalasX.value[i] = x;

    if (sala.tipo === 'ma') {
      // Un hueco en la casa: cerca de bambú a la luz de la luna y un farol de piedra.
      const bambu = new THREE.MeshStandardMaterial({ color: 0x2b2a24, roughness: 0.7 });
      for (let k = -14; k <= 14; k++) {
        const caña = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.0 + Math.sin(k) * 0.08, 6), bambu);
        caña.position.set(k * 0.16, 1.0, -1.6);
        grupo.add(caña);
      }
      const torii = new THREE.Group();
      const piedra = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 1 });
      const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 6), piedra); pie.position.y = 0.25;
      const fuego = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.26), new THREE.MeshBasicMaterial({ color: 0xffb46a }));
      fuego.position.y = 0.6;
      const techo = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.16, 6), piedra); techo.position.y = 0.78;
      torii.add(pie, fuego, techo);
      torii.position.set(1.1, -0.25, 2.5);
      grupo.add(torii);
      return { sala, x, tipo: 'ma', grupo, potencia: 0.35 };
    }

    const material = crearMaterialPapel(washi);
    const materialRanma = crearMaterialPapel(washi, { kumiko: [9, 2], escala: [3, 0.6] });
    material.uniforms.uLuz.value.set(x, 1.0, -2.2);
    materialRanma.uniforms.uLuz.value.set(x, 1.0, -2.2);

    // Paneles fijos a los lados y las dos hojas que se abren
    const anchoFijo = (S / 2 - 0.1 - ANCHO_HOJA) / 2;
    for (const lado of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const p = panelPapel(anchoFijo, ALTO_PUERTA, material);
        p.position.set(lado * (ANCHO_HOJA + anchoFijo * (k + 0.5)), 0, 0);
        grupo.add(p);
      }
    }
    const hojas = [-1, 1].map((lado) => {
      const h = panelPapel(ANCHO_HOJA, ALTO_PUERTA, material);
      h.userData.cerrada = lado * ANCHO_HOJA / 2;
      h.userData.lado = lado;
      h.position.set(h.userData.cerrada, 0, 0.05);
      grupo.add(h);
      return h;
    });
    // Ranma: el panel alto sobre el dintel
    const ranma = panelPapel(S - 0.2, 0.52, materialRanma);
    ranma.position.set(0, ALTO_PUERTA + 0.13, 0);
    grupo.add(ranma);

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
  });

  return { casa, registro, uniformesBrillo, inicio, fin, largo };
}
