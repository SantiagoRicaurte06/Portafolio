// Cursor de tinta: un punto que sigue al ratón con inercia y se abre en un círculo con un kanji
// sobre lo que se puede pulsar (開 abrir, 入 entrar en el mapa). Sobre la casa, un halo cálido muy tenue.
// Solo con ratón o trackpad (pointer: fine); en táctil no existe. El cursor del sistema vuelve
// sobre los campos del formulario, para no esconder el cursor de texto.

const INTERACTIVOS = 'a[href], button, summary, label[for], [role="button"]';
const CAMPOS = 'input, textarea, select, [contenteditable="true"]';
// Paneles de papel claro (la entrada y la pausa no tienen papel: la tinta va clara)
const PAPEL = '.panel:not(.panel-ma), .indice-obras';

export function iniciarCursor({ menosMovimiento = false } = {}) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const raiz = document.documentElement;

  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="cursor-punto"></span><span class="cursor-anillo"><span class="cursor-texto"></span></span>';
  const halo = document.createElement('div');
  halo.className = 'cursor-halo';
  halo.setAttribute('aria-hidden', 'true');
  document.body.append(halo, cursor);
  raiz.classList.add('cursor-tinta');

  const punto = cursor.querySelector('.cursor-punto');
  const anillo = cursor.querySelector('.cursor-anillo');
  const texto = cursor.querySelector('.cursor-texto');

  // Posición real (ratón) y posiciones suavizadas (punto, anillo y halo con distinta inercia)
  const raton = { x: innerWidth / 2, y: innerHeight / 2 };
  const p = { ...raton };
  const a = { ...raton };
  const h = { ...raton };
  let cuadro = 0;
  let ultimo = 0;

  function mover(o, k, factor) {
    o.x += (raton.x - o.x) * factor * k;
    o.y += (raton.y - o.y) * factor * k;
  }

  function animar(ahora) {
    const dt = Math.min(64, ahora - (ultimo || ahora)) / 16.67;
    ultimo = ahora;
    if (menosMovimiento) { Object.assign(p, raton); Object.assign(a, raton); Object.assign(h, raton); } else {
      mover(p, dt, 0.42);
      mover(a, dt, 0.2);
      mover(h, dt, 0.08);
    }
    punto.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    anillo.style.transform = `translate3d(${a.x}px, ${a.y}px, 0)`;
    halo.style.transform = `translate3d(${h.x}px, ${h.y}px, 0)`;
    // Se detiene cuando todo llegó: sin bucle permanente
    const quieto = Math.abs(raton.x - h.x) + Math.abs(raton.y - h.y) < 0.3 && Math.abs(raton.x - a.x) + Math.abs(raton.y - a.y) < 0.3;
    cuadro = quieto ? 0 : requestAnimationFrame(animar);
    if (quieto) ultimo = 0;
  }
  const despertar = () => { if (!cuadro) cuadro = requestAnimationFrame(animar); };

  function leerObjetivo(objetivo) {
    if (!(objetivo instanceof Element)) return;
    const campo = objetivo.closest(CAMPOS);
    const pulsable = !campo && objetivo.closest(INTERACTIVOS);
    cursor.classList.toggle('en-campo', Boolean(campo));
    cursor.classList.toggle('activo', Boolean(pulsable));
    if (pulsable) texto.textContent = pulsable.closest('.mapa') ? '入' : '開';
    cursor.classList.toggle('sobre-papel', Boolean(objetivo.closest(PAPEL)));
    halo.classList.toggle('visible', objetivo.id === 'escena' && !menosMovimiento);
  }

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') { cursor.classList.add('fuera'); return; }
    raton.x = e.clientX; raton.y = e.clientY;
    if (cursor.classList.contains('fuera')) {
      // Al volver a la ventana aparece donde está el ratón, sin cruzar la pantalla
      Object.assign(p, raton); Object.assign(a, raton); Object.assign(h, raton);
      cursor.classList.remove('fuera');
    }
    despertar();
  }, { passive: true });
  addEventListener('pointerover', (e) => leerObjetivo(e.target), { passive: true });
  document.addEventListener('pointerleave', () => { cursor.classList.add('fuera'); halo.classList.remove('visible'); });
  addEventListener('blur', () => cursor.classList.add('fuera'));
  addEventListener('pointerdown', () => cursor.classList.add('pulsando'), { passive: true });
  addEventListener('pointerup', () => cursor.classList.remove('pulsando'), { passive: true });
  // Lo que cambia bajo un ratón quieto (paneles que aparecen al caminar con la rueda)
  let releer = 0;
  addEventListener('wheel', () => {
    clearTimeout(releer);
    releer = setTimeout(() => leerObjetivo(document.elementFromPoint(raton.x, raton.y)), 120);
  }, { passive: true });

  cursor.classList.add('fuera');
}
