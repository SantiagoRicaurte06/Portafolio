// Idioma de las páginas de texto (privacidad, términos, 404): el mismo que eligió
// el visitante en la casa (clave 'idioma' en localStorage). El título de cada
// idioma va en <html data-titulo-es="…" data-titulo-en="…">.
const raiz = document.documentElement;
const bloques = document.querySelectorAll('[data-idioma]');
const botones = document.querySelectorAll('[data-cambiar]');

function aplicar(idioma) {
  const actual = idioma === 'en' ? 'en' : 'es';
  raiz.lang = actual;
  const titulo = raiz.dataset[actual === 'en' ? 'tituloEn' : 'tituloEs'];
  if (titulo) document.title = titulo;
  bloques.forEach((el) => { el.hidden = el.dataset.idioma !== actual; });
  botones.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cambiar === actual)));
}

let guardado = null;
try { guardado = localStorage.getItem('idioma'); } catch { /* sin almacenamiento */ }
// Sin elección guardada, igual que la casa: el idioma del navegador.
aplicar(guardado ?? (navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'));

botones.forEach((b) => b.addEventListener('click', () => {
  aplicar(b.dataset.cambiar);
  try { localStorage.setItem('idioma', b.dataset.cambiar); } catch { /* sin almacenamiento */ }
}));
