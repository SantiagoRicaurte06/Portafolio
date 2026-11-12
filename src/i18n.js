const TEXTOS = {
  es: {
    saltar: 'Saltar al contenido',
    mapa: 'Mapa de la casa',
    genkan: 'Entrada',
    obras: 'Obras',
    taller: 'Taller',
    camino: 'Camino',
    servicios: 'Servicios',
    suenos: 'Sueños',
    contacto: 'Contacto',
    encender: 'Encender las lámparas',
    apagar: 'Apagar las lámparas',
    abrir: 'Abrir',
    rol: 'Desarrollador de Software · Backend y análisis de datos',
    insignia: 'Disponible para empleo y etapa productiva · Remoto o Yopal',
    verObras: 'Ver mis obras',
    cambiarIdioma: 'Change language to English',
    creditoKanji: 'Trazos de los kanji:',
    capturasPronto: 'Capturas con datos de prueba, próximamente.',
    usoDiario: 'Uso a diario',
    heConstruido: 'He construido con',
    aprendiendo: 'Estoy aprendiendo',
    comoTrabajo: 'Cómo trabajo',
    estudios: 'Estudios',
    idiomas: 'Idiomas',
    cotizar: 'Cotizar un proyecto',
    metas: 'Hacia dónde voy',
    intereses: 'Lo que me gusta',
  },
  en: {
    saltar: 'Skip to content',
    mapa: 'Map of the house',
    genkan: 'Entrance',
    obras: 'Work',
    taller: 'Workshop',
    camino: 'Path',
    servicios: 'Services',
    suenos: 'Dreams',
    contacto: 'Contact',
    encender: 'Turn on the lamps',
    apagar: 'Turn off the lamps',
    abrir: 'Open',
    rol: 'Software Developer · Backend and data analysis',
    insignia: 'Open to jobs and internships · Remote or Yopal, Colombia',
    verObras: 'See my work',
    cambiarIdioma: 'Cambiar idioma a español',
    creditoKanji: 'Kanji strokes:',
    capturasPronto: 'Screenshots with test data, coming soon.',
    usoDiario: 'Daily tools',
    heConstruido: "I've built with",
    aprendiendo: 'Currently learning',
    comoTrabajo: 'How I work',
    estudios: 'Education',
    idiomas: 'Languages',
    cotizar: 'Request a quote',
    metas: "Where I'm headed",
    intereses: 'What I enjoy',
  },
};

const CLAVE = 'idioma';
let actual = 'es';

function guardado() {
  try { return localStorage.getItem(CLAVE); } catch { return null; }
}

function guardar(idioma) {
  try { localStorage.setItem(CLAVE, idioma); } catch { /* sin almacenamiento: no pasa nada */ }
}

export function t(clave) {
  return TEXTOS[actual][clave] ?? TEXTOS.es[clave] ?? clave;
}

export function idiomaActual() {
  return actual;
}

export function aplicarIdioma(idioma) {
  actual = TEXTOS[idioma] ? idioma : 'es';
  document.documentElement.lang = actual;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-idioma]').forEach((el) => { el.hidden = el.dataset.idioma !== actual; });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.dispatchEvent(new CustomEvent('idioma', { detail: actual }));
}

export function iniciarIdioma(boton) {
  const inicial = guardado() ?? (navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en');
  const pintarBoton = () => {
    boton.textContent = actual === 'es' ? 'EN' : 'ES';
    boton.setAttribute('aria-label', t('cambiarIdioma'));
  };
  aplicarIdioma(inicial);
  pintarBoton();
  boton.addEventListener('click', () => {
    aplicarIdioma(actual === 'es' ? 'en' : 'es');
    guardar(actual);
    pintarBoton();
  });
}
