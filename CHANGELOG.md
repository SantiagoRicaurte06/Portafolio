# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Añadido

- Términos de uso (ES/EN) en `/terminos.html`, enlazados en el pie junto a la política de privacidad.
- `sitemap.xml` y la línea `Sitemap:` en `robots.txt`.
- Open Graph y URL canónica en la política de privacidad y en los términos.

### Cambiado

- Página 404 rediseñada: hoja de shōji con bordes rasgados iluminada por la linterna, 空 en tinta con el sello, selector ES/EN.
- `og:image` y `og:url` con URL absoluta (`https://santiagoricaurte.dev`).
- El idioma de las páginas de texto vive en un solo módulo (`src/idioma-pagina.js`) y, sin elección guardada, sigue al navegador como la casa.

## [1.2.0] - 2026-11-13

### Añadido

- Política de tratamiento de datos personales y aviso de privacidad completos (Ley 1581 de 2012), en español e inglés, con selector de idioma.
- Aviso corto de tratamiento de datos debajo del formulario de contacto.

### Cambiado

- La casilla de autorización del formulario nombra al responsable y enlaza a la política.
- La constancia de autorización del correo registra la versión 1.0 de la política.

## [1.1.0] - 2026-11-13

### Añadido

- Objetos con mucho más detalle en las siete salas:
  - Entrada: wagasa abierto y cerrado, andon y geta.
  - Obras: tana con chigaidana, cajas de kiri y kakejiku con ensō.
  - Taller: shodō completo y té con vapor.
  - Camino: momiji con ramificación, hojas que aletean y caen en péndulo.
  - Servicios: noren con el 商 calado y chōchin.
  - Sueños: montañas en capas y grulla articulada.
  - Contacto: orizuru de origami.
- Arquitectura y jardín: taruki y kawara, cadena de lluvia, pilares sobre piedras, ranma calados, piedras de paso, tōrō con fuego, arbustos karikomi, bambú y primer plano con juncos y rama de pino.
- Papel washi a contraluz con pulpa y fibras de kozo, temperatura de color, kumiko con volumen, parches y manchas, y llama que respira.
- Atmósfera: cámara con inercia y acercamiento a la puerta, linterna que camina entre salas, polvo en el haz de luz, niebla sobre el agua y postproceso suave en equipos potentes.
- Estanque con reflejo del muro, koi, luciérnagas, nenúfares y luna.
- Tinta más viva (tono, sangrado y kasure), sello animado, preludio con línea de carga y cortina, y transición de tinta más orgánica.
- Interfaz:
  - Cursor de tinta con 開 / 入.
  - Palabras que entran por línea y numeración que rueda.
  - Paneles de papel rasgado.
  - Hilo de progreso y sugerencia de scroll.
- Paisaje sonoro nocturno procedural: viento, grillos, gotas, pasos, pincel, sello y tinta.

### Cambiado

- En celular la casa 3D se carga con el primer gesto y antes se ve una imagen fija de la entrada (Lighthouse móvil: rendimiento 93, LCP 1,8 s).
- La escena se construye por etapas, los shaders se compilan en segundo plano y la entrada se ve sin esperar al 3D.

### Corregido

- El cursor ya no salta a la esquina de la pantalla al hacer clic ni al pasar por un botón.

## [1.0.3] - 2026-11-12

### Corregido

- Modo lectura: los paneles visibles quedaban desplazados media altura hacia arriba (la regla del recorrido `.sala.visible .panel` era más específica), lo que dejaba Obras fuera de vista y huecos negros entre salas.

## [1.0.2] - 2026-11-12

### Corregido

- Los enlaces directos a una sala (por ejemplo `santiagoricaurte.dev/#taller`) se quedaban en la entrada: el ancla del navegador devolvía el scroll a 0. Ahora el salto ocurre al terminar el preludio y la restauración automática del scroll está desactivada en el recorrido.

## [1.0.1] - 2026-11-12

### Corregido

- Con "reducir movimiento" activado (Windows lo activa al apagar sus efectos de animación) el sitio mostraba solo el modo lectura, sin la casa en 3D. Ahora la casa se muestra igual y solo se calma lo que se mueve solo: scroll suavizado, balanceo de cámara, hojas, noren, grulla y la animación del pincel. El modo lectura queda para cuando no hay WebGL2 o cuando el visitante lo elige con 読.

## [1.0.0] - 2026-11-12

Primera versión pública del portafolio rediseñado.

### Añadido

- Casa japonesa en 3D (Three.js) recorrida con el scroll: muro de shōji con papel washi procedural, linterna que sigue al cursor y proyecta sombras reales de los objetos de cada sala, puertas que se abren solas.
- Siete salas (Entrada, Obras, Taller, Camino, Servicios, Sueños, Contacto) y una pausa 間 frente al estanque.
- Caligrafía de pincel sobre los trazos de KanjiVG y preludio 玄関 con sello hanko.
- Estanque con ondas que responden al cursor y a las hojas de momiji.
- Proyectos como pergaminos que se desenrollan con el scroll.
- Mapa numerado con transición de tinta, navegación con teclado y modo lectura sin 3D.
- Contenido bilingüe (español e inglés).
- Formulario de contacto con función de Vercel y Resend: validación, honeypot, límite de envíos y constancia del consentimiento.
- Aviso de privacidad preliminar (Ley 1581), página 404, Open Graph, datos estructurados y Vercel Web Analytics.

[1.2.0]: https://github.com/SantiagoRicaurte06/Portafolio/releases/tag/v1.2.0
[1.1.0]: https://github.com/SantiagoRicaurte06/Portafolio/releases/tag/v1.1.0
[1.0.3]: https://github.com/SantiagoRicaurte06/Portafolio/releases/tag/v1.0.3
[1.0.2]: https://github.com/SantiagoRicaurte06/Portafolio/releases/tag/v1.0.2
[1.0.1]: https://github.com/SantiagoRicaurte06/Portafolio/releases/tag/v1.0.1
[1.0.0]: https://github.com/SantiagoRicaurte06/Portafolio/releases/tag/v1.0.0
