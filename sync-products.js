import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Faltan las credenciales de Supabase en el archivo .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PENCY_URL = 'https://pency.app/mayoristaperfumeslaplata';

async function syncProducts() {
  console.log(`📡 Obteniendo datos desde ${PENCY_URL}...`);
  
  try {
    const response = await fetch(PENCY_URL);
    const html = await response.text();
    
    // Extraer datos JSON de Next.js
    const regex = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
    const match = html.match(regex);
    
    if (!match) {
      throw new Error("No se pudo encontrar la data de productos en la página.");
    }
    
    const nextData = JSON.parse(match[1]);
    let providerProducts = [];
    
    if (nextData.props && nextData.props.pageProps && nextData.props.pageProps.products) {
      providerProducts = nextData.props.pageProps.products;
    } else {
      throw new Error("Estructura de datos inesperada en la página del proveedor.");
    }
    
    console.log(`📦 Se encontraron ${providerProducts.length} productos en el proveedor.`);
    
    // Obtener todos los productos actuales de Supabase
    console.log("🔍 Obteniendo productos actuales de tu base de datos...");
    const { data: currentProducts, error: fetchError } = await supabase
      .from('productos')
      .select('*');
      
    if (fetchError) throw fetchError;
    
    const productMap = new Map(currentProducts.map(p => [p.name.toLowerCase().trim(), p]));
    
    let insertCount = 0;
    let updateCount = 0;
    
    for (const pProduct of providerProducts) {
      const name = pProduct.title.trim();
      const nameLower = name.toLowerCase();
      const precio = pProduct.price || 0;
      const descripcion = pProduct.description || null;
      const imagen_url = pProduct.images && pProduct.images.length > 0 ? pProduct.images[0] : null;
      
      const existingProduct = productMap.get(nameLower);
      
      if (existingProduct) {
        // Actualizar si algo cambió (ignorando el campo 'activo' para no pisar tu configuración)
        if (existingProduct.precio !== precio || 
            existingProduct.descripcion !== descripcion || 
            existingProduct.imagen_url !== imagen_url) {
            
          const { error: updateError } = await supabase
            .from('productos')
            .update({ precio, descripcion, imagen_url })
            .eq('id', existingProduct.id);
            
          if (updateError) {
            console.error(`❌ Error actualizando ${name}:`, updateError.message);
          } else {
            updateCount++;
          }
        }
      } else {
        // Insertar nuevo
        const { error: insertError } = await supabase
          .from('productos')
          .insert([{ 
            name, 
            precio, 
            descripcion, 
            imagen_url,
            activo: pProduct.type !== 'unavailable' && pProduct.currentStock !== 0 // Activo por defecto si hay stock
          }]);
          
        if (insertError) {
          console.error(`❌ Error insertando ${name}:`, insertError.message);
        } else {
          insertCount++;
        }
      }
    }
    
    console.log(`✅ Sincronización completada.`);
    console.log(`   - Productos nuevos insertados: ${insertCount}`);
    console.log(`   - Productos actualizados: ${updateCount}`);
    
  } catch (err) {
    console.error("❌ Error en la sincronización:", err);
  }
}

syncProducts();
