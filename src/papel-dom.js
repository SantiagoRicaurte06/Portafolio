// Textura de washi para los paneles HTML: pulpa, fibras de kozo y grano. Se genera una vez (~5 ms).
export function texturaWashi(tamano = 256, semilla = 11) {
  const r = ((s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296))(semilla);
  const c = document.createElement('canvas');
  c.width = c.height = tamano;
  const x = c.getContext('2d');
  x.fillStyle = '#f3efe6';
  x.fillRect(0, 0, tamano, tamano);
  const repetir = (dibujar) => {
    for (const dx of [-tamano, 0, tamano]) for (const dy of [-tamano, 0, tamano]) { x.save(); x.translate(dx, dy); dibujar(); x.restore(); }
  };
  for (let i = 0; i < 18; i++) {
    const cx = r() * tamano; const cy = r() * tamano; const R = 30 + r() * 90;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
    const col = r() < 0.5 ? '255,255,252' : '150,140,120';
    g.addColorStop(0, `rgba(${col},.05)`); g.addColorStop(1, `rgba(${col},0)`);
    repetir(() => { x.fillStyle = g; x.fillRect(cx - R, cy - R, 2 * R, 2 * R); });
  }
  x.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const p = new Path2D(); let px = r() * tamano; let py = r() * tamano; let a = r() * 6.28;
    p.moveTo(px, py);
    for (let s = 0, L = 20 + r() * 110; s < L; s += 4) { a += (r() - 0.5) * 0.35; px += Math.cos(a) * 4; py += Math.sin(a) * 4; p.lineTo(px, py); }
    const trazo = `rgba(${r() < 0.65 ? '255,255,250' : '110,100,85'},${0.04 + r() * 0.1})`; const lw = 0.3 + r() * 0.9;
    repetir(() => { x.strokeStyle = trazo; x.lineWidth = lw; x.stroke(p); });
  }
  const im = x.getImageData(0, 0, tamano, tamano); const d = im.data;
  for (let i = 0; i < d.length; i += 4) { const g = (r() - 0.5) * 9; d[i] += g; d[i + 1] += g; d[i + 2] += g; }
  x.putImageData(im, 0, 0);
  return new Promise((resolver) => c.toBlob((b) => resolver(b ? URL.createObjectURL(b) : null), 'image/webp', 0.85));
}
