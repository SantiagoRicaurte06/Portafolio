// Papel washi procedural: pulpa de grosor desigual, fibras largas de kozo y grano.
// Se hornea una sola vez a una textura (en celular el ruido por píxel sería caro).
// Canales de la textura horneada (papel.js los lee todos con una sola lectura):
//   r = pulpa (grosor a escala media), g = fibras largas de kozo, b = grano fino,
//   a = ruido de baja frecuencia (nubes de pulpa y manchas de humedad).
import * as THREE from 'three';

export const WASHI_GLSL = /* glsl */`
float hashW(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoiseW(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(hashW(i), hashW(i + vec2(1,0)), f.x), mix(hashW(i + vec2(0,1)), hashW(i + 1.0), f.x), f.y);
}
float fbmW(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a*vnoiseW(p); p *= 2.03; a *= 0.5; } return s; }
float fibrasW(vec2 uv, float ang){
  mat2 r = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 q = r * uv * vec2(9.0, 160.0);
  float n = vnoiseW(q + fbmW(uv * 7.0) * 3.0);
  return smoothstep(0.86, 0.98, n) * 0.6;
}
// Fibras de kozo: muy largas (baja frecuencia a lo largo), finas y onduladas.
float fibrasLargasW(vec2 uv, float ang){
  mat2 r = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 q = r * uv * vec2(2.6, 130.0);
  float n = vnoiseW(q + vec2(0.0, fbmW(uv * 4.0 + ang) * 4.0));
  return smoothstep(0.89, 0.975, n);
}
vec4 washiCanales(vec2 uv){
  float pulpa = fbmW(uv * 3.0);
  float fib = max(max(fibrasLargasW(uv, 0.3), fibrasLargasW(uv + 7.1, 1.9)),
                  max(fibrasLargasW(uv + 3.3, -0.8), fibrasW(uv + 5.7, 1.2)));
  float grano = hashW(floor(uv * 700.0));
  float nubes = fbmW(uv * 2.0 + 17.3);
  return vec4(pulpa, fib, grano, nubes);
}
float washi(vec2 uv){
  vec4 c = washiCanales(uv);
  return clamp(c.r * 0.7 + c.g * 0.18 + c.b * 0.12, 0.0, 1.0);
}
`;

export function hornearWashi(renderer, tamano = 1024) {
  // Con mipmaps las fibras finas no titilan cuando el muro queda lejos (tamano es potencia de 2).
  const destino = new THREE.WebGLRenderTarget(tamano, tamano, {
    depthBuffer: false,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  destino.texture.wrapS = destino.texture.wrapT = THREE.RepeatWrapping;
  destino.texture.colorSpace = THREE.NoColorSpace;
  const material = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `varying vec2 vUv; ${WASHI_GLSL}
      void main(){
        // Repetible: se mezclan cuatro copias desplazadas para que no se note la costura.
        vec2 u = vUv;
        vec4 a = washiCanales(u), b = washiCanales(u - vec2(1.0, 0.0)), c = washiCanales(u - vec2(0.0, 1.0)), d = washiCanales(u - 1.0);
        vec2 w = smoothstep(0.0, 1.0, u);
        vec4 v = mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
        // La mezcla aplana el contraste en el centro: se estira de nuevo alrededor de la media.
        v.r = (v.r - 0.47) * 1.8 + 0.5;
        v.g = v.g * 1.35;
        v.a = (v.a - 0.47) * 2.2 + 0.5;
        gl_FragColor = clamp(v, 0.0, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const escena = new THREE.Scene();
  const malla = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  escena.add(malla);
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const anterior = renderer.getRenderTarget();
  renderer.setRenderTarget(destino);
  renderer.render(escena, camara);
  renderer.setRenderTarget(anterior);
  material.dispose();
  malla.geometry.dispose();
  return destino.texture;
}
