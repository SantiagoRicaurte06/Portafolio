// Postproceso barato (solo calidad alta): la escena se pinta en lineal (HDR, media precisión) y
// un único pase final aplica bloom suave de lo muy brillante, viñeta, tone mapping, sRGB y un
// grano de película sutil. El bloom se calcula a un cuarto de resolución (umbral + 2 desenfoques).
import * as THREE from 'three';

const vertex = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const umbralFragment = /* glsl */`
uniform sampler2D tMapa;
uniform vec2 uTexel;     // texel de la imagen completa
uniform float uUmbral;
varying vec2 vUv;
void main(){
  // 4 lecturas bilineales = promedio de 4×4 texeles
  vec3 c = texture2D(tMapa, vUv + uTexel * vec2(-1.0, -1.0)).rgb
         + texture2D(tMapa, vUv + uTexel * vec2( 1.0, -1.0)).rgb
         + texture2D(tMapa, vUv + uTexel * vec2(-1.0,  1.0)).rgb
         + texture2D(tMapa, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
  c = min(c * 0.25, vec3(8.0));
  float l = max(c.r, max(c.g, c.b));
  float rodilla = uUmbral * 0.4;
  float suave = clamp(l - uUmbral + rodilla, 0.0, 2.0 * rodilla);
  suave = suave * suave / (4.0 * rodilla + 1e-4);
  gl_FragColor = vec4(c * max(suave, l - uUmbral) / max(l, 1e-4), 1.0);
}`;

const desenfoqueFragment = /* glsl */`
uniform sampler2D tMapa;
uniform vec2 uDir;       // texel de la imagen reducida en la dirección del pase
varying vec2 vUv;
void main(){
  // Gauss de 9 muestras con 5 lecturas bilineales
  vec3 c = texture2D(tMapa, vUv).rgb * 0.2270270;
  c += texture2D(tMapa, vUv + uDir * 1.3846154).rgb * 0.3162162;
  c += texture2D(tMapa, vUv - uDir * 1.3846154).rgb * 0.3162162;
  c += texture2D(tMapa, vUv + uDir * 3.2307692).rgb * 0.0702703;
  c += texture2D(tMapa, vUv - uDir * 3.2307692).rgb * 0.0702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const finalFragment = /* glsl */`
uniform sampler2D tEscena;
uniform sampler2D tBrillo;
uniform float uBloom;
uniform float uVineta;
uniform float uGrano;
uniform float uSemilla;
uniform float uAspecto;
varying vec2 vUv;
float hashG(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main(){
  vec3 c = texture2D(tEscena, vUv).rgb + texture2D(tBrillo, vUv).rgb * uBloom;
  vec2 d = vUv - 0.5;
  d.x *= uAspecto;
  c *= 1.0 - uVineta * smoothstep(0.3, 1.0, length(d));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // Grano en el espacio de salida: más en las sombras y medios tonos que en las luces
  float g = hashG(gl_FragCoord.xy + uSemilla) + hashG(gl_FragCoord.yx * 1.37 - uSemilla) - 1.0;
  float l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor.rgb = max(gl_FragColor.rgb + g * uGrano * (1.0 - 0.7 * l), 0.0);
}`;

export function soportaPostproceso(renderer) {
  const ext = renderer.extensions;
  return renderer.capabilities.isWebGL2 !== false && (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'));
}

export function crearPostproceso(renderer, { muestras = 0, menosMovimiento = false } = {}) {
  const rtEscena = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: muestras });
  const opcionesBrillo = { type: THREE.HalfFloatType, depthBuffer: false };
  const rtA = new THREE.WebGLRenderTarget(1, 1, opcionesBrillo);
  const rtB = new THREE.WebGLRenderTarget(1, 1, opcionesBrillo);

  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const triangulo = new THREE.Mesh(geo);
  triangulo.frustumCulled = false;

  const sinTono = (fragmentShader, uniforms) => new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader, depthTest: false, depthWrite: false, toneMapped: false });
  const umbral = sinTono(umbralFragment, { tMapa: { value: rtEscena.texture }, uTexel: { value: new THREE.Vector2() }, uUmbral: { value: 1.15 } });
  const desenfoque = sinTono(desenfoqueFragment, { tMapa: { value: null }, uDir: { value: new THREE.Vector2() } });
  const final = new THREE.ShaderMaterial({
    uniforms: {
      tEscena: { value: rtEscena.texture },
      tBrillo: { value: rtA.texture },
      uBloom: { value: 0.32 },
      uVineta: { value: 0.42 },
      uGrano: { value: 0.022 },
      uSemilla: { value: 0 },
      uAspecto: { value: 1 },
    },
    vertexShader: vertex,
    fragmentShader: finalFragment,
    depthTest: false,
    depthWrite: false,
  });

  let anchoB = 1, altoB = 1;

  function pase(material, destino) {
    triangulo.material = material;
    renderer.setRenderTarget(destino);
    renderer.render(triangulo, camara);
  }

  return {
    // ancho y alto en píxeles del lienzo (ya multiplicados por el pixelRatio)
    redimensionar(ancho, alto) {
      rtEscena.setSize(ancho, alto);
      anchoB = Math.max(1, Math.round(ancho / 4));
      altoB = Math.max(1, Math.round(alto / 4));
      rtA.setSize(anchoB, altoB);
      rtB.setSize(anchoB, altoB);
      umbral.uniforms.uTexel.value.set(1 / ancho, 1 / alto);
      final.uniforms.uAspecto.value = ancho / alto;
    },
    render(escena, camaraEscena, t) {
      renderer.setRenderTarget(rtEscena);
      renderer.render(escena, camaraEscena);
      pase(umbral, rtA);
      desenfoque.uniforms.tMapa.value = rtA.texture;
      desenfoque.uniforms.uDir.value.set(1 / anchoB, 0);
      pase(desenfoque, rtB);
      desenfoque.uniforms.tMapa.value = rtB.texture;
      desenfoque.uniforms.uDir.value.set(0, 1 / altoB);
      pase(desenfoque, rtA);
      // Grano a 24 imágenes por segundo, como la película; quieto con menos movimiento
      final.uniforms.uSemilla.value = menosMovimiento ? 17.0 : (Math.floor(t * 24) % 997) * 7.13;
      pase(final, null);
    },
    liberar() {
      [rtEscena, rtA, rtB].forEach((r) => r.dispose());
      [umbral, desenfoque, final].forEach((m) => m.dispose());
      geo.dispose();
    },
  };
}
