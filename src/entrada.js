// Animación de la primera visita: penumbra → 玄関 trazo a trazo → cae el sello → se abre la casa.
// Se salta con clic, tecla, rueda o toque, y no se repite en las siguientes visitas.
import { crearKanji, pintar, saltarAlFinal } from './caligrafia.js';

const CLAVE = 'entrada-vista';

function yaSeVio() {
  try { return localStorage.getItem(CLAVE) === 'si'; } catch { return false; }
}

function marcarVista() {
  try { localStorage.setItem(CLAVE, 'si'); } catch { /* sin almacenamiento: se verá otra vez */ }
}

const esperar = (ms) => new Promise((r) => { setTimeout(r, ms); });

export function reproducirEntrada() {
  const menosMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (yaSeVio() || menosMovimiento) return Promise.resolve();

  const capa = document.createElement('div');
  capa.className = 'entrada';
  capa.setAttribute('aria-hidden', 'true');
  const kanji = crearKanji('玄関', { clase: 'entrada-kanji' });
  const sello = document.createElement('img');
  sello.src = '/sello.svg';
  sello.alt = '';
  sello.className = 'entrada-sello';
  capa.append(kanji, sello);
  document.body.append(capa);

  let saltada = false;
  let alSaltar;
  const salto = new Promise((r) => { alSaltar = r; });
  const saltar = () => { saltada = true; alSaltar(); };
  const eventos = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  eventos.forEach((e) => addEventListener(e, saltar, { once: true, passive: true }));

  const secuencia = (async () => {
    await pintar(kanji, { duracion: 1700 });
    if (saltada) return;
    capa.classList.add('sellada');
    await esperar(650);
  })();

  return Promise.race([secuencia, salto]).then(async () => {
    eventos.forEach((e) => removeEventListener(e, saltar));
    saltarAlFinal(kanji);
    capa.classList.add('sellada', 'saliendo');
    marcarVista();
    await esperar(saltada ? 250 : 500);
    capa.remove();
  });
}
