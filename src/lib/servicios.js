import { supabase } from './supabase';

export async function getServicios() {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getAllServicios() {
  const { data, error } = await supabase
    .from('servicios')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function crearServicio(servicio) {
  const { data, error } = await supabase
    .from('servicios')
    .insert([servicio])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function actualizarServicio(id, servicio) {
  const { error } = await supabase
    .from('servicios')
    .update(servicio)
    .eq('id', id);

  if (error) throw error;
}

export async function eliminarServicio(id) {
  const { error } = await supabase
    .from('servicios')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
