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
 * Obtiene los próximos turnos a partir de hoy (para el panel admin).
 * Incluye turnos normales futuros y calcula la próxima ocurrencia de los turnos fijos.
 */
export async function getProximosTurnos() {
  const hoyStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const hoyDate = new Date(hoyStr + 'T00:00:00');

  // 1. Obtener turnos normales desde hoy
  const { data: normales, error: errNorm } = await supabase
    .from('turnos')
    .select('*')
    .gte('fecha', hoyStr)
    .neq('estado', 'cancelado');

  if (errNorm) throw errNorm;

  // 2. Obtener todos los turnos fijos (activos)
  const { data: fijos, error: errFijos } = await supabase
    .from('turnos')
    .select('*')
    .eq('es_fijo', true)
    .neq('estado', 'cancelado');

  if (errFijos) throw errFijos;

  const result = [...normales];
  const resultIds = new Set(normales.map(t => t.id));

  // Procesar turnos fijos para que aparezcan en la fecha correcta (próxima ocurrencia)
  for (const fijo of fijos) {
    if (!resultIds.has(fijo.id)) {
      // Si la fecha original es en el pasado, calcular el próximo día de la semana que coincide
      const originalDate = new Date(fijo.fecha + 'T00:00:00');
      if (originalDate < hoyDate) {
        const dayOfWeek = originalDate.getDay();
        const nextDate = new Date(hoyDate);
        // Avanzar hasta encontrar el mismo día de la semana
        while (nextDate.getDay() !== dayOfWeek) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        
        // Crear una copia para mostrar en "Próximos Turnos" con la fecha actualizada
        result.push({
          ...fijo,
          fecha: nextDate.toISOString().split('T')[0],
          // Opcional: mostrar siempre como pendiente para la nueva semana, 
          // aunque el original esté confirmado? Lo dejamos como está para no perder el original.
        });
      } else {
        result.push(fijo);
      }
      resultIds.add(fijo.id);
    }
  }

  // Ordenar por fecha y luego por hora
  result.sort((a, b) => {
    if (a.fecha === b.fecha) {
      return a.hora.localeCompare(b.hora);
    }
    return a.fecha.localeCompare(b.fecha);
  });

  return result;
}

/**
 * Obtiene todos los turnos fijos activos.
 */
export async function getTurnosFijos() {
  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .eq('es_fijo', true)
    .neq('estado', 'cancelado')
    .order('fecha', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Obtiene los horarios ya ocupados para una fecha dada.
 * @returns {string[]} Array de horas ocupadas, ej: ["10:00", "11:30"]
 */
export async function getHorasOcupadas(fecha) {
  // Obtener turnos no cancelados en esa fecha específica o cualquier turno fijo no cancelado
  const { data, error } = await supabase
    .from('turnos')
    .select('hora, fecha, es_fijo')
    .neq('estado', 'cancelado')
    .or(`fecha.eq.${fecha},es_fijo.eq.true`);

  if (error) throw error;

  const targetDayOfWeek = new Date(fecha + 'T12:00:00').getDay();
  const occupiedSet = new Set();

  for (const t of data) {
    const horaStr = t.hora.slice(0, 5);
    if (t.fecha === fecha) {
      occupiedSet.add(horaStr);
    } else if (t.es_fijo) {
      // Si el turno fijo comenzó antes o el mismo día consultado,
      // y coincide el día de la semana, se considera ocupado.
      if (t.fecha <= fecha) {
        const fixedDayOfWeek = new Date(t.fecha + 'T12:00:00').getDay();
        if (fixedDayOfWeek === targetDayOfWeek) {
          occupiedSet.add(horaStr);
        }
      }
    }
  }

  return Array.from(occupiedSet);
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
        },
        bloqueos: []
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
      },
      bloqueos: []
    };
  }
}

// Función auxiliar para normalizar configs viejas a la estructura de un horario por día
function normalizeConfig(rawVal) {
  const baseDuration = rawVal.duracion ?? 45;
  const bloqueos = Array.isArray(rawVal.bloqueos) ? rawVal.bloqueos : [];
  
  // Si rawVal ya tiene el objeto de días con su apertura/cierre
  if (rawVal.dias && typeof rawVal.dias === 'object' && !Array.isArray(rawVal.dias)) {
    const newDias = {};
    Object.keys(rawVal.dias).forEach(d => {
      const dayData = rawVal.dias[d];
      
      // Si venía con formato de intervalos, extraemos el primero
      if (dayData.intervalos && Array.isArray(dayData.intervalos) && dayData.intervalos.length > 0) {
        newDias[d] = {
          activo: dayData.activo ?? false,
          apertura: dayData.intervalos[0].apertura ?? "10:00",
          cierre: dayData.intervalos[0].cierre ?? "18:00"
        };
      } else {
        newDias[d] = {
          activo: dayData.activo ?? false,
          apertura: dayData.apertura ?? "10:00",
          cierre: dayData.cierre ?? "18:00"
        };
      }
    });
    return {
      duracion: baseDuration,
      dias: newDias,
      bloqueos: bloqueos
    };
  }
  
  // Si rawVal tiene el formato viejo de array de días y apertura/cierre globales:
  const activeDaysArray = Array.isArray(rawVal.dias) ? rawVal.dias : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const globalApertura = rawVal.apertura ?? "10:00";
  const globalCierre = rawVal.cierre ?? "18:00";
  
  const diasEstructura = {};
  ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach(d => {
    const activo = activeDaysArray.includes(d);
    diasEstructura[d] = {
      activo: activo,
      apertura: globalApertura,
      cierre: globalCierre
    };
  });
  
  return {
    duracion: baseDuration,
    dias: diasEstructura,
    bloqueos: bloqueos
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
