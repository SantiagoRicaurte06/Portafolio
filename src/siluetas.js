// Siluetas que se ven detrás del papel de cada shōji. Todas en un lienzo de 200×200, color = currentColor.

const hoja = 'M0,-6 L1.6,-2.2 5.7,-2.6 2.6,0.4 4.6,4.6 0,2.4 -4.6,4.6 -2.6,0.4 -5.7,-2.6 -1.6,-2.2Z';

const SILUETAS = {
  // Geta y un paraguas de papel cerrado, apoyado junto a la puerta
  genkan: `
    <path d="M151,22h4v8h-4z"/>
    <path d="M153,30 L163,128 L143,128Z"/>
    <path d="M151.5,128h3v40h-3z"/>
    <path d="M147,166h11a3,3 0 0 1 0,6h-11z"/>
    <g>
      <rect x="18" y="160" width="58" height="8" rx="3"/>
      <rect x="24" y="168" width="7" height="14" rx="1"/>
      <rect x="63" y="168" width="7" height="14" rx="1"/>
      <path d="M26,160 Q47,138 68,160 L64,160 Q47,145 30,160Z"/>
      <rect x="84" y="164" width="58" height="8" rx="3" transform="rotate(-4 113 168)"/>
      <rect x="90" y="171" width="7" height="13" rx="1"/>
      <rect x="129" y="168" width="7" height="13" rx="1"/>
      <path d="M92,163 Q113,141 134,160 L130,160 Q113,148 96,163Z"/>
    </g>`,

  // Estante bajo con pergaminos enrollados
  obras: `
    <rect x="30" y="40" width="6" height="140"/>
    <rect x="164" y="40" width="6" height="140"/>
    <rect x="26" y="40" width="148" height="6"/>
    <rect x="26" y="96" width="148" height="6"/>
    <rect x="26" y="150" width="148" height="6"/>
    <g>
      <rect x="44" y="78" width="70" height="16" rx="8"/><circle cx="44" cy="86" r="9"/><circle cx="114" cy="86" r="9"/>
      <rect x="60" y="60" width="64" height="16" rx="8"/><circle cx="60" cy="68" r="9"/><circle cx="124" cy="68" r="9"/>
      <rect x="128" y="64" width="12" height="30" rx="6"/>
      <rect x="48" y="132" width="90" height="16" rx="8"/><circle cx="48" cy="140" r="9"/><circle cx="138" cy="140" r="9"/>
      <rect x="66" y="114" width="54" height="16" rx="8"/><circle cx="66" cy="122" r="9"/><circle cx="120" cy="122" r="9"/>
      <path d="M126,114 h22 v-6 l6,8 -6,8 v-6 h-22z" />
    </g>`,

  // Mesa baja con laptop, pincel en su soporte y piedra de tinta
  taller: `
    <rect x="16" y="132" width="168" height="8" rx="2"/>
    <rect x="26" y="140" width="8" height="34"/>
    <rect x="166" y="140" width="8" height="34"/>
    <path d="M58,80 h70 l-6,48 h-58z"/>
    <path d="M44,128 h98 l-6,4 h-86z"/>
    <rect x="150" y="112" width="22" height="20" rx="2"/>
    <rect x="156" y="62" width="3" height="50"/>
    <path d="M155.5,112 L157.5,122 L159.5,112z"/>
    <rect x="164" y="74" width="2.5" height="38"/>
    <path d="M24,122 h22 v10 h-22z M28,124 h14 v5 h-14z" fill-rule="evenodd"/>`,

  // Momiji: tronco, ramas, copa y hojas que caen
  camino: `
    <path d="M94,186 C98,160 92,140 100,118 C104,104 96,92 90,80 L96,78 C104,90 110,100 108,116 C116,104 128,96 140,94 L141,99 C128,102 118,110 112,124 C108,142 112,164 110,186Z"/>
    <path d="M100,112 C88,104 74,104 62,96 L64,92 C76,99 90,99 102,106Z"/>
    <g>
      <ellipse cx="96" cy="62" rx="44" ry="26"/>
      <ellipse cx="60" cy="84" rx="30" ry="18"/>
      <ellipse cx="140" cy="84" rx="32" ry="18"/>
      <ellipse cx="120" cy="50" rx="28" ry="18"/>
      <ellipse cx="70" cy="52" rx="24" ry="16"/>
      <ellipse cx="100" cy="88" rx="26" ry="12"/>
    </g>
    <g class="hojas-caen">
      <path class="hoja-cae h1" transform="translate(50 100)" d="${hoja}"/>
      <path class="hoja-cae h2" transform="translate(150 104)" d="${hoja}"/>
      <path class="hoja-cae h3" transform="translate(84 96)" d="${hoja}"/>
      <path class="hoja-cae h4" transform="translate(126 100)" d="${hoja}"/>
      <path class="hoja-cae h5" transform="translate(30 92)" d="${hoja}"/>
      <path class="hoja-cae h6" transform="translate(166 96)" d="${hoja}"/>
    </g>`,

  // Cortina noren de tienda: barra y tres paños
  servicios: `
    <rect x="20" y="34" width="160" height="6" rx="3"/>
    <circle cx="20" cy="37" r="5"/><circle cx="180" cy="37" r="5"/>
    <path d="M30,40 h44 v104 q-22,6 -44,0z"/>
    <path d="M78,40 h44 v110 q-22,6 -44,0z"/>
    <path d="M126,40 h44 v104 q-22,6 -44,0z"/>
    <circle cx="100" cy="86" r="14" fill="var(--papel)" opacity=".35"/>`,

  // Los Alpes bajo un cielo despejado y una grulla volando hacia ellos
  suenos: `
    <circle cx="156" cy="40" r="13"/>
    <path d="M0,170 L40,116 L56,130 L90,72 L116,112 L132,98 L168,138 L200,118 L200,170 Q150,162 100,168 Q50,174 0,170Z"/>
    <path d="M70,64 Q60,42 38,34 Q56,52 62,66Z"/>
    <path d="M76,62 Q92,38 116,30 Q96,52 82,66Z"/>
    <ellipse cx="72" cy="66" rx="14" ry="4.5" transform="rotate(-10 72 66)"/>
    <path d="M84,63 L106,57 L107,59 L86,66Z"/>
    <path d="M106,57 L113,57.5 L107,59Z"/>
    <path d="M59,69 L34,75 L35,76.5 L59,71Z"/>`,

  // Grulla de papel (origami) echando a volar
  contacto: `
    <path d="M100,112 L60,62 L98,96Z"/>
    <path d="M100,112 L150,40 L104,98Z"/>
    <path d="M78,118 L100,104 L124,118 L100,128Z"/>
    <path d="M124,118 L154,88 L150,94 L130,122Z"/>
    <path d="M154,88 L164,90 L152,94Z"/>
    <path d="M78,118 L52,104 L74,124Z"/>
    <path d="M44,170 q20,-10 40,0 M100,176 q24,-12 48,0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".6"/>`,
};

export function crearSilueta(nombre) {
  const contenido = SILUETAS[nombre];
  if (!contenido) return null;
  const plantilla = document.createElement('template');
  plantilla.innerHTML = `<svg class="silueta silueta-${nombre}" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><g fill="currentColor">${contenido}</g></svg>`;
  return plantilla.content.firstElementChild;
}
