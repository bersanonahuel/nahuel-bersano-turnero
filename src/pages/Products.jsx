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

  const handleWhatsAppQuery = (productName) => {
    const phone = '5493472436713'; // Teléfono de contacto de Nahuel Bersano
    const text = encodeURIComponent(`¡Hola! Quisiera consultar por el producto "${productName}" que vi en el catálogo.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

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
        {loading ? (
          <p className="text-center" style={{ gridColumn: 'span 4' }}>Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center" style={{ gridColumn: 'span 4', color: 'var(--text-muted)' }}>No se encontraron productos.</p>
        ) : (
          filteredProducts.map((product, index) => (
            <div 
              key={product.id} 
              className="product-card-container animate-fade-in-up" 
              style={{ animationDelay: `${index * 75}ms` }}
              onClick={() => handleWhatsAppQuery(product.name)}
              title="Click para consultar por WhatsApp"
            >
              <div className="product-badge">Premium</div>
              <div className="product-img-wrapper">
                <img 
                  src={product.imagen_url || 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=500&auto=format&fit=crop'} 
                  alt={product.name} 
                  className="product-img" 
                />
              </div>
              <div className="product-details">
                <span className="product-category">Cuidado Personal</span>
                <h3 className="product-title">{product.name}</h3>
                <p className="product-desc">{product.descripcion}</p>
                <div className="product-price-row">
                  <p className="product-price">${product.precio}</p>
                  <span className="product-action-btn">
                    Consultar
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
