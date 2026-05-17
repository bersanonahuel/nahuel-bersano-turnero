import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Phone } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/login');
  };

  return (
    <div className="container section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Crear Cuenta</h1>
          <p style={{ color: 'var(--text-muted)' }}>Únete para reservar tus turnos fácilmente</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2" style={{ gap: '16px' }}>
            <div className="input-group" style={{ marginBottom: '0' }}>
              <label className="input-label">Nombre</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                <input type="text" className="input-field" style={{ paddingLeft: '44px' }} placeholder="Juan" required />
              </div>
            </div>
            <div className="input-group" style={{ marginBottom: '0' }}>
              <label className="input-label">Apellido</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
                <input type="text" className="input-field" style={{ paddingLeft: '44px' }} placeholder="Pérez" required />
              </div>
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '16px' }}>
            <label className="input-label">Teléfono (WhatsApp)</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
              <input type="tel" className="input-field" style={{ paddingLeft: '44px' }} placeholder="+54 11 1234 5678" required />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
              <input type="email" className="input-field" style={{ paddingLeft: '44px' }} placeholder="tu@email.com" required />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
              <input type="password" className="input-field" style={{ paddingLeft: '44px' }} placeholder="••••••••" required />
            </div>
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}>
            Registrarse
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Inicia Sesión</Link>
        </div>
      </div>
    </div>
  );
}
