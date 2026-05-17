import React, { useState, useEffect } from 'react';
import { Calendar, Users, Check, X, Clock, Settings, Package, TrendingUp, Star, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTurnosHoy, actualizarEstadoTurno, sumarPuntos, getHorariosConfig, guardarHorariosConfig } from '../lib/turnos';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('turnos');

  const [turnosHoy,     setTurnosHoy]     = useState([]);
  const [clientes,      setClientes]      = useState([]);
  const [products,      setProducts]      = useState([]);
  const [stats,         setStats]         = useState({ semana: 0, mes: 0, anio: 0 });
  const [loadingTurnos, setLoadingTurnos] = useState(true);
  const [loadingCli,    setLoadingCli]    = useState(true);
  const [toastMsg,      setToastMsg]      = useState('');

  const [configState, setConfigState] = useState({
    duracion: 45,
    dias: {
      "Lun": { activo: true, intervalos: [{ apertura: "10:00", cierre: "18:00" }] },
      "Mar": { activo: true, intervalos: [{ apertura: "10:00", cierre: "18:00" }] },
      "Mié": { activo: true, intervalos: [{ apertura: "10:00", cierre: "18:00" }] },
      "Jue": { activo: true, intervalos: [{ apertura: "10:00", cierre: "18:00" }] },
      "Vie": { activo: true, intervalos: [{ apertura: "10:00", cierre: "18:00" }] },
      "Sáb": { activo: true, intervalos: [{ apertura: "10:00", cierre: "18:00" }] },
      "Dom": { activo: false, intervalos: [] }
    }
  });

  useEffect(() => {
    if (user?.role !== 'admin' && !user?.permiso_horarios) navigate('/');
  }, [user, navigate]);

  // ── Carga inicial ────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.role !== 'admin' && !user?.permiso_horarios) return;
    fetchTurnos();
    fetchStats();
    
    // Solo admins pueden ver catálogo de productos y clientes
    if (user?.role === 'admin') {
      fetchClientes();
      fetchProducts();
    }
    
    // Cargar config de horarios
    getHorariosConfig()
      .then(setConfigState)
      .catch(console.error);
  }, [user]);

  async function fetchTurnos() {
    setLoadingTurnos(true);
    try {
      const data = await getTurnosHoy();
      setTurnosHoy(data);
    } catch {
      setTurnosHoy(MOCK_TURNOS); // fallback a mock si Supabase no está configurado
    } finally {
      setLoadingTurnos(false);
    }
  }

  async function fetchClientes() {
    setLoadingCli(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('puntos', { ascending: false });
      if (error) throw error;
      setClientes(data);
    } catch {
      setClientes(MOCK_CLIENTES);
    } finally {
      setLoadingCli(false);
    }
  }

  async function fetchStats() {
    const hoy   = new Date();
    const isoHoy = hoy.toISOString().split('T')[0];
    const lunesISO = getLunes(hoy);
    const inicioMes = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`;
    const inicioAnio = `${hoy.getFullYear()}-01-01`;

    try {
      const [sem, mes, anio] = await Promise.all([
        supabase.from('turnos').select('id', { count: 'exact', head: true }).gte('fecha', lunesISO).lte('fecha', isoHoy).neq('estado','cancelado'),
        supabase.from('turnos').select('id', { count: 'exact', head: true }).gte('fecha', inicioMes).lte('fecha', isoHoy).neq('estado','cancelado'),
        supabase.from('turnos').select('id', { count: 'exact', head: true }).gte('fecha', inicioAnio).lte('fecha', isoHoy).neq('estado','cancelado'),
      ]);
      setStats({ semana: sem.count ?? 0, mes: mes.count ?? 0, anio: anio.count ?? 0 });
    } catch {
      setStats({ semana: 34, mes: 142, anio: 1204 }); // mock
    }
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data);
    } catch {
      setProducts(MOCK_PRODUCTS);
    }
  }

  // ── Acciones ─────────────────────────────────────────────────────────
  async function handleEstado(turnoId, clienteUid, nuevoEstado) {
    try {
      await actualizarEstadoTurno(turnoId, nuevoEstado);
      if (nuevoEstado === 'confirmado') await sumarPuntos(clienteUid, 30);
      toast(nuevoEstado === 'confirmado' ? '✓ Turno confirmado — +30 pts al cliente' : '✗ Turno cancelado');
      fetchTurnos();
    } catch {
      toast('Error al actualizar el turno');
    }
  }

  function toast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  async function handleTogglePermiso(clienteUid, currentVal) {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ permiso_horarios: !currentVal })
        .eq('uid', clienteUid);

      if (error) throw error;
      toast(`Permisos actualizados con éxito`);
      fetchClientes();
    } catch (err) {
      console.error(err);
      toast('Error al actualizar permisos');
    }
  }

  async function handleSaveConfig() {
    try {
      await guardarHorariosConfig(configState);
      toast('✓ Configuración de horarios y duraciones guardada');
    } catch (err) {
      console.error(err);
      toast('Error al guardar la configuración');
    }
  }

  if (user?.role !== 'admin' && !user?.permiso_horarios) return null;

  const statCards = [
    { label: 'Cortes esta semana', value: stats.semana, icon: <TrendingUp size={22} />, color: '#3b82f6' },
    { label: 'Cortes este mes',    value: stats.mes,    icon: <Calendar size={22} />,   color: '#10b981' },
    { label: 'Cortes este año',    value: stats.anio,   icon: <Users size={22} />,      color: '#111' },
  ];

  const TABS = [
    { id: 'turnos',         label: 'Turnos de Hoy',    icon: <Clock size={15} /> },
    user?.role === 'admin' && { id: 'clientes',       label: 'Clientes',          icon: <Users size={15} /> },
    user?.role === 'admin' && { id: 'puntos',         label: 'Puntos',             icon: <Star size={15} /> },
    user?.role === 'admin' && { id: 'productos',      label: 'Productos',          icon: <Package size={15} /> },
    { id: 'configuracion',  label: 'Configuración',      icon: <Settings size={15} /> },
  ].filter(Boolean);

  return (
    <div className="container section" style={{ position: 'relative' }}>

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#111', color: '#fff', padding: '12px 20px', borderRadius: 'var(--radius-md)', zIndex: 999, fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}>Panel de Control</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {user?.name} — {user?.role === 'admin' ? 'Administrador' : 'Colaborador (Gestor de Horarios)'}
          </p>
        </div>
        <button className="btn-outline" style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', gap: '6px', alignItems: 'center' }} onClick={() => { fetchTurnos(); fetchStats(); }}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3" style={{ marginBottom: '32px' }}>
        {statCards.map((s, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${s.color}18`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '2px' }}>{s.label}</p>
              <p style={{ fontSize: '1.8rem', fontWeight: '700', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={{ padding: '14px 20px', fontWeight: '500', fontSize: '0.88rem', whiteSpace: 'nowrap', borderBottom: activeTab === tab.id ? '2px solid #111' : '2px solid transparent', color: activeTab === tab.id ? '#111' : 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', fontFamily: 'inherit', flexShrink: 0 }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>

          {/* ── TURNOS ────────────────────────────────────────────────── */}
          {activeTab === 'turnos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Turnos de hoy — {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{turnosHoy.length} turnos</span>
              </div>
              {loadingTurnos ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando turnos...</p>
              ) : turnosHoy.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay turnos para hoy.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.82rem', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 0' }}>Hora</th>
                        <th style={{ padding: '10px 0' }}>Cliente</th>
                        <th style={{ padding: '10px 0' }}>Servicio</th>
                        <th style={{ padding: '10px 0' }}>Estado</th>
                        <th style={{ padding: '10px 0', textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turnosHoy.map(turno => (
                        <tr key={turno.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '14px 0', fontWeight: '600' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={14} /> {turno.hora}
                            </span>
                          </td>
                          <td style={{ padding: '14px 0', fontSize: '0.95rem' }}>{turno.cliente_name}</td>
                          <td style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <div>{turno.servicio}</div>
                            <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>
                              Duración: {turno.duracion ?? 45} min
                              {turno.es_fijo && (
                                <span style={{
                                  marginLeft: '8px',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontSize: '0.65rem',
                                  fontWeight: '700',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                }}>
                                  FIJO
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '14px 0' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '600',
                              background: turno.estado === 'confirmado' ? '#dcfce7' : turno.estado === 'cancelado' ? '#fee2e2' : '#f3f4f6',
                              color:      turno.estado === 'confirmado' ? '#16a34a' : turno.estado === 'cancelado' ? '#dc2626' : '#6b7280',
                            }}>
                              {turno.estado.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '14px 0', textAlign: 'right' }}>
                            {turno.estado === 'pendiente' && (
                              <>
                                <button onClick={() => handleEstado(turno.id, turno.cliente_uid, 'confirmado')} style={{ color: 'var(--success)', marginRight: '12px' }} title="Confirmar"><Check size={18} /></button>
                                <button onClick={() => handleEstado(turno.id, turno.cliente_uid, 'cancelado')} style={{ color: 'var(--danger)' }} title="Cancelar"><X size={18} /></button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── CLIENTES ─────────────────────────────────────────────── */}
          {activeTab === 'clientes' && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>Clientes registrados</h3>
              {loadingCli ? <p style={{ color: 'var(--text-muted)' }}>Cargando...</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.82rem', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 0' }}>Nombre</th>
                        <th style={{ padding: '10px 0' }}>Email</th>
                        <th style={{ padding: '10px 0' }}>Rol</th>
                        <th style={{ padding: '10px 0', textAlign: 'center' }}>Permisos (Horarios)</th>
                        <th style={{ padding: '10px 0', textAlign: 'right' }}>Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '14px 0', fontWeight: '500' }}>{c.name}</td>
                          <td style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{c.email}</td>
                          <td style={{ padding: '14px 0', fontSize: '0.9rem' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                              background: c.role === 'admin' ? '#f3e8ff' : '#f3f4f6',
                              color: c.role === 'admin' ? '#7e22ce' : '#374151'
                            }}>
                              {c.role === 'admin' ? 'ADMIN' : 'CLIENTE'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 0', textAlign: 'center' }}>
                            {c.role === 'admin' ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <ShieldCheck size={14} color="var(--success)" /> Administrador total
                              </span>
                            ) : (
                              <button
                                onClick={() => handleTogglePermiso(c.uid, c.permiso_horarios)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  border: 'none',
                                  background: c.permiso_horarios ? '#dcfce7' : '#fee2e2',
                                  color: c.permiso_horarios ? '#15803d' : '#b91c1c',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontFamily: 'inherit'
                                }}
                              >
                                {c.permiso_horarios ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                                {c.permiso_horarios ? 'Con Permiso' : 'Sin Permiso'}
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: '700' }}>★ {c.puntos ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── PUNTOS ───────────────────────────────────────────────── */}
          {activeTab === 'puntos' && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '6px' }}>Sistema de Puntos</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>1 corte completado = 30 puntos. Los puntos no vencen. Próximamente: canjes por descuentos y promociones.</p>
              <div style={{ background: '#f9f9f9', borderLeft: '3px solid #111', padding: '14px 16px', marginBottom: '24px', fontSize: '0.88rem', color: 'var(--text-muted)', borderRadius: '0 4px 4px 0' }}>
                Los puntos se acreditan automáticamente cuando confirmás un turno desde el panel.
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', maxWidth: '500px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.82rem', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '10px 0' }}>Cliente</th>
                    <th style={{ padding: '10px 0', textAlign: 'right' }}>Puntos</th>
                    <th style={{ padding: '10px 0', textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 0' }}>{c.name}</td>
                      <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: '700' }}>★ {c.puntos ?? 0}</td>
                      <td style={{ padding: '14px 0', textAlign: 'right' }}>
                        <button className="btn-outline" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Canjear</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── PRODUCTOS ────────────────────────────────────────────── */}
          {activeTab === 'productos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Catálogo de Productos</h3>
                <button className="btn-outline" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>+ Agregar</button>
              </div>
              <div className="grid grid-cols-2">
                {products.map((p, i) => (
                  <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                    <div className="input-group">
                      <label className="input-label">Nombre</label>
                      <input type="text" className="input-field" defaultValue={p.name} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Descripción</label>
                      <textarea className="input-field" defaultValue={p.descripcion} rows="2" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Precio</label>
                      <input type="text" className="input-field" defaultValue={p.precio} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '6px 12px', fontSize: '0.8rem' }}>Eliminar</button>
                      <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Guardar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CONFIGURACIÓN ────────────────────────────────────────── */}
          {activeTab === 'configuracion' && (
            <div style={{ maxWidth: '520px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '20px' }}>Configuración de Horarios</h3>
              
              <div className="input-group">
                <label className="input-label">Duración base de cada turno (minutos)</label>
                <input
                  type="number"
                  className="input-field"
                  value={configState.duracion}
                  onChange={e => setConfigState({ ...configState, duracion: parseInt(e.target.value) || 45 })}
                />
              </div>

              <div className="input-group" style={{ marginTop: '24px' }}>
                <label className="input-label" style={{ marginBottom: '16px', display: 'block', fontWeight: '600', fontSize: '1.05rem' }}>Horarios por Día de Atención</label>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => {
                    const dayData = configState.dias?.[d] || { activo: false, intervalos: [] };
                    const active = dayData.activo;
                    const intervalos = dayData.intervalos || [];

                    return (
                      <div key={d} style={{
                        padding: '16px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        background: active ? '#fff' : '#f9f9f9',
                        transition: 'all 0.2s ease',
                        boxShadow: active ? 'var(--shadow-subtle)' : 'none'
                      }}>
                        {/* Day Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: intervalos.length > 0 && active ? '16px' : '0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={e => {
                                const newDias = { ...configState.dias };
                                newDias[d] = { 
                                  ...dayData, 
                                  activo: e.target.checked,
                                  intervalos: e.target.checked && dayData.intervalos.length === 0 
                                    ? [{ apertura: '10:00', cierre: '18:00' }]
                                    : dayData.intervalos
                                };
                                setConfigState({ ...configState, dias: newDias });
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#111' }}
                            />
                            <span style={{ fontWeight: '700', fontSize: '1rem' }}>{d}</span>
                          </div>
                          
                          {active && (
                            <button
                              type="button"
                              onClick={() => {
                                const newDias = { ...configState.dias };
                                newDias[d] = {
                                  ...dayData,
                                  intervalos: [...intervalos, { apertura: '14:00', cierre: '18:00' }]
                                };
                                setConfigState({ ...configState, dias: newDias });
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px dashed var(--border-color)',
                                background: '#fff',
                                color: '#111',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                            >
                              + Agregar Turno/Intervalo
                            </button>
                          )}
                        </div>

                        {/* List of Intervals */}
                        {active && (
                          <div style={{ display: 'grid', gap: '10px' }}>
                            {intervalos.length === 0 && (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0', fontStyle: 'italic' }}>
                                Sin horarios definidos. Agrega un intervalo para habilitar turnos este día.
                              </p>
                            )}
                            {intervalos.map((interval, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: '#fcfcfc',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px 12px',
                                transition: 'all 0.2s ease'
                              }}>
                                <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                  <input
                                    type="time"
                                    value={interval.apertura}
                                    onChange={e => {
                                      const newDias = { ...configState.dias };
                                      const newIntervals = [...intervalos];
                                      newIntervals[idx] = { ...interval, apertura: e.target.value };
                                      newDias[d] = { ...dayData, intervalos: newIntervals };
                                      setConfigState({ ...configState, dias: newDias });
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid var(--border-color)',
                                      fontSize: '0.85rem',
                                      fontFamily: 'inherit',
                                      background: '#fff',
                                      cursor: 'pointer'
                                    }}
                                  />
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>a</span>
                                  <input
                                    type="time"
                                    value={interval.cierre}
                                    onChange={e => {
                                      const newDias = { ...configState.dias };
                                      const newIntervals = [...intervalos];
                                      newIntervals[idx] = { ...interval, cierre: e.target.value };
                                      newDias[d] = { ...dayData, intervalos: newIntervals };
                                      setConfigState({ ...configState, dias: newDias });
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid var(--border-color)',
                                      fontSize: '0.85rem',
                                      fontFamily: 'inherit',
                                      background: '#fff',
                                      cursor: 'pointer'
                                    }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newDias = { ...configState.dias };
                                    newDias[d] = {
                                      ...dayData,
                                      intervalos: intervalos.filter((_, i) => i !== idx)
                                    };
                                    setConfigState({ ...configState, dias: newDias });
                                  }}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#fce8e6'; e.currentTarget.style.color = 'var(--danger)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <button
                className="btn-primary"
                onClick={handleSaveConfig}
                style={{ marginTop: '24px', width: '100%', justifyContent: 'center' }}
              >
                Guardar cambios
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Fallback mock data (cuando Supabase no está configurado aún) ──────────
const MOCK_TURNOS = [
  { id: 1, cliente_uid: 'u1', cliente_name: 'Martín Gómez',  servicio: 'Corte de Pelo', hora: '10:00', estado: 'confirmado' },
  { id: 2, cliente_uid: 'u2', cliente_name: 'Lucas Silva',   servicio: 'Corte de Pelo', hora: '11:30', estado: 'pendiente' },
  { id: 3, cliente_uid: 'u3', cliente_name: 'Andrés López',  servicio: 'Corte de Pelo', hora: '14:00', estado: 'pendiente' },
];

const MOCK_CLIENTES = [
  { name: 'Martín Gómez',  email: 'martin@gmail.com',  puntos: 360 },
  { name: 'Lucas Silva',   email: 'lucas@gmail.com',   puntos: 240 },
  { name: 'Andrés López',  email: 'andres@gmail.com',  puntos: 150 },
];

const MOCK_PRODUCTS = [
  { name: 'Cera Mate Premium', descripcion: 'Fijación fuerte, sin brillo.', precio: '$8,500' },
  { name: 'Aceite para Barba', descripcion: 'Hidratación profunda.',        precio: '$6,000' },
];

function getLunes(fecha) {
  const d = new Date(fecha);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
