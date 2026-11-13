// Atmósfera: polvo en suspensión que se enciende en el haz de la puerta abierta y una niebla
// baja, casi invisible, sobre el agua. Todo en shaders: en la CPU solo se mueven uniforms.
import * as THREE from 'three';
import { NIVEL_AGUA, ORILLA, ALTO_PUERTA } from './constantes.js';
import { BRILLO_GLSL } from './casa.js';

// ── Polvo ────────────────────────────────────────────────────────────────────
// Las motas viven en una caja delante de la puerta (en coordenadas de la sala) y solo brillan
// dentro del haz que sale por la abertura; fuera de él no se ven (gl_PointSize = 0).
const polvoVertex = /* glsl */`
attribute float aFase;
uniform float uTiempo;
uniform float uApertura;   // 0..1, cuánto se ve el haz (apertura × potencia de la sala)
uniform float uMedia;      // media anchura de la abertura
uniform float uEscalaPx;   // píxeles por unidad a distancia 1
varying float vBrillo;
const float ALTO = ${(ALTO_PUERTA + 0.1).toFixed(2)};
void main(){
  float f = aFase * 6.2831;
  vec3 p = vec3((position.x - 0.5) * 3.8, position.y * ALTO, 0.08 + position.z * 1.85);
  // Deriva lenta: suben muy despacio y se mecen
  p.y = mod(p.y + uTiempo * (0.018 + 0.022 * aFase), ALTO);
  p.x += sin(uTiempo * 0.31 + f) * 0.10 + sin(uTiempo * 0.13 + f * 2.0) * 0.18;
  p.z += sin(uTiempo * 0.23 + f * 1.7) * 0.07;
  // El haz se abre un poco hacia el engawa y se apaga lejos de la puerta
  float media = uMedia + p.z * 0.32;
  float haz = 1.0 - smoothstep(media - 0.2, media + 0.15, abs(p.x));
  haz *= smoothstep(0.0, 0.25, p.y) * (1.0 - smoothstep(ALTO - 0.5, ALTO, p.y));
  haz *= 1.0 - 0.85 * smoothstep(0.5, 1.9, p.z);
  float titila = 0.55 + 0.45 * sin(uTiempo * (0.6 + aFase) + f * 3.0);
  vBrillo = haz * uApertura * titila;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tam = (0.010 + 0.014 * fract(aFase * 7.31)) * uEscalaPx / max(0.1, -mv.z);
  gl_PointSize = vBrillo < 0.003 ? 0.0 : clamp(tam, 1.5, 10.0);
}`;

const polvoFragment = /* glsl */`
uniform vec3 uColor;
varying float vBrillo;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a = 1.0 - smoothstep(0.0, 0.25, dot(c, c));
  a *= a * vBrillo;
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor * a, 1.0);
  #include <colorspace_fragment>
}`;

export function crearPolvo(cantidad) {
  const pos = new Float32Array(cantidad * 3);
  const fase = new Float32Array(cantidad);
  for (let i = 0; i < cantidad; i++) {
    pos[i * 3] = Math.random();
    pos[i * 3 + 1] = Math.random();
    pos[i * 3 + 2] = Math.random() ** 1.4; // más motas cerca del papel
    fase[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTiempo: { value: 0 },
      uApertura: { value: 0 },
      uMedia: { value: 0 },
      uEscalaPx: { value: 1000 },
      uColor: { value: new THREE.Color(1.0, 0.74, 0.46).multiplyScalar(1.5) },
    },
    vertexShader: polvoVertex,
    fragmentShader: polvoFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    // Aditivo: el tone mapping de 0 no es 0 con AgX y dejaría cuadros; se suma en lineal.
    toneMapped: false,
  });
  const puntos = new THREE.Points(geo, material);
  puntos.frustumCulled = false;
  puntos.renderOrder = 2;
  return { objeto: puntos, uniforms: material.uniforms };
}

// ── Niebla baja sobre el agua ────────────────────────────────────────────────
const nieblaFragment = /* glsl */`
varying vec3 vMundo;
uniform float uTiempo;
uniform float uCapa;
uniform float uOpacidad;
${BRILLO_GLSL}
float hashN(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruidoN(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hashN(i), hashN(i + vec2(1.0, 0.0)), f.x), mix(hashN(i + vec2(0.0, 1.0)), hashN(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main(){
  vec2 p = vMundo.xz * vec2(0.32, 0.75) + vec2(uTiempo * 0.035, uCapa * 7.3);
  float n = ruidoN(p) * 0.62 + ruidoN(p * 2.3 + vec2(-uTiempo * 0.05, 3.1)) * 0.38;
  n = smoothstep(0.32, 0.85, n);
  float orilla = smoothstep(${ORILLA.toFixed(2)}, ${(ORILLA + 0.9).toFixed(2)}, vMundo.z) * (1.0 - smoothstep(6.0, 8.5, vMundo.z));
  float d = distance(cameraPosition, vMundo);
  float a = n * orilla * (1.0 - smoothstep(11.0, 20.0, d)) * uOpacidad;
  if (a < 0.002) discard;
  // Fría a la luz de la luna; se entibia donde el muro iluminado la toca
  float muro = brilloMuro(vMundo.x) * exp(-(vMundo.z - ${ORILLA.toFixed(2)}) * 0.45);
  vec3 color = vec3(0.075, 0.085, 0.10) + vec3(1.0, 0.72, 0.42) * muro * 0.2;
  gl_FragColor = vec4(color, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function crearNiebla({ inicio, fin, uniformesBrillo, capas }) {
  const grupo = new THREE.Group();
  const tiempo = { value: 0 };
  const geo = new THREE.PlaneGeometry(fin - inicio + 20, 7.5);
  for (let k = 0; k < capas; k++) {
    const material = new THREE.ShaderMaterial({
      uniforms: { ...uniformesBrillo, uTiempo: tiempo, uCapa: { value: k }, uOpacidad: { value: capas > 1 ? 0.09 : 0.13 } },
      vertexShader: 'varying vec3 vMundo; void main(){ vec4 m = modelMatrix * vec4(position,1.0); vMundo = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }',
      fragmentShader: nieblaFragment,
      transparent: true,
      depthWrite: false,
    });
    const plano = new THREE.Mesh(geo, material);
    plano.rotation.x = -Math.PI / 2;
    plano.position.set((inicio + fin) / 2, NIVEL_AGUA + 0.07 + k * 0.16, ORILLA + 3.75);
    plano.renderOrder = 1;
    grupo.add(plano);
  }
  return { grupo, tiempo };
}
