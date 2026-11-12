// Función de Vercel: recibe el formulario de contacto y lo envía por correo con Resend.
// Variables de entorno: RESEND_API_KEY (obligatoria), CONTACTO_DESTINO (correo que recibe),
// CONTACTO_REMITENTE (opcional; por defecto el remitente de pruebas de Resend).
import { validar, permitido } from './_validar.js';

const ETIQUETAS = { trabajo: 'Oferta de trabajo', proyecto: 'Proyecto', otro: 'Otro' };
const LIMITE_BYTES = 16 * 1024;

const responder = (estado, cuerpo) => new Response(JSON.stringify(cuerpo), {
  status: estado,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export async function POST(request, { enviar = fetch, entorno = process.env } = {}) {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return responder(415, { error: 'formato' });
  const largo = Number(request.headers.get('content-length') ?? 0);
  if (largo > LIMITE_BYTES) return responder(413, { error: 'formato' });

  // En Vercel, x-real-ip la pone la plataforma y el cliente no puede falsificarla.
  const ip = request.headers.get('x-real-ip') ?? (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  if (!permitido(`ip:${ip}`)) return responder(429, { error: 'limite' });

  let cuerpo;
  try {
    const crudo = await request.text();
    if (crudo.length > LIMITE_BYTES) return responder(413, { error: 'formato' });
    cuerpo = JSON.parse(crudo);
  } catch {
    return responder(400, { error: 'formato' });
  }

  const resultado = validar(cuerpo);
  // A los bots se les responde como si todo hubiera salido bien, para no darles pistas.
  if (!resultado.ok) return resultado.bot ? responder(200, { ok: true }) : responder(422, { error: resultado.error });

  // Segundo límite por remitente: rotar IPs con el mismo correo no sirve para agotar la cuota de Resend.
  if (!permitido(`email:${resultado.datos.email}`)) return responder(429, { error: 'limite' });

  const clave = entorno.RESEND_API_KEY;
  const destino = entorno.CONTACTO_DESTINO;
  if (!clave || !destino) {
    console.error('contacto: faltan RESEND_API_KEY o CONTACTO_DESTINO');
    return responder(503, { error: 'servicio' });
  }

  const { nombre, email, motivo, mensaje } = resultado.datos;
  const respuesta = await enviar('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: entorno.CONTACTO_REMITENTE || 'Portafolio <onboarding@resend.dev>',
      to: [destino],
      reply_to: email,
      subject: `[Portafolio] ${ETIQUETAS[motivo]} · ${nombre}`,
      // Solo texto: nada de lo que escribe el visitante se interpreta como HTML.
      text: `Nombre: ${nombre}\nEmail: ${email}\nMotivo: ${ETIQUETAS[motivo]}\n\n${mensaje}\n\n— Enviado desde el formulario del portafolio. El remitente aceptó el aviso de privacidad.`,
    }),
  }).catch(() => null);

  if (!respuesta || !respuesta.ok) {
    console.error('contacto: Resend respondió', respuesta?.status);
    return responder(502, { error: 'servicio' });
  }
  return responder(200, { ok: true });
}
