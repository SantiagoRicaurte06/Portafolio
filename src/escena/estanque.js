// Estanque frente al engawa: agua casi negra que refleja el muro de shōji (con los cortes de los
// pilares), la linterna y una luna fría; ondas analíticas con anillos finos de tinta clara (gofun
// sobre sumi). Debajo nadan koi; encima vagan luciérnagas y flotan nenúfares y hojas de momiji.
import * as THREE from 'three';
import { BRILLO_GLSL } from './casa.js';
import { formaHojaMomiji } from './ocupantes.js';
import { SEPARACION } from './constantes.js';
import { crearKoi, KOI_GLSL, MAX_KOI } from './koi.js';
import { crearLuciernagas } from './luciernagas.js';

const MAX_ONDAS = 20;
const NIVEL = -0.28;
const ORILLA = 2.0;
const MICRO = 0.004; // micro-oleaje permanente (pendiente)

export function crearEstanque({ inicio, fin, uniformesBrillo, xCamino }) {
  const grupo = new THREE.Group();
  const ondas = Array.from({ length: MAX_ONDAS }, () => new THREE.Vector4(0, 0, -99, 0));
  let siguiente = 0;
  const koi = crearKoi(ondas);
  const u = {
    ...uniformesBrillo,
    ...koi.uniformes,
    uT: { value: 0 },
    uTM: { value: 0 },
    uMicro: { value: MICRO },
    uOndas: { value: ondas },
    uLinterna: { value: new THREE.Vector3(0, 1, -2.35) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: 'varying vec3 vMundo; void main(){ vec4 m = modelMatrix * vec4(position,1.0); vMundo = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }',
    fragmentShader: /* glsl */`
      varying vec3 vMundo;
      uniform float uT;
      uniform float uTM;
      uniform float uMicro;
      uniform vec4 uOndas[${MAX_ONDAS}];
      uniform vec3 uLinterna;
      ${BRILLO_GLSL}
      ${KOI_GLSL}
      const float VEL = 0.55;
      const float LONG = 0.16;
      const float NIVEL = ${NIVEL.toFixed(3)};
      const float ORILLA = ${ORILLA.toFixed(3)};
      const float SEP = ${SEPARACION.toFixed(3)};
      const vec3 AMBAR = vec3(1.0, 0.72, 0.42);

      // 1 lejos de los pilares (cada SEP metros, en (i - 0.5) * SEP), 0 sobre ellos
      float sinPilar(float x, float ancho, float suave){
        float d = abs(mod(x, SEP) - SEP * 0.5);
        return smoothstep(ancho, ancho + suave, d);
      }

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
          // anillo de tinta: una línea fina por cresta, más firme en el frente que en la estela
          float fw = fwidth(x);
          float dist = abs(fract(x + 0.5) - 0.5);
          float linea = 1.0 - smoothstep(0.0, fw + 0.035, dist);
          linea *= (1.0 - smoothstep(0.15, 0.9, fw)) * (1.0 - smoothstep(-0.2, 1.0, x));
          linea *= mix(0.4, 1.0, smoothstep(-1.6, -0.4, x));
          anillos = max(anillos, linea * smoothstep(0.015, 0.22, env));
        }
        // micro-oleaje: el reflejo respira aunque nadie toque el agua
        vec2 pm = p * vec2(1.0, 1.6);
        grad += uMicro * vec2(
          sin(pm.x * 2.3 + pm.y * 1.1 + uTM * 0.9) + 0.6 * sin(pm.x * 5.3 - pm.y * 3.7 + uTM * 1.6),
          sin(pm.y * 3.1 - pm.x * 0.7 + uTM * 1.1) + 0.6 * sin(pm.y * 6.9 + pm.x * 2.7 - uTM * 1.4));

        // Reflexión con la normal perturbada y fresnel: más espejo lejos, más hondo cerca
        vec3 vista = normalize(vMundo - cameraPosition);
        vec3 n = normalize(vec3(-grad.x * 0.5, 1.0, -grad.y * 0.5));
        vec3 r = reflect(vista, n);
        r.y = max(r.y, 0.02);
        float rz = min(r.z, -0.05);
        float fres = 0.02 + 0.98 * pow(1.0 - clamp(-dot(vista, n), 0.0, 1.0), 5.0);
        float refl = smoothstep(0.02, 0.42, fres);

        // El rayo reflejado llega al muro (z = 0): franja de shōji, ranma, marcos y pilares
        float tm = -vMundo.z / rz;
        float xw = vMundo.x + tm * r.x;
        float h = NIVEL + tm * r.y;
        float blur = 0.03 + tm * 0.02; // se estira y se ablanda con la distancia
        float panel = smoothstep(0.02 - blur, 0.02 + blur, h) * (1.0 - smoothstep(2.28 - blur, 2.28 + blur, h))
                    + 0.4 * smoothstep(2.44 - blur, 2.44 + blur, h) * (1.0 - smoothstep(2.92 - blur, 2.92 + blur, h));
        float xr = abs(mod(xw + SEP * 0.5, SEP) - SEP * 0.5);
        float marco = min(min(xr, abs(xr - 1.35)), abs(xr - 2.5));
        float pilares = sinPilar(xw, 0.08, 0.03 + blur * 0.5);
        // los pilares del borde del engawa (z = 1.98) cortan con otro paralaje
        float tf = (1.98 - vMundo.z) / rz;
        pilares *= sinPilar(vMundo.x + tf * r.x, 0.075, 0.02);
        float estrias = 0.86 + 0.14 * sin(vMundo.z * 30.0 + sin(vMundo.x * 1.3 + uTM * 0.3) * 2.0 + uTM * 0.5);
        float muro = brilloMuro(xw) * panel * mix(0.55, 1.0, smoothstep(0.03, 0.06 + blur * 0.5, marco)) * pilares;
        vec3 reflejo = AMBAR * muro * 0.3 * estrias;
        // La linterna detrás del papel: un halo cálido alargado
        float tl = (uLinterna.z - vMundo.z) / rz;
        vec2 dl = vec2(vMundo.x + tl * r.x - uLinterna.x, NIVEL + tl * r.y - uLinterna.y) * vec2(1.6, 0.9);
        reflejo += AMBAR * exp(-dot(dl, dl)) * 0.22 * pilares * smoothstep(0.0, 0.3, panel) * estrias;
        // Cielo nocturno por encima del alero (solo se ve en pantallas verticales)
        reflejo += vec3(0.018, 0.022, 0.03) * smoothstep(3.3, 3.6, NIVEL + tf * r.y);

        // Bajo el agua: penumbra que toma la luz de las salas y los koi como siluetas
        float mk = 0.0;
        float rojo = 0.0;
        vec2 pk = p + grad * 0.06;
        for (int k = 0; k < ${MAX_KOI}; k++){
          float mancha;
          mk = max(mk, siluetaKoi(pk, uKoi[k], uKoiB[k], mancha));
          rojo = max(rojo, mancha);
        }
        float luzAgua = brilloMuro(p.x) * exp(-(vMundo.z - ORILLA) * 0.7);
        vec3 fondo = (vec3(0.014, 0.015, 0.017) + AMBAR * luzAgua * 0.035) * (1.0 - mk * 0.8);
        fondo = mix(fondo, vec3(0.32, 0.05, 0.035) * (0.25 + luzAgua * 0.6), rojo * 0.5);
        reflejo *= 1.0 - mk * 0.55;

        vec3 color = mix(fondo, reflejo, refl);
        // Luna: un disco frío y tenue, quebrado por el oleaje
        float e = length(r - normalize(vec3(-0.35, 0.26, -1.0)));
        color += vec3(0.55, 0.62, 0.78) * ((1.0 - smoothstep(0.011, 0.016, e)) * 0.07 + exp(-e * e * 2500.0) * 0.02);
        // Anillos de tinta clara
        color = mix(color, vec3(0.86, 0.84, 0.8), anillos * 0.36);
        // Orilla en penumbra
        color *= smoothstep(-0.02, 0.35, vMundo.z - ORILLA);
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

  // ── Nenúfares: siluetas quietas cerca de la orilla, en grupitos a lo largo del pasillo ──
  const azar = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const pads = [];
  for (let x = inicio + azar() * 2; x < fin; x += 1.6 + azar() * 2.4) {
    const n = 1 + Math.floor(azar() * 3);
    for (let k = 0; k < n; k++) {
      const radio = 0.06 + azar() * 0.1;
      pads.push([x + (azar() - 0.5) * 0.6, ORILLA + 0.1 + radio + azar() * 0.45, radio, azar() * 6.28]);
    }
  }
  const nenufares = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 18, 0.25, Math.PI * 2 - 0.25),
    new THREE.MeshBasicMaterial({ color: 0x080a08 }),
    pads.length,
  );
  const o = new THREE.Object3D();
  pads.forEach(([x, z, radio, giro], i) => {
    o.position.set(x, NIVEL + 0.003, z);
    o.rotation.set(-Math.PI / 2, 0, giro);
    o.scale.set(radio, radio * 0.92, 1);
    o.updateMatrix();
    nenufares.setMatrixAt(i, o.matrix);
  });
  o.scale.set(1, 1, 1);
  grupo.add(nenufares);

  // ── Luciérnagas ──
  const luciernagas = crearLuciernagas({ nivel: NIVEL, orilla: ORILLA, cantidad: 32 });
  grupo.add(luciernagas.grupo);

  // ── Gotitas al tocar fuerte el agua ──
  const MAX_GOTAS = 36;
  const gotasPos = new Float32Array(MAX_GOTAS * 3);
  const gotasVida = new Float32Array(MAX_GOTAS);
  const gotasVel = new Float32Array(MAX_GOTAS * 3);
  const geoGotas = new THREE.BufferGeometry();
  geoGotas.setAttribute('position', new THREE.BufferAttribute(gotasPos, 3));
  geoGotas.setAttribute('aVida', new THREE.BufferAttribute(gotasVida, 1));
  const gotas = new THREE.Points(geoGotas, new THREE.ShaderMaterial({
    uniforms: { uTam: { value: 9 * Math.min(globalThis.devicePixelRatio || 1, 2) } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */`
      attribute float aVida;
      uniform float uTam;
      varying float vVida;
      void main(){
        vVida = aVida;
        vec4 mv = viewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aVida > 0.0 ? clamp(uTam / -mv.z, 1.0, 4.0) : 0.0;
      }`,
    fragmentShader: /* glsl */`
      varying float vVida;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float a = 1.0 - smoothstep(0.2, 0.5, length(c));
        gl_FragColor = vec4(vec3(0.86, 0.84, 0.8), a * min(vVida * 2.0, 0.8));
        #include <colorspace_fragment>
      }`,
  }));
  gotas.frustumCulled = false;
  grupo.add(gotas);
  let gotasVivas = 0;
  function salpicar(x, z) {
    let n = 7;
    for (let i = 0; i < MAX_GOTAS && n > 0; i++) {
      if (gotasVida[i] > 0) continue;
      const ang = Math.random() * Math.PI * 2;
      const lat = 0.25 + Math.random() * 0.35;
      gotasPos.set([x, NIVEL + 0.01, z], i * 3);
      gotasVel.set([Math.cos(ang) * lat, 0.9 + Math.random() * 0.6, Math.sin(ang) * lat], i * 3);
      gotasVida[i] = 1;
      n--;
    }
    gotasVivas = MAX_GOTAS;
  }
  function moverGotas(dt) {
    if (!gotasVivas) return;
    gotasVivas = 0;
    for (let i = 0; i < MAX_GOTAS; i++) {
      if (gotasVida[i] <= 0) continue;
      gotasVel[i * 3 + 1] -= 5.5 * dt;
      gotasPos[i * 3] += gotasVel[i * 3] * dt;
      gotasPos[i * 3 + 1] += gotasVel[i * 3 + 1] * dt;
      gotasPos[i * 3 + 2] += gotasVel[i * 3 + 2] * dt;
      gotasVida[i] = gotasPos[i * 3 + 1] < NIVEL ? 0 : Math.max(0, gotasVida[i] - dt * 0.9);
      if (gotasVida[i] > 0) gotasVivas++;
    }
    geoGotas.attributes.position.needsUpdate = true;
    geoGotas.attributes.aVida.needsUpdate = true;
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
  grupo.add(hojas);

  const raycaster = new THREE.Raycaster();
  const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -NIVEL);
  const punto = new THREE.Vector3();
  let ultima = 0;
  let quietoActual = false;

  function tocar(ndc, camara, fuerte = false) {
    raycaster.setFromCamera(ndc, camara);
    if (!raycaster.ray.intersectPlane(plano, punto)) return;
    if (punto.z < ORILLA + 0.05) return;
    const ahora = performance.now();
    if (!fuerte && ahora - ultima < 120) return;
    ultima = ahora;
    agregarOnda(punto.x, punto.z, fuerte ? 1.2 : 0.5);
    if (fuerte && !quietoActual) salpicar(punto.x, punto.z);
  }

  function actualizar(t, dt, linterna, quieto = false) {
    quietoActual = quieto;
    reloj.t = t;
    u.uT.value = t;
    u.uLinterna.value.copy(linterna);
    // con menos movimiento el agua no respira sola; solo responde al visitante
    if (!quieto) u.uTM.value = t;
    u.uMicro.value = quieto ? 0 : MICRO;
    koi.actualizar(t, dt, linterna.x + 0.4, quieto);
    luciernagas.actualizar(t, quieto);
    moverGotas(dt);
    hojas.visible = !quieto;
    if (quieto) return;
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
