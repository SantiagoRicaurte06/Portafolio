// La escena 3D de la casa. Se importa de forma diferida: el contenido HTML ya está visible antes.
import * as THREE from 'three';
import { SEPARACION as S, ALTURA_OJOS, DISTANCIA_CAMARA } from './constantes.js';
import { hornearWashi } from './washi.js';
import { crearCasa } from './casa.js';
import { crearEstanque } from './estanque.js';
import { mostrarOcupantes } from './ocupantes.js';

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const llama = (t) => 0.86 + 0.07 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 17.9 + 1.3) + 0.03 * Math.sin(t * 3.1 + 0.4);

export function crearEscena(canvas, { salas, calidad, menosMovimiento = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: calidad.antialias, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, calidad.dpr));
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x070605);
  escena.fog = new THREE.Fog(0x070605, 9, 22);

  const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 60);

  const washi = hornearWashi(renderer, calidad.washi);
  const { casa, registro, uniformesBrillo, inicio, fin } = crearCasa({ salas, washi, calidad });
  escena.add(casa);

  const iCamino = salas.findIndex((s) => s.id === 'camino');
  const estanque = crearEstanque({ inicio, fin, uniformesBrillo, xCamino: Math.max(0, iCamino) * S });
  escena.add(estanque.grupo);

  // Luna: muy tenue y fría, solo para recortar pilares y vigas
  escena.add(new THREE.HemisphereLight(0x8a96b0, 0x0a0806, 0.22));
  const luna = new THREE.DirectionalLight(0xa8b4d0, 0.35);
  luna.position.set(-6, 9, 8);
  escena.add(luna);

  // La linterna andon: la única luz con sombra. Viaja a la sala activa y sigue al cursor.
  const andon = new THREE.SpotLight(0xffc98a, 26, 7, THREE.MathUtils.degToRad(68), 0.85, 1.6);
  andon.castShadow = true;
  andon.shadow.mapSize.set(calidad.sombra, calidad.sombra);
  andon.shadow.radius = 5;
  andon.shadow.bias = -0.0006;
  andon.shadow.normalBias = 0;
  andon.shadow.camera.near = 0.2;
  andon.shadow.camera.far = 6;
  andon.shadow.camera.layers.set(1);
  escena.add(andon, andon.target);
  const relleno = new THREE.PointLight(0xffd6a6, 0, 6, 1.4);
  escena.add(relleno);

  const estado = { posicion: 0, local: 0, cursor: new THREE.Vector2(0, 0), cursorSuave: new THREE.Vector2(0, 0), ancho: 1, alto: 1 };
  const reloj = { previo: performance.now(), elapsedTime: 0, getDelta() { const ahora = performance.now(); const d = (ahora - this.previo) / 1000; this.previo = ahora; this.elapsedTime += Math.min(d, 0.1); return d; } };
  let corriendo = true;

  function redimensionar(ancho, alto) {
    estado.ancho = ancho; estado.alto = alto;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.fov = camara.aspect < 0.8 ? 52 : 38;
    camara.updateProjectionMatrix();
  }

  function cuadro() {
    if (!corriendo) return;
    const dt = Math.min(0.05, reloj.getDelta());
    const t = reloj.elapsedTime;
    estado.cursorSuave.lerp(estado.cursor, 1 - Math.exp(-dt * 5));

    // Cámara: avanza por el pasillo; la sala queda a la izquierda y el texto a la derecha
    const vertical = camara.aspect < 0.8;
    // En la entrada la casa queda a la derecha (el nombre va a la izquierda); en las salas, al revés.
    const desfase = vertical ? 0 : -1.7 + 2.85 * suave(0, 1, Math.min(1, estado.posicion));
    const salaX = estado.posicion * S;
    const empuje = suave(0.05, 0.6, estado.local) * (Math.abs(estado.posicion - Math.round(estado.posicion)) < 0.02 ? 1 : 0);
    camara.position.set(
      salaX + desfase + estado.cursorSuave.x * 0.08,
      ALTURA_OJOS + (vertical ? 0.35 : 0) + (menosMovimiento ? 0 : Math.sin(salaX * 1.3) * 0.012) - estado.cursorSuave.y * 0.04,
      (vertical ? 8.6 : DISTANCIA_CAMARA) - empuje * 0.9,
    );
    // En celular la casa sube a la mitad superior: el panel ocupa la de abajo
    camara.lookAt(salaX + desfase * 0.55, vertical ? 0.05 : 1.3, 0);

    // Salas: potencia, sombras y apertura de puertas según la distancia a la cámara
    const activa = Math.round(estado.posicion);
    registro.forEach((r, i) => {
      const distancia = Math.abs(estado.posicion - i);
      const cerca = 1 - suave(0.15, 0.6, distancia);
      const parpadeo = llama(t + i * 1.7);
      r.potencia = (0.38 + 0.62 * cerca) * parpadeo;
      uniformesBrillo.uSalasP.value[i] = r.tipo === 'ma' ? 0.15 : r.potencia;
      if (r.tipo !== 'sala') return;
      const apertura = i === activa ? suave(0.14, 0.5, estado.local) * (1 - suave(0.0, 0.25, distancia)) : 0;
      r.apertura += (apertura - r.apertura) * (1 - Math.exp(-dt * 6));
      uniformesBrillo.uSalasA.value[i] = r.apertura;
      r.hojas.forEach((h) => { h.position.x = h.userData.cerrada + h.userData.lado * r.apertura * 1.3; });
      const abierta = r.apertura > 0.02;
      r.interior.visible = abierta;
      if (r.ocupantes && r.ocupantes.visibles !== abierta) { mostrarOcupantes(r.ocupantes, abierta); r.ocupantes.visibles = abierta; }
      const sombra = i === activa ? 1 - suave(0.3, 0.5, distancia) : 0;
      for (const m of [r.material, r.materialRanma]) {
        m.uniforms.uPotencia.value = r.potencia;
        m.uniforms.uSombra.value = sombra;
      }
      // Con menos movimiento las cosas de la sala quedan quietas (la linterna la sigue moviendo el visitante)
      if (r.ocupantes?.animar && distancia < 1.2 && !menosMovimiento) r.ocupantes.animar(t, dt);
      r.ocupantes && (r.ocupantes.grupo.visible = distancia < 1.5);
    });

    // La linterna dentro de la sala activa sigue al cursor
    const rActiva = registro[activa];
    if (rActiva && rActiva.tipo === 'sala') {
      const lx = rActiva.x + estado.cursorSuave.x * 1.6;
      const ly = 0.95 + estado.cursorSuave.y * 0.55;
      andon.position.set(lx + Math.sin(t * 2.3) * 0.01, ly, -2.35);
      andon.target.position.set(rActiva.x + estado.cursorSuave.x * 0.5, 1.05, 0);
      andon.intensity = 26 * llama(t);
      andon.visible = true;
      for (const m of [rActiva.material, rActiva.materialRanma]) m.uniforms.uLuz.value.set(lx, ly + 0.2, -2.0);
      relleno.position.set(rActiva.x - 0.6, 2.0, -0.35);
      relleno.intensity = 2.2 * rActiva.apertura;
    } else {
      andon.visible = false;
      relleno.intensity = 0;
    }

    estanque.actualizar(t, dt, andon.position, menosMovimiento);
    renderer.render(escena, camara);
  }

  renderer.setAnimationLoop(cuadro);

  return {
    redimensionar,
    // posicion: 0..n-1 por el pasillo; local: 0..1 dentro de la pausa de la sala actual
    avanzar(posicion, local) { estado.posicion = posicion; estado.local = local; },
    apuntar(x, y) { estado.cursor.set(x, y); estanque.tocar(estado.cursor, camara); },
    tocarAgua(x, y) { estanque.tocar(new THREE.Vector2(x, y), camara, true); },
    pausar(p) { corriendo = !p; renderer.setAnimationLoop(p ? null : cuadro); if (!p) reloj.getDelta(); },
    info: () => renderer.info,
  };
}
