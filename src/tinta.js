// Tinta viva: caligrafía de pincel sobre los trazos de KanjiVG (CC BY-SA 3.0).
// Cada trazo se pinta con ~40 cerdas que pierden tinta a su ritmo. Lo que la hace parecer real:
// - tono: más negra donde el pincel va lento (entrada, tome) y gris donde se seca (kasure);
// - kasure en vetas largas que dependen de la carga y de la velocidad, no de un ruido punto a punto;
// - entrada con gota irregular (el pincel se posa en diagonal) y harai que se abre en cerdas sueltas;
// - sangrado al secarse (feathering) y el grano del papel que se ve a través de la tinta;
// - ritmo: cada trazo arranca lento y acelera, las pausas crecen con el recorrido del pincel en el
//   aire (entre radicales más que entre trazos vecinos) y la mano tiembla un poco.
// Canvas 2D: solo cuesta mientras se anima.
import TRAZOS from './datos/kanji.json';

const NS = 'http://www.w3.org/2000/svg';
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const aleatorio = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
function ruido(x) {
  const i = Math.floor(x); const f = x - i;
  const h = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  return h(i) + (h(i + 1) - h(i)) * f * f * (3 - 2 * f);
}

function remate(tipo, pts) {
  if (/[㇒㇏㇓㇀㇋㇇㇜]/.test(tipo) || /a$/.test(tipo)) return 'harai';
  if (/[㇚㇟㇂㇆㇈㇉㇌㇙㇁㇄]/.test(tipo)) return 'hane';
  const n = pts.length; const a = pts[Math.floor(n * 0.86)]; const b = pts[n - 1];
  if (n > 10 && a.tx * b.tx + a.ty * b.ty < 0.3) return 'hane';
  return 'tome';
}

// Presión (ancho relativo) a lo largo del trazo: gota al posarse, cuerpo y remate.
function presion(t, fin) {
  let p = 0.5 + 0.5 * sm(0, 0.1, t) + 0.3 * Math.exp(-(((t - 0.035) / 0.03) ** 2));
  if (fin === 'tome') p += 0.18 * Math.exp(-(((t - 0.94) / 0.035) ** 2)) - 0.45 * sm(0.975, 1, t);
  if (fin === 'harai') p *= 1 - 0.9 * Math.pow(sm(0.45, 1, t), 1.2);
  if (fin === 'hane') p *= 1 - 0.85 * sm(0.9, 1, t);
  return p;
}

// Velocidad relativa: el pincel se posa despacio, acelera, y frena en el tome o sale lanzado en el harai.
function ritmo(t, fin) {
  const arranque = 0.3 + 0.7 * sm(0, 0.24, t);
  if (fin === 'tome') return arranque * (1 - 0.55 * sm(0.7, 1, t));
  if (fin === 'hane') return arranque * (1 - 0.45 * sm(0.72, 0.9, t) + 0.6 * sm(0.9, 1, t));
  return arranque * (1 + 0.4 * sm(0.5, 1, t));
}
// Tiempo relativo de un trazo (media de 1/ritmo): sirve para cuadrar la duración pedida.
function costeRitmo(fin) {
  let c = 0;
  for (let k = 0; k < 24; k++) c += 1 / ritmo((k + 0.5) / 24, fin);
  return c / 24;
}

// Grano de papel: fibras y poros que se restan de la tinta. Se genera una vez y se repite.
let grano = null;
function texturaGrano() {
  if (grano) return grano;
  grano = document.createElement('canvas');
  grano.width = grano.height = 128;
  const g = grano.getContext('2d');
  const r = aleatorio(31);
  for (let k = 0; k < 520; k++) {
    g.fillStyle = `rgba(0,0,0,${0.15 + 0.6 * r() * r()})`;
    g.fillRect(r() * 128, r() * 128, 1 + (r() < 0.2), 1);
  }
  g.lineCap = 'round';
  for (let k = 0; k < 46; k++) {
    let x = r() * 128; let y = r() * 128; let a = r() * 7;
    g.strokeStyle = `rgba(0,0,0,${0.25 + 0.5 * r()})`; g.lineWidth = 0.5 + r() * 0.7;
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0, n = 3 + r() * 8; s < n; s++) { a += (r() - 0.5) * 0.8; x += Math.cos(a) * 3; y += Math.sin(a) * 3; g.lineTo(x, y); }
    g.stroke();
  }
  return grano;
}

// Muestrea los trazos de un texto (uno o más kanji) en coordenadas de 109×109 por carácter.
function muestrear(texto, vertical) {
  const anfitrion = document.createElementNS(NS, 'svg');
  anfitrion.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden');
  document.body.append(anfitrion);
  const salida = [];
  [...texto].filter((c) => TRAZOS[c]).forEach((c, ci) => {
    const dx = vertical ? 0 : ci * 109; const dy = vertical ? ci * 109 : 0;
    for (const { d, t } of TRAZOS[c]) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      anfitrion.append(p);
      const L = p.getTotalLength(); const pts = [];
      for (let l = 0; l <= L; l += 0.5) { const q = p.getPointAtLength(l); pts.push({ x: q.x + dx, y: q.y + dy, l }); }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 2)]; const b = pts[Math.min(pts.length - 1, i + 2)];
        const mx = b.x - a.x; const my = b.y - a.y; const m = Math.hypot(mx, my) || 1;
        pts[i].tx = mx / m; pts[i].ty = my / m;
      }
      const fin = remate(t, pts);
      salida.push({ pts, L, fin, ci, coste: costeRitmo(fin) });
    }
  });
  anfitrion.remove();
  // Pausa tras cada trazo (en múltiplos de opciones.pausa) y recarga del pincel:
  // cuanto más viaja la mano en el aire, más larga la pausa; un carácter nuevo, más todavía.
  salida.forEach((s, j) => {
    const sig = salida[j + 1];
    if (!sig) { s.pausa = 0; return; }
    const a = s.pts[s.pts.length - 1]; const b = sig.pts[0];
    const viaje = Math.hypot(b.x - a.x, b.y - a.y);
    s.pausa = sig.ci !== s.ci ? 3.2 : Math.min(2.4, 0.5 + viaje / 30);
    sig.recarga = sig.ci !== s.ci || viaje > 38;
  });
  if (salida[0]) salida[0].recarga = true;
  return salida;
}

/**
 * Prepara un canvas con el texto en tinta. Devuelve { pintar(): Promise, completar(), terminado }.
 * opciones: tamano (px por carácter), vertical, grosor, cerdas, velocidad (unidades/s), pausa (ms base),
 * tinta "r,g,b", grano (0–1, poros del papel), temblor (0–1), semilla,
 * duracion (ms, opcional): ajusta la velocidad para que todo el texto termine en ese tiempo.
 */
export function prepararTinta(canvas, texto, opciones = {}) {
  const o = { tamano: 120, vertical: true, grosor: 8, cerdas: 40, velocidad: 110, pausa: 110, tinta: '20,18,16', grano: 0.2, temblor: 1, semilla: 7, ...opciones };
  const n = [...texto].filter((c) => TRAZOS[c]).length || 1;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const lado = Math.round(o.tamano * dpr); const k = lado / 109;
  const ancho = o.vertical ? lado : lado * n; const alto = o.vertical ? lado * n : lado;
  canvas.width = ancho; canvas.height = alto;
  canvas.style.width = `${ancho / dpr}px`; canvas.style.height = `${alto / dpr}px`;
  const vista = canvas.getContext('2d');
  const capa = () => { const c = document.createElement('canvas'); c.width = ancho; c.height = alto; return c; };
  const seco = capa(); const mojado = capa();
  const cs = seco.getContext('2d'); const w = mojado.getContext('2d');
  w.setTransform(k, 0, 0, k, 0, 0); w.lineCap = 'round'; w.lineJoin = 'round'; w.strokeStyle = `rgb(${o.tinta})`;
  const patron = o.grano > 0 ? vista.createPattern(texturaGrano(), 'repeat') : null;
  const rnd = aleatorio(o.semilla);
  let trazos = null;
  let terminado = false;
  let cancelar = null;
  let carga = 1;

  // Gota irregular: el pincel se posa en diagonal y deja más tinta (más negra) que el cuerpo.
  const gota = (x, y, r, a, angulo, alargar) => {
    w.save(); w.translate(x, y); w.rotate(angulo); w.scale(alargar, 1);
    const lados = 20; const radios = Array.from({ length: lados }, () => r * (0.82 + 0.32 * rnd()));
    w.beginPath();
    for (let j = 0; j <= lados; j++) {
      const a0 = (j / lados) * Math.PI * 2; const a1 = ((j + 0.5) / lados) * Math.PI * 2;
      const r0 = radios[j % lados]; const r1 = (r0 + radios[(j + 1) % lados]) / 2;
      if (j === 0) w.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
      else w.quadraticCurveTo(Math.cos(a0) * r0, Math.sin(a0) * r0, Math.cos(a1) * r1, Math.sin(a1) * r1);
    }
    const g = w.createRadialGradient(-r * 0.15, 0, 0, 0, 0, r * 1.1);
    g.addColorStop(0, `rgba(${o.tinta},${a})`); g.addColorStop(0.7, `rgba(${o.tinta},${a * 0.8})`); g.addColorStop(1, `rgba(${o.tinta},${a * 0.25})`);
    w.fillStyle = g; w.fill();
    w.restore();
  };
  const mostrar = () => {
    vista.clearRect(0, 0, ancho, alto); vista.drawImage(seco, 0, 0); vista.drawImage(mojado, 0, 0);
    if (patron) {
      vista.globalCompositeOperation = 'destination-out'; vista.globalAlpha = o.grano;
      vista.fillStyle = patron; vista.fillRect(0, 0, ancho, alto);
      vista.globalCompositeOperation = 'source-over'; vista.globalAlpha = 1;
    }
  };
  // Al secarse, la tinta sangra en el papel: un halo ancho y tenue (solo la sombra, dibujando la
  // imagen fuera del lienzo) y un borde corto más denso.
  const fijar = () => {
    cs.save();
    cs.shadowColor = `rgba(${o.tinta},.16)`; cs.shadowBlur = 6 * dpr; cs.shadowOffsetX = ancho * 2;
    cs.drawImage(mojado, -ancho * 2, 0);
    cs.shadowColor = `rgba(${o.tinta},.38)`; cs.shadowBlur = 1.6 * dpr; cs.shadowOffsetX = 0;
    cs.drawImage(mojado, 0, 0);
    cs.restore();
    w.save(); w.setTransform(1, 0, 0, 1, 0, 0); w.clearRect(0, 0, ancho, alto); w.restore();
  };

  let si = 0; let i = 0; let B = null; let semillaTrazo = 0;
  const empezarTrazo = (s) => {
    carga = s.recarga ? 1 : carga * 0.92;
    semillaTrazo = rnd() * 500;
    B = Array.from({ length: o.cerdas }, (_, j) => {
      const off = (j / (o.cerdas - 1)) * 2 - 1;
      const borde = off * off;
      return {
        off: off * (0.9 + 0.1 * rnd()),
        tinta: carga * (0.78 + 0.22 * rnd()) * (1 - 0.18 * borde),
        seca: (0.0011 + 0.0065 * borde) * (0.5 + rnd()),
        lw: (0.6 + 0.7 * rnd()) * (1 - 0.35 * borde),
        corte: 0.8 + 0.2 * Math.pow(rnd(), 0.6 + 2 * borde), // dónde suelta el papel en el harai
        semilla: rnd() * 1000, prev: null,
      };
    });
    const p0 = s.pts[0];
    const angulo = Math.atan2(p0.ty, p0.tx) - 0.5;
    gota(p0.x + p0.tx * 0.9, p0.y + p0.ty * 0.9, o.grosor * 0.6, 0.5 + 0.25 * carga, angulo, 1.3);
  };
  const pintarHasta = (s, hasta) => {
    const tiembla = 0.9 * o.temblor;
    for (const b of B) {
      w.beginPath(); let suma = 0; let cuenta = 0;
      for (let j = i; j < hasta; j++) {
        const p = s.pts[j]; const t = p.l / s.L; const pr = presion(t, s.fin); const v = ritmo(t, s.fin);
        // El harai se abre: las cerdas se separan y cada una suelta el papel a su altura.
        if (s.fin === 'harai' && t > b.corte) { b.prev = null; continue; }
        const abre = s.fin === 'harai' ? 1 + 0.6 * sm(0.62, 1, t) : s.fin === 'hane' ? 1 + 0.25 * sm(0.9, 1, t) : 1;
        const anchoP = o.grosor * pr * (1 + 0.1 * (ruido(p.l * 0.3 + b.semilla) - 0.5));
        const secado = s.fin === 'harai' ? 1 + 6 * sm(0.4, 1, t) : s.fin === 'hane' ? 1 + 4 * sm(0.85, 1, t) : 1;
        b.tinta -= b.seca * secado * 0.3;
        // Temblor: la mano entera ondula despacio; cada cerda vibra un poco por su cuenta.
        const mano = (ruido(p.l * 0.05 + semillaTrazo) - 0.5) * tiembla + (ruido(p.l * 0.42 + semillaTrazo) - 0.5) * 0.22 * tiembla;
        const cerda = (ruido(b.semilla + p.l * 0.25) - 0.5) * 0.1;
        const desvio = (b.off * abre + cerda) * anchoP * 0.5 + mano;
        const x = p.x - p.ty * desvio; const y = p.y + p.tx * desvio;
        // Kasure: vetas largas (ruido lento a lo largo del trazo) que se abren al secarse y al ir rápido.
        const veta = ruido(b.semilla * 3.1 + p.l * 0.055) * 0.72 + ruido(b.semilla * 7.7 + p.l * 0.6) * 0.28;
        const salto = veta > b.tinta * 1.4 + 0.1 - 0.2 * sm(0.8, 1.3, v);
        if (b.prev && !salto && b.tinta > 0.03) {
          w.moveTo(b.prev[0], b.prev[1]); w.lineTo(x, y);
          suma += b.tinta * (1.3 - 0.4 * Math.min(1, v)); cuenta++; // lento = tinta acumulada, más negra
        }
        b.prev = [x, y];
      }
      if (cuenta) { w.globalAlpha = Math.min(1, 0.16 + suma / cuenta); w.lineWidth = (o.grosor / o.cerdas) * 2.6 * b.lw; w.stroke(); }
    }
    w.globalAlpha = 1; i = hasta;
  };
  const cerrarTrazo = (s) => {
    const e = s.pts[s.pts.length - 1];
    if (s.fin === 'tome') gota(e.x - e.tx * 0.9, e.y - e.ty * 0.9, o.grosor * 0.46, 0.32 + 0.2 * carga, Math.atan2(e.ty, e.tx) + 0.6, 1.15);
    fijar(); si++; i = 0; B = null;
  };

  function completar() {
    if (terminado) return;
    trazos ??= muestrear(texto, o.vertical);
    cancelar?.();
    while (si < trazos.length) { const s = trazos[si]; if (!B) empezarTrazo(s); pintarHasta(s, s.pts.length); cerrarTrazo(s); }
    mostrar(); terminado = true;
  }

  function pintar() {
    if (terminado) return Promise.resolve();
    trazos ??= muestrear(texto, o.vertical);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { completar(); return Promise.resolve(); }
    let escalaPausa = 1;
    if (o.duracion) {
      // Tiempo = Σ L·coste / velocidad + Σ pausas. Las pausas no se comen más del 40 % del total.
      const recorrido = trazos.reduce((a, s) => a + s.L * s.coste, 0);
      const pausas = trazos.reduce((a, s) => a + s.pausa, 0) * o.pausa;
      escalaPausa = pausas > o.duracion * 0.4 ? (o.duracion * 0.4) / pausas : 1;
      const tinta = Math.max(200, o.duracion - pausas * escalaPausa);
      o.velocidad = recorrido / (tinta / 1000);
    }
    return new Promise((resolver) => {
      let ultimo = 0; let espera = 0; let id = 0;
      cancelar = () => { cancelAnimationFrame(id); resolver(); };
      const cuadro = (ahora) => {
        const dt = Math.min(120, ahora - (ultimo || ahora)); ultimo = ahora;
        if (si >= trazos.length) { mostrar(); terminado = true; resolver(); return; }
        const s = trazos[si];
        if (espera > 0) { espera -= dt; id = requestAnimationFrame(cuadro); return; }
        if (!B) empezarTrazo(s);
        const t = s.pts[i].l / s.L;
        const pulso = 1 + 0.12 * (ruido(ahora * 0.004 + si * 9) - 0.5) * o.temblor;
        const v = o.velocidad * ritmo(t, s.fin) * pulso;
        const hasta = Math.min(s.pts.length, i + Math.max(1, Math.round((v * dt / 1000) / 0.5)));
        pintarHasta(s, hasta);
        if (i >= s.pts.length) { espera = s.pausa * o.pausa * escalaPausa; cerrarTrazo(s); }
        mostrar();
        id = requestAnimationFrame(cuadro);
      };
      id = requestAnimationFrame(cuadro);
    });
  }

  return { pintar, completar, get terminado() { return terminado; } };
}
