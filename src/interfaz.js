// Sutilezas de la interfaz: el texto de cada panel entra por líneas detrás de una máscara,
// la numeración rueda, un hilo con el punto rojo marca cuánto se ha caminado y una línea que cae
// invita a entrar. Todo es decoración: el contenido sigue siendo el HTML de siempre.
import { t } from './i18n.js';

// Párrafos que entran línea por línea (los pergaminos ya se desenrollan solos)
const LINEAS = '.panel-cuerpo :is(.rol, .bajada, .camino p, .como-trabajo p, .servicios p, .lista-tinta li)';
const PALABRA = 'pl';

// Envuelve cada palabra en un <span>; los espacios quedan como texto para que el párrafo corte igual.
function partir(el) {
  if (el.querySelector(`.${PALABRA}`)) return;
  const caminante = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textos = [];
  while (caminante.nextNode()) if (caminante.currentNode.nodeValue.trim()) textos.push(caminante.currentNode);
  textos.forEach((nodo) => {
    const trozo = document.createDocumentFragment();
    nodo.nodeValue.split(/(\s+)/).forEach((parte) => {
      if (!parte) return;
      if (/^\s+$/.test(parte)) { trozo.append(parte); return; }
      const s = document.createElement('span');
      s.className = PALABRA;
      s.textContent = parte;
      trozo.append(s);
    });
    nodo.replaceWith(trozo);
  });
}

// Deshace el corte: el texto vuelve a ser un solo nodo (mejor para lectores de pantalla y para copiar)
function unir(el) {
  const palabras = el.querySelectorAll(`.${PALABRA}`);
  if (!palabras.length) return;
  palabras.forEach((s) => s.replaceWith(s.textContent));
  el.normalize();
}

function prepararSala(sala) {
  const bloques = [...sala.querySelectorAll(LINEAS)].filter((el) => !el.closest('[hidden]'));
  let linea = -1;
  const palabras = [];
  bloques.forEach((el) => {
    partir(el);
    let arriba = null;
    el.querySelectorAll(`.${PALABRA}`).forEach((s) => {
      const y = s.offsetTop;
      if (arriba === null || Math.abs(y - arriba) > 3) { linea += 1; arriba = y; }
      s.style.setProperty('--l', Math.min(linea, 16));
      palabras.push(s);
    });
  });
  if (!palabras.length) return;
  // Cuando termina la última palabra, el texto vuelve a estar entero
  const ultima = palabras[palabras.length - 1];
  const terminar = (e) => {
    if (e.target !== ultima) return;
    sala.removeEventListener('animationend', terminar);
    if (sala.classList.contains('visible')) bloques.forEach(unir);
  };
  sala.removeEventListener('animationend', sala._terminarLineas);
  sala._terminarLineas = terminar;
  sala.addEventListener('animationend', terminar);
}

// La numeración "02 / 07": las cifras ruedan desde 00 (CSS: @property --n + counter)
function prepararNumeros() {
  document.querySelectorAll('.panel-cabeza .numero').forEach((n) => {
    const primero = n.firstChild;
    if (!primero || primero.nodeType !== Node.TEXT_NODE) return;
    const valor = parseInt(primero.nodeValue, 10);
    if (Number.isNaN(valor)) return;
    const cifras = document.createElement('span');
    cifras.className = 'cifras';
    cifras.style.setProperty('--num', valor);
    cifras.textContent = primero.nodeValue;
    primero.replaceWith(cifras);
  });
}

export function iniciarInterfaz({ modo, menosMovimiento = false }) {
  prepararNumeros();
  const salas = [...document.querySelectorAll('.sala')];

  if (modo !== 'recorrido') return { progreso() {} };

  // Reveal por líneas: se mide justo cuando la sala recibe .visible (antes del siguiente pintado)
  if (!menosMovimiento) {
    const vigia = new MutationObserver((cambios) => cambios.forEach(({ target, oldValue }) => {
      const antes = (oldValue ?? '').split(/\s+/).includes('visible');
      if (!antes && target.classList.contains('visible')) prepararSala(target);
    }));
    salas.forEach((s) => vigia.observe(s, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }));
  }

  // Hilo del recorrido: una marca por sala y el punto rojo que avanza
  const hilo = document.createElement('div');
  hilo.className = 'hilo';
  hilo.setAttribute('aria-hidden', 'true');
  const total = Math.max(1, salas.length - 1);
  hilo.innerHTML = `${salas.map((_, i) => `<span class="hilo-marca" style="--m:${(i / total).toFixed(4)}"></span>`).join('')}<span class="hilo-punto"></span>`;

  // Sugerencia de scroll: una línea que cae; se va al empezar a caminar
  const sugerencia = document.createElement('div');
  sugerencia.className = 'sugerencia';
  sugerencia.setAttribute('aria-hidden', 'true');
  sugerencia.innerHTML = '<span class="sugerencia-texto"></span><span class="sugerencia-linea"></span>';
  const textoSugerencia = sugerencia.querySelector('.sugerencia-texto');
  const pintarTexto = () => { textoSugerencia.textContent = t('sugerenciaScroll'); };
  pintarTexto();
  document.addEventListener('idioma', pintarTexto);
  document.body.append(hilo, sugerencia);

  const raiz = document.documentElement;
  let ultimo = -1;
  return {
    // posicion: 0…total (con decimales mientras se camina); local: avance dentro de la pausa
    progreso(posicion, cuantas = total, local = 0) {
      const p = Math.min(1, Math.max(0, posicion / Math.max(1, cuantas)));
      if (Math.abs(p - ultimo) > 0.0005) { hilo.style.setProperty('--p', p.toFixed(4)); ultimo = p; }
      raiz.classList.toggle('caminando', posicion > 0.01 || local > 0.02);
    },
  };
}
