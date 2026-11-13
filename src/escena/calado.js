// Ranma calado (sukashi-bori): una tabla de madera sobre el panel alto con olas o nubes recortadas.
// La luz de la sala atraviesa los huecos y dibuja el motivo en la noche.
import * as THREE from 'three';
import { azar } from './lote.js';

// Media luna con la panza hacia arriba: arco exterior de radio r y arco interior de un círculo
// más bajo que pasa por las mismas puntas. `corte` inclina la ola hacia delante.
function medialuna(cx, cy, r, { abertura = 1.1, caida = 0.8, corte = 0.35, n = 14 } = {}) {
  const puntas = [Math.PI / 2 - abertura, Math.PI / 2 + abertura];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = puntas[0] + (puntas[1] - puntas[0]) * (i / n);
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const h = caida * r;
  const tx = Math.sin(abertura) * r, ty = Math.cos(abertura) * r;
  const r2 = Math.hypot(tx, ty + h);
  const b0 = Math.atan2(ty + h, -tx), b1 = Math.atan2(ty + h, tx);
  for (let i = 1; i < n; i++) {
    const a = b0 + (b1 - b0) * (i / n);
    pts.push([Math.cos(a) * r2, Math.sin(a) * r2 - h]);
  }
  return pts.map(([x, y]) => new THREE.Vector2(cx + x + y * corte, cy + y));
}

// Nube: óvalo con el borde en festón.
function nube(cx, cy, a, b, lobulos, n = 56) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const k = 1 + 0.16 * Math.abs(Math.sin(t * lobulos * 0.5));
    pts.push(new THREE.Vector2(cx + Math.cos(t) * a * k, cy + Math.sin(t) * b * k));
  }
  return pts;
}

// Banda de bruma (kasumi): rectángulo de puntas redondas.
function bruma(cx, cy, largo, alto, n = 8) {
  const pts = [];
  const r = alto / 2;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    pts.push(new THREE.Vector2(cx + largo / 2 - r + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (i / n) * Math.PI;
    pts.push(new THREE.Vector2(cx - largo / 2 + r + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

// Tabla de `ancho` × `alto` (de y=0 a y=alto, centrada en x) con su grosor hacia +z.
export function geoCalado(motivo, ancho, alto, grosor = 0.025, semilla = 1) {
  const tabla = new THREE.Shape();
  tabla.moveTo(-ancho / 2, 0);
  tabla.lineTo(ancho / 2, 0);
  tabla.lineTo(ancho / 2, alto);
  tabla.lineTo(-ancho / 2, alto);
  tabla.closePath();
  const huecos = [];
  const rnd = azar(semilla);
  const margen = 0.3;

  if (motivo === 'olas') {
    // Dos filas de olas en escamas (seigaiha), cada una con su cresta interior.
    const r = Math.min(0.2, alto * 0.48);
    const paso = r * 2.1;
    const filas = [alto * 0.02, alto * 0.02 + r * 0.85];
    filas.forEach((y, f) => {
      for (let x = -ancho / 2 + margen + (f ? paso / 2 : 0); x <= ancho / 2 - margen; x += paso) {
        huecos.push(medialuna(x, y, r));
        huecos.push(medialuna(x, y, r * 0.55, { caida: 0.9 }));
      }
    });
  } else {
    // Nubes en festón y bandas de bruma debajo.
    const cuantas = Math.max(2, Math.round(ancho / 1.8));
    const paso = (ancho - margen * 2) / cuantas;
    for (let i = 0; i < cuantas; i++) {
      const cx = -ancho / 2 + margen + paso * (i + 0.5) + (rnd() - 0.5) * paso * 0.15;
      const a = paso * (0.26 + rnd() * 0.06);
      huecos.push(nube(cx, alto * 0.6, a, alto * 0.24, 5 + Math.floor(rnd() * 3)));
    }
    for (let i = 0; i < cuantas + 1; i++) {
      const cx = -ancho / 2 + margen + paso * i;
      const largo = paso * (0.45 + rnd() * 0.25);
      if (Math.abs(cx) + largo / 2 > ancho / 2 - 0.08) continue;
      huecos.push(bruma(cx, alto * 0.16, largo, alto * 0.11));
    }
  }

  for (const pts of huecos) tabla.holes.push(new THREE.Path(pts));
  return new THREE.ExtrudeGeometry(tabla, { depth: grosor, bevelEnabled: false, curveSegments: 1 });
}
