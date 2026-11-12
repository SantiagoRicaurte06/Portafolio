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
    activarSonido: 'Activar sonido',
    modoLectura: 'Modo lectura',
    modoCasa: 'Recorrer la casa',
    cargando: 'ENCENDIENDO LAS LINTERNAS',
    silenciar: 'Silenciar',
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
    fNombre: 'Nombre',
    fEmail: 'Email',
    fMotivo: 'Motivo',
    mTrabajo: 'Oferta de trabajo o práctica',
    mProyecto: 'Proyecto',
    mOtro: 'Otro',
    fMensaje: 'Mensaje',
    fConsentimiento: 'Acepto el tratamiento de mis datos según el',
    avisoPrivacidad: 'aviso de privacidad',
    fEnviar: 'Enviar',
    enviando: 'Enviando…',
    enviado: 'Mensaje enviado. Te respondo pronto.',
    error_nombre: 'Revisa tu nombre (entre 2 y 80 caracteres).',
    error_email: 'Revisa tu email.',
    error_motivo: 'Elige un motivo.',
    error_mensaje: 'El mensaje debe tener entre 10 y 3000 caracteres.',
    error_consentimiento: 'Necesito tu autorización para tratar tus datos.',
    error_limite: 'Enviaste varios mensajes seguidos. Intenta en unos minutos.',
    error_formato: 'No se pudo leer el formulario. Recarga la página e intenta de nuevo.',
    error_servicio: 'No se pudo enviar ahora. Escríbeme directo al correo.',
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
    activarSonido: 'Sound on',
    modoLectura: 'Reading mode',
    modoCasa: 'Walk the house',
    cargando: 'LIGHTING THE LANTERNS',
    silenciar: 'Mute',
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
    fNombre: 'Name',
    fEmail: 'Email',
    fMotivo: 'Reason',
    mTrabajo: 'Job or internship offer',
    mProyecto: 'Project',
    mOtro: 'Other',
    fMensaje: 'Message',
    fConsentimiento: 'I agree to the processing of my data under the',
    avisoPrivacidad: 'privacy notice',
    fEnviar: 'Send',
    enviando: 'Sending…',
    enviado: "Message sent. I'll get back to you soon.",
    error_nombre: 'Check your name (2 to 80 characters).',
    error_email: 'Check your email.',
    error_motivo: 'Pick a reason.',
    error_mensaje: 'The message must be 10 to 3000 characters long.',
    error_consentimiento: 'I need your consent to process your data.',
    error_limite: 'You sent several messages in a row. Try again in a few minutes.',
    error_formato: "The form couldn't be read. Reload the page and try again.",
    error_servicio: "It couldn't be sent right now. Email me directly.",
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
    const visible = actual === 'es' ? 'EN' : 'ES';
    boton.textContent = visible;
    // El nombre accesible empieza por el texto visible (WCAG 2.5.3).
    boton.setAttribute('aria-label', `${visible} · ${t('cambiarIdioma')}`);
  };
  aplicarIdioma(inicial);
  pintarBoton();
  boton.addEventListener('click', () => {
    aplicarIdioma(actual === 'es' ? 'en' : 'es');
    guardar(actual);
    pintarBoton();
  });
}
