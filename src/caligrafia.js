// Pinta kanji trazo por trazo con los datos de KanjiVG (CC BY-SA 3.0).
import TRAZOS from './datos/kanji.json';

const NS = 'http://www.w3.org/2000/svg';
const menosMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Crea el SVG de un texto (uno o más kanji en fila) con todos los trazos ocultos.
export function crearKanji(texto, { clase = '', etiqueta } = {}) {
  const caracteres = [...texto].filter((c) => TRAZOS[c]);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${109 * caracteres.length} 109`);
  svg.setAttribute('class', `kanji-pintado ${clase}`.trim());
  if (etiqueta) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', etiqueta);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  caracteres.forEach((c, i) => {
    const grupo = document.createElementNS(NS, 'g');
    grupo.setAttribute('transform', `translate(${109 * i} 0)`);
    TRAZOS[c].forEach((d) => {
      const trazo = document.createElementNS(NS, 'path');
      trazo.setAttribute('d', d);
      grupo.append(trazo);
    });
    svg.append(grupo);
  });
  return svg;
}

// Anima los trazos en orden. Devuelve una promesa que se cumple al terminar.
// `duracion` es el tiempo total aproximado en ms; los trazos largos tardan más.
export function pintar(svg, { duracion = 1600 } = {}) {
  const trazos = [...svg.querySelectorAll('path')];
  if (svg.dataset.pintado) return Promise.resolve();
  svg.dataset.pintado = 'si';
  if (menosMovimiento() || !trazos.length) {
    trazos.forEach((t) => { t.style.strokeDashoffset = '0'; t.style.strokeDasharray = 'none'; });
    return Promise.resolve();
  }
  const largos = trazos.map((t) => t.getTotalLength());
  const total = largos.reduce((a, b) => a + b, 0);
  const pausa = 40; // el pincel se levanta entre trazos
  const tiempoTinta = Math.max(duracion - pausa * trazos.length, duracion * 0.5);

  let espera = 0;
  const animaciones = trazos.map((t, i) => {
    const largo = largos[i];
    const ms = Math.max(90, (largo / total) * tiempoTinta);
    t.style.strokeDasharray = `${largo} ${largo}`;
    t.style.strokeDashoffset = String(largo);
    const animacion = t.animate(
      [{ strokeDashoffset: largo }, { strokeDashoffset: 0 }],
      { duration: ms, delay: espera, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' },
    );
    espera += ms + pausa;
    return animacion.finished;
  });
  return Promise.all(animaciones).then(() => {
    trazos.forEach((t) => { t.style.strokeDashoffset = '0'; t.style.strokeDasharray = 'none'; });
  });
}

export function saltarAlFinal(svg) {
  svg.querySelectorAll('path').forEach((t) => {
    t.getAnimations().forEach((a) => a.finish());
    t.style.strokeDashoffset = '0';
    t.style.strokeDasharray = 'none';
  });
}
