// Objetos de la sala camino: un momiji, protagonista de las sombras. Solo proyectan sombra
// hasta que la puerta se abre.
// - Tronco con curvatura y ramificación recursiva (semilla fija: el árbol es siempre el mismo).
// - Las ramas se agrupan en jerarquía (líderes → ramas) que se mecen con el viento en la CPU;
//   las hojas aletean en el shader (también en la sombra, con un customDepthMaterial).
// - Hojas que caen como hojas de verdad: péndulo, se aceleran al pasar por abajo, giran y se posan.
// Presupuesto: ≈18 draw calls y ≈17k triángulos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ROJO = 0x8e2a22;
const NIVEL_MAX = 4;
const HOJAS_POR_RACIMO = 8;
const CAEN = 16;
const EN_EL_PISO = 26;

// Pseudoaleatorio con semilla (mulberry32)
function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fusiona geometrías de un mismo material (conserva posición, normal y color).
function fusionar(geos) {
  const limpias = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  return mergeGeometries(limpias);
}

// Hoja palmada de siete lóbulos lanceolados con su pecíolo (la base está en el origen, la punta hacia +y).
function hojaMomiji(r) {
  const s = new THREE.Shape();
  const polar = (ang, rad) => [Math.cos(ang) * rad * r, Math.sin(ang) * rad * r];
  const pw = r * 0.03;
  s.moveTo(-pw, -r * 0.5);
  s.lineTo(pw, -r * 0.5);
  s.lineTo(pw, -r * 0.1);
  // [desvío desde la vertical en grados, largo relativo]; de la derecha-abajo hacia la izquierda-abajo
  const lobulos = [[118, 0.45], [78, 0.74], [39, 0.92], [0, 1], [-39, 0.92], [-78, 0.74], [-118, 0.45]];
  lobulos.forEach(([desvio, largo], i) => {
    const phi = THREE.MathUtils.degToRad(90 - desvio);
    if (i > 0) {
      const previo = THREE.MathUtils.degToRad(90 - lobulos[i - 1][0]);
      s.lineTo(...polar((phi + previo) / 2, 0.3));
    }
    s.lineTo(...polar(phi - 0.2, 0.55 * largo));
    s.lineTo(...polar(phi, largo));
    s.lineTo(...polar(phi + 0.2, 0.55 * largo));
  });
  s.lineTo(-pw, -r * 0.1);
  return new THREE.ShapeGeometry(s);
}

// Tubo ahusado sobre una polilínea (marcos por transporte paralelo, sin torsiones).
function tubo(puntos, radios, lados) {
  const pos = [], nor = [], idx = [];
  let normal = new THREE.Vector3();
  const tan = new THREE.Vector3(), bin = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < puntos.length; i++) {
    const a = puntos[Math.max(0, i - 1)], b = puntos[Math.min(puntos.length - 1, i + 1)];
    tan.subVectors(b, a).normalize();
    if (i === 0) {
      normal.set(0, 0, 1);
      if (Math.abs(tan.z) > 0.9) normal.set(1, 0, 0);
    }
    normal.addScaledVector(tan, -normal.dot(tan)).normalize();
    bin.crossVectors(tan, normal);
    for (let k = 0; k < lados; k++) {
      const ang = (k / lados) * Math.PI * 2;
      v.copy(normal).multiplyScalar(Math.cos(ang)).addScaledVector(bin, Math.sin(ang));
      nor.push(v.x, v.y, v.z);
      pos.push(puntos[i].x + v.x * radios[i], puntos[i].y + v.y * radios[i], puntos[i].z + v.z * radios[i]);
    }
  }
  for (let i = 0; i < puntos.length - 1; i++) {
    for (let k = 0; k < lados; k++) {
      const a = i * lados + k, b = i * lados + ((k + 1) % lados);
      // Orden antihorario visto desde fuera: la cara exterior es la visible
      idx.push(a, b, a + lados, b, b + lados, a + lados);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

// Aleteo de las hojas en el vértice: giro alrededor del pecíolo y un leve cabeceo, con fase por instancia.
function conAleteo(mat, uniformes, clave) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTiempo = uniformes.uTiempo;
    sh.uniforms.uViento = uniformes.uViento;
    sh.vertexShader = 'uniform float uTiempo;\nuniform float uViento;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  float mjFase = dot(instanceMatrix[3].xyz, vec3(17.13, 31.7, 23.9));
  float mjGiro = uViento * (0.55 * sin(uTiempo * 2.3 + mjFase) + 0.45 * sin(uTiempo * 5.3 + mjFase * 1.7));
  float mjC = cos(mjGiro), mjS = sin(mjGiro);
  transformed.xz = mat2(mjC, mjS, -mjS, mjC) * transformed.xz;
  float mjB = mjGiro * 0.6;
  transformed.yz = mat2(cos(mjB), sin(mjB), -sin(mjB), cos(mjB)) * transformed.yz;
#endif`);
  };
  mat.customProgramCacheKey = () => clave;
  return mat;
}

// Piedras facetadas y musgo al pie del árbol (un solo mesh con color por vértice).
function piedrasYMusgo(rnd) {
  const geos = [];
  const deformar = (g, fuerza) => {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      // El desplazamiento depende solo de la posición: los vértices repetidos se mueven igual (sin grietas)
      const n = Math.sin(x * 41.3 + y * 17.1) * Math.sin(z * 29.7 - y * 23.9) * Math.cos(x * 13.7 + z * 11.3);
      const f = 1 + fuerza * n;
      p.setXYZ(i, x * f, y * f, z * f);
    }
    g.computeVertexNormals();
    return g;
  };
  const pintar = (g, hex) => {
    const c = new THREE.Color(hex);
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) { const k = 0.85 + rnd() * 0.3; col[i] = c.r * k; col[i + 1] = c.g * k; col[i + 2] = c.b * k; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  };
  const piedras = [[-0.32, -1.18, 0.13, 0.48, 0.4], [0.42, -1.38, 0.095, 0.55, 1.3], [0.62, -0.98, 0.06, 0.6, 2.2], [-0.62, -0.9, 0.05, 0.5, 0.9]];
  for (const [x, z, r, aplastar, giro] of piedras) {
    const g = deformar(new THREE.IcosahedronGeometry(r, 1), 0.28);
    g.scale(1.25, aplastar, 1).rotateY(giro).translate(x, r * aplastar * 0.55, z);
    geos.push(pintar(g, 0x3b3a37));
    // Musgo en la cara de arriba de cada piedra
    for (let k = 0; k < 3; k++) {
      const m = deformar(new THREE.IcosahedronGeometry(r * (0.35 + rnd() * 0.25), 0), 0.35);
      m.scale(1.4, 0.32, 1.1).translate(x + (rnd() - 0.5) * r, r * aplastar * 1.0, z + (rnd() - 0.5) * r * 0.8);
      geos.push(pintar(m, 0x2e322b));
    }
  }
  // Musgo alrededor del pie del tronco
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + rnd() * 0.5;
    const d = 0.08 + rnd() * 0.12;
    const m = deformar(new THREE.IcosahedronGeometry(0.035 + rnd() * 0.03, 0), 0.35);
    m.scale(1.5, 0.28, 1.2).translate(0.08 + Math.cos(a) * d, 0.006, -1.25 + Math.sin(a) * d * 0.7);
    geos.push(pintar(m, 0x2e322b));
  }
  return new THREE.Mesh(fusionar(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
}

export function camino() {
  const g = new THREE.Group();
  const rnd = azar(20261112);
  const corteza = new THREE.MeshStandardMaterial({ color: 0x1d1714, roughness: 1 });
  const uniformes = { uTiempo: { value: 0 }, uViento: { value: 0.3 } };
  const matHoja = conAleteo(new THREE.MeshStandardMaterial({ color: ROJO, roughness: 0.8, side: THREE.DoubleSide }), uniformes, 'momiji-aleteo');
  const sombraHoja = conAleteo(new THREE.MeshDepthMaterial(), uniformes, 'momiji-aleteo-sombra');
  const geoHoja = hojaMomiji(0.058);

  // Grupos que se mecen: el tronco (quieto), los líderes y, colgando de ellos, las ramas
  const grupos = [];
  const nuevoGrupo = (pivote, padre, nivel) => {
    const nodo = new THREE.Group();
    nodo.position.copy(pivote).sub(padre ? padre.pivote : new THREE.Vector3());
    (padre ? padre.nodo : g).add(nodo);
    const gr = { nodo, pivote: pivote.clone(), geos: [], hojas: [], nivel, fase: rnd() * 10, largo: 0 };
    grupos.push(gr);
    return gr;
  };
  const racimos = []; // puntos del follaje (coordenadas de la sala) para que nazcan las hojas que caen

  const o = new THREE.Object3D();
  const Z = new THREE.Vector3(0, 0, 1), Y = new THREE.Vector3(0, 1, 0);
  const X = new THREE.Vector3(1, 0, 0);
  const qLadeo = new THREE.Quaternion(), qPlano = new THREE.Quaternion(), qGiro = new THREE.Quaternion();

  function racimo(gr, centro, dir) {
    racimos.push(centro.clone());
    for (let j = 0; j < HOJAS_POR_RACIMO; j++) {
      // Las hojas se abren en abanico alrededor de la punta, más hacia adelante y hacia abajo
      const desv = new THREE.Vector3((rnd() - 0.5) * 0.2, (rnd() - 0.62) * 0.11, (rnd() - 0.5) * 0.12);
      const p = centro.clone().addScaledVector(dir, 0.035 + rnd() * 0.03).add(desv);
      const hacia = Math.atan2(desv.y - 0.01, desv.x) - Math.PI / 2;
      o.position.copy(p).sub(gr.pivote);
      o.rotation.set((rnd() - 0.5) * 1.1, (rnd() - 0.5) * 1.0, hacia + (rnd() - 0.5) * 0.7, 'ZXY');
      o.scale.setScalar(0.75 + rnd() * 0.5);
      o.updateMatrix();
      gr.hojas.push(o.matrix.clone());
    }
  }

  function crecer(origen, dir, largo, r0, nivel, gr) {
    const pasos = [10, 7, 5, 4, 3][nivel];
    const r1 = Math.max(0.0035, r0 * (nivel === 0 ? 0.6 : 0.62));
    const puntos = [origen.clone()];
    const radios = [r0 + (nivel === 0 ? 0.04 : 0)];
    const p = origen.clone(), d = dir.clone();
    const curva = [0.1, 0.32, 0.4, 0.45, 0.5][nivel];
    for (let k = 1; k <= pasos; k++) {
      d.x += (rnd() - 0.5) * curva;
      d.y += (rnd() - 0.5) * curva * 0.6;
      d.z += (rnd() - 0.5) * curva * 0.3;
      if (nivel === 0) d.x += 0.09 * Math.sin(k * 0.75 + 0.4); // la ese del tronco
      if (nivel >= 2) d.y += (0.12 - d.y) * 0.22;              // pisos casi horizontales, la punta apenas sube
      if (p.y > 1.7) d.y -= 0.25;
      if (p.z > -0.7) d.z -= 0.12;
      if (p.z < -1.5) d.z += 0.12;
      d.normalize();
      p.addScaledVector(d, largo / pasos);
      puntos.push(p.clone());
      const u = k / pasos;
      radios.push(Math.max(0.0035, THREE.MathUtils.lerp(r0, r1, u)) + (nivel === 0 ? 0.04 * Math.exp(-u * 9) : 0));
    }
    gr.geos.push(tubo(puntos.map((q) => q.clone().sub(gr.pivote)), radios, [8, 6, 5, 4, 4][nivel]));
    gr.largo = Math.max(gr.largo, largo);

    if (nivel === NIVEL_MAX) { racimo(gr, p, d); return; }
    if (nivel === 3) racimo(gr, puntos[2], d);
    // Una ramita lateral a media rama: rellena el interior de la copa
    if (nivel === 2 && rnd() < 0.7) {
      const lado = rnd() < 0.5 ? -1 : 1;
      const nd = d.clone().applyAxisAngle(Z, lado * (0.6 + rnd() * 0.4)).normalize();
      crecer(puntos[2], nd, largo * 0.45, r0 * 0.35, NIVEL_MAX, gr);
    }
    const hijos = nivel === 0 ? 3 : nivel === 1 ? 2 : (rnd() < 0.3 ? 3 : 2);
    const abanico = [0.8, 0.62, 0.55, 0.5][nivel];
    for (let i = 0; i < hijos; i++) {
      const centro = (i - (hijos - 1) / 2);
      const nd = d.clone()
        .applyAxisAngle(Z, centro * abanico * (hijos === 3 ? 1 : 1.2) + (rnd() - 0.5) * 0.3)
        .applyAxisAngle(Y, (rnd() - 0.5) * 0.9)
        .normalize();
      const destino = nivel <= 1 ? nuevoGrupo(p, gr, nivel + 1) : gr;
      const factor = nivel === 0 ? 0.72 : 0.72 + rnd() * 0.12;
      crecer(p, nd, largo * factor, r1 * (hijos === 3 ? 0.78 : 0.86), nivel + 1, destino);
    }
  }

  const raiz = nuevoGrupo(new THREE.Vector3(), null, 0);
  const base = new THREE.Vector3(0.08, 0, -1.25);
  crecer(base, new THREE.Vector3(0.06, 1, 0.02).normalize(), 0.72, 0.05, 0, raiz);
  // Raíces que asoman sobre el piso
  for (const [ang, largo] of [[0.3, 0.2], [2.4, 0.17], [4.2, 0.14]]) {
    const pts = [], rs = [];
    for (let k = 0; k <= 4; k++) {
      const u = k / 4;
      pts.push(new THREE.Vector3(base.x + Math.cos(ang) * largo * u, 0.03 * (1 - u) + 0.004, base.z + Math.sin(ang) * largo * u * 0.7));
      rs.push(0.03 * (1 - u) + 0.006);
    }
    raiz.geos.push(tubo(pts, rs, 4));
  }

  // Un mesh de madera por grupo y, si tiene follaje, un InstancedMesh de hojas
  for (const gr of grupos) {
    if (gr.geos.length) gr.nodo.add(new THREE.Mesh(fusionar(gr.geos), corteza));
    if (gr.hojas.length) {
      const hojas = new THREE.InstancedMesh(geoHoja, matHoja, gr.hojas.length);
      gr.hojas.forEach((m, i) => hojas.setMatrixAt(i, m));
      hojas.customDepthMaterial = sombraHoja;
      hojas.computeBoundingSphere();
      gr.nodo.add(hojas);
    }
  }

  g.add(piedrasYMusgo(rnd));

  // Hojas que caen (primeras CAEN instancias) y hojas posadas en el piso (el resto)
  const matSuelta = new THREE.MeshStandardMaterial({ color: ROJO, roughness: 0.85, side: THREE.DoubleSide });
  const sueltas = new THREE.InstancedMesh(geoHoja, matSuelta, CAEN + EN_EL_PISO);
  sueltas.frustumCulled = false;
  const posar = (i, x, z, giro) => {
    o.position.set(x, 0.004 + i * 0.00005, z);
    o.rotation.set(-Math.PI / 2 + (rnd() - 0.5) * 0.15, 0, giro, 'XYZ');
    o.scale.setScalar(0.8 + rnd() * 0.4);
    o.updateMatrix();
    sueltas.setMatrixAt(i, o.matrix);
  };
  for (let i = CAEN; i < CAEN + EN_EL_PISO; i++) {
    const a = rnd() * Math.PI * 2, d = 0.15 + Math.pow(rnd(), 0.7) * 0.85;
    posar(i, base.x + Math.cos(a) * d, THREE.MathUtils.clamp(base.z + Math.sin(a) * d * 0.45, -1.55, -0.4), rnd() * 6.28);
  }
  const caida = Array.from({ length: CAEN }, () => ({}));
  const nacer = (h, primeraVez) => {
    const r = racimos[Math.floor(rnd() * racimos.length)];
    h.x0 = r.x; h.y = primeraVez ? 0.15 + rnd() * (r.y - 0.15) : r.y;
    h.z = THREE.MathUtils.clamp(r.z, -1.5, -0.5);
    h.fase = rnd() * 6.28;
    h.w = 1.6 + rnd() * 1.2;          // frecuencia del péndulo
    h.A = 0.05 + rnd() * 0.08;        // amplitud del vaivén
    h.v = 0.1 + rnd() * 0.07;         // caída media
    h.deriva = (rnd() - 0.35) * 0.06; // el aire empuja un poco hacia un lado
    h.inclina = 0.4 + rnd() * 0.6;    // cuánto se ladea en cada vaivén
    h.base = rnd() * 0.9;             // no todas caen planas: así su sombra se lee
    h.yaw = rnd() * 6.28;
    h.giro = (rnd() - 0.5) * 2.4;
    h.tumbo = rnd() < 0.25 ? 4 + rnd() * 4 : 0; // algunas dan vueltas de canto
    h.rodar = 0;
    h.reposo = 0;
  };
  caida.forEach((h) => nacer(h, true));

  const animar = (t, dt) => {
    // Ráfagas: una envolvente lenta que modula todo el viento
    const rafaga = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.29)) * (0.5 + 0.5 * Math.sin(t * 0.53 + 1.7));
    uniformes.uTiempo.value = t;
    uniformes.uViento.value = 0.12 + 0.28 * rafaga;
    for (const gr of grupos) {
      if (gr.nivel === 0) continue;
      const amp = (gr.nivel === 1 ? 0.018 : 0.04) * rafaga;
      const f = gr.nivel === 1 ? 0.7 : 1.25;
      gr.nodo.rotation.z = amp * (0.65 * Math.sin(t * f + gr.fase) + 0.35 * Math.sin(t * f * 2.3 + gr.fase * 1.7));
      gr.nodo.rotation.x = amp * 0.4 * Math.sin(t * f * 0.8 + gr.fase * 2.1);
    }

    caida.forEach((h, i) => {
      if (h.reposo > 0) {
        h.reposo -= dt;
        if (h.reposo <= 0) nacer(h, false);
        return;
      }
      h.fase += h.w * dt;
      const s = Math.sin(h.fase), c = Math.cos(h.fase);
      // Péndulo: cae rápido al pasar por abajo (c² alto) y casi se detiene en los extremos
      h.y -= h.v * (0.35 + 1.3 * c * c) * dt;
      h.x0 += h.deriva * rafaga * dt;
      h.yaw += h.giro * dt;
      h.rodar += h.tumbo * dt;
      if (h.y <= 0.004) {
        posar(i, h.x0 + h.A * s, h.z, h.yaw);
        h.reposo = 3 + rnd() * 6;
        return;
      }
      o.position.set(h.x0 + h.A * s, h.y, h.z + 0.025 * Math.sin(h.fase * 0.5));
      // Plana con el envés hacia abajo, ladeada hacia el lado del vaivén
      qLadeo.setFromAxisAngle(Z, h.inclina * s);
      qPlano.setFromAxisAngle(X, -Math.PI / 2 + h.base + h.rodar);
      qGiro.setFromAxisAngle(Z, h.yaw);
      o.quaternion.copy(qLadeo).multiply(qPlano).multiply(qGiro);
      o.scale.setScalar(1);
      o.updateMatrix();
      sueltas.setMatrixAt(i, o.matrix);
    });
    sueltas.instanceMatrix.needsUpdate = true;
  };
  animar(0, 0);
  g.add(sueltas);

  return { grupo: g, animar, sombraViva: true };
}
