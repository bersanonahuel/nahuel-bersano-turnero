import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user, loginWithGoogle, loginAsAdmin } = useAuth();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.permiso_horarios) navigate('/dashboard');
      else navigate('/book');
    }
  }, [user, navigate]);

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    if (adminUser.trim() === 'Nahuel' && adminPass === 'bersano') {
      loginAsAdmin();
    } else {
      alert("Credenciales incorrectas");
    }
  };

  return (
    <div className="container section" style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', letterSpacing: '-0.03em' }}>Reservá tu turno</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Usamos tu cuenta de Google para enviarte el recordatorio y gestionar tu historial.
          </p>
        </div>

        {/* Google Button */}
        <button
          onClick={loginWithGoogle}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '14px 24px',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            background: '#fff',
            color: '#111',
            fontFamily: 'inherit',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-subtle)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-subtle)'}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px' }} />
          Continuar con Google
        </button>

        {/* Benefits */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['✓ Recordatorio 30 min antes', '✓ Historial de turnos', '✓ Sistema de puntos'].map(b => (
            <span key={b} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: '#f9f9f9', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
              {b}
            </span>
          ))}
        </div>

        {/* Admin link (subtle, at the bottom) */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            style={{ fontSize: '0.75rem', color: '#ccc', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
          >
            Acceso administrador
          </button>
        </div>

        {showAdminPanel && (
          <form onSubmit={handleAdminSubmit} style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <div className="input-group">
              <label className="input-label">Usuario</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="Usuario"
                  value={adminUser}
                  onChange={e => setAdminUser(e.target.value)}
                />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                  value={adminPass}
                  onChange={e => setAdminPass(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Ingresar como Admin
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
