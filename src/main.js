import { iniciarIdioma, t } from './i18n.js';
import { iniciarLinterna } from './linterna.js';
import { crearKanji, pintar } from './caligrafia.js';
import { reproducirEntrada } from './entrada.js';

const pasillo = document.getElementById('pasillo');
const habitaciones = [...document.querySelectorAll('.habitacion')];
const enlacesMapa = [...document.querySelectorAll('.mapa a')];
const botonLamparas = document.getElementById('lamparas');
const menosMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esCelular = () => matchMedia('(max-width: 760px)').matches;

// ── Puertas shōji ──────────────────────────────────────────────────────────
function armarShoji(habitacion) {
  const marco = habitacion.querySelector('.marco');
  const contenido = habitacion.querySelector('.contenido');
  contenido.id = `contenido-${habitacion.id}`;
  contenido.inert = true;

  // El kanji de la habitación, que se pinta al abrir la puerta.
  const firma = crearKanji(habitacion.dataset.kanji, { clase: 'kanji-sala' });
  contenido.prepend(firma);

  const sombra = document.createElement('div');
  sombra.className = 'sombra';
  sombra.setAttribute('aria-hidden', 'true');
  sombra.textContent = habitacion.dataset.kanji;

  const shoji = document.createElement('button');
  shoji.type = 'button';
  shoji.className = 'shoji';
  shoji.setAttribute('aria-expanded', 'false');
  shoji.setAttribute('aria-controls', contenido.id);
  shoji.innerHTML = '<span class="hoja hoja-izq"></span><span class="hoja hoja-der"></span><span class="shoji-etiqueta"></span>';
  shoji.addEventListener('click', () => abrir(habitacion));

  marco.append(sombra, shoji);
}

function pintarEtiquetas() {
  habitaciones.forEach((h) => {
    const nombre = h.querySelector('h1, h2')?.textContent ?? '';
    h.querySelector('.shoji-etiqueta').textContent = `${t('abrir')} · ${h.dataset.kanji}`;
    h.querySelector('.shoji').setAttribute('aria-label', `${t('abrir')}: ${nombre}`);
  });
}

function abrir(habitacion, { enfocar = true } = {}) {
  if (habitacion.classList.contains('abierta')) return;
  habitacion.classList.add('abierta');
  const contenido = habitacion.querySelector('.contenido');
  contenido.inert = false;
  const shoji = habitacion.querySelector('.shoji');
  shoji.setAttribute('aria-expanded', 'true');
  shoji.tabIndex = -1;
  const firma = contenido.querySelector('.kanji-sala');
  if (firma) setTimeout(() => pintar(firma, { duracion: 1200 }), 450);
  if (enfocar) contenido.querySelector('h1, h2')?.setAttribute('tabindex', '-1');
  if (enfocar) contenido.querySelector('h1, h2')?.focus({ preventScroll: true });
}

// ── Lámparas: todo iluminado y todas las puertas abiertas ─────────────────
function encenderLamparas(encendidas) {
  document.body.classList.toggle('lamparas', encendidas);
  botonLamparas.setAttribute('aria-pressed', String(encendidas));
  botonLamparas.querySelector('.texto').textContent = t(encendidas ? 'apagar' : 'encender');
  if (encendidas) habitaciones.forEach((h) => abrir(h, { enfocar: false }));
}

// ── Pasillo: la rueda del mouse camina de lado en escritorio ──────────────
pasillo.addEventListener('wheel', (e) => {
  if (esCelular() || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  // Si la habitación abierta tiene scroll propio, se respeta.
  const interno = e.target.closest('.contenido');
  if (interno && interno.scrollHeight > interno.clientHeight) return;
  e.preventDefault();
  pasillo.scrollBy({ left: e.deltaY * 1.2, behavior: 'auto' });
}, { passive: false });

// ── Mapa: marca la habitación en la que estás ─────────────────────────────
const vigia = new IntersectionObserver((entradas) => {
  entradas.forEach((entrada) => {
    if (!entrada.isIntersecting) return;
    enlacesMapa.forEach((a) => a.setAttribute('aria-current', String(a.hash === `#${entrada.target.id}`)));
  });
}, { threshold: 0.6 });

enlacesMapa.forEach((a) => a.addEventListener('click', (e) => {
  const destino = document.querySelector(a.hash);
  if (!destino) return;
  e.preventDefault();
  destino.scrollIntoView({ behavior: menosMovimiento ? 'auto' : 'smooth', inline: 'start', block: 'start' });
  history.replaceState(null, '', a.hash);
}));

// ── Arranque ───────────────────────────────────────────────────────────────
habitaciones.forEach(armarShoji);
iniciarIdioma(document.getElementById('idioma'));
pintarEtiquetas();
document.addEventListener('idioma', () => {
  pintarEtiquetas();
  encenderLamparas(document.body.classList.contains('lamparas'));
});
habitaciones.forEach((h) => vigia.observe(h));
botonLamparas.addEventListener('click', () => encenderLamparas(!document.body.classList.contains('lamparas')));

iniciarLinterna();
if (menosMovimiento) encenderLamparas(true);

// Primera visita: 玄関 trazo a trazo y el sello; después la entrada se abre sola.
reproducirEntrada().then(() => abrir(habitaciones[0], { enfocar: false }));
