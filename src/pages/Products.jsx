import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const products = [
    { 
      id: 1, 
      name: 'Cera Mate Premium', 
      category: 'Ceras', 
      price: '$8,500', 
      description: 'Fijación fuerte de efecto mate natural. Ideal para peinados estructurados con textura y volumen de larga duración durante todo el día sin dejar residuos.',
      image: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=500&auto=format&fit=crop' 
    },
    { 
      id: 2, 
      name: 'Aceite para Barba', 
      category: 'Aceites', 
      price: '$6,000', 
      description: 'Nutre e hidrata profundamente el vello facial y la piel debajo. Formulado con aceites esenciales orgánicos para brindar suavidad, brillo e hidratación.',
      image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=500&auto=format&fit=crop' 
    },
    { 
      id: 3, 
      name: 'Shampoo Fortalecedor', 
      category: 'Shampoos', 
      price: '$5,500', 
      description: 'Limpia con profundidad, fortalece los folículos pilosos y estimula el crecimiento saludable del cabello. Brinda un aroma fresco y revitalizante.',
      image: 'https://images.unsplash.com/photo-1580870058826-2810f2df2e65?w=500&auto=format&fit=crop' 
    },
    { 
      id: 4, 
      name: 'Máquina Trimmer Pro', 
      category: 'Máquinas', 
      price: '$45,000', 
      description: 'Recortadora profesional de alta precisión con cuchillas de acero inoxidable y batería recargable de larga duración. Perfecta para contornos y terminaciones.',
      image: 'https://images.unsplash.com/photo-1593683693892-2b227c207d57?w=500&auto=format&fit=crop' 
    },
  ];

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
        {filteredProducts.map(product => (
          <div key={product.id} className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <img src={product.image} alt={product.name} style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', marginBottom: '8px' }}>
                {product.category}
              </span>
              <h3 style={{ marginBottom: '10px', fontSize: '1.15rem', fontWeight: '700' }}>{product.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '16px' }}>
                {product.description}
              </p>
              <p style={{ fontSize: '1.3rem', fontWeight: '800', color: '#111', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginBottom: '0' }}>
                {product.price}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
