// Preludio: mientras carga la casa, 玄関 se pinta en tinta clara sobre la noche, cae el sello y una
// línea fina de pincel avanza con la carga. Al salir, la noche se abre como una cortina de tinta.
// Autocontenido: crea su DOM y sus estilos. Nunca más de `maximo` ms (3,5 s) hasta el sello;
// se salta con un clic o una tecla y respeta prefers-reduced-motion.
import { prepararTinta } from './tinta.js';
import { estamparSello } from './sello.js';
import { sonar } from './sonido.js';

const ESTILOS = `
.prl { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; overflow: hidden; }
.prl.saliendo { pointer-events: none; }
.prl-fondo { position: absolute; inset: 0; background: radial-gradient(circle at 50% 45%, #15130f, var(--noche, #070605) 70%); will-change: transform; }
.prl-centro { position: relative; display: flex; gap: 1.2rem; align-items: flex-end; }
.prl-centro canvas { display: block; }
.prl-hueco { width: 52px; height: 52px; flex: none; }
.prl-carga { position: absolute; left: 50%; bottom: 12vh; transform: translateX(-50%); display: grid; justify-items: center; gap: .85rem; }
.prl-linea { display: block; }
.prl-carga p { margin: 0; font-family: var(--fuente-mono, ui-monospace, monospace); font-size: .68rem; letter-spacing: .22em; color: rgb(243 239 230 / .45); white-space: nowrap; }
`;
const TINTA_CLARA = '243,239,230';

function ruido(x) {
  const i = Math.floor(x); const f = x - i;
  const h = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
  return h(i) + (h(i + 1) - h(i)) * f * f * (3 - 2 * f);
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Borde rasgado de la cortina: ondas lentas, fibras y algún chorreón de tinta.
function bordeCortina() {
  const puntos = []; const fase = Math.random() * 100;
  for (let k = 0; k <= 64; k++) {
    const y = -2 + (k / 64) * 104;
    let x = 50 + (ruido(fase + y * 0.06) - 0.5) * 3.2 + (ruido(fase * 2 + y * 0.45) - 0.5) * 0.9;
    if (ruido(fase * 3 + y * 0.2) > 0.82) x += (ruido(y) - 0.5) * 2.4;
    puntos.push([x, y]);
  }
  const lista = (pts) => pts.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(',');
  return {
    izq: `polygon(0% -2%, ${lista(puntos.map(([x, y]) => [x + 0.25, y]))}, 0% 102%)`,
    der: `polygon(100% -2%, ${lista(puntos.map(([x, y]) => [x - 0.25, y]))}, 100% 102%)`,
  };
}

/**
 * crearPreludio({ visto, texto, carga, maximo }) → {
 *   terminado: Promise (tinta + sello listos, ≤ maximo ms),
 *   cargar(promesa): registra una carga para la línea de progreso y devuelve la misma promesa,
 *   progreso(0–1): fija un mínimo de progreso a mano,
 *   saltar(): termina la tinta ya,
 *   salir(): Promise (completa la línea, abre la cortina y quita el preludio)
 * }
 * visto: el visitante ya lo vio (versión corta). carga: promesa o lista de promesas opcionales.
 */
export function crearPreludio({ visto = false, texto = '', carga, maximo = 3500 } = {}) {
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.getElementById('prl-estilos')) {
    const estilo = document.createElement('style');
    estilo.id = 'prl-estilos'; estilo.textContent = ESTILOS;
    document.head.append(estilo);
  }
  const raiz = document.createElement('div');
  raiz.className = 'prl';
  raiz.setAttribute('aria-hidden', 'true');
  raiz.innerHTML = '<div class="prl-fondo"></div><div class="prl-fondo"></div><div class="prl-centro"><canvas></canvas><span class="prl-hueco"></span></div><div class="prl-carga"><canvas class="prl-linea"></canvas><p></p></div>';
  const [izq, der] = raiz.querySelectorAll('.prl-fondo');
  const borde = bordeCortina();
  izq.style.clipPath = borde.izq; der.style.clipPath = borde.der;
  const centro = raiz.querySelector('.prl-centro');
  const hueco = raiz.querySelector('.prl-hueco');
  const cargaDom = raiz.querySelector('.prl-carga');
  raiz.querySelector('.prl-carga p').textContent = texto;
  document.body.append(raiz);

  // ── Línea de carga: un trazo de pincel fino que avanza ─────────────────
  const linea = raiz.querySelector('.prl-linea');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const largo = Math.round(Math.min(220, innerWidth * 0.5)); const alto = 8;
  linea.width = largo * dpr; linea.height = alto * dpr;
  linea.style.width = `${largo}px`; linea.style.height = `${alto}px`;
  const cl = linea.getContext('2d'); cl.scale(dpr, dpr);
  let registradas = 0; let resueltas = 0; let minimo = 0; let mostrado = 0; let final = false;
  const inicio = performance.now();
  const objetivo = () => {
    if (final) return 1;
    const espera = 0.72 * (1 - Math.exp(-(performance.now() - inicio) / 1800)); // avanza aunque nadie informe
    const real = registradas ? (resueltas + (registradas - resueltas) * espera) / registradas : espera;
    return Math.max(minimo, Math.min(1, real));
  };
  const dibujarLinea = () => {
    cl.clearRect(0, 0, largo, alto);
    const fin = mostrado * largo; if (fin < 1) return;
    const medio = alto / 2;
    cl.fillStyle = `rgba(${TINTA_CLARA},.5)`;
    cl.beginPath();
    for (let x = 0; x <= fin; x += 2) {
      const g = (0.55 + 0.45 * ruido(x * 0.05)) * Math.min(1, x / 6 + 0.5) * Math.min(1, (fin - x) / 14 + 0.25);
      cl.lineTo(x, medio - g - (ruido(x * 0.02 + 9) - 0.5) * 0.8);
    }
    for (let x = Math.floor(fin / 2) * 2; x >= 0; x -= 2) {
      const g = (0.55 + 0.45 * ruido(x * 0.05 + 4)) * Math.min(1, x / 6 + 0.5) * Math.min(1, (fin - x) / 14 + 0.25);
      cl.lineTo(x, medio + g - (ruido(x * 0.02 + 9) - 0.5) * 0.8);
    }
    cl.fill();
    // Cerdas sueltas (kasure) en el último tramo, donde el pincel va más seco
    cl.strokeStyle = `rgba(${TINTA_CLARA},.28)`; cl.lineWidth = 0.6;
    for (let c = 0; c < 3; c++) {
      const y = medio + (c - 1) * 1.7;
      cl.beginPath();
      for (let x = Math.max(0, fin - 60); x < fin; x += 2) {
        if (ruido(x * 0.12 + c * 31) > 0.55) cl.moveTo(x, y); else cl.lineTo(x + 2, y + (ruido(x * 0.3 + c) - 0.5) * 0.6);
      }
      cl.stroke();
    }
  };
  let vivo = true; let ultimo = 0;
  const bucle = (ahora) => {
    if (!vivo) return;
    const dt = Math.min(100, ahora - (ultimo || ahora)); ultimo = ahora;
    mostrado += (objetivo() - mostrado) * Math.min(1, dt / 240);
    dibujarLinea();
    requestAnimationFrame(bucle);
  };
  if (quieto) { mostrado = objetivo(); dibujarLinea(); } else requestAnimationFrame(bucle);
  const refrescar = () => { if (quieto) { mostrado = objetivo(); dibujarLinea(); } };

  function cargar(promesa) {
    registradas++;
    const contar = () => { resueltas++; refrescar(); };
    Promise.resolve(promesa).then(contar, contar);
    refrescar();
    return promesa;
  }
  function progreso(x) { minimo = Math.max(minimo, Math.min(1, x)); refrescar(); }
  [].concat(carga ?? []).forEach(cargar);

  // ── Tinta y sello ──────────────────────────────────────────────────────
  const duracion = visto ? 900 : 2300;
  const tinta = prepararTinta(centro.querySelector('canvas'), '玄関', {
    tamano: Math.min(150, innerWidth * 0.3), vertical: false, grosor: 7.5, tinta: TINTA_CLARA, grano: 0.3,
    duracion, pausa: visto ? 15 : 70,
  });
  const msSello = visto ? 420 : 560;
  let saltado = false;
  let avisarSalto;
  const salto = new Promise((r) => { avisarSalto = r; });
  function saltar() { saltado = true; tinta.completar(); avisarSalto(); }
  addEventListener('pointerdown', saltar, { once: true });
  addEventListener('keydown', saltar, { once: true });
  sonar('pincel', { duracion: duracion / 1000 });

  const limite = Math.max(400, Math.min(maximo - msSello - 120, duracion + 550));
  const terminado = Promise.race([tinta.pintar(), esperar(limite), salto])
    .then(async () => {
      tinta.completar();
      removeEventListener('pointerdown', saltar);
      removeEventListener('keydown', saltar);
      await esperar(quieto || saltado ? 0 : 120);
      await estamparSello(centro, { x: hueco.offsetLeft + 26, y: hueco.offsetTop + 26, tamano: 52, giro: -6, ms: saltado ? 300 : msSello });
    });

  // ── Salida: la línea se completa y la noche se abre como cortina ───────
  let saliendo = null;
  function salir() {
    saliendo ??= (async () => {
      await terminado;
      final = true; refrescar();
      if (quieto) { vivo = false; raiz.remove(); return; }
      raiz.classList.add('saliendo');
      await esperar(260); // que se vea la línea completa
      const suave = 'cubic-bezier(.7,0,.2,1)';
      centro.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.04)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
      cargaDom.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      sonar('tinta', { duracion: 1.1 });
      const abrir = (el, x, retraso) => el.animate(
        [{ transform: 'none' }, { transform: `translateX(${x * 0.08}%) scaleY(1.01)`, offset: 0.25 }, { transform: `translateX(${x}%)` }],
        { duration: 1050, delay: retraso, easing: suave, fill: 'forwards' },
      ).finished;
      await Promise.all([abrir(izq, -62, 140), abrir(der, 62, 200)]).catch(() => {});
      vivo = false; raiz.remove();
    })();
    return saliendo;
  }

  return { terminado, cargar, progreso, saltar, salir };
}
