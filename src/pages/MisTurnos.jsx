import React, { useState, useEffect } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getTurnosDeCliente, actualizarEstadoTurno } from '../lib/turnos';
import { useNavigate } from 'react-router-dom';

export default function MisTurnos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchTurnos();
  }, [user, navigate]);

  async function fetchTurnos() {
    try {
      const data = await getTurnosDeCliente(user.uid);
      setTurnos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelar(turnoId, fechaStr, horaStr) {
    // Verificar si faltan menos de 2 horas (política del local)
    const turnoDate = new Date(`${fechaStr}T${horaStr}:00`);
    const now = new Date();
    const diffHours = (turnoDate - now) / (1000 * 60 * 60);

    if (diffHours < 2) {
      alert("No podés cancelar con menos de 2 horas de anticipación. Por favor, contactanos directamente.");
      return;
    }

    if (!window.confirm("¿Estás seguro de cancelar este turno?")) return;

    try {
      await actualizarEstadoTurno(turnoId, 'cancelado');
      fetchTurnos();
    } catch (err) {
      console.error(err);
      alert("Hubo un error al cancelar el turno.");
    }
  }

  return (
    <div className="container section" style={{ minHeight: '60vh' }}>
      <div className="text-center mb-8">
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', letterSpacing: '-0.02em' }}>Mis Turnos</h1>
        <p style={{ color: 'var(--text-muted)' }}>Historial y turnos próximos.</p>
      </div>

      {loading ? (
        <p className="text-center">Cargando...</p>
      ) : turnos.length === 0 ? (
        <div className="text-center">
          <p style={{ marginBottom: '20px' }}>No tenés turnos registrados.</p>
          <button className="btn-primary" onClick={() => navigate('/book')}>Sacar un turno</button>
        </div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {turnos.map(turno => {
            const isPast = new Date(`${turno.fecha}T${turno.hora}:00`) < new Date();
            const isActive = turno.estado === 'pendiente' || turno.estado === 'confirmado';

            return (
              <div key={turno.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: (!isActive || isPast) ? 0.7 : 1 }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{turno.servicio}</h3>
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} /> {turno.fecha}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> {turno.hora}
                    </span>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                      background: turno.estado === 'confirmado' ? '#dcfce7' : turno.estado === 'cancelado' ? '#fee2e2' : '#f3f4f6',
                      color: turno.estado === 'confirmado' ? '#16a34a' : turno.estado === 'cancelado' ? '#dc2626' : '#6b7280',
                    }}>
                      {turno.estado.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  {isActive && !isPast && (
                    <button
                      className="btn-outline"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '6px 12px', fontSize: '0.85rem' }}
                      onClick={() => handleCancelar(turno.id, turno.fecha, turno.hora)}
                    >
                      <X size={16} /> Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
