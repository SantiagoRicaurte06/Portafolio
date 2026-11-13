// Lo que vive dentro de cada sala. Desde el pasillo solo se ve su sombra en el papel;
// cuando la puerta se abre, se ven a contraluz. Un archivo por sala en ./ocupantes/.
import { genkan } from './ocupantes/genkan.js';
import { obras } from './ocupantes/obras.js';
import { taller } from './ocupantes/taller.js';
import { camino } from './ocupantes/camino.js';
import { servicios } from './ocupantes/servicios.js';
import { suenos } from './ocupantes/suenos.js';
import { contacto } from './ocupantes/contacto.js';

export { formaHojaMomiji } from './ocupantes/comun.js';

const FABRICAS = { genkan, obras, taller, camino, servicios, suenos, contacto };

export function crearOcupantes(id) {
  const fabrica = FABRICAS[id];
  if (!fabrica) return null;
  const ocupantes = fabrica();
  ocupantes.grupo.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
      o.layers.set(1); // solo los ve la sombra; la cámara los ve cuando la puerta se abre
    }
  });
  return ocupantes;
}

export function mostrarOcupantes(ocupantes, visibles) {
  ocupantes.grupo.traverse((o) => {
    if (o.isMesh) { if (visibles) o.layers.enable(0); else o.layers.disable(0); }
  });
}
