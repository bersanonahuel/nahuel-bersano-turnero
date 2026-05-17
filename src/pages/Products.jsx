import React, { useState } from 'react';
import { Search, ShoppingBag } from 'lucide-react';

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const products = [
    { id: 1, name: 'Cera Mate Premium', category: 'Ceras', price: '$8,500', image: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=500&auto=format&fit=crop' },
    { id: 2, name: 'Aceite para Barba', category: 'Aceites', price: '$6,000', image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=500&auto=format&fit=crop' },
    { id: 3, name: 'Shampoo Fortalecedor', category: 'Shampoos', price: '$5,500', image: 'https://images.unsplash.com/photo-1580870058826-2810f2df2e65?w=500&auto=format&fit=crop' },
    { id: 4, name: 'Máquina Trimmer Pro', category: 'Máquinas', price: '$45,000', image: 'https://images.unsplash.com/photo-1593683693892-2b227c207d57?w=500&auto=format&fit=crop' },
  ];

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="container section">
      <div className="text-center mb-8">
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Nuestros Productos</h1>
        <p style={{ color: 'var(--text-muted)' }}>La mejor calidad para el cuidado personal en casa.</p>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto 40px', position: 'relative' }}>
        <Search size={20} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          className="input-field" 
          placeholder="Buscar productos..." 
          style={{ paddingLeft: '48px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <img src={product.image} alt={product.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '8px' }}>{product.category}</span>
              <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>{product.name}</h3>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '20px', marginTop: 'auto' }}>{product.price}</p>
              <button className="btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <ShoppingBag size={18} />
                Consultar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
