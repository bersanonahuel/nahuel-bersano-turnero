import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, MessageCircle } from 'lucide-react';
import { getProductos } from '../lib/productos';

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Activa el tema oscuro de lujo exclusivo para esta página
  useEffect(() => {
    document.body.classList.add('dark-theme-page');
    return () => {
      document.body.classList.remove('dark-theme-page');
    };
  }, []);

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

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleWhatsAppQuery = (productName, e) => {
    e.stopPropagation(); // Evita que se abra/cierre la tarjeta
    const phone = '5493472436713'; // Teléfono de contacto de Nahuel Bersano
    const text = encodeURIComponent(`¡Hola! Quisiera consultar por el producto "${productName}" que vi en el catálogo.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="container section">
      <div className="text-center mb-8 products-dark-header">
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', letterSpacing: '-0.02em' }}>Catálogo de Productos</h1>
        <p style={{ color: 'var(--text-muted)' }}>Exhibición de artículos exclusivos para el cuidado personal en el salón.</p>
      </div>

      <div className="search-container" style={{ maxWidth: '500px', margin: '0 auto 40px', position: 'relative' }}>
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
          filteredProducts.map((product, index) => {
            const isExpanded = expandedId === product.id;
            return (
              <div 
                key={product.id} 
                className={`product-card-container animate-fade-in-up ${isExpanded ? 'is-expanded' : ''}`} 
                style={{ animationDelay: `${index * 75}ms` }}
                onClick={(e) => toggleExpand(product.id, e)}
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
                  
                  {/* Contenedor colapsable con animación */}
                  <div className={`product-desc-container ${isExpanded ? 'is-expanded' : ''}`}>
                    <div className="product-desc-content">
                      <p className="product-desc-text">
                        {product.descripcion || 'Sin descripción disponible.'}
                      </p>
                      <button 
                        className="product-consult-btn"
                        onClick={(e) => handleWhatsAppQuery(product.name, e)}
                      >
                        <MessageCircle size={15} /> Consultar por WhatsApp
                      </button>
                    </div>
                  </div>

                  <div className="product-price-row">
                    <p className="product-price">${product.precio}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>
                      <span>{isExpanded ? 'Cerrar' : 'Ver más'}</span>
                      <ChevronDown 
                        size={15} 
                        style={{ 
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', 
                          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' 
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
