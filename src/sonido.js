// Paisaje sonoro de la casa de noche, todo generado con Web Audio (sin archivos):
// viento con ráfagas, suzumushi lejanos, goteo del estanque y una reverb de madera hecha
// con una respuesta de impulso sintética. Eventos: shoji, furin, gota, pasos, pincel, sello
// y tinta. Apagado por defecto; solo arranca cuando el visitante lo activa con 音.
//
// API: activarSonido(bool), sonidoActivo(), sonar(nombre, opciones?), velocidad(v)

const VOLUMEN = 0.75; // volumen general, ya bajo de por sí: cada fuente es tenue

let ctx = null;
let maestro = null; // fade-in / fade-out
let seco = null; // bus sin reverb
let envioReverb = null; // bus hacia la reverb
let blanco = null; // buffers de ruido reutilizados
let rosa = null;
let activo = false;
let tictac = null; // intervalo del viento
let temporizadores = []; // grillos y gotas
let apagado = null; // suspender el contexto tras el fade-out

// Viento: nodos y estado
const viento = {};
let aire = 0; // 0..1, suavizado
let aireObjetivo = 0;
let rafaga = 0.3;
let proximaRafaga = 0;

const azar = (a, b) => a + Math.random() * (b - a);

// ── Construcción ───────────────────────────────────────────────────────────

function bufferRuido(segundos, tipo) {
  const largo = Math.floor(ctx.sampleRate * segundos);
  const buffer = ctx.createBuffer(1, largo, ctx.sampleRate);
  const d = buffer.getChannelData(0);
  if (tipo === 'rosa') {
    // Ruido rosa (Paul Kellet, versión económica)
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < largo; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
  } else {
    for (let i = 0; i < largo; i++) d[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Respuesta de impulso de una sala de madera: reflexiones tempranas cercanas y una cola
// corta que se oscurece al decaer (la madera y el papel absorben los agudos).
function impulsoMadera(segundos = 1.9) {
  const tasa = ctx.sampleRate;
  const largo = Math.floor(tasa * segundos);
  const ir = ctx.createBuffer(2, largo, tasa);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let previo = 0;
    for (let i = 0; i < largo; i++) {
      const t = i / tasa;
      const p = t / segundos;
      // Filtro de un polo cuyo corte baja con el tiempo
      const k = 0.55 + 0.4 * p;
      previo = previo * k + (Math.random() * 2 - 1) * (1 - k);
      d[i] = previo * Math.pow(1 - p, 2.2) * Math.exp(-t * 2.4) * 2.2;
    }
    // Reflexiones tempranas: tabiques y tatami
    [0.011, 0.019, 0.027, 0.041, 0.058, 0.074].forEach((t, j) => {
      const i = Math.floor((t + c * 0.0023 * (j % 3)) * tasa);
      if (i < largo) d[i] += (j % 2 ? -1 : 1) * 0.5 * Math.exp(-j * 0.35);
    });
  }
  return ir;
}

function preparar() {
  if (ctx) return;
  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (!Contexto) return;
  ctx = new Contexto({ latencyHint: 'playback' });
  blanco = bufferRuido(2, 'blanco');
  rosa = bufferRuido(5, 'rosa');

  // Final de la cadena: compresor suave → limitador → volumen maestro
  const compresor = ctx.createDynamicsCompressor();
  compresor.threshold.value = -22;
  compresor.knee.value = 14;
  compresor.ratio.value = 3;
  compresor.attack.value = 0.008;
  compresor.release.value = 0.3;
  const limitador = ctx.createDynamicsCompressor();
  limitador.threshold.value = -6;
  limitador.knee.value = 2;
  limitador.ratio.value = 20;
  limitador.attack.value = 0.002;
  limitador.release.value = 0.12;
  maestro = ctx.createGain();
  maestro.gain.value = 0;
  compresor.connect(limitador).connect(maestro).connect(ctx.destination);

  const mezcla = ctx.createGain();
  mezcla.connect(compresor);
  seco = ctx.createGain();
  seco.connect(mezcla);
  const reverb = ctx.createConvolver();
  reverb.buffer = impulsoMadera();
  const retorno = ctx.createGain();
  retorno.gain.value = 0.55;
  envioReverb = ctx.createGain();
  envioReverb.connect(reverb).connect(retorno).connect(mezcla);

  crearViento();

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (activo) ctx.resume();
  });
}

// Conecta un nodo a los buses con paneo y proporción de reverb.
function salida(nodo, { pan = 0, mojado = 0.3, nivel = 1 } = {}) {
  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  const g = ctx.createGain();
  g.gain.value = nivel;
  nodo.connect(g).connect(panner);
  const s = ctx.createGain();
  s.gain.value = 1 - mojado * 0.6;
  const m = ctx.createGain();
  m.gain.value = mojado;
  panner.connect(s).connect(seco);
  panner.connect(m).connect(envioReverb);
  return g;
}

function fuenteRuido(buffer, t, duracion) {
  const f = ctx.createBufferSource();
  f.buffer = buffer;
  const desfase = Math.random() * Math.max(0, buffer.duration - duracion - 0.05);
  f.start(t, desfase, duracion + 0.05);
  return f;
}

function envolvente(t, pico, ataque, caida) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + caida);
  return g;
}

function filtro(tipo, frecuencia, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = tipo;
  f.frequency.value = frecuencia;
  f.Q.value = q;
  return f;
}

// ── Ambiente ───────────────────────────────────────────────────────────────

function crearViento() {
  const fuente = ctx.createBufferSource();
  fuente.buffer = rosa;
  fuente.loop = true;
  viento.grave = filtro('lowpass', 360, 0.5);
  viento.volumen = ctx.createGain();
  viento.volumen.gain.value = 0.03;
  // Silbido suave entre las rendijas del shōji
  viento.agudo = filtro('bandpass', 850, 2.2);
  viento.silbido = ctx.createGain();
  viento.silbido.gain.value = 0.002;
  fuente.connect(viento.grave).connect(viento.volumen);
  fuente.connect(viento.agudo).connect(viento.silbido);
  salida(viento.volumen, { mojado: 0.25 });
  salida(viento.silbido, { pan: -0.3, mojado: 0.5 });
  // LFO lento que respira sobre las ráfagas
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const profundidad = ctx.createGain();
  profundidad.gain.value = 0.008;
  lfo.connect(profundidad).connect(viento.volumen.gain);
  fuente.start();
  lfo.start();
}

function actualizarViento() {
  const t = ctx.currentTime;
  // Ráfagas: un nuevo objetivo cada pocos segundos, al que se llega despacio
  if (t >= proximaRafaga) {
    rafaga = Math.random() < 0.25 ? azar(0.6, 1) : azar(0, 0.45);
    proximaRafaga = t + azar(3, 9);
  }
  aire += (aireObjetivo - aire) * 0.12;
  aireObjetivo *= 0.86;
  const tc = 1.2 - aire * 0.8;
  viento.volumen.gain.setTargetAtTime(0.022 + 0.022 * rafaga + 0.05 * aire, t, tc);
  viento.grave.frequency.setTargetAtTime(260 + 280 * rafaga + 900 * aire, t, tc);
  viento.silbido.gain.setTargetAtTime(0.0015 + 0.004 * rafaga * rafaga + 0.01 * aire, t, tc);
  viento.agudo.frequency.setTargetAtTime(700 + 450 * rafaga + 700 * aire, t, tc);
}

// Suzumushi: un trino agudo de pulsos rápidos, lejano y casi en el umbral.
function grillo(pan, base) {
  const t = ctx.currentTime + 0.05;
  const pulsos = Math.floor(azar(6, 22));
  const periodo = azar(0.028, 0.04);
  const osc = ctx.createOscillator();
  osc.frequency.value = base * azar(0.995, 1.005);
  const g = ctx.createGain();
  g.gain.value = 0;
  const nivel = azar(0.0025, 0.005);
  for (let i = 0; i < pulsos; i++) {
    const p = t + i * periodo;
    const n = nivel * (0.6 + 0.4 * Math.sin((i / pulsos) * Math.PI));
    g.gain.setValueAtTime(0, p);
    g.gain.linearRampToValueAtTime(n, p + periodo * 0.3);
    g.gain.linearRampToValueAtTime(0, p + periodo * 0.8);
  }
  osc.connect(g);
  salida(g, { pan, mojado: 0.8 });
  osc.start(t);
  osc.stop(t + pulsos * periodo + 0.05);
}

function programar(fn, minimo, maximo) {
  const ciclo = () => {
    if (!activo) return;
    if (!document.hidden) fn();
    temporizadores.push(setTimeout(ciclo, azar(minimo, maximo) * 1000));
  };
  temporizadores.push(setTimeout(ciclo, azar(minimo, maximo) * 1000));
}

function iniciarAmbiente() {
  detenerAmbiente();
  proximaRafaga = 0;
  tictac = setInterval(actualizarViento, 120);
  // Dos grillos a cada lado, con patrones distintos (a veces responden en ráfaga)
  programar(() => { grillo(-0.6, 4300); if (Math.random() < 0.4) setTimeout(() => activo && grillo(-0.6, 4300), 260); }, 0.8, 3.2);
  programar(() => grillo(0.7, 4720), 1.4, 4.5);
  programar(() => gota({ nivel: azar(0.25, 0.55), pan: azar(-0.5, 0.5) }), 4, 13);
}

function detenerAmbiente() {
  clearInterval(tictac);
  temporizadores.forEach(clearTimeout);
  temporizadores = [];
}

// ── Eventos ────────────────────────────────────────────────────────────────

// Shōji: papel y madera deslizándose por el carril, con micro-tirones y un toque al tope.
function shoji({ duracion = azar(0.55, 0.8) } = {}) {
  const t = ctx.currentTime + 0.01;
  const roce = fuenteRuido(blanco, t, duracion);
  const banda = filtro('bandpass', 1300, 0.9);
  banda.frequency.setValueAtTime(1500, t);
  banda.frequency.exponentialRampToValueAtTime(650, t + duracion);
  const cuerpo = filtro('lowpass', 420, 1.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.06);
  // Fricción: pequeños tirones irregulares (stick-slip)
  let p = t + 0.07;
  while (p < t + duracion - 0.08) {
    g.gain.setTargetAtTime(azar(0.035, 0.075), p, 0.01);
    p += azar(0.02, 0.06);
  }
  g.gain.setTargetAtTime(0.0001, t + duracion - 0.06, 0.03);
  roce.connect(banda).connect(g);
  roce.connect(cuerpo).connect(g);
  salida(g, { pan: azar(-0.2, 0.2), mojado: 0.3 });
  golpeMadera(t + duracion, { nivel: 0.07, frecuencia: azar(170, 210), pan: 0.15 });
}

// Golpe breve sobre madera hueca: resonancia grave y un clic de contacto.
function golpeMadera(t, { nivel = 0.1, frecuencia = 120, pan = 0, mojado = 0.35 } = {}) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(frecuencia * 1.4, t);
  osc.frequency.exponentialRampToValueAtTime(frecuencia, t + 0.03);
  const g = envolvente(t, nivel, 0.004, 0.14);
  osc.connect(g);
  salida(g, { pan, mojado });
  osc.start(t);
  osc.stop(t + 0.2);

  const clic = fuenteRuido(blanco, t, 0.06);
  const banda = filtro('bandpass', frecuencia * 5, 1.5);
  const gc = envolvente(t, nivel * 0.5, 0.002, 0.045);
  clic.connect(banda).connect(gc);
  salida(gc, { pan, mojado });
}

// Fūrin: vidrio con parciales inarmónicos y pares desafinados que baten. Cada golpe es distinto.
function furin({ nivel = 1 } = {}) {
  const base = azar(1950, 2650);
  const pan = azar(-0.5, 0.5);
  const parciales = [[1, 0.05, 2.8], [2.37 + azar(-0.04, 0.04), 0.022, 1.9], [4.19 + azar(-0.06, 0.06), 0.011, 1.2], [6.53 + azar(-0.1, 0.1), 0.005, 0.7]];
  const golpes = Math.random() < 0.55 ? 1 : Math.random() < 0.7 ? 2 : 3;
  let t = ctx.currentTime + 0.01;
  for (let k = 0; k < golpes; k++) {
    const fuerza = nivel * (k === 0 ? 1 : azar(0.35, 0.6));
    parciales.forEach(([razon, amp, caida]) => {
      const batido = azar(0.8, 3.5);
      [-1, 1].forEach((signo) => {
        const osc = ctx.createOscillator();
        osc.frequency.value = base * razon + signo * batido * 0.5;
        const g = envolvente(t, amp * fuerza * 0.55, 0.003, caida * azar(0.85, 1.15));
        osc.connect(g);
        salida(g, { pan, mojado: 0.45 });
        osc.start(t);
        osc.stop(t + caida * 1.2 + 0.05);
      });
    });
    // Transitorio del badajo
    const tic = fuenteRuido(blanco, t, 0.03);
    const alto = filtro('highpass', 5000, 0.7);
    const gt = envolvente(t, 0.012 * fuerza, 0.001, 0.02);
    tic.connect(alto).connect(gt);
    salida(gt, { pan, mojado: 0.3 });
    t += azar(0.18, 0.5);
  }
}

// Gota en el estanque: un "plic" de tono descendente y una burbuja menor a veces.
function gota({ nivel = 1, pan = azar(-0.4, 0.4) } = {}) {
  const t = ctx.currentTime + 0.01;
  const burbuja = (inicio, f0, n) => {
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(f0, inicio);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.42, inicio + 0.09);
    const g = envolvente(inicio, n, 0.003, azar(0.09, 0.16));
    osc.connect(g);
    salida(g, { pan, mojado: 0.55 });
    osc.start(inicio);
    osc.stop(inicio + 0.25);
  };
  burbuja(t, azar(1100, 1900), 0.045 * nivel);
  if (Math.random() < 0.45) burbuja(t + azar(0.05, 0.14), azar(1700, 2600), 0.018 * nivel);
  const toque = fuenteRuido(blanco, t, 0.03);
  const banda = filtro('bandpass', 3000, 1);
  const gt = envolvente(t, 0.01 * nivel, 0.001, 0.02);
  toque.connect(banda).connect(gt);
  salida(gt, { pan, mojado: 0.5 });
}

// Pasos sobre el engawa: madera hueca; más rápidos y algo más fuertes con más velocidad.
function pasos({ cantidad } = {}) {
  const n = cantidad ?? 2 + Math.round(aire * 2 + Math.random());
  const intervalo = 0.44 - aire * 0.16;
  let t = ctx.currentTime + 0.02;
  for (let i = 0; i < n; i++) {
    const lado = i % 2 ? 0.18 : -0.18;
    const nivel = (0.07 + aire * 0.04) * azar(0.75, 1);
    golpeMadera(t, { nivel, frecuencia: azar(95, 135), pan: lado, mojado: 0.4 });
    // Roce del tabi sobre la tabla
    const roce = fuenteRuido(rosa, t, 0.12);
    const banda = filtro('bandpass', azar(500, 800), 0.8);
    const g = envolvente(t + 0.01, nivel * 0.25, 0.02, 0.09);
    roce.connect(banda).connect(g);
    salida(g, { pan: lado, mojado: 0.3 });
    // Crujido ocasional de la tabla
    if (Math.random() < 0.18) {
      const cruje = fuenteRuido(blanco, t + 0.05, 0.25);
      const b = filtro('bandpass', 900, 9);
      b.frequency.setValueAtTime(azar(700, 1000), t + 0.05);
      b.frequency.linearRampToValueAtTime(azar(1000, 1400), t + 0.28);
      const gc = envolvente(t + 0.05, 0.02, 0.05, 0.18);
      cruje.connect(b).connect(gc);
      salida(gc, { pan: lado, mojado: 0.4 });
    }
    t += intervalo * azar(0.9, 1.1);
  }
}

// Pincel: roce de cerdas sobre washi, apenas audible, con presión que varía.
function pincel({ duracion = 1.2 } = {}) {
  const t = ctx.currentTime + 0.01;
  const roce = fuenteRuido(blanco, t, duracion);
  const banda = filtro('bandpass', azar(3200, 4200), 0.6);
  const alto = filtro('highpass', 1500, 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.012, t + 0.08);
  for (let p = t + 0.1; p < t + duracion - 0.15; p += azar(0.08, 0.2)) {
    g.gain.setTargetAtTime(azar(0.006, 0.016), p, 0.05);
  }
  g.gain.setTargetAtTime(0.0001, t + duracion - 0.12, 0.05);
  roce.connect(banda).connect(alto).connect(g);
  salida(g, { pan: azar(-0.15, 0.15), mojado: 0.2 });
}

// Sello: golpe seco del hanko sobre el papel.
function sello() {
  const t = ctx.currentTime + 0.01;
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(58, t + 0.07);
  const g = envolvente(t, 0.12, 0.002, 0.1);
  osc.connect(g);
  salida(g, { mojado: 0.15 });
  osc.start(t);
  osc.stop(t + 0.15);
  const papel = fuenteRuido(blanco, t, 0.05);
  const bajo = filtro('lowpass', 1800, 0.7);
  const gp = envolvente(t, 0.04, 0.001, 0.035);
  papel.connect(bajo).connect(gp);
  salida(gp, { mojado: 0.15 });
}

// Tinta: un soplo suave que se abre y se cierra, cruzando el espacio estéreo.
function tinta({ duracion = 1.1 } = {}) {
  const t = ctx.currentTime + 0.01;
  const fuente = fuenteRuido(rosa, t, duracion);
  const banda = filtro('bandpass', 300, 1.1);
  banda.frequency.setValueAtTime(280, t);
  banda.frequency.exponentialRampToValueAtTime(1600, t + duracion * 0.45);
  banda.frequency.exponentialRampToValueAtTime(420, t + duracion);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + duracion * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(-0.5, t);
  panner.pan.linearRampToValueAtTime(0.5, t + duracion);
  fuente.connect(banda).connect(g).connect(panner);
  salida(panner, { mojado: 0.5 });
}

const EVENTOS = { shoji, furin, gota, pasos, pincel, sello, tinta };

// ── API ────────────────────────────────────────────────────────────────────

export function sonidoActivo() {
  return activo;
}

export function activarSonido(encender) {
  activo = Boolean(encender);
  if (activo) preparar();
  if (!ctx) return;
  clearTimeout(apagado);
  const ahora = ctx.currentTime;
  maestro.gain.cancelScheduledValues(ahora);
  maestro.gain.setValueAtTime(maestro.gain.value, ahora);
  if (activo) {
    if (ctx.state !== 'running' && !document.hidden) ctx.resume();
    maestro.gain.setTargetAtTime(VOLUMEN, ahora, 0.6); // fade-in de ~2 s
    iniciarAmbiente();
  } else {
    maestro.gain.setTargetAtTime(0, ahora, 0.3); // fade-out de ~1 s
    detenerAmbiente();
    apagado = setTimeout(() => { if (!activo) ctx.suspend(); }, 1600);
  }
}

// nombre: 'shoji' | 'furin' | 'gota' | 'pasos' | 'pincel' | 'sello' | 'tinta'
// opciones (opcional): { nivel, pan, duracion, cantidad } según el evento
export function sonar(nombre, opciones) {
  if (!activo || !ctx || ctx.state === 'closed' || document.hidden) return;
  EVENTOS[nombre]?.(opciones);
}

// Velocidad del scroll (p. ej. lenis.velocity, en px por frame). Más rápido = más aire.
// Se puede llamar en cada evento de scroll: se suaviza y vuelve sola al reposo.
export function velocidad(v) {
  const nivel = Math.min(1, Math.abs(Number(v) || 0) / 45);
  if (nivel > aireObjetivo) aireObjetivo = nivel;
}
