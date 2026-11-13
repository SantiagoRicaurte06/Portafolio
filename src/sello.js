// Sello hanko: el sello rojo cae, presiona el papel y deja una impresión imperfecta, como uno real
// (tinta desigual por la presión, poros sin tinta y bordes mordidos). Se dibuja en canvas a partir de
// /sello.svg y se anima con la Web Animations API (sin bucle propio: no cuesta nada al terminar).
import { sonar } from './sonido.js';

let imagen = null;
function cargarImagen() {
  if (imagen) return imagen;
  imagen = new Promise((resolver) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null);
    img.src = '/sello.svg';
  });
  return imagen;
}

// Impresión: el sello y, encima, lo que la tinta no llegó a cubrir.
function imprimir(lienzo, img) {
  const c = lienzo.getContext('2d');
  const S = lienzo.width; const u = S / 64;
  if (img) c.drawImage(img, 0, 0, S, S);
  else {
    c.fillStyle = '#b3262c'; c.beginPath();
    if (c.roundRect) c.roundRect(3 * u, 3 * u, 58 * u, 58 * u, 6 * u); else c.rect(3 * u, 3 * u, 58 * u, 58 * u);
    c.fill();
    c.strokeStyle = '#f6f2ea'; c.lineWidth = 2 * u; c.strokeRect(7 * u, 7 * u, 50 * u, 50 * u);
  }
  const r = Math.random;
  c.globalCompositeOperation = 'destination-out';
  // Presión desigual: un lado del sello carga menos tinta.
  const a = r() * Math.PI * 2;
  const g = c.createLinearGradient(S / 2 + Math.cos(a) * S * 0.6, S / 2 + Math.sin(a) * S * 0.6, S / 2, S / 2);
  g.addColorStop(0, 'rgba(0,0,0,.42)'); g.addColorStop(0.55, 'rgba(0,0,0,.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  // Manchas sin tinta: grupos de poros, más densos en el lado flojo.
  const fx = Math.cos(a); const fy = Math.sin(a);
  for (let k = 0; k < 9; k++) {
    const lado = 0.25 + 0.35 * r();
    const cx = S / 2 + fx * S * lado + (r() - 0.5) * S * 0.7; const cy = S / 2 + fy * S * lado + (r() - 0.5) * S * 0.7;
    const radio = S * (0.03 + 0.07 * r());
    for (let p = 0, n = 14 + r() * 26; p < n; p++) {
      const d = radio * Math.sqrt(r()); const t = r() * 7;
      c.fillStyle = `rgba(0,0,0,${0.35 + 0.6 * r()})`;
      c.beginPath(); c.arc(cx + Math.cos(t) * d, cy + Math.sin(t) * d, u * (0.12 + 0.5 * r() * r()), 0, 7); c.fill();
    }
  }
  // Poros sueltos por toda la superficie.
  for (let p = 0; p < 260; p++) {
    c.fillStyle = `rgba(0,0,0,${0.2 + 0.7 * r()})`;
    c.fillRect(r() * S, r() * S, u * (0.15 + 0.35 * r()), u * (0.15 + 0.35 * r()));
  }
  // Rayas finas de la madera/goma del sello.
  c.lineWidth = u * 0.25;
  for (let p = 0; p < 7; p++) {
    const y = r() * S; c.strokeStyle = `rgba(0,0,0,${0.15 + 0.25 * r()})`;
    c.beginPath(); c.moveTo(r() * S * 0.4, y); c.lineTo(S * (0.6 + r() * 0.4), y + (r() - 0.5) * S * 0.08); c.stroke();
  }
  // Borde mordido: mordiscos pequeños a lo largo del contorno.
  for (let p = 0; p < 70; p++) {
    const t = r() * 4; const s = r() * 58 * u + 3 * u; const m = 3 * u + (r() - 0.3) * u * 0.9;
    const [x, y] = t < 1 ? [s, m] : t < 2 ? [S - m, s] : t < 3 ? [s, S - m] : [m, s];
    c.fillStyle = `rgba(0,0,0,${0.5 + 0.5 * r()})`;
    c.beginPath(); c.arc(x, y, u * (0.3 + 0.9 * r()), 0, 7); c.fill();
  }
  c.globalCompositeOperation = 'source-over';
}

/**
 * Estampa el sello en `contenedor` (centrado en x, y px; relativos al contenedor, que debe estar
 * posicionado, o a la ventana si es document.body). Devuelve una Promise que se resuelve con el
 * elemento cuando el sello ya está asentado.
 * opciones: tamano (px), giro (grados finales), ms (duración de la caída), sonido (true),
 * retirar (ms, opcional: tras ese tiempo se desvanece y se quita solo).
 */
export async function estamparSello(contenedor = document.body, { x = innerWidth / 2, y = innerHeight / 2, tamano = 64, giro = -5 + Math.random() * 3, ms = 560, sonido = true, retirar } = {}) {
  const img = await cargarImagen();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = Math.round(tamano * dpr);
  lienzo.setAttribute('aria-hidden', 'true');
  const fijo = contenedor === document.body || contenedor === document.documentElement;
  lienzo.style.cssText = `position:${fijo ? 'fixed' : 'absolute'};left:${x}px;top:${y}px;width:${tamano}px;height:${tamano}px;pointer-events:none;z-index:70;transform:translate(-50%,-50%) rotate(${giro}deg)`;
  imprimir(lienzo, img);
  contenedor.append(lienzo);

  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!quieto) {
    const base = 'translate(-50%,-50%)';
    // Cae girando, aplasta un poco al tocar (la tinta se transfiere), rebota mínimo y se asienta.
    const caida = lienzo.animate([
      { transform: `${base} scale(1.9) rotate(${giro - 13}deg)`, opacity: 0, filter: 'blur(1.5px)', offset: 0 },
      { transform: `${base} scale(1.25) rotate(${giro - 5}deg)`, opacity: 0.35, filter: 'blur(.6px)', offset: 0.4, easing: 'cubic-bezier(.5,0,.9,.5)' },
      { transform: `${base} scale(.93) rotate(${giro + 0.6}deg)`, opacity: 0.8, filter: 'blur(0)', offset: 0.62 },
      { transform: `${base} scale(1.015) rotate(${giro - 0.2}deg)`, opacity: 1, filter: 'blur(0)', offset: 0.8 },
      { transform: `${base} scale(1) rotate(${giro}deg)`, opacity: 1, filter: 'blur(0)', offset: 1 },
    ], { duration: ms, easing: 'cubic-bezier(.3,0,.2,1)' });
    if (sonido) setTimeout(() => sonar('sello'), ms * 0.6);
    await caida.finished.catch(() => {});
  } else if (sonido) sonar('sello');

  if (retirar) {
    setTimeout(() => {
      if (quieto) { lienzo.remove(); return; }
      lienzo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished.then(() => lienzo.remove(), () => lienzo.remove());
    }, retirar);
  }
  return lienzo;
}
