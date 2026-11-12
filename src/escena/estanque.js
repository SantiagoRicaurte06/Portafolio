// Estanque frente al engawa: agua casi negra, ondas analíticas con anillos claros (como gofun
// sobre sumi) y el reflejo de la luz de las salas. El cursor y las hojas que caen hacen ondas.
import * as THREE from 'three';
import { BRILLO_GLSL } from './casa.js';
import { formaHojaMomiji } from './ocupantes.js';

const MAX_ONDAS = 20;
const NIVEL = -0.28;
const ORILLA = 2.0;

export function crearEstanque({ inicio, fin, uniformesBrillo, xCamino }) {
  const grupo = new THREE.Group();
  const ondas = Array.from({ length: MAX_ONDAS }, () => new THREE.Vector4(0, 0, -99, 0));
  let siguiente = 0;
  const u = {
    ...uniformesBrillo,
    uT: { value: 0 },
    uOndas: { value: ondas },
    uLinterna: { value: new THREE.Vector3() },
    uLuna: { value: new THREE.Vector2(0, 0) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: 'varying vec3 vMundo; void main(){ vec4 m = modelMatrix * vec4(position,1.0); vMundo = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }',
    fragmentShader: /* glsl */`
      varying vec3 vMundo;
      uniform float uT;
      uniform vec4 uOndas[${MAX_ONDAS}];
      uniform vec3 uLinterna;
      ${BRILLO_GLSL}
      const float VEL = 0.55;
      const float LONG = 0.16;
      void main(){
        vec2 p = vMundo.xz;
        vec2 grad = vec2(0.0);
        float anillos = 0.0;
        for (int k = 0; k < ${MAX_ONDAS}; k++){
          vec4 o = uOndas[k];
          float edad = uT - o.z;
          if (edad < 0.0 || edad > 5.0) continue;
          vec2 d = p - o.xy;
          float r = length(d) + 1e-4;
          float x = (r - edad * VEL) / LONG;
          float env = exp(-x * x * 0.3) * exp(-edad * 0.9) * o.w / (1.0 + r * 1.5);
          grad += (d / r) * cos(x * 6.2831) * env;
          float c = abs(fract(x) - 0.5);
          float linea = 1.0 - smoothstep(0.0, max(fwidth(x) * 1.3, 1e-4), 0.5 - c);
          anillos = max(anillos, linea * smoothstep(0.03, 0.3, env));
        }
        vec2 q = p + grad * 0.35;
        float lejos = q.y - ${ORILLA.toFixed(2)};
        // Reflejo del muro iluminado: se estira hacia el espectador y se apaga con la distancia
        float muro = brilloMuro(q.x + grad.x * 0.6) * exp(-lejos * 0.45);
        float estrias = 0.9 + 0.1 * sin(q.y * 9.0 + q.x * 1.3 + uT * 0.4);
        vec3 color = vec3(0.012, 0.013, 0.015);
        color += vec3(1.0, 0.72, 0.42) * muro * 0.16 * estrias;
        // Reflejo de la linterna: un trazo cálido vertical
        vec2 dl = vec2((q.x - uLinterna.x) * 3.0, (lejos - 0.6) * 0.35);
        color += vec3(1.0, 0.7, 0.38) * exp(-dot(dl, dl) * 2.0) * 0.25 * (0.6 + 0.4 * sin(q.y * 40.0 + uT * 2.0));
        // Anillos de tinta clara
        color = mix(color, vec3(0.86, 0.83, 0.78), anillos * 0.32);
        // Orilla en penumbra
        color *= smoothstep(-0.02, 0.35, lejos);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(fin - inicio + 20, 16), material);
  agua.rotation.x = -Math.PI / 2;
  agua.position.set((inicio + fin) / 2, NIVEL, ORILLA + 8);
  grupo.add(agua);

  const reloj = { t: 0 };
  function agregarOnda(x, z, fuerza = 1) {
    ondas[siguiente].set(x, z, reloj.t, fuerza);
    siguiente = (siguiente + 1) % MAX_ONDAS;
  }

  // Hojas de momiji que salen de la sala Camino, cruzan el engawa y caen al agua: el único rojo vivo.
  const geo = formaHojaMomiji(0.055);
  const mat = new THREE.MeshStandardMaterial({ color: 0xa3261f, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x2a0806 });
  const N = 9;
  const hojas = new THREE.InstancedMesh(geo, mat, N);
  const estado = Array.from({ length: N }, (_, i) => ({ x: 0, y: 0, z: 0, v: 0, f: i, flota: 0, xi: 0 }));
  const reiniciar = (h) => {
    h.xi = xCamino + (Math.random() - 0.5) * 3.5;
    h.x = h.xi; h.y = 3.0 + Math.random() * 1.2; h.z = 0.6 + Math.random() * 1.6;
    h.v = 0.18 + Math.random() * 0.12; h.flota = 0;
  };
  estado.forEach((h) => { reiniciar(h); h.y -= Math.random() * 3; });
  const o = new THREE.Object3D();
  grupo.add(hojas);

  const raycaster = new THREE.Raycaster();
  const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -NIVEL);
  const punto = new THREE.Vector3();
  let ultima = 0;

  function tocar(ndc, camara, fuerte = false) {
    raycaster.setFromCamera(ndc, camara);
    if (!raycaster.ray.intersectPlane(plano, punto)) return;
    if (punto.z < ORILLA + 0.05) return;
    const ahora = performance.now();
    if (!fuerte && ahora - ultima < 120) return;
    ultima = ahora;
    agregarOnda(punto.x, punto.z, fuerte ? 1.2 : 0.5);
  }

  function actualizar(t, dt, linterna) {
    reloj.t = t;
    u.uT.value = t;
    u.uLinterna.value.copy(linterna);
    estado.forEach((h, i) => {
      if (h.flota > 0) {
        h.flota += dt;
        h.x += 0.03 * dt;
        if (h.flota > 7) reiniciar(h);
      } else {
        h.y -= h.v * dt;
        h.z += 0.12 * dt;
        h.x = h.xi + Math.sin(t * 1.1 + h.f) * 0.35;
        if (h.y <= NIVEL + 0.01) {
          if (h.z > ORILLA + 0.05) { h.y = NIVEL + 0.01; h.flota = 0.001; agregarOnda(h.x, h.z, 0.7); }
          else reiniciar(h);
        }
      }
      o.position.set(h.x, h.y, h.z);
      if (h.flota > 0) o.rotation.set(-Math.PI / 2, 0, h.f + t * 0.1);
      else o.rotation.set(t * 1.5 + h.f, t * 0.9 + h.f, t * 0.5);
      o.updateMatrix();
      hojas.setMatrixAt(i, o.matrix);
    });
    hojas.instanceMatrix.needsUpdate = true;
  }

  return { grupo, tocar, actualizar, agregarOnda };
}
