// Sonido de la casa, generado con Web Audio (sin archivos): viento de fondo, el roce del shōji
// y una campanita fūrin. Apagado por defecto; solo arranca cuando el visitante lo activa.

let ctx = null;
let maestro = null;
let viento = null;
let activo = false;

function ruido(segundos) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * segundos), ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  return buffer;
}

function preparar() {
  if (ctx) return;
  ctx = new AudioContext();
  maestro = ctx.createGain();
  maestro.gain.value = 0;
  maestro.connect(ctx.destination);

  // Viento: ruido grave que sube y baja despacio.
  const fuente = ctx.createBufferSource();
  fuente.buffer = ruido(4);
  fuente.loop = true;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 380;
  const volumen = ctx.createGain();
  volumen.gain.value = 0.035;
  const oscilador = ctx.createOscillator();
  oscilador.frequency.value = 0.08;
  const profundidad = ctx.createGain();
  profundidad.gain.value = 0.02;
  oscilador.connect(profundidad).connect(volumen.gain);
  fuente.connect(filtro).connect(volumen).connect(maestro);
  fuente.start();
  oscilador.start();
  viento = fuente;
}

export function sonidoActivo() {
  return activo;
}

export function activarSonido(encender) {
  activo = encender;
  if (encender) preparar();
  if (!ctx) return;
  if (encender && ctx.state === 'suspended') ctx.resume();
  const ahora = ctx.currentTime;
  maestro.gain.cancelScheduledValues(ahora);
  maestro.gain.setTargetAtTime(encender ? 1 : 0, ahora, 0.25);
}

export function sonar(nombre) {
  if (!activo || !ctx || !viento) return;
  const t = ctx.currentTime;
  if (nombre === 'shoji') {
    // Papel y madera deslizándose: ruido filtrado que baja de tono.
    const fuente = ctx.createBufferSource();
    fuente.buffer = ruido(0.7);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 0.9;
    filtro.frequency.setValueAtTime(1400, t);
    filtro.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    const volumen = ctx.createGain();
    volumen.gain.setValueAtTime(0.0001, t);
    volumen.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
    volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    fuente.connect(filtro).connect(volumen).connect(maestro);
    fuente.start(t);
    fuente.stop(t + 0.7);
  }
  if (nombre === 'furin') {
    // Campanita de vidrio: tres parciales que se apagan lento.
    [[2093, 0.06], [5230, 0.025], [7340, 0.012]].forEach(([frecuencia, nivel]) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frecuencia * (1 + (Math.random() - 0.5) * 0.01);
      const volumen = ctx.createGain();
      volumen.gain.setValueAtTime(0.0001, t);
      volumen.gain.exponentialRampToValueAtTime(nivel, t + 0.005);
      volumen.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      osc.connect(volumen).connect(maestro);
      osc.start(t);
      osc.stop(t + 2.7);
    });
  }
}
