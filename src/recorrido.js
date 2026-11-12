// El recorrido: el scroll (rueda, trackpad, dedo, teclado, barra) es caminar por el engawa.
// Cada sala tiene una pausa (la puerta se abre, se lee) y luego un tramo de caminata hasta la siguiente.
// Lenis suaviza el scroll; la página real crece con un espaciador (#trayecto), así el navegador,
// la barra de scroll, Fin/Inicio y el lector de pantalla siguen funcionando.
import Lenis from 'lenis';

const TRANSITO = 0.95; // pantallas de scroll entre una sala y la siguiente
const facil = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function crearRecorrido({ salas, trayecto, menosMovimiento, alActualizar }) {
  const lenis = new Lenis({ lerp: menosMovimiento ? 1 : 0.085, smoothWheel: !menosMovimiento, wheelMultiplier: 0.9, touchMultiplier: 1.3, autoRaf: true });
  let tramos = [];
  let total = 0;

  function medir() {
    const alto = window.innerHeight;
    tramos = [];
    let y = 0;
    salas.forEach((sala, i) => {
      const pausa = sala.pausa * alto;
      tramos.push({ i, tipo: 'pausa', desde: y, hasta: y + pausa });
      y += pausa;
      if (i < salas.length - 1) {
        tramos.push({ i, tipo: 'transito', desde: y, hasta: y + TRANSITO * alto });
        y += TRANSITO * alto;
      }
    });
    total = y;
    trayecto.style.height = `${total + alto}px`;
  }

  function estado(scroll) {
    const y = Math.min(Math.max(scroll, 0), total);
    const tramo = tramos.find((t) => y < t.hasta) ?? tramos[tramos.length - 1];
    const f = (y - tramo.desde) / Math.max(1, tramo.hasta - tramo.desde);
    if (tramo.tipo === 'pausa') return { posicion: tramo.i, local: Math.min(1, f), sala: tramo.i };
    const posicion = tramo.i + facil(f);
    return { posicion, local: f < 0.5 ? 1 : 0, sala: Math.round(posicion) };
  }

  function inicioPausa(i) {
    return tramos.find((t) => t.tipo === 'pausa' && t.i === i)?.desde ?? 0;
  }

  // Ir a una sala: queda con la puerta ya abierta (o en el punto `local` de su pausa).
  function irA(i, { local = i === 0 ? 0 : 0.45, inmediato = false } = {}) {
    const t = tramos.find((x) => x.tipo === 'pausa' && x.i === i);
    if (!t) return;
    const y = t.desde + (t.hasta - t.desde) * local;
    lenis.scrollTo(y, { immediate: inmediato || menosMovimiento, duration: 1.4, force: true });
  }

  medir();
  lenis.on('scroll', ({ scroll }) => alActualizar(estado(scroll)));
  addEventListener('resize', () => { medir(); alActualizar(estado(lenis.scroll)); });
  alActualizar(estado(0));

  return { lenis, irA, inicioPausa, estadoActual: () => estado(lenis.scroll), detener: () => lenis.stop(), reanudar: () => lenis.start() };
}
