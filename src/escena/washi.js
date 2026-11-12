// Papel washi procedural: pulpa de grosor desigual, fibras largas y grano.
// Se hornea una sola vez a una textura (en celular el ruido por píxel sería caro).
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
float washi(vec2 uv){
  float pulpa = fbmW(uv * 3.0);
  float fib = max(max(fibrasW(uv, 0.3), fibrasW(uv + 7.1, 1.9)), fibrasW(uv + 3.3, -0.8));
  float grano = hashW(floor(uv * 700.0)) * 0.12;
  return clamp(pulpa * 0.7 + fib * 0.3 + grano, 0.0, 1.0);
}
`;

export function hornearWashi(renderer, tamano = 1024) {
  const destino = new THREE.WebGLRenderTarget(tamano, tamano, { depthBuffer: false });
  destino.texture.wrapS = destino.texture.wrapT = THREE.RepeatWrapping;
  destino.texture.colorSpace = THREE.NoColorSpace;
  const material = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `varying vec2 vUv; ${WASHI_GLSL}
      void main(){
        // Repetible: se mezclan cuatro copias desplazadas para que no se note la costura.
        vec2 u = vUv;
        float a = washi(u), b = washi(u - vec2(1.0, 0.0)), c = washi(u - vec2(0.0, 1.0)), d = washi(u - 1.0);
        vec2 w = smoothstep(0.0, 1.0, u);
        float v = mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
        gl_FragColor = vec4(v, v, v, 1.0);
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
