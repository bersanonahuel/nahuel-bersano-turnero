import React from 'react';
import { MapPin, Phone, Link2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer container">
      <div className="footer-grid">
        <div>
          <h3 className="logo" style={{ marginBottom: '16px', fontSize: '1.2rem', letterSpacing: '-0.03em' }}>Nahuel<span style={{ fontWeight: 300 }}>Bersano</span></h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            La mejor experiencia para tu estilo. Calidad, precisión y elegancia en cada corte.
          </p>
        </div>
        <div>
          <h4 style={{ marginBottom: '16px' }}>Enlaces</h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><a href="/" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Inicio</a></li>
            <li><a href="/book" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Reservar</a></li>
            <li><a href="/products" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Productos</a></li>
          </ul>
        </div>
        <div>
          <h4 style={{ marginBottom: '16px' }}>Contacto</h4>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <MapPin size={16} /> Av. Falsa 123, Ciudad
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Phone size={16} /> +54 11 1234-5678
            </li>
          </ul>
        </div>
        <div>
          <h4 style={{ marginBottom: '16px' }}>Síguenos</h4>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#" style={{ color: 'var(--text-muted)' }}><Link2 size={24} /></a>
            <a href="#" style={{ color: 'var(--text-muted)' }}><Link2 size={24} /></a>
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px 0', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        © 2026 Nahuel Bersano. Todos los derechos reservados.
      </div>
    </footer>
  );
}
