// Hotaru: puntos cálidos que vagan sobre el estanque y parpadean lento, con su reflejo tenue.
// Todo el movimiento va en el vertex shader (sin trabajo de CPU por cuadro). Se repiten en una
// ventana alrededor de la cámara, así bastan unas pocas para todo el pasillo.
import * as THREE from 'three';

const VENTANA = 14;

export function crearLuciernagas({ nivel, orilla, cantidad = 32 }) {
  const base = new Float32Array(cantidad * 3);
  const semilla = new Float32Array(cantidad * 4);
  for (let i = 0; i < cantidad; i++) {
    base[i * 3] = (Math.random() - 0.5) * VENTANA;
    base[i * 3 + 1] = nivel + 0.12 + Math.random() * 1.15;
    base[i * 3 + 2] = orilla + 0.3 + Math.random() * 2.4;
    semilla.set([Math.random() * 6.2832, 0.6 + Math.random() * 0.8, Math.random(), Math.random()], i * 4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(base, 3));
  geo.setAttribute('aSemilla', new THREE.BufferAttribute(semilla, 4));

  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const comunes = {
    uT: { value: 0 },
    uBrillo: { value: 1 },
    uTam: { value: 24 * dpr },
  };
  const material = (espejo) => new THREE.ShaderMaterial({
    uniforms: { ...comunes },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aSemilla;
      uniform float uT;
      uniform float uTam;
      varying float vLuz;
      const float NIVEL = ${nivel.toFixed(3)};
      const float ORILLA = ${orilla.toFixed(3)};
      const float VENTANA = ${VENTANA.toFixed(1)};
      void main(){
        vec3 q = position;
        float s = aSemilla.x;
        float lento = aSemilla.y;
        // deriva en lazos lentos
        q.x += sin(uT * 0.13 * lento + s) * 0.6 + sin(uT * 0.31 + s * 2.0) * 0.18;
        q.y += sin(uT * 0.23 * lento + s * 1.7) * 0.16;
        q.z += cos(uT * 0.11 * lento + s * 0.6) * 0.35;
        q.z = max(q.z, ORILLA + 0.15);
        q.y = max(q.y, NIVEL + 0.06);
        // se repiten a lo largo del pasillo en una ventana centrada en la cámara
        float rel = mod(q.x - cameraPosition.x + VENTANA * 0.5, VENTANA) - VENTANA * 0.5;
        q.x = cameraPosition.x + rel;
        float borde = 1.0 - smoothstep(VENTANA * 0.36, VENTANA * 0.5, abs(rel));
        // parpadeo lento: encendidas un rato, casi apagadas otro
        float ciclo = sin(uT * (0.3 + 0.35 * aSemilla.z) + s * 3.1);
        vLuz = (0.05 + smoothstep(0.05, 0.85, ciclo)) * borde * (0.6 + 0.4 * aSemilla.w);
        ${espejo ? `
        // reflejo: el punto simétrico bajo el agua, llevado al plano del agua por el rayo de la cámara
        vec3 m = vec3(q.x, 2.0 * NIVEL - q.y, q.z);
        vec3 c = cameraPosition;
        vec3 w = c + (m - c) * ((c.y - NIVEL) / (c.y - m.y));
        w.y = NIVEL + 0.004;
        vLuz *= 0.3 * smoothstep(ORILLA, ORILLA + 0.25, w.z);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
        gl_PointSize = clamp(uTam / distance(c, m), 1.0, 10.0);` : `
        vec4 mv = viewMatrix * vec4(q, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uTam / -mv.z, 1.0, 14.0);`}
      }`,
    fragmentShader: /* glsl */`
      uniform float uBrillo;
      varying float vLuz;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d2 = dot(c, c) * 4.0;
        float a = exp(-d2 * 14.0) * 0.9 + max(0.0, 1.0 - d2) * 0.18;
        gl_FragColor = vec4(vec3(1.0, 0.76, 0.4) * a * vLuz * uBrillo, 1.0);
        #include <colorspace_fragment>
      }`,
  });

  const grupo = new THREE.Group();
  for (const espejo of [false, true]) {
    const puntos = new THREE.Points(geo, material(espejo));
    puntos.frustumCulled = false; // se mueven en el shader
    grupo.add(puntos);
  }

  function actualizar(t, quieto) {
    // con menos movimiento quedan fijas donde estaban y más tenues
    if (!quieto) comunes.uT.value = t;
    comunes.uBrillo.value = quieto ? 0.45 : 1;
  }

  return { grupo, actualizar };
}
