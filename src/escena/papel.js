// Papel shōji iluminado desde dentro de la sala.
// Se ve desde el pasillo: la luz de la linterna atraviesa el washi y los objetos de la sala
// dejan su sombra en el papel. getShadowMask() da la oclusión sin depender de N·L, que es lo
// que permite ver la sombra "por detrás". La rejilla kumiko se pinta en el mismo shader.
import * as THREE from 'three';

const vertex = THREE.ShaderLib.shadow.vertexShader
  .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;\nvarying vec2 vUv;')
  .replace('#include <fog_vertex>', '#include <fog_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvUv = uv;');

const fragment = /* glsl */`
uniform vec3 uLuz;
uniform vec3 uColorLuz;
uniform vec3 uColorPapel;
uniform float uPotencia;
uniform float uSombra;        // 0 = sin sombras (sala lejana), 1 = sombras de la linterna
uniform sampler2D uWashi;
uniform vec2 uEscalaWashi;
uniform vec2 uKumiko;         // columnas, filas
uniform float uGrosorKumiko;
varying vec3 vMundo;
varying vec2 vUv;
#include <common>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
  float sombra = mix(1.0, getShadowMask(), uSombra);
  // Charco de luz: la linterna ilumina el papel alrededor de su proyección y se apaga hacia los bordes
  vec2 enMuro = vMundo.xy - uLuz.xy;
  float charco = exp(-dot(enMuro, enMuro) * 0.5);
  float ambiente = exp(-enMuro.x * enMuro.x * 0.05) * 0.07;      // la sala entera brilla apenas
  float fibra = texture2D(uWashi, vUv * uEscalaWashi).r;
  float grosor = mix(0.5, 1.0, fibra);
  float paso = exp(-1.2 * grosor);                // lo grueso deja pasar menos luz: las fibras se ven a contraluz
  float halo = exp(-dot(enMuro, enMuro) * 2.2);   // brillo de la llama dispersado dentro del papel
  vec3 atras = uColorLuz * uPotencia * paso * (charco * sombra * 2.6 + halo * 1.1 + ambiente);
  vec3 frente = uColorPapel * (0.012 + 0.008 * fibra);
  vec3 color = frente + atras;
  // Kumiko: listones de madera, casi negros contra la luz
  vec2 celda = fract(vUv * uKumiko);
  vec2 g = uGrosorKumiko * uKumiko;
  float liston = max(1.0 - step(g.x, celda.x) * step(celda.x, 1.0 - g.x), 1.0 - step(g.y, celda.y) * step(celda.y, 1.0 - g.y));
  color = mix(color, vec3(0.012, 0.010, 0.009) + atras * 0.03, liston * 0.96);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function crearMaterialPapel(washi, { kumiko = [3, 6], escala = [1.2, 2] } = {}) {
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
      },
    ]),
    vertexShader: vertex,
    fragmentShader: fragment,
  });
  // Las texturas de render target no se pueden clonar al fusionar uniforms: se asigna después.
  material.uniforms.uWashi.value = washi;
  return material;
}
