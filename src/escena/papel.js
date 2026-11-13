// Papel shōji iluminado desde dentro de la sala.
// Se ve desde el pasillo: la luz de la linterna atraviesa el washi y los objetos de la sala
// dejan su sombra en el papel. La oclusión se lee del mapa de sombras sin depender de N·L, que es
// lo que permite ver la sombra "por detrás". La rejilla kumiko se pinta en el mismo shader.
//
// Uniforms que se pueden tocar desde fuera (escena.js usa uLuz, uPotencia y uSombra):
//   uTiempo         segundos; mueve un poco el charco y el halo como una llama (0 = quieto).
//                   En el bucle de escena.js: m.uniforms.uTiempo.value = t + i * 1.7
//                   (el desfase por sala evita que todas las llamas tiemblen a la vez).
//   uPenumbra       ancho del borde de las sombras, en múltiplos de shadow.radius (2.2).
//   uKoshi          alto (0..1 de la hoja) del zócalo de madera koshi; 0 = sin koshi.
//   uSemilla        cambia el parche remendado y las manchas de humedad de cada material.
//   uImperfecciones 0 = papel nuevo, 1 = parches y manchas sutiles (por defecto).
// Coste por píxel: 2 lecturas del washi + las 5 del mapa de sombras (solo en la sala activa).
import * as THREE from 'three';
import { SEPARACION } from './constantes.js';

const vertex = THREE.ShaderLib.shadow.vertexShader
  .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;\nvarying vec2 vUv;\nvarying vec3 vOrigen;')
  .replace('#include <fog_vertex>', '#include <fog_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvUv = uv;\nvOrigen = modelMatrix[3].xyz;');

const fragment = /* glsl */`
uniform vec3 uLuz;
uniform vec3 uColorLuz;
uniform vec3 uColorPapel;
uniform float uPotencia;
uniform float uSombra;        // 0 = sin sombras (sala lejana), 1 = sombras de la linterna
uniform sampler2D uWashi;     // r pulpa, g fibras de kozo, b grano, a baja frecuencia
uniform vec2 uEscalaWashi;
uniform vec2 uKumiko;         // columnas, filas
uniform float uGrosorKumiko;  // medio ancho del listón, en unidades de uv
uniform float uKoshi;
uniform float uSemilla;
uniform float uImperfecciones;
uniform float uTiempo;
uniform float uPenumbra;
varying vec3 vMundo;
varying vec2 vUv;
varying vec3 vOrigen;
#include <common>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

float hashP(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// Sombra de la linterna con un disco de muestreo más ancho que el de three (mismo número de
// lecturas): da la penumbra amplia de una llama que no es puntual. Si el tipo de sombra no es
// PCF se usa el chunk tal cual.
float sombraLinterna(){
#if defined( USE_SHADOWMAP ) && defined( SHADOWMAP_TYPE_PCF ) && NUM_SPOT_LIGHT_SHADOWS > 0
  if (!receiveShadow) return 1.0;
  SpotLightShadow sl = spotLightShadows[ 0 ];
  vec4 c = vSpotLightCoord[ 0 ];
  c.xyz /= c.w;
  #ifdef USE_REVERSED_DEPTH_BUFFER
    c.z -= sl.shadowBias;
  #else
    c.z += sl.shadowBias;
  #endif
  if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
  vec2 radio = sl.shadowRadius * uPenumbra / sl.shadowMapSize;
  float phi = interleavedGradientNoise(gl_FragCoord.xy) * PI2;
  float s = 0.0;
  for (int k = 0; k < 5; k++) s += texture(spotShadowMap[ 0 ], vec3(c.xy + vogelDiskSample(k, 5, phi) * radio, c.z));
  return mix(1.0, s * 0.2, sl.shadowIntensity);
#else
  return getShadowMask();
#endif
}

void main() {
  // ── Sombra suave ─────────────────────────────────────────────────────────
  float sombra = 1.0;
  if (uSombra > 0.001) {   // uniform: las salas lejanas no pagan el mapa de sombras
    float s = sombraLinterna();
    // Promedio con los vecinos del cuadro 2×2 (derivadas): borra el ruido del disco ancho.
    vec2 par = 1.0 - 2.0 * mod(floor(gl_FragCoord.xy), 2.0);
    s += (dFdx(s) * par.x + dFdy(s) * par.y) / 3.0;
    // El papel difunde la luz: el borde se ablanda y lo más oscuro nunca llega a negro.
    s = mix(s, smoothstep(0.0, 1.0, s), 0.5);   // borde suave sin perder el detalle de hojas y ramas
    sombra = mix(1.0, mix(0.08, 1.0, s), uSombra);
  }

  // ── Charco de luz con temblor de llama ───────────────────────────────────
  float t = uTiempo;
  vec2 temblor = vec2(sin(t * 5.3) + 0.5 * sin(t * 11.7), 0.6 * sin(t * 7.1) + 0.4 * sin(t * 13.3)) * 0.018;
  float respira = 1.0 + 0.035 * sin(t * 9.1) + 0.02 * sin(t * 15.7);
  vec2 enMuro = vMundo.xy - uLuz.xy - temblor;
  float charco = exp(-dot(enMuro, enMuro) * 0.5 / respira);
  vec2 enHalo = enMuro - temblor * 1.5;           // la punta de la llama se mueve más que la base
  float halo = exp(-dot(enHalo, enHalo) * 2.2 / respira);
  float ambiente = exp(-enMuro.x * enMuro.x * 0.05) * 0.07;   // la sala entera brilla apenas

  // Temperatura: cálido y amarillento en el centro, más frío y gris hacia los bordes
  float calor = smoothstep(0.0, 1.0, charco + halo * 0.5);
  vec3 luz = uColorLuz * mix(vec3(0.78, 0.85, 1.0), vec3(1.08, 0.97, 0.8), calor);

  // ── Identidad de cada hoja (el material lo comparten varias) ─────────────
  // Paneles fijos: por su distancia al centro de la sala. Hojas corredizas (más adelante en z):
  // por el lado, para que el remiendo no salte mientras se abren.
  float dx = vOrigen.x - floor(vOrigen.x / ${SEPARACION.toFixed(3)} + 0.5) * ${SEPARACION.toFixed(3)};
  float clave = mix(floor(dx * 4.0 + 0.5), sign(dx) * 10.0 + 31.0, step(0.025, vOrigen.z));
  vec2 local = vMundo.xy - vOrigen.xy;            // metros, pegado a la hoja

  // ── Grosor del washi ─────────────────────────────────────────────────────
  vec4 w = texture2D(uWashi, vUv * uEscalaWashi);
  vec2 corrimiento = vec2(hashP(vec2(clave, uSemilla)), hashP(vec2(uSemilla, clave + 3.1)));
  vec4 lejos = texture2D(uWashi, local * 0.45 + corrimiento * 7.0);
  float grosor = mix(0.5, 1.0, w.r)               // pulpa
               + (lejos.r - 0.5) * 0.35           // nubes de pulpa más grandes
               + w.g * 0.5                        // fibras de kozo: más oscuras al trasluz
               + (w.b - 0.5) * 0.08;              // grano

  // ── Imperfecciones: un remiendo y manchas de humedad ─────────────────────
  vec2 kc = vUv * uKumiko;
  vec2 objetivo = floor(vec2(hashP(vec2(clave + 5.0, uSemilla)), mix(0.15, 0.7, hashP(vec2(uSemilla + 9.0, clave)))) * uKumiko);
  float enCelda = step(dot(abs(floor(kc) - objetivo), vec2(1.0)), 0.5);
  float tieneParche = step(0.62, hashP(vec2(clave * 1.31 + 0.7, uSemilla * 0.37 + 2.9))) * uImperfecciones * enCelda;
  float giro = (hashP(vec2(uSemilla, clave + 1.0)) - 0.5) * 0.12;
  vec2 cp = fract(kc) - 0.5 - (corrimiento - 0.5) * 0.12;
  cp = mat2(cos(giro), -sin(giro), sin(giro), cos(giro)) * cp;
  float dP = max(abs(cp.x), abs(cp.y)) - (0.27 + 0.06 * corrimiento.x) + (w.b - 0.5) * 0.012 + w.g * 0.008; // borde rasgado
  float aP = fwidth(dP) + 0.002;
  float dentro = (1.0 - smoothstep(-aP, aP, dP)) * tieneParche;
  float bordeP = (1.0 - smoothstep(0.0, 0.012 + aP, abs(dP))) * tieneParche;   // pegamento y doble capa
  grosor += dentro * 0.3 + bordeP * 0.3;

  float umbral = 0.74 + hashP(vec2(clave + 4.0, uSemilla)) * 0.1;
  float abajo = 1.0 - smoothstep(0.2, 1.4, local.y);          // la humedad sube desde el piso
  float aguada = smoothstep(umbral, umbral + 0.08, lejos.a) * abajo * uImperfecciones;
  float cerco = smoothstep(umbral - 0.025, umbral, lejos.a) * (1.0 - smoothstep(umbral, umbral + 0.015, lejos.a)) * abajo * uImperfecciones;
  vec3 manchas = mix(vec3(1.0), vec3(0.97, 0.93, 0.85), aguada * 0.6) * mix(vec3(1.0), vec3(0.8, 0.72, 0.58), cerco * 0.45);

  // ── Luz que atraviesa el papel ───────────────────────────────────────────
  float paso = exp(-1.25 * grosor);               // lo grueso deja pasar menos luz
  vec3 atras = luz * uPotencia * paso * (charco * sombra * 2.6 + halo * 1.1 + ambiente) * manchas;

  // Kumiko: medidas en unidades de celda; o = posición respecto al centro del listón más cercano
  vec2 o = fract(kc + 0.5) - 0.5;
  vec2 g = uGrosorKumiko * uKumiko;
  vec2 aa = fwidth(kc);
  vec2 cubre = 1.0 - smoothstep(g - aa, g + aa, abs(o));      // x: listón vertical, y: horizontal
  float liston = max(cubre.x, cubre.y);
  float cruce = cubre.x * cubre.y;
  vec2 cerca = 1.0 - smoothstep(g, g * 3.5 + aa, abs(o));
  atras *= 1.0 - 0.18 * max(cerca.x, cerca.y);    // el listón le quita luz difusa al papel pegado

  vec3 frente = uColorPapel * (0.012 + 0.008 * w.r + 0.004 * dentro);
  vec3 color = frente + atras;

  // Listones con volumen: casi negros, con un hilo de luz en el canto que mira a la linterna
  vec2 haciaLuz = sign(uLuz.xy - vMundo.xy);
  vec2 lado = clamp(o / g, -1.0, 1.0);
  vec2 canto = smoothstep(0.4, 1.0, lado * haciaLuz) * cubre * (1.0 - cubre.yx);
  float luzCanto = uPotencia * (charco * sombra + halo * 0.4);
  vec3 madera = vec3(0.012, 0.010, 0.009) * (0.8 + 0.4 * max(abs(lado.x) * cubre.x, abs(lado.y) * cubre.y))
              + atras * 0.035
              + luz * luzCanto * (canto.x + canto.y) * 0.1;
  madera *= 1.0 - 0.5 * cruce;                   // uniones a media madera, más oscuras
  color = mix(color, madera, liston * 0.96);

  // Koshi: zócalo de madera al pie de la hoja con un travesaño más grueso encima
  float aaY = fwidth(vUv.y);
  float tabla = 1.0 - smoothstep(uKoshi - aaY, uKoshi + aaY, vUv.y);
  float anchoRiel = uGrosorKumiko * 2.2;
  float riel = 1.0 - smoothstep(anchoRiel - aaY, anchoRiel + aaY, abs(vUv.y - uKoshi));
  float koshi = max(tabla, riel) * step(0.001, uKoshi);
  float cantoRiel = smoothstep(0.4, 1.0, (vUv.y - uKoshi) / anchoRiel * haciaLuz.y) * riel;
  vec3 maderaKoshi = vec3(0.016, 0.012, 0.009) * (0.75 + 0.5 * w.r) + luz * luzCanto * cantoRiel * 0.1;
  color = mix(color, maderaKoshi, koshi * 0.98);

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

let contador = 0;

export function crearMaterialPapel(washi, { kumiko = [3, 6], escala = [1.2, 2], koshi = 0, semilla } = {}) {
  contador += 1;
  const material = new THREE.ShaderMaterial({
    lights: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      {
        uLuz: { value: new THREE.Vector3() },
        uColorLuz: { value: new THREE.Color(0xffc98a) },
        uColorPapel: { value: new THREE.Color(0xf3efe6) },
        uPotencia: { value: 1 },
        uSombra: { value: 0 },
        uWashi: { value: null },
        uEscalaWashi: { value: new THREE.Vector2(...escala) },
        uKumiko: { value: new THREE.Vector2(...kumiko) },
        uGrosorKumiko: { value: 0.012 },
        uKoshi: { value: koshi },
        uSemilla: { value: semilla ?? contador * 1.618 },
        uImperfecciones: { value: 1 },
        uTiempo: { value: 0 },
        uPenumbra: { value: 1.15 },
      },
    ]),
    vertexShader: vertex,
    fragmentShader: fragment,
  });
  // Las texturas de render target no se pueden clonar al fusionar uniforms: se asigna después.
  material.uniforms.uWashi.value = washi;
  return material;
}
