import { supabase } from './supabase';

export async function getProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function crearProducto(producto) {
  const { data, error } = await supabase
    .from('productos')
    .insert([producto])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function actualizarProducto(id, producto) {
  const { error } = await supabase
    .from('productos')
    .update(producto)
    .eq('id', id);

  if (error) throw error;
}

export async function eliminarProducto(id) {
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
