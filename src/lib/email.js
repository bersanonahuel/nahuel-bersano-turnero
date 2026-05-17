// ─── EmailJS — Envío de Recordatorios ─────────────────────────────────────
// Obtené estas credenciales en: emailjs.com
// Crear cuenta → Add Service (Gmail) → Create Template → tomar los IDs

import emailjs from '@emailjs/browser';

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * Envía email de confirmación de turno al cliente.
 * @param {Object} params
 * @param {string} params.to_email   - Email del cliente
 * @param {string} params.to_name    - Nombre del cliente
 * @param {string} params.fecha      - Fecha del turno (ej: "20 de mayo")
 * @param {string} params.hora       - Hora del turno (ej: "10:30")
 * @param {string} params.servicio   - Nombre del servicio
 */
export async function enviarConfirmacion({ to_email, to_name, fecha, hora, servicio }) {
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { to_email, to_name, fecha, hora, servicio, tipo: 'confirmacion' },
    PUBLIC_KEY
  );
}

/**
 * Envía email de recordatorio 30 minutos antes del turno.
 * (Se llama desde el cron de Supabase Edge Functions en producción)
 */
export async function enviarRecordatorio({ to_email, to_name, fecha, hora, servicio }) {
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { to_email, to_name, fecha, hora, servicio, tipo: 'recordatorio' },
    PUBLIC_KEY
  );
}
