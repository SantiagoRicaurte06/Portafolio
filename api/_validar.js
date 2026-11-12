// Validación del formulario de contacto. Sin dependencias para que la función arranque rápido.

export const MOTIVOS = ['trabajo', 'proyecto', 'otro'];
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9.-]{1,253}\.[a-z]{2,24}$/i;
// Caracteres de control (salvo salto de línea y tabulación) no tienen nada que hacer en un mensaje.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Devuelve { ok: true, datos } o { ok: false, error, bot? }.
 * `ahora` se inyecta para poder probar el tiempo mínimo.
 */
export function validar(cuerpo, ahora = Date.now()) {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return { ok: false, error: 'formato' };

  // Honeypot: un campo oculto que solo llenan los bots.
  if (texto(cuerpo.sitio) !== '') return { ok: false, error: 'rechazado', bot: true };

  // Nadie llena el formulario en menos de 3 s; los bots sí.
  const inicio = Number(cuerpo.inicio);
  if (!Number.isFinite(inicio) || ahora - inicio < 3000 || ahora - inicio > 1000 * 60 * 60 * 6) {
    return { ok: false, error: 'rechazado', bot: true };
  }

  const nombre = texto(cuerpo.nombre);
  const email = texto(cuerpo.email).toLowerCase();
  const motivo = texto(cuerpo.motivo);
  const mensaje = texto(cuerpo.mensaje);

  if (nombre.length < 2 || nombre.length > 80 || CONTROL.test(nombre) || /[\r\n]/.test(nombre)) return { ok: false, error: 'nombre' };
  if (email.length > 254 || !EMAIL.test(email)) return { ok: false, error: 'email' };
  if (!MOTIVOS.includes(motivo)) return { ok: false, error: 'motivo' };
  if (mensaje.length < 10 || mensaje.length > 3000 || CONTROL.test(mensaje)) return { ok: false, error: 'mensaje' };
  if (cuerpo.consentimiento !== true) return { ok: false, error: 'consentimiento' };

  return { ok: true, datos: { nombre, email, motivo, mensaje } };
}

// Límite por IP en memoria: 5 envíos cada 10 minutos por instancia de la función.
// Es una barrera de mejor esfuerzo (cada instancia lleva su cuenta), junto al honeypot y el tiempo mínimo.
const VENTANA = 10 * 60 * 1000;
const MAXIMO = 5;
const registros = new Map();

export function permitido(ip, ahora = Date.now()) {
  const clave = ip || 'desconocida';
  const recientes = (registros.get(clave) ?? []).filter((t) => ahora - t < VENTANA);
  if (recientes.length >= MAXIMO) { registros.set(clave, recientes); return false; }
  recientes.push(ahora);
  registros.set(clave, recientes);
  if (registros.size > 5000) registros.clear();
  return true;
}

export function reiniciarLimite() {
  registros.clear();
}
