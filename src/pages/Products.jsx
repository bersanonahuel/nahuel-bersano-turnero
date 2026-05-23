import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { getProductos } from '../lib/productos';

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProds() {
      try {
        const data = await getProductos();
        setProducts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProds();
  }, []);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="container section">
      <div className="text-center mb-8">
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', letterSpacing: '-0.02em' }}>Catálogo de Productos</h1>
        <p style={{ color: 'var(--text-muted)' }}>Exhibición de artículos exclusivos para el cuidado personal en el salón.</p>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto 40px', position: 'relative' }}>
        <Search size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          className="input-field" 
          placeholder="Buscar en el catálogo..." 
          style={{ paddingLeft: '48px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-4" style={{ gap: '24px' }}>
        {loading ? <p className="text-center" style={{ gridColumn: 'span 4' }}>Cargando productos...</p> : filteredProducts.map(product => (
          <div key={product.id} className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <img src={product.imagen_url || 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=500&auto=format&fit=crop'} alt={product.name} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover' }} />
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', marginBottom: '6px' }}>
                Producto
              </span>
              <h3 style={{ marginBottom: '8px', fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.2' }}>{product.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {product.descripcion}
              </p>
              <p style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginBottom: '0' }}>
                ${product.precio}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
