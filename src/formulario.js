// Formulario de contacto: valida en el navegador, envía a /api/contacto y muestra el resultado.
import { t } from './i18n.js';

export function iniciarFormulario() {
  const formulario = document.getElementById('formulario-contacto');
  if (!formulario) return;
  const estado = formulario.querySelector('.formulario-estado');
  const boton = formulario.querySelector('button[type="submit"]');
  const motivo = formulario.elements.motivo;
  const inicio = Date.now();

  // "Cotizar un proyecto" deja el motivo listo.
  document.querySelectorAll('[data-motivo]').forEach((enlace) => {
    enlace.addEventListener('click', () => { motivo.value = enlace.dataset.motivo; });
  });

  const mostrar = (clave, tipo) => {
    estado.textContent = t(clave);
    estado.dataset.tipo = tipo;
  };

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!formulario.reportValidity()) return;
    const datos = {
      nombre: formulario.elements.nombre.value,
      email: formulario.elements.email.value,
      motivo: motivo.value,
      mensaje: formulario.elements.mensaje.value,
      consentimiento: formulario.elements.consentimiento.checked,
      sitio: formulario.elements.sitio.value,
      inicio,
    };
    boton.disabled = true;
    mostrar('enviando', 'info');
    try {
      const respuesta = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (respuesta.ok && cuerpo.ok) {
        formulario.reset();
        mostrar('enviado', 'ok');
      } else {
        mostrar(`error_${cuerpo.error ?? 'servicio'}`, 'error');
      }
    } catch {
      mostrar('error_servicio', 'error');
    } finally {
      boton.disabled = false;
    }
  });
}
