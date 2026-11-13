// La escena 3D de la casa. Se importa de forma diferida: el contenido HTML ya está visible antes.
import * as THREE from 'three';
import { SEPARACION as S, ALTURA_OJOS, DISTANCIA_CAMARA } from './constantes.js';
import { hornearWashi } from './washi.js';
import { crearCasa } from './casa.js';
import { crearEstanque } from './estanque.js';
import { mostrarOcupantes } from './ocupantes.js';
import { crearPolvo, crearNiebla } from './atmosfera.js';
import { crearPostproceso, soportaPostproceso } from './postproceso.js';

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const llama = (t) => 0.86 + 0.07 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 17.9 + 1.3) + 0.03 * Math.sin(t * 3.1 + 0.4);
// Acercamiento exponencial independiente de los fps
const hacia = (actual, objetivo, dt, rapidez) => actual + (objetivo - actual) * (1 - Math.exp(-dt * rapidez));
// Resorte críticamente amortiguado: inercia sin rebote
function resorte(r, objetivo, dt, w) {
  const a = -w * w * (r.x - objetivo) - 2 * w * r.v;
  r.v += a * dt;
  r.x += r.v * dt;
}

const PR_MINIMO = 0.75;

export function crearEscena(canvas, { salas, calidad, menosMovimiento = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: calidad.antialias, powerPreference: 'high-performance' });
  const prMaximo = Math.min(devicePixelRatio, calidad.dpr);
  renderer.setPixelRatio(prMaximo);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Con postproceso hay varios render() por cuadro: se cuentan juntos
  renderer.info.autoReset = false;

  const alta = calidad.dpr > 1.25;
  let post = alta && soportaPostproceso(renderer)
    ? crearPostproceso(renderer, { muestras: calidad.antialias ? 4 : 0, menosMovimiento })
    : null;

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x070605);
  escena.fog = new THREE.Fog(0x070605, 9, 22);

  const camara = new THREE.PerspectiveCamera(38, 1, 0.1, 60);

  const washi = hornearWashi(renderer, calidad.washi);
  const { casa, registro, uniformesBrillo, inicio, fin } = crearCasa({ salas, washi, calidad });
  escena.add(casa);

  const iCamino = salas.findIndex((s) => s.id === 'camino');
  const iMa = salas.findIndex((s) => s.tipo === 'ma');
  const estanque = crearEstanque({ inicio, fin, uniformesBrillo, xCamino: Math.max(0, iCamino) * S });
  escena.add(estanque.grupo);

  // Atmósfera: polvo en el haz de la puerta y niebla baja sobre el agua
  const polvo = crearPolvo(alta ? 260 : 150);
  escena.add(polvo.objeto);
  const niebla = crearNiebla({ inicio, fin, uniformesBrillo, capas: alta ? 2 : 1 });
  escena.add(niebla.grupo);

  // Luna: muy tenue y fría, solo para recortar pilares y vigas
  escena.add(new THREE.HemisphereLight(0x8a96b0, 0x0a0806, 0.22));
  const luna = new THREE.DirectionalLight(0xa8b4d0, 0.35);
  luna.position.set(-6, 9, 8);
  escena.add(luna);

  // La linterna andon: la única luz con sombra. Camina de sala en sala y sigue al cursor.
  const andon = new THREE.SpotLight(0xffc98a, 26, 7, THREE.MathUtils.degToRad(68), 0.85, 1.6);
  andon.castShadow = true;
  andon.shadow.mapSize.set(calidad.sombra, calidad.sombra);
  andon.shadow.radius = 5;
  andon.shadow.bias = -0.0006;
  andon.shadow.normalBias = 0;
  andon.shadow.camera.near = 0.2;
  andon.shadow.camera.far = 6;
  andon.shadow.camera.layers.set(1);
  andon.visible = false;
  escena.add(andon, andon.target);
  const relleno = new THREE.PointLight(0xffd6a6, 0, 6, 1.4);
  escena.add(relleno);

  const estado = { posicion: 0, local: 0, cursor: new THREE.Vector2(0, 0), cursorSuave: new THREE.Vector2(0, 0), ancho: 1, alto: 1 };
  // Cámara: posición con inercia propia, acercamiento a la puerta y bajada hacia el agua en 間
  const cam = { pos: { x: 0, v: 0 }, empuje: 0, ma: 0, iniciada: false };
  // Linterna: x de la sala a la que camina (con inercia), fuerza (0 = apagada) y sombra por sala
  const linterna = { x: { x: 0, v: 0 }, fuerza: 0, iniciada: false };
  const sombras = registro.map(() => 0);
  const reloj = { previo: performance.now(), elapsedTime: 0, getDelta() { const ahora = performance.now(); const d = (ahora - this.previo) / 1000; this.previo = ahora; this.elapsedTime += Math.min(d, 0.1); return d; } };
  let corriendo = true;
  const mirar = new THREE.Vector3();

  // ── Rendimiento adaptativo: baja el pixelRatio si va lento de forma sostenida ──
  const rend = { pr: prMaximo, techo: prMaximo, media: 1000 / 60, lento: 0, sobra: 0, espera: 3, ultimo: '' };
  function aplicarTamano() {
    renderer.setPixelRatio(rend.pr);
    renderer.setSize(estado.ancho, estado.alto, false);
    const tam = renderer.getDrawingBufferSize(new THREE.Vector2());
    post?.redimensionar(tam.x, tam.y);
    polvo.uniforms.uEscalaPx.value = tam.y / (2 * Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2));
  }
  function medir(ms) {
    if (ms > 100) return; // pestaña oculta, pausa o un tirón aislado
    rend.media += (ms - rend.media) * 0.05;
    if (rend.espera > 0) { rend.espera -= ms / 1000; return; }
    rend.lento = rend.media > 21 ? rend.lento + ms / 1000 : Math.max(0, rend.lento - ms / 2000);
    rend.sobra = rend.media < 17.8 ? rend.sobra + ms / 1000 : 0;
    if (rend.lento > 1.5) {
      if (rend.pr > PR_MINIMO + 0.01) {
        // Si acaba de subir y vuelve a ir lento, ese nivel queda como techo (sin oscilar)
        if (rend.ultimo === 'subir') rend.techo = Math.max(PR_MINIMO, rend.pr - 0.25);
        rend.pr = Math.max(PR_MINIMO, rend.pr - 0.25);
        rend.ultimo = 'bajar';
      } else if (post) {
        // Último recurso: sin postproceso (los materiales se recompilan una vez)
        post.liberar();
        post = null;
      } else return;
      aplicarTamano();
      rend.lento = 0; rend.sobra = 0; rend.espera = 2;
    } else if (rend.sobra > 6 && rend.pr < rend.techo - 0.01) {
      rend.pr = Math.min(rend.techo, rend.pr + 0.25);
      rend.ultimo = 'subir';
      aplicarTamano();
      rend.lento = 0; rend.sobra = 0; rend.espera = 2;
    }
  }

  function redimensionar(ancho, alto) {
    estado.ancho = ancho; estado.alto = alto;
    camara.aspect = ancho / alto;
    camara.fov = camara.aspect < 0.8 ? 52 : 38;
    camara.updateProjectionMatrix();
    aplicarTamano();
  }

  function cuadro() {
    if (!corriendo) return;
    const crudo = reloj.getDelta();
    medir(crudo * 1000);
    const dt = Math.min(0.05, crudo);
    const t = reloj.elapsedTime;
    renderer.info.reset();
    estado.cursorSuave.lerp(estado.cursor, 1 - Math.exp(-dt * 5));
    const activa = Math.round(estado.posicion);

    // ── Cámara ──────────────────────────────────────────────────────────────
    // Inercia propia sobre la posición del scroll; los saltos del mapa se toman de golpe
    if (!cam.iniciada || Math.abs(estado.posicion - cam.pos.x) > 1.2) { cam.pos.x = estado.posicion; cam.pos.v = 0; cam.iniciada = true; }
    else resorte(cam.pos, estado.posicion, dt, 8);
    const p = cam.pos.x;
    const vertical = camara.aspect < 0.8;
    // En la entrada la casa queda a la derecha (el nombre va a la izquierda); en las salas, al revés.
    const desfase = vertical ? 0 : -1.7 + 2.85 * suave(0, 1, Math.min(1, Math.max(0, p)));
    const salaX = p * S;
    // Dolly-in suave mientras la puerta de la sala se abre
    const rA = registro[activa];
    const objetivoEmpuje = rA && rA.tipo === 'sala' ? rA.apertura * (1 - suave(0.0, 0.3, Math.abs(p - activa))) : 0;
    cam.empuje = hacia(cam.empuje, objetivoEmpuje, dt, 2.2);
    // 間: la cámara baja un poco y mira el agua
    cam.ma = iMa >= 0 ? 1 - suave(0.0, 0.75, Math.abs(p - iMa)) : 0;
    const parallax = menosMovimiento ? 0.4 : 1;
    const cx = estado.cursorSuave.x * parallax, cy = estado.cursorSuave.y * parallax;
    let respiraX = 0, respiraY = 0, balanceo = 0;
    if (!menosMovimiento) {
      respiraY = Math.sin(t * 0.62) * 0.006 + Math.sin(t * 0.27 + 1.0) * 0.004;
      respiraX = Math.sin(t * 0.41 + 0.5) * 0.004;
      balanceo = Math.sin(t * 0.33) * 0.0012;
    }
    const paso = menosMovimiento ? 0 : Math.sin(salaX * 1.3) * 0.012 * Math.min(1, Math.abs(cam.pos.v) * 2);
    camara.position.set(
      salaX + desfase + cx * 0.12 + respiraX,
      ALTURA_OJOS + (vertical ? 0.35 : 0) + paso + respiraY - cy * 0.05 - cam.ma * 0.32 - cam.empuje * 0.04,
      (vertical ? 8.6 : DISTANCIA_CAMARA) - cam.empuje * 0.9 - cam.ma * 0.4,
    );
    // En celular la casa sube a la mitad superior: el panel ocupa la de abajo
    mirar.set(
      salaX + desfase * 0.55 + cx * 0.03,
      (vertical ? 0.05 : 1.3) - cam.ma * 1.0 + cy * 0.02,
      cam.ma * 1.2,
    );
    camara.lookAt(mirar);
    if (balanceo) camara.rotateZ(balanceo);

    // ── Salas: potencia, apertura de puertas y ocupantes ────────────────────
    registro.forEach((r, i) => {
      const distancia = Math.abs(estado.posicion - i);
      const cerca = 1 - suave(0.15, 0.6, distancia);
      const parpadeo = llama(t + i * 1.7);
      r.potencia = (0.38 + 0.62 * cerca) * parpadeo;
      uniformesBrillo.uSalasP.value[i] = r.tipo === 'ma' ? 0.15 : r.potencia;
      if (r.tipo !== 'sala') return;
      const apertura = i === activa ? suave(0.14, 0.5, estado.local) * (1 - suave(0.0, 0.25, distancia)) : 0;
      r.apertura = hacia(r.apertura, apertura, dt, 6);
      uniformesBrillo.uSalasA.value[i] = r.apertura;
      r.hojas.forEach((h) => { h.position.x = h.userData.cerrada + h.userData.lado * r.apertura * 1.3; });
      const abierta = r.apertura > 0.02;
      r.interior.visible = abierta;
      if (r.ocupantes && r.ocupantes.visibles !== abierta) { mostrarOcupantes(r.ocupantes, abierta); r.ocupantes.visibles = abierta; }
      // Con menos movimiento las cosas de la sala quedan quietas (la linterna la sigue moviendo el visitante)
      if (r.ocupantes?.animar && distancia < 1.2 && !menosMovimiento) r.ocupantes.animar(t, dt);
      r.ocupantes && (r.ocupantes.grupo.visible = distancia < 1.5);
    });

    // ── La linterna camina a la sala activa y sigue al cursor ───────────────
    const destino = rA ? rA.x : 0;
    if (!linterna.iniciada || menosMovimiento) { linterna.x.x = destino; linterna.x.v = 0; linterna.iniciada = true; }
    else resorte(linterna.x, destino, dt, 4.5);
    const enSala = rA && rA.tipo === 'sala';
    linterna.fuerza = hacia(linterna.fuerza, enSala ? 1 : 0, dt, 3);
    const lxBase = linterna.x.x;
    // Al caminar se mece un poco, como llevada en la mano
    const andar = Math.min(1, Math.abs(linterna.x.v) / 3);
    const lx = lxBase + estado.cursorSuave.x * 1.6;
    const ly = 0.95 + estado.cursorSuave.y * 0.55 + Math.abs(Math.sin(lxBase * 2.2)) * 0.06 * andar;
    andon.position.set(lx + Math.sin(t * 2.3) * 0.01, ly, -2.35);
    andon.target.position.set(lxBase + estado.cursorSuave.x * 0.5, 1.05, 0);
    andon.intensity = 26 * llama(t) * linterna.fuerza;
    andon.visible = linterna.fuerza > 0.01;
    const rCerca = registro[Math.round(lxBase / S)];
    relleno.position.set(lxBase - 0.6, 2.0, -0.35);
    relleno.intensity = rCerca && rCerca.tipo === 'sala' ? 2.2 * rCerca.apertura * linterna.fuerza : 0;

    registro.forEach((r, i) => {
      if (r.tipo !== 'sala') return;
      const distancia = Math.abs(estado.posicion - i);
      const cercaLinterna = 1 - suave(0.8, 2.4, Math.abs(lxBase - r.x));
      const objetivo = (i === activa ? 1 - suave(0.3, 0.5, distancia) : 0) * cercaLinterna * linterna.fuerza;
      sombras[i] = hacia(sombras[i], objetivo, dt, 4);
      // El charco de luz del papel acompaña a la linterna mientras pasa por detrás
      const tocada = Math.abs(lx - r.x) < S * 0.75;
      for (const m of [r.material, r.materialRanma]) {
        m.uniforms.uPotencia.value = r.potencia;
        m.uniforms.uSombra.value = sombras[i];
        const luz = m.uniforms.uLuz.value;
        if (tocada) luz.set(lx, ly + 0.2, -2.0);
        else { luz.x = hacia(luz.x, r.x, dt, 2); luz.y = hacia(luz.y, 1.0, dt, 2); }
        if (m.uniforms.uTiempo) m.uniforms.uTiempo.value = t;
      }
    });

    // ── Atmósfera ───────────────────────────────────────────────────────────
    const tAtm = menosMovimiento ? 0 : t;
    const haz = enSala ? rA.apertura * rA.potencia : 0;
    polvo.objeto.position.x = enSala ? rA.x : salaX;
    polvo.objeto.visible = haz > 0.01;
    polvo.uniforms.uApertura.value = haz;
    polvo.uniforms.uMedia.value = Math.min(1.3, 1.3 * (enSala ? rA.apertura : 0));
    polvo.uniforms.uTiempo.value = tAtm;
    niebla.tiempo.value = tAtm;

    estanque.actualizar(t, dt, andon.position, menosMovimiento);
    if (post) post.render(escena, camara, t);
    else renderer.render(escena, camara);
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
    // Diagnóstico: pixelRatio actual, media de ms por cuadro y si hay postproceso
    rendimiento: () => ({ pixelRatio: rend.pr, msPorCuadro: +rend.media.toFixed(1), postproceso: !!post }),
  };
}
