# Plan del portafolio v2

Decisiones cerradas en la entrevista del 2026-11-12. Si algo cambia, se actualiza aquí primero.

## Objetivo

- Conseguir **empleo o etapa productiva (SENA)**; secundario: clientes freelance.
- Público: reclutadores y líderes técnicos. Nombre, rol y acceso a proyectos visibles en los primeros segundos.
- Bilingüe **ES / EN**; idioma inicial según el navegador, la elección se recuerda.

## Concepto

Casa japonesa en blanco y negro recorrida por un **pasillo (engawa) horizontal** con puertas **shōji**; en móvil el pasillo es vertical.

- **Linterna andon**: el cursor (o el dedo) es una linterna; la casa está en penumbra y la luz proyecta las siluetas detrás del papel y hace legible la tinta. En móvil sigue el dedo; giroscopio opcional que el usuario activa.
- **Siluetas** SVG de objetos (nada personal), con la sombra suave del kanji de cada habitación. Sin recargar: una animación por habitación.
- **Caligrafía** trazo a trazo con datos de **KanjiVG** (CC BY-SA 3.0, crédito en el pie).
- **Único color**: el rojo del sello hanko **サンティアゴ** (logo y favicon).
- **Botón "encender las lámparas"**: ilumina todo y deja el contenido legible sin linterna; se activa solo con `prefers-reduced-motion`.
- **Mapa de la casa** siempre visible para saltar a cualquier habitación.
- **Sonido** (roce del shōji, fūrin, viento) apagado por defecto, botón 🔈.
- **Tipografías**: Shippori Mincho (títulos) + Zen Kaku Gothic New (texto). Si no armonizan en pantalla, buscar otra combinación.

### Entrada (solo la primera visita, se salta con clic, tecla o scroll)

Penumbra → se pinta 玄関 trazo a trazo → cae el sello → nombre, rol e insignia → la primera puerta se abre sola. Unos 2,5 s.

## Habitaciones (en este orden)

| # | Habitación | Silueta | Contenido |
|---|---|---|---|
| 1 | 玄関 Genkan | Geta y paraguas | Santiago Alexis Ricaurte · "Desarrollador de Software · Backend y análisis de datos" · insignia "Disponible para empleo y etapa productiva · Remoto o Yopal" |
| 2 | 作 Obras | Estante con pergaminos | 3 pergaminos (ver abajo) |
| 3 | 技 Taller | Mesa baja con laptop, pinceles y tintero | Habilidades agrupadas + "Cómo trabajo" |
| 4 | 道 Camino | Momiji con hojas que caen (sus sombras pasan por la luz) | Historia, Yopal, ADSO SENA, cofundador de Zyvo, foto en B/N con borde de pincel |
| 5 | 商 Servicios | Cortina noren | Servicios freelance a nombre propio |
| 6 | 夢 Sueños | Alpes bajo cielo despejado con una grulla volando hacia ellos | Sueños e intereses |
| 7 | 縁 Contacto | Grulla de papel echando a volar | Enlaces, CV y formulario |

### 作 Obras

Casos de estudio **anónimos**, sin código ni enlaces al repo, con 4–6 capturas **con datos ficticios** (las aporta Santiago):

1. **papeleria-turnos** → "Papelería con varias sedes en Casanare": turnos, cuadre de caja en vivo, bodega, deudas y nómina por sede. React 19 + TypeScript + Vite + Tailwind + Supabase. En producción, 12 versiones, CI.
2. **sistema-de-aguas** → "Empresa de agua": inventario, BOM, producción y facturación interna. TypeScript full-stack (Express + Prisma + React/Vite), 57 pruebas, CI.
3. **Este portafolio**: cómo se hizo (KanjiVG, linterna, función en Vercel, flujo de trabajo). Código público.

No se muestran por ahora: N.B.A_Predictor, Jobsy, Proyecto-ESP32-IoT. Se pueden agregar después sin tocar el diseño.

### 技 Taller

- **Uso a diario**: Python, SQL (PostgreSQL), Supabase, TypeScript, Node.js/Express, Git y GitHub Actions.
- **He construido con**: Prisma, React, Docker, Go, pandas, scikit-learn/XGBoost, MQTT.
- **Estoy aprendiendo**: análisis de datos (estadística, visualización), buenas prácticas (código limpio, arquitectura, pruebas), finanzas, inglés.
- **Cómo trabajo**: yo diseño, reviso y decido; la IA (Claude Code) es una herramienta con reglas: skills propias, hooks de protección, revisiones de seguridad y rendimiento, Conventional Commits y CI. Redactarlo para que no suene a que la IA hace todo.
- Sin barras de porcentaje.

### 道 Camino

De Yopal, Casanare (Colombia). Estudiante de ADSO en el SENA. Busca empleo o prácticas; prefiere remoto, también presencial; abierto a empresas de fuera de Colombia. Cofundador de **Zyvo** con sus socios, con proyectos en marcha con empresas → https://www.zyvolabs.website/ (ahí están sus redes). Texto natural, sin inventar logros.

### 商 Servicios

A nombre de Santiago (Zyvo solo se menciona en Camino). Botón "Cotizar" que abre el formulario con el motivo "Proyecto".

1. Sitios web y landing pages, editables con CMS sin código.
2. Tiendas online funcionales con pasarela de pago (Wompi) y CMS.
3. Software a la medida (enlaza a los casos de Obras).
4. Bots y automatizaciones (Discord, WhatsApp, flujos con IA).
5. Presencia en Google: Google Business Profile y SEO local.
6. Mantenimiento después de entregar.

Sin precios.

### 夢 Sueños

Viajar a Suiza · crecer como empresa con Zyvo y lograr estabilidad financiera · llegar a senior · hablar al menos 3 idiomas además del español · crear un proyecto con ingresos mensuales estables. Intereses: estudiar finanzas por su cuenta, inventar ideas locas e intentar sacarlas adelante, planes con amigos los fines de semana, caminatas por la naturaleza y la libertad de un cielo despejado.

### 縁 Contacto

- Email, LinkedIn, GitHub y **CV en PDF** ES/EN (Santiago pasa su CV; se adapta al estilo del sitio).
- **Formulario**: nombre, email, motivo (Oferta de trabajo / Proyecto / Otro), mensaje y casilla de consentimiento sin marcar.
  - Función de Vercel + Resend; validación con esquema, honeypot y límite por IP.
  - Destino: Gmail personal hasta tener `contacto@<dominio>` (reenvío con Cloudflare Email Routing o el registrador).
  - Revisión con `revision-seguridad-backend` antes de publicar.
- **Aviso de privacidad** (Ley 1581 de 2012) en ES/EN: borrador para que lo revise el abogado de Santiago.

## Técnica

- **Vite + JavaScript puro** (sin framework).
- **Vercel** con dominio propio (lo gestiona Santiago), vista previa por PR y **Vercel Web Analytics** (sin cookies, sin otros rastreadores).
- Accesible con teclado y lector de pantalla, contraste AA, `prefers-reduced-motion`.
- Meta: Lighthouse ≥ 90 en móvil.
- Página 404 temática ("habitación vacía"), Open Graph con el sello, crédito a KanjiVG en el pie.

## Pendientes de Santiago

1. CV actual.
2. 4–6 capturas con datos ficticios de cada sistema (puedo preparar un guion de qué capturar).
3. Links de LinkedIn y GitHub.
4. Dominio, y llevar el borrador de privacidad al abogado.
