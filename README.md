# Portafolio · Santiago Alexis Ricaurte

Portafolio personal con estética japonesa en blanco y negro: una casa en 3D que se recorre con el scroll. Dentro de cada sala, una linterna proyecta sombras reales sobre el papel de las puertas shōji; las puertas se abren solas, cada sala tiene su kanji pintado a pincel y los proyectos se desenrollan como pergaminos. Frente a la casa hay un estanque que responde al cursor.

## Ejecutar en local

```bash
npm install
npm run dev      # sitio en desarrollo
npm test         # pruebas de la función de contacto
npm run build    # build de producción en dist/
```

## Cómo está hecho

- **Escena:** Three.js con un shader propio para el papel washi (`src/escena/papel.js`): la sombra de los objetos se lee del shadow map y se ve a contraluz.
- **Recorrido:** Lenis; el scroll avanza la cámara por el pasillo con una pausa en cada sala (`src/recorrido.js`).
- **Tinta:** pincel simulado con cerdas sobre los trazos de [KanjiVG](https://kanjivg.tagaini.net) (CC BY-SA 3.0) en `src/tinta.js`, y transición de tinta en WebGL (`src/transicion.js`).
- **Contacto:** función de Vercel con Resend (`api/contacto.js`), con validación, honeypot y límite de envíos.
- **Modo lectura:** página vertical sin 3D para lectura rápida, automática con `prefers-reduced-motion`.

## Flujo de trabajo

Ramas, commits y PRs según [`GIT_WORKFLOW.md`](GIT_WORKFLOW.md).
