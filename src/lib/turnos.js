// ─── Turnos — operaciones con Supabase ────────────────────────────────────
import { supabase } from './supabase';

/**
 * Crea un nuevo turno en la base de datos.
 * @param {Object} turno
 * @param {string} turno.cliente_uid   - UID de Firebase del cliente
 * @param {string} turno.cliente_email - Email del cliente
 * @param {string} turno.cliente_name  - Nombre del cliente
 * @param {string} turno.fecha         - Fecha (YYYY-MM-DD)
 * @param {string} turno.hora          - Hora (HH:MM)
 * @param {string} turno.servicio      - Nombre del servicio
 * @param {number} turno.precio        - Precio en pesos
 * @returns {Object} El turno creado
 */
export async function crearTurno({ cliente_uid, cliente_email, cliente_name, fecha, hora, servicio, precio }) {
  const { data, error } = await supabase
    .from('turnos')
    .insert({
      cliente_uid,
      cliente_email,
      cliente_name,
      fecha,
      hora,
      servicio,
      precio,
      estado: 'pendiente', // pendiente | confirmado | cancelado
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Obtiene los turnos de un cliente específico.
 */
export async function getTurnosDeCliente(clienteUid) {
  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .eq('cliente_uid', clienteUid)
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Obtiene TODOS los turnos (solo para admin).
 */
export async function getTodosTurnos() {
  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Obtiene los turnos de hoy (para el panel admin).
 */
export async function getTurnosHoy() {
  const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .eq('fecha', hoy)
    .order('hora', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Obtiene los horarios ya ocupados para una fecha dada.
 * @returns {string[]} Array de horas ocupadas, ej: ["10:00", "11:30"]
 */
export async function getHorasOcupadas(fecha) {
  const { data, error } = await supabase
    .from('turnos')
    .select('hora')
    .eq('fecha', fecha)
    .neq('estado', 'cancelado');

  if (error) throw error;
  return data.map(t => t.hora);
}

/**
 * Actualiza el estado de un turno.
 * @param {string} id  - ID del turno
 * @param {string} estado - 'confirmado' | 'cancelado'
 */
export async function actualizarEstadoTurno(id, estado) {
  const { error } = await supabase
    .from('turnos')
    .update({ estado })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Suma puntos al cliente después de un turno completado.
 * @param {string} clienteUid - UID de Firebase del cliente
 * @param {number} puntos     - Puntos a sumar (default: 30)
 */
export async function sumarPuntos(clienteUid, puntos = 30) {
  const { error } = await supabase.rpc('sumar_puntos', {
    p_uid:    clienteUid,
    p_puntos: puntos,
  });

  if (error) throw error;
}
