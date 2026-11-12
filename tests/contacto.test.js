import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { validar, permitido, reiniciarLimite } from '../api/_validar.js';
import { POST } from '../api/contacto.js';

const AHORA = 1_800_000_000_000;
const valido = (cambios = {}) => ({
  nombre: 'Ana Pérez',
  email: 'ana@empresa.co',
  motivo: 'trabajo',
  mensaje: 'Hola, tenemos una vacante backend.',
  consentimiento: true,
  sitio: '',
  inicio: AHORA - 10_000,
  ...cambios,
});

beforeEach(() => reiniciarLimite());

test('acepta un envío válido y normaliza el email', () => {
  const r = validar(valido({ email: '  Ana@Empresa.CO ' }), AHORA);
  assert.equal(r.ok, true);
  assert.equal(r.datos.email, 'ana@empresa.co');
});

test('marca como bot el honeypot lleno y el envío demasiado rápido', () => {
  assert.equal(validar(valido({ sitio: 'http://spam' }), AHORA).bot, true);
  assert.equal(validar(valido({ inicio: AHORA - 500 }), AHORA).bot, true);
  assert.equal(validar(valido({ inicio: 'x' }), AHORA).bot, true);
});

test('rechaza campos inválidos', () => {
  assert.equal(validar(valido({ nombre: 'A' }), AHORA).error, 'nombre');
  assert.equal(validar(valido({ nombre: 'Ana\nBcc: x@y.co' }), AHORA).error, 'nombre');
  assert.equal(validar(valido({ email: 'no-es-email' }), AHORA).error, 'email');
  assert.equal(validar(valido({ motivo: 'admin' }), AHORA).error, 'motivo');
  assert.equal(validar(valido({ mensaje: 'corto' }), AHORA).error, 'mensaje');
  assert.equal(validar(valido({ mensaje: 'x'.repeat(3001) }), AHORA).error, 'mensaje');
  assert.equal(validar(valido({ consentimiento: 'true' }), AHORA).error, 'consentimiento');
  assert.equal(validar([], AHORA).error, 'formato');
});

test('limita a 5 envíos por IP cada 10 minutos', () => {
  for (let i = 0; i < 5; i++) assert.equal(permitido('1.2.3.4', AHORA + i), true);
  assert.equal(permitido('1.2.3.4', AHORA + 10), false);
  assert.equal(permitido('5.6.7.8', AHORA + 10), true);
  assert.equal(permitido('1.2.3.4', AHORA + 11 * 60 * 1000), true);
});

const peticion = (cuerpo, cabeceras = {}) => new Request('https://x/api/contacto', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9', ...cabeceras },
  body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
});

test('envía el correo como texto con reply_to y responde ok', async () => {
  let enviado;
  const enviar = async (url, opciones) => { enviado = { url, ...JSON.parse(opciones.body) }; return new Response('{}', { status: 200 }); };
  const r = await POST(peticion(valido({ inicio: Date.now() - 10_000 })), { enviar, entorno: { RESEND_API_KEY: 'k', CONTACTO_DESTINO: 'yo@x.co' } });
  assert.equal(r.status, 200);
  assert.equal(enviado.url, 'https://api.resend.com/emails');
  assert.equal(enviado.reply_to, 'ana@empresa.co');
  assert.equal(enviado.html, undefined);
  assert.match(enviado.subject, /Oferta de trabajo/);
});

test('no llama a Resend con datos inválidos, bots ni sin configuración', async () => {
  let llamadas = 0;
  const enviar = async () => { llamadas++; return new Response('{}'); };
  const entorno = { RESEND_API_KEY: 'k', CONTACTO_DESTINO: 'yo@x.co' };
  assert.equal((await POST(peticion(valido({ email: 'mal', inicio: Date.now() - 10_000 })), { enviar, entorno })).status, 422);
  assert.equal((await POST(peticion(valido({ sitio: 'spam', inicio: Date.now() - 10_000 })), { enviar, entorno })).status, 200);
  assert.equal((await POST(peticion('{no json'), { enviar, entorno })).status, 400);
  assert.equal((await POST(peticion(valido(), { 'content-type': 'text/plain' }), { enviar, entorno })).status, 415);
  assert.equal((await POST(peticion(valido({ inicio: Date.now() - 10_000 })), { enviar, entorno: {} })).status, 503);
  assert.equal(llamadas, 0);
});

test('responde 502 si Resend falla, sin filtrar detalles', async () => {
  const enviar = async () => new Response('{"message":"clave inválida"}', { status: 401 });
  const r = await POST(peticion(valido({ inicio: Date.now() - 10_000 })), { enviar, entorno: { RESEND_API_KEY: 'k', CONTACTO_DESTINO: 'yo@x.co' } });
  assert.equal(r.status, 502);
  assert.deepEqual(await r.json(), { error: 'servicio' });
});

test('limita por remitente aunque cambie la IP', async () => {
  const enviar = async () => new Response('{}', { status: 200 });
  const entorno = { RESEND_API_KEY: 'k', CONTACTO_DESTINO: 'yo@x.co' };
  for (let i = 0; i < 5; i++) {
    const r = await POST(peticion(valido({ inicio: Date.now() - 10_000 }), { 'x-real-ip': `10.0.0.${i}` }), { enviar, entorno });
    assert.equal(r.status, 200);
  }
  const r = await POST(peticion(valido({ inicio: Date.now() - 10_000 }), { 'x-real-ip': '10.0.0.99' }), { enviar, entorno });
  assert.equal(r.status, 429);
});
