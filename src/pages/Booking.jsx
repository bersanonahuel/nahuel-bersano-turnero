import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { crearTurno, getHorasOcupadas, getHorariosConfig } from '../lib/turnos';
import { enviarConfirmacion } from '../lib/email';

const SERVICIOS = [
  { id: 'corte',       name: 'Corte de Pelo',  precio: 8000,  duracion: '45 min' },
  { id: 'corte_barba', name: 'Corte + Barba',  precio: 12000, duracion: '60 min' },
];

export default function Booking() {
  const { user, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]             = useState(1);
  const [servicio, setServicio]     = useState(SERVICIOS[0]);
  const [selectedDate, setDate]     = useState('');
  const [selectedTime, setTime]     = useState('');
  const [horasOcupadas, setOcupadas]= useState([]);
  const [loading, setLoading]       = useState(false);
  const [loadingHoras, setLoadingH] = useState(false);
  const [error, setError]           = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [esFijo, setEsFijo]         = useState(false);
  const [config, setConfig]         = useState({
    apertura: '10:00',
    cierre: '18:00',
    duracion: 45,
    dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  });

  // Cargar configuración de horarios al iniciar
  useEffect(() => {
    getHorariosConfig()
      .then(setConfig)
      .catch(err => console.error('Error al cargar config de horarios:', err));
  }, []);

  // Hoy como mínimo para el datepicker
  const hoy = new Date().toISOString().split('T')[0];

  // ── Generar slots de horarios dinámicos ──────────────────────────────
  const diasSemanaMapa = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const generarHorarios = () => {
    const slots = [];
    if (!selectedDate || !config || !config.dias) return slots;
    
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const diaNombre = diasSemanaMapa[dateObj.getDay()];
    
    const diaConfig = config.dias[diaNombre];
    if (!diaConfig || !diaConfig.activo) return slots;
    
    // Parsear duración del servicio (ej. "45 min" -> 45)
    let duracionMinutos = config.duracion || 45;
    if (servicio && servicio.duracion) {
      const match = servicio.duracion.match(/(\d+)/);
      if (match) {
        duracionMinutos = parseInt(match[1], 10);
      }
    }
    
    // Obtener los intervalos
    const intervalos = diaConfig.intervalos || [];
    
    intervalos.forEach(interval => {
      if (!interval.apertura || !interval.cierre) return;
      const [hApertura, mApertura] = interval.apertura.split(':').map(Number);
      const [hCierre, mCierre] = interval.cierre.split(':').map(Number);
      
      let actual = new Date();
      actual.setHours(hApertura, mApertura, 0, 0);
      
      const limite = new Date();
      limite.setHours(hCierre, mCierre, 0, 0);
      
      while (actual < limite) {
        const horaStr = actual.toTimeString().slice(0, 5); // "HH:MM"
        if (!slots.includes(horaStr)) {
          slots.push(horaStr);
        }
        actual.setMinutes(actual.getMinutes() + duracionMinutos);
      }
    });
    
    // Ordenar cronológicamente
    slots.sort();
    return slots;
  };

  // Validar si el día de la semana es laboral
  const esDiaLaboral = (fechaStr) => {
    if (!fechaStr || !config || !config.dias) return true;
    const dateObj = new Date(fechaStr + 'T12:00:00'); // Evitar problemas de zona horaria
    const diaNombre = diasSemanaMapa[dateObj.getDay()];
    
    if (config.dias && typeof config.dias === 'object' && !Array.isArray(config.dias)) {
      return config.dias[diaNombre]?.activo ?? false;
    }
    if (Array.isArray(config.dias)) {
      return config.dias.includes(diaNombre);
    }
    return true;
  };

  // Cargar horas ocupadas cuando cambia la fecha
  useEffect(() => {
    if (!selectedDate) return;
    setTime('');
    
    if (!esDiaLaboral(selectedDate)) {
      setOcupadas([]);
      return;
    }

    setLoadingH(true);
    getHorasOcupadas(selectedDate)
      .then(setOcupadas)
      .catch(() => setOcupadas([]))
      .finally(() => setLoadingH(false));
  }, [selectedDate]);

  // ── Pantalla de login rápido ──────────────────────────────────────────
  if (!user) {
    return (
      <div className="container section text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '2rem', letterSpacing: '-0.03em' }}>¡Casi listo!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', maxWidth: '380px', lineHeight: '1.7' }}>
          Iniciá sesión con Google para asociar tu turno, recibir recordatorios y sumar puntos.
        </p>
        <button
          onClick={loginWithGoogle}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: '#fff', color: '#111', fontFamily: 'inherit', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', boxShadow: 'var(--shadow-subtle)' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px' }} />
          Continuar con Google
        </button>
      </div>
    );
  }

  // ── Confirmación final ───────────────────────────────────────────────
  if (confirmado) {
    return (
      <div className="container section text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '24px' }} />
        <h2 style={{ fontSize: '2rem', marginBottom: '8px', letterSpacing: '-0.03em' }}>¡Turno reservado!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
          {servicio.name} {esFijo && ' (Turno Fijo Recurrente)'} — {selectedDate} a las {selectedTime}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px' }}>
          Te enviamos una confirmación a <strong>{user.email}</strong>. Recibirás un recordatorio 30 min antes.
        </p>
        <button className="btn-primary" onClick={() => navigate('/')}>Volver al inicio</button>
      </div>
    );
  }

  // ── Confirmar turno ─────────────────────────────────────────────────
  const handleConfirmar = async () => {
    setLoading(true);
    setError('');

    // Parsear duración del servicio
    const match = servicio.duracion.match(/(\d+)/);
    const duracionMinutos = match ? parseInt(match[1], 10) : config.duracion;

    try {
      await crearTurno({
        cliente_uid:   user.uid,
        cliente_email: user.email,
        cliente_name:  user.name,
        fecha:         selectedDate,
        hora:          selectedTime,
        servicio:      servicio.name,
        precio:        servicio.precio,
        es_fijo:       esFijo,
        duracion:      duracionMinutos,
      });

      // Email de confirmación
      try {
        await enviarConfirmacion({
          to_email: user.email,
          to_name:  user.name,
          fecha:    selectedDate,
          hora:     selectedTime,
          servicio: `${servicio.name}${esFijo ? ' (Turno Fijo Semanal)' : ''}`,
        });
      } catch {
        // Email falla silenciosamente (EmailJS no configurado aún)
        console.warn('Email no enviado — configurar EmailJS en .env');
      }

      setConfirmado(true);
    } catch (err) {
      setError('Error al reservar el turno. Intentá de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container section">
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '2.2rem', letterSpacing: '-0.03em', marginBottom: '8px' }}>Reservar Turno</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Hola, <strong>{user.name}</strong> — elegí tu servicio, fecha y hora.</p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px', alignItems: 'center' }}>
          {['Servicio', 'Fecha y hora', 'Confirmar'].map((label, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: step > i + 1 ? '#111' : step === i + 1 ? '#111' : '#e5e7eb',
                  color: step >= i + 1 ? '#fff' : '#aaa',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: '700', flexShrink: 0
                }}>{i + 1}</div>
                <span style={{ fontSize: '0.85rem', color: step === i + 1 ? '#111' : 'var(--text-muted)', fontWeight: step === i + 1 ? '600' : '400' }}>{label}</span>
              </div>
              {i < 2 && <div style={{ width: '32px', height: '1px', background: '#e5e7eb' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 1: Servicio ────────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {SERVICIOS.map(s => (
              <button
                key={s.id}
                onClick={() => { setServicio(s); setStep(2); }}
                style={{
                  padding: '24px',
                  border: `2px solid ${servicio.id === s.id ? '#111' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-lg)',
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: 'inherit',
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '4px' }}>{s.name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{s.duracion}</p>
                </div>
                <p style={{ fontSize: '1.3rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
                  ${s.precio.toLocaleString('es-AR')}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 2: Fecha y hora ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="card">
            <div className="input-group">
              <label className="input-label">
                <Calendar size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                Elegí una fecha
              </label>
              <input
                type="date"
                className="input-field"
                min={hoy}
                value={selectedDate}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            {selectedDate && !esDiaLaboral(selectedDate) && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--danger)', marginTop: '12px', fontSize: '0.9rem' }}>
                <AlertCircle size={16} />
                La barbería no abre este día. Días de atención: {config.dias.join(', ')}.
              </div>
            )}

            {selectedDate && esDiaLaboral(selectedDate) && (
              <div style={{ marginTop: '8px' }}>
                <label className="input-label" style={{ marginBottom: '12px', display: 'block' }}>
                  <Clock size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                  Horarios disponibles ({servicio.duracion})
                </label>
                {loadingHoras ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando horarios...</p>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {generarHorarios().map(hora => {
                        const ocupada = horasOcupadas.includes(hora);
                        const selec   = selectedTime === hora;
                        return (
                          <button
                            key={hora}
                            disabled={ocupada}
                            onClick={() => setTime(hora)}
                            style={{
                              padding: '10px 18px',
                              borderRadius: 'var(--radius-md)',
                              border: selec ? 'none' : '1px solid var(--border-color)',
                              background: selec ? '#111' : ocupada ? '#f3f4f6' : '#fff',
                              color: selec ? '#fff' : ocupada ? '#ccc' : '#111',
                              fontWeight: '500',
                              cursor: ocupada ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                              textDecoration: ocupada ? 'line-through' : 'none',
                              transition: 'all 0.15s ease',
                              fontFamily: 'inherit',
                            }}
                          >
                            {hora}
                          </button>
                        );
                      })}
                    </div>

                    {selectedTime && (
                      <div style={{
                        marginTop: '24px',
                        padding: '18px',
                        border: `1px solid ${esFijo ? '#111' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: esFijo ? '#f9f9f9' : '#fff',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: esFijo ? 'var(--shadow-subtle)' : 'none'
                      }} onClick={() => setEsFijo(!esFijo)}>
                        <input
                          type="checkbox"
                          checked={esFijo}
                          onChange={(e) => setEsFijo(e.target.checked)}
                          style={{ marginTop: '4px', cursor: 'pointer', accentColor: '#111' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p style={{ fontWeight: '600', fontSize: '0.95rem', margin: 0, color: '#111' }}>¿Reservar como Turno Fijo?</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                            Reservá este mismo día ({new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long' })}) y horario ({selectedTime}) de forma recurrente todas las semanas.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Confirmar ─────────────────────────────────────────── */}
        {step === 3 && (
          <div className="card">
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Resumen de tu turno</h3>
            <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
              {[
                ['Servicio', servicio.name],
                ['Fecha',    selectedDate],
                ['Hora',     selectedTime],
                ['Duración', servicio.duracion],
                ['Tipo de Turno', esFijo ? 'Fijo (Semanal Recurrente)' : 'Normal (Una sola vez)'],
                ['Total',    `$${servicio.precio.toLocaleString('es-AR')}`],
                ['Email',    user.email],
              ].map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{key}</span>
                  <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{ background: '#f9f9f9', borderLeft: '3px solid #111', padding: '14px 16px', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', marginBottom: '20px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>
                {esFijo ? (
                  <>Al confirmar, reservás este espacio <strong style={{ color: '#111' }}>semanalmente</strong>. Si necesitás cancelar alguna semana en particular, recordá avisar con al menos 2 horas de anticipación.</>
                ) : (
                  <>Al confirmar te comprometés a presentarte <strong style={{ color: '#111' }}>10 minutos antes</strong>. La cancelación con menos de <strong style={{ color: '#111' }}>2 horas de anticipación</strong> requiere abonar el servicio completo.</>
                )}
              </p>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--danger)', marginBottom: '16px', fontSize: '0.9rem' }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── Navegación ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', gap: '12px' }}>
          {step > 1 ? (
            <button className="btn-outline" onClick={() => setStep(s => s - 1)}>← Volver</button>
          ) : <div />}

          {step === 2 && (
            <button
              className="btn-primary"
              disabled={!selectedDate || !selectedTime || !esDiaLaboral(selectedDate)}
              style={{ opacity: (!selectedDate || !selectedTime || !esDiaLaboral(selectedDate)) ? 0.45 : 1 }}
              onClick={() => setStep(3)}
            >
              Siguiente →
            </button>
          )}

          {step === 3 && (
            <button
              className="btn-primary"
              onClick={handleConfirmar}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1, minWidth: '160px', justifyContent: 'center' }}
            >
              {loading ? 'Reservando...' : 'Confirmar Turno'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
