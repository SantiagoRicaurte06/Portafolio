import { iniciarIdioma, t } from './i18n.js';
import { iniciarFormulario } from './formulario.js';
import { activarSonido, sonar, sonidoActivo, velocidad } from './sonido.js';
import { prepararTinta } from './tinta.js';
import { texturaWashi } from './papel-dom.js';
import { transicionTinta } from './transicion.js';
import { crearPreludio } from './preludio.js';

const menosMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tactil = matchMedia('(pointer: coarse)').matches;
const salasDom = [...document.querySelectorAll('.sala')];
const enlacesMapa = [...document.querySelectorAll('.mapa a')];
const botonSonido = document.getElementById('sonido');
const botonLectura = document.getElementById('lectura');

// Cuánto scroll dura la pausa de cada sala (en pantallas)
const PAUSAS = { genkan: 1.1, obras: 3.3, taller: 1.5, camino: 1.5, ma: 0.7, servicios: 1.6, suenos: 1.3, contacto: 1.7 };

function leer(clave) { try { return localStorage.getItem(clave); } catch { return null; } }
function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ } }

// El modo ya lo decidió el script del <head> (antes del primer pintado)
const modo = document.documentElement.classList.contains('modo-lectura') ? 'lectura' : 'recorrido';
if (modo === 'recorrido' && 'scrollRestoration' in history) history.scrollRestoration = 'manual';

// ── Comunes a los dos modos ────────────────────────────────────────────────
iniciarIdioma(document.getElementById('idioma'));
iniciarFormulario();
// Lo que no hace falta para el primer pintado espera a que el navegador esté libre
const cuandoLibre = (fn, limite = 1200) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: limite }) : setTimeout(fn, 200));
cuandoLibre(() => texturaWashi().then((url) => { if (url) document.documentElement.style.setProperty('--washi', `url(${url})`); }));

function pintarBotones() {
  botonSonido.setAttribute('aria-pressed', String(sonidoActivo()));
  botonSonido.querySelector('.texto').textContent = t(sonidoActivo() ? 'silenciar' : 'activarSonido');
  botonLectura.setAttribute('aria-pressed', String(modo === 'lectura'));
  botonLectura.querySelector('.texto').textContent = t(modo === 'lectura' ? 'modoCasa' : 'modoLectura');
}
botonSonido.addEventListener('click', () => { activarSonido(!sonidoActivo()); pintarBotones(); sonar('furin'); });
botonLectura.addEventListener('click', () => { guardar('modo', modo === 'lectura' ? 'recorrido' : 'lectura'); location.reload(); });
document.addEventListener('idioma', pintarBotones);
pintarBotones();

// Kanji de pincel de cada sala: se pintan la primera vez que la sala se muestra
const tintas = new Map();
salasDom.forEach((s) => {
  const lienzo = s.querySelector('.kanji-tinta');
  if (!lienzo || getComputedStyle(lienzo.parentElement).display === 'none') return;
  const tamano = innerWidth < 760 ? 46 : 62;
  tintas.set(s, prepararTinta(lienzo, s.dataset.kanji, { tamano, vertical: innerWidth >= 760, grosor: 8.5, duracion: 1500, pausa: 50 }));
});
const pintarSala = (s) => tintas.get(s)?.pintar();

const pergaminos = [...document.querySelectorAll('.pergamino')];
const listaObras = document.querySelector('.pergaminos');

if (modo === 'lectura') {
  const vigia = new IntersectionObserver((entradas) => entradas.forEach((e) => {
    if (e.isIntersecting) { pintarSala(e.target); e.target.classList.add('visible'); }
  }), { threshold: 0.2 });
  salasDom.forEach((s) => vigia.observe(s));
} else {
  iniciarRecorrido();
}

async function iniciarRecorrido() {
  const lienzo = document.getElementById('escena');
  const trayecto = document.getElementById('trayecto');
  const salas = salasDom.map((s) => ({ id: s.id, tipo: s.dataset.tipo === 'ma' ? 'ma' : 'sala', pausa: PAUSAS[s.id] ?? 1.3 }));
  const iObras = salas.findIndex((s) => s.id === 'obras');
  let recorrido = null;

  // Índice de proyectos para saltar entre pergaminos
  const indice = document.createElement('ul');
  indice.className = 'indice-obras';
  pergaminos.forEach((_, k) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = String(k + 1).padStart(2, '0');
    b.addEventListener('click', () => recorrido?.irA(iObras, { local: (k + 0.55) / pergaminos.length }));
    li.append(b); indice.append(li);
  });
  listaObras?.before(indice);

  // Preludio: 玄関 en tinta, el sello y la línea de carga mientras llega la casa
  const preludio = crearPreludio({ visto: leer('preludio-visto') === 'si', texto: t('cargando') });

  const calidad = tactil || (navigator.hardwareConcurrency ?? 8) <= 4
    ? { dpr: 1.25, sombra: 512, washi: 512, antialias: false }
    : { dpr: 1.75, sombra: 1024, washi: 1024, antialias: true };

  let escena;
  try {
    await new Promise((r) => cuandoLibre(r, 900));
    const { crearEscena } = await preludio.cargar(import('./escena/escena.js'));
    escena = crearEscena(lienzo, { salas, calidad, menosMovimiento });
    escena.redimensionar(innerWidth, innerHeight);
    addEventListener('resize', () => escena.redimensionar(innerWidth, innerHeight));
  } catch (error) {
    console.error('No se pudo crear la escena 3D', error);
    guardar('modo', 'lectura');
    location.reload();
    return;
  }

  let salaActual = -1;
  let ultimaApertura = 0;
  const { crearRecorrido } = await preludio.cargar(import('./recorrido.js'));
  recorrido = crearRecorrido({
    salas, trayecto, menosMovimiento,
    alActualizar({ posicion, local, sala }) {
      escena.avanzar(posicion, local);
      const cerca = Math.abs(posicion - sala) < 0.32;
      salasDom.forEach((s, i) => {
        const visible = i === sala && cerca;
        if (visible && !s.classList.contains('visible')) { pintarSala(s); sonar('pincel', { duracion: 1.5 }); }
        s.classList.toggle('visible', visible);
        s.inert = !visible;
      });
      if (sala !== salaActual) {
        if (salaActual !== -1) { sonar('pasos'); sonar('furin', { nivel: 0.6 }); }
        salaActual = sala;
        enlacesMapa.forEach((a) => a.setAttribute('aria-current', String(a.hash === `#${salas[sala].id}`)));
      }
      // Sonido de la puerta al empezar a abrirse
      const apertura = cerca && posicion === sala ? local : 0;
      if (ultimaApertura < 0.15 && apertura >= 0.15 && salas[sala].tipo === 'sala') sonar('shoji');
      ultimaApertura = apertura;
      // Obras: cada pergamino se desenrolla en su tercio de la pausa
      if (sala === iObras && pergaminos.length) {
        const n = pergaminos.length;
        const k = Math.min(n - 1, Math.floor(local * n));
        pergaminos.forEach((p, j) => {
          const d = j < k ? 1 : j > k ? 0 : Math.min(1, Math.max(0, (local * n - k) / 0.45));
          p.style.setProperty('--d', d.toFixed(3));
          p.classList.toggle('actual', j === k);
        });
        indice.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', String(j === k)));
      }
    },
  });

  // El viento y los pasos responden a la velocidad del scroll
  recorrido.lenis.on('scroll', ({ velocity }) => velocidad(velocity));

  // Mapa y enlaces internos: la tinta cubre la pantalla y la cámara salta a la sala
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const i = salas.findIndex((s) => `#${s.id}` === a.hash);
    if (i < 0) return;
    e.preventDefault();
    const r = a.getBoundingClientRect();
    sonar('tinta');
    transicionTinta(() => recorrido.irA(i, { inmediato: true }), { origen: [(r.left + r.width / 2) / innerWidth, (r.top + r.height / 2) / innerHeight] });
    history.replaceState(null, '', a.hash);
  }));

  // Teclado: ← → (o J/K) para ir de sala en sala
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select')) return;
    const { sala } = recorrido.estadoActual();
    if (e.key === 'ArrowRight' || e.key === 'k') recorrido.irA(Math.min(salas.length - 1, sala + 1));
    if (e.key === 'ArrowLeft' || e.key === 'j') recorrido.irA(Math.max(0, sala - 1));
  });

  // Linterna y agua: el puntero mueve la luz; tocar el agua hace ondas
  addEventListener('pointermove', (e) => escena.apuntar((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), { passive: true });
  lienzo.addEventListener('pointerdown', (e) => {
    escena.tocarAgua((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    sonar('gota', { pan: (e.clientX / innerWidth) * 2 - 1 });
  });
  document.addEventListener('visibilitychange', () => escena.pausar(document.hidden));

  await preludio.terminado;

  // Enlace directo (#obras): se salta cuando el preludio termina, para que el ancla del
  // navegador (que apunta a un panel fijo) no devuelva el scroll a 0 después.
  const inicial = salas.findIndex((s) => `#${s.id}` === location.hash);
  if (inicial > 0) requestAnimationFrame(() => recorrido.irA(inicial, { inmediato: true }));
  guardar('preludio-visto', 'si');
  preludio.salir();
}
