import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Scissors, User, Calendar, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (path) => location.pathname === path ? 'active' : '';

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo" style={{ letterSpacing: '-0.03em' }} onClick={closeMobile}>
          <Scissors size={24} color="var(--primary)" />
          Nahuel<span style={{ fontWeight: 300 }}>Bersano</span>
        </Link>

        {/* Desktop links */}
        <div className="nav-links nav-desktop">
          <Link to="/" className={`nav-link ${isActive('/')}`}>Inicio</Link>
          <Link to="/products" className={`nav-link ${isActive('/products')}`}>Productos</Link>
          {(user?.role === 'admin' || user?.permiso_horarios) && (
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Panel Admin</Link>
          )}
        </div>

        {/* Desktop right */}
        <div className="nav-links nav-desktop">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {user.puntos !== undefined && (
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111', background: '#f3f4f6', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                  ★ {user.puntos} pts
                </span>
              )}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{user.name}</span>
              <button onClick={logout} className="nav-link" title="Cerrar sesión" style={{ padding: 0 }}>
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="nav-link" title="Iniciar Sesión">
              <User size={20} />
            </Link>
          )}
          <Link to="/book" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            <Calendar size={16} />
            Reservar
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menú"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="nav-mobile-drawer">
          <Link to="/" className="nav-mobile-link" onClick={closeMobile}>Inicio</Link>
          <Link to="/products" className="nav-mobile-link" onClick={closeMobile}>Productos</Link>
          {(user?.role === 'admin' || user?.permiso_horarios) && (
            <Link to="/dashboard" className="nav-mobile-link" onClick={closeMobile}>Panel Admin</Link>
          )}
          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '16px' }}>
            {user ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>{user.name}</span>
                  {user.puntos !== undefined && (
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px' }}>
                      ★ {user.puntos} pts
                    </span>
                  )}
                </div>
                <button onClick={() => { logout(); closeMobile(); }} className="btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-outline" style={{ display: 'flex', justifyContent: 'center', width: '100%' }} onClick={closeMobile}>
                Iniciar sesión
              </Link>
            )}
            <Link to="/book" className="btn-primary" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '10px' }} onClick={closeMobile}>
              <Calendar size={16} />
              Reservar Turno
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
