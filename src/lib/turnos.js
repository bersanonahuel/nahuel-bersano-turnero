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
export async function crearTurno({ cliente_uid, cliente_email, cliente_name, fecha, hora, servicio, precio, es_fijo = false, duracion = 45 }) {
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
      es_fijo,
      duracion,
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

/**
 * Obtiene la configuración de horarios.
 */
export async function getHorariosConfig() {
  try {
    const { data, error } = await supabase
      .from('configuraciones')
      .select('valor')
      .eq('clave', 'horarios')
      .maybeSingle();

    if (error || !data) {
      return {
        duracion: 45,
        dias: {
          "Lun": { activo: true, apertura: "10:00", cierre: "18:00" },
          "Mar": { activo: true, apertura: "10:00", cierre: "18:00" },
          "Mié": { activo: true, apertura: "10:00", cierre: "18:00" },
          "Jue": { activo: true, apertura: "10:00", cierre: "18:00" },
          "Vie": { activo: true, apertura: "10:00", cierre: "18:00" },
          "Sáb": { activo: true, apertura: "10:00", cierre: "18:00" },
          "Dom": { activo: false, apertura: "10:00", cierre: "18:00" }
        }
      };
    }
    return normalizeConfig(data.valor);
  } catch (err) {
    console.error('Error cargando config:', err);
    return {
      duracion: 45,
      dias: {
        "Lun": { activo: true, apertura: "10:00", cierre: "18:00" },
        "Mar": { activo: true, apertura: "10:00", cierre: "18:00" },
        "Mié": { activo: true, apertura: "10:00", cierre: "18:00" },
        "Jue": { activo: true, apertura: "10:00", cierre: "18:00" },
        "Vie": { activo: true, apertura: "10:00", cierre: "18:00" },
        "Sáb": { activo: true, apertura: "10:00", cierre: "18:00" },
        "Dom": { activo: false, apertura: "10:00", cierre: "18:00" }
      }
    };
  }
}

// Función auxiliar para normalizar configs viejas a la nueva estructura de días separados
function normalizeConfig(rawVal) {
  const baseDuration = rawVal.duracion ?? 45;
  
  // Si rawVal ya tiene el objeto de días con su apertura/cierre, lo dejamos tal cual
  if (rawVal.dias && typeof rawVal.dias === 'object' && !Array.isArray(rawVal.dias)) {
    return {
      duracion: baseDuration,
      dias: rawVal.dias
    };
  }
  
  // Si rawVal tiene el formato viejo de array de días y apertura/cierre globales:
  const activeDaysArray = Array.isArray(rawVal.dias) ? rawVal.dias : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const globalApertura = rawVal.apertura ?? "10:00";
  const globalCierre = rawVal.cierre ?? "18:00";
  
  const diasEstructura = {};
  ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach(d => {
    diasEstructura[d] = {
      activo: activeDaysArray.includes(d),
      apertura: globalApertura,
      cierre: globalCierre
    };
  });
  
  return {
    duracion: baseDuration,
    dias: diasEstructura
  };
}

/**
 * Guarda la configuración de horarios.
 */
export async function guardarHorariosConfig(config) {
  const { error } = await supabase
    .from('configuraciones')
    .upsert({ clave: 'horarios', valor: config });

  if (error) throw error;
}
