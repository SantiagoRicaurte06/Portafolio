// Tinta viva: caligrafía de pincel sobre los trazos de KanjiVG (CC BY-SA 3.0).
// Cada trazo se pinta con ~40 cerdas que pierden tinta a su ritmo (kasure: vetas secas),
// con presión al entrar, remate según el tipo de trazo (tome, harai, hane), charco de tinta
// en los extremos y un sangrado leve al secarse. Canvas 2D: solo cuesta mientras se anima.
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

function presion(t, fin) {
  let p = 0.5 + 0.5 * sm(0, 0.1, t) + 0.28 * Math.exp(-(((t - 0.035) / 0.03) ** 2));
  if (fin === 'tome') p += 0.16 * Math.exp(-(((t - 0.94) / 0.035) ** 2)) - 0.45 * sm(0.975, 1, t);
  if (fin === 'harai') p *= 1 - 0.96 * Math.pow(sm(0.45, 1, t), 1.2);
  if (fin === 'hane') p *= 1 - 0.85 * sm(0.9, 1, t);
  return p;
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
      salida.push({ pts, L, fin: remate(t, pts) });
    }
  });
  anfitrion.remove();
  return salida;
}

/**
 * Prepara un canvas con el texto en tinta. Devuelve { pintar(): Promise, completar() }.
 * opciones: tamano (px por carácter), vertical, grosor, cerdas, velocidad (unidades/s), pausa (ms), tinta "r,g,b",
 * duracion (ms, opcional): ajusta la velocidad para que todo el texto termine en ese tiempo.
 */
export function prepararTinta(canvas, texto, opciones = {}) {
  const o = { tamano: 120, vertical: true, grosor: 8, cerdas: 40, velocidad: 110, pausa: 110, tinta: '20,18,16', semilla: 7, ...opciones };
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
  w.setTransform(k, 0, 0, k, 0, 0); w.lineCap = 'round'; w.strokeStyle = `rgb(${o.tinta})`;
  const rnd = aleatorio(o.semilla);
  let trazos = null;
  let terminado = false;
  let cancelar = null;

  const charco = (x, y, r, a) => {
    const g = w.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${o.tinta},${a})`); g.addColorStop(1, `rgba(${o.tinta},0)`);
    w.fillStyle = g; w.beginPath(); w.arc(x, y, r, 0, 7); w.fill();
  };
  const mostrar = () => { vista.clearRect(0, 0, ancho, alto); vista.drawImage(seco, 0, 0); vista.drawImage(mojado, 0, 0); };
  const fijar = () => {
    cs.save(); cs.shadowColor = `rgba(${o.tinta},.35)`; cs.shadowBlur = 2.2 * dpr; cs.drawImage(mojado, 0, 0); cs.restore();
    w.save(); w.setTransform(1, 0, 0, 1, 0, 0); w.clearRect(0, 0, ancho, alto); w.restore();
  };

  let si = 0; let i = 0; let B = null;
  const empezarTrazo = (s) => {
    const carga = 1 - 0.07 * (si % 4);
    B = Array.from({ length: o.cerdas }, (_, j) => {
      const off = (j / (o.cerdas - 1)) * 2 - 1;
      return { off: off * (0.92 + 0.08 * rnd()), tinta: carga * (0.8 + 0.2 * rnd()), seca: (0.0012 + 0.006 * off * off) * (0.5 + rnd()), lw: 0.7 + 0.6 * rnd(), semilla: rnd() * 1000, prev: null };
    });
    const p0 = s.pts[0];
    charco(p0.x + p0.tx * 0.8, p0.y + p0.ty * 0.8, o.grosor * 0.62, 0.55);
  };
  const pintarHasta = (s, hasta) => {
    for (const b of B) {
      w.beginPath(); let suma = 0; let cuenta = 0;
      for (let j = i; j < hasta; j++) {
        const p = s.pts[j]; const t = p.l / s.L; const pr = presion(t, s.fin);
        const ancho = o.grosor * pr * (1 + 0.08 * (ruido(p.l * 0.3 + b.semilla) - 0.5));
        const secado = s.fin === 'harai' ? 1 + 7 * sm(0.4, 1, t) : s.fin === 'hane' ? 1 + 4 * sm(0.85, 1, t) : 1;
        b.tinta -= b.seca * secado * 0.3;
        const temblor = (ruido(b.semilla + p.l * 0.25) - 0.5) * 0.1;
        const x = p.x - p.ty * (b.off + temblor) * ancho * 0.5;
        const y = p.y + p.tx * (b.off + temblor) * ancho * 0.5;
        const salto = ruido(b.semilla * 3.1 + p.l * 0.09) > b.tinta * 1.5 + 0.05;
        if (b.prev && !salto && b.tinta > 0.04) { w.moveTo(b.prev[0], b.prev[1]); w.lineTo(x, y); suma += b.tinta; cuenta++; }
        b.prev = [x, y];
      }
      if (cuenta) { w.globalAlpha = Math.min(1, 0.25 + suma / cuenta); w.lineWidth = (o.grosor / o.cerdas) * 2.6 * b.lw; w.stroke(); }
    }
    w.globalAlpha = 1; i = hasta;
  };
  const cerrarTrazo = (s) => {
    const e = s.pts[s.pts.length - 1];
    if (s.fin === 'tome') charco(e.x - e.tx * 0.6, e.y - e.ty * 0.6, o.grosor * 0.5, 0.45);
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
    if (o.duracion) {
      const largo = trazos.reduce((a, s) => a + s.L, 0);
      const tinta = Math.max(200, o.duracion - o.pausa * trazos.length);
      o.velocidad = (largo / (tinta / 1000)) * 1.15;
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
        const t = i / s.pts.length;
        const v = o.velocidad * (0.45 + 0.9 * sm(0, 0.15, t) - 0.35 * sm(0.8, 1, t));
        const hasta = Math.min(s.pts.length, i + Math.max(1, Math.round((v * dt / 1000) / 0.5)));
        pintarHasta(s, hasta);
        if (i >= s.pts.length) { cerrarTrazo(s); espera = o.pausa; }
        mostrar();
        id = requestAnimationFrame(cuadro);
      };
      id = requestAnimationFrame(cuadro);
    });
  }

  return { pintar, completar, get terminado() { return terminado; } };
}
