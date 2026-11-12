// La linterna andon: el puntero (o el dedo) mueve la luz; sin puntero, la luz flota suave.
// Expone --x/--y (posición en px) y --lx/--ly (-1..1, para mover las sombras al revés de la luz).

export function iniciarLinterna() {
  const raiz = document.documentElement.style;
  let objetivoX = innerWidth / 2;
  let objetivoY = innerHeight / 2;
  let x = objetivoX;
  let y = objetivoY;
  let ultimoMovimiento = 0;
  let pendiente = false;

  const mover = (px, py) => {
    objetivoX = px;
    objetivoY = py;
    ultimoMovimiento = performance.now();
    if (!pendiente) { pendiente = true; requestAnimationFrame(cuadro); }
  };

  function cuadro(ahora) {
    pendiente = false;
    // Sin puntero por 4 s (celular, teclado): la luz deriva despacio cerca del centro.
    if (ahora - ultimoMovimiento > 4000) {
      objetivoX = innerWidth / 2 + Math.sin(ahora / 2600) * innerWidth * 0.12;
      objetivoY = innerHeight / 2 + Math.cos(ahora / 3400) * innerHeight * 0.08;
    }
    x += (objetivoX - x) * 0.18;
    y += (objetivoY - y) * 0.18;
    raiz.setProperty('--x', `${x.toFixed(1)}px`);
    raiz.setProperty('--y', `${y.toFixed(1)}px`);
    raiz.setProperty('--lx', ((x / innerWidth) * 2 - 1).toFixed(3));
    raiz.setProperty('--ly', ((y / innerHeight) * 2 - 1).toFixed(3));

    const quieta = Math.abs(objetivoX - x) < 0.5 && Math.abs(objetivoY - y) < 0.5;
    if (!quieta || ahora - ultimoMovimiento > 4000) { pendiente = true; requestAnimationFrame(cuadro); }
  }

  addEventListener('pointermove', (e) => mover(e.clientX, e.clientY), { passive: true });
  addEventListener('pointerdown', (e) => mover(e.clientX, e.clientY), { passive: true });
  // Con teclado, la luz va al elemento enfocado.
  addEventListener('focusin', (e) => {
    const r = e.target.getBoundingClientRect?.();
    if (r && r.width) mover(r.left + r.width / 2, r.top + r.height / 2);
  });

  pendiente = true;
  requestAnimationFrame(cuadro);
}
