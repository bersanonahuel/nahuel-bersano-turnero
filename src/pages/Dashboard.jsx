import React, { useState, useEffect } from 'react';
import { Calendar, Users, Check, X, Clock, Settings, Package, TrendingUp, Star, RefreshCw, ShieldAlert, ShieldCheck, Scissors, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProximosTurnos, getTurnosFijos, crearTurno, actualizarEstadoTurno, actualizarTurnoFijo, getHorasOcupadas, sumarPuntos, getHorariosConfig, guardarHorariosConfig, getFechaLocalISO } from '../lib/turnos';
import { getAllProductos, crearProducto, actualizarProducto, eliminarProducto } from '../lib/productos';
import { getAllServicios, crearServicio, actualizarServicio, eliminarServicio } from '../lib/servicios';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('turnos');

  const [turnosHoy,     setTurnosHoy]     = useState([]);
  const [turnosFijos,   setTurnosFijos]   = useState([]);
  const [clientes,      setClientes]      = useState([]);
  const [products,      setProducts]      = useState([]);
  const [servicios,     setServicios]     = useState([]);
  const [stats,         setStats]         = useState({ semana: 0, mes: 0, anio: 0 });
  const [loadingTurnos, setLoadingTurnos] = useState(true);
  const [loadingCli,    setLoadingCli]    = useState(true);
  const [toastMsg,      setToastMsg]      = useState('');

  // Estado para otorgar un nuevo Turno Fijo desde el panel admin
  const [showNuevoFijo, setShowNuevoFijo] = useState(false);
  const [modoClienteFijo, setModoClienteFijo] = useState('registrado'); // 'registrado' | 'manual'
  const [nuevoFijo, setNuevoFijo] = useState({
    cliente_uid: '',
    cliente_name: '',
    cliente_email: '',
    servicio_id: '',
    fecha: getFechaLocalISO(),
    hora: '10:00',
  });
  const [horasOcupadasFijo, setHorasOcupadasFijo] = useState([]);
  const [creandoFijo, setCreandoFijo] = useState(false);

  const [configState, setConfigState] = useState({
    duracion: 45,
    dias: {
      "Lun": { activo: true, apertura: "10:00", cierre: "18:00" },
      "Mar": { activo: true, apertura: "10:00", cierre: "18:00" },
      "Mié": { activo: true, apertura: "10:00", cierre: "18:00" },
      "Jue": { activo: true, apertura: "10:00", cierre: "18:00" },
      "Vie": { activo: true, apertura: "10:00", cierre: "18:00" },
      "Sáb": { activo: true, apertura: "10:00", cierre: "18:00" },
      "Dom": { activo: false, apertura: "10:00", cierre: "18:00" }
    },
    bloqueos: []
  });

  useEffect(() => {
    if (user?.role !== 'admin' && !user?.permiso_horarios) navigate('/');
  }, [user, navigate]);

  // ── Carga inicial ────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.role !== 'admin' && !user?.permiso_horarios) return;
    fetchTurnos();
    fetchStats();
    
    // Cargar clientes y servicios para poder gestionar turnos fijos
    fetchClientes();
    fetchServicios();

    // Solo admins pueden ver catálogo de productos
    if (user?.role === 'admin') {
      fetchProducts();
    }
    
    // Cargar config de horarios
    getHorariosConfig()
      .then(setConfigState)
      .catch(console.error);

    // Suscripción a cambios en turnos (Real-time)
    const turnosChannel = supabase.channel('realtime_turnos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos' }, () => {
        fetchTurnos();
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(turnosChannel);
    };
  }, [user]);

  useEffect(() => {
    if (!nuevoFijo.fecha || !showNuevoFijo) return;
    getHorasOcupadas(nuevoFijo.fecha)
      .then(setHorasOcupadasFijo)
      .catch(() => setHorasOcupadasFijo([]));
  }, [nuevoFijo.fecha, showNuevoFijo]);

  async function fetchTurnos() {
    setLoadingTurnos(true);
    try {
      const data = await getProximosTurnos();
      setTurnosHoy(data);
      const fijos = await getTurnosFijos();
      setTurnosFijos(fijos);
    } catch {
      setTurnosHoy([]); // En caso de error, mostrar array vacío o mocks
      setTurnosFijos([]);
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
    const isoHoy = getFechaLocalISO(hoy);
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
      const data = await getAllProductos();
      setProducts(data);
    } catch {
      setProducts(MOCK_PRODUCTS);
    }
  }

  async function fetchServicios() {
    try {
      const data = await getAllServicios();
      setServicios(data);
      if (data && data.length > 0) {
        setNuevoFijo(prev => ({ ...prev, servicio_id: prev.servicio_id || data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ── Acciones ─────────────────────────────────────────────────────────
  async function handleEstado(turnoId, clienteUid, nuevoEstado) {
    try {
      await actualizarEstadoTurno(turnoId, nuevoEstado);
      if (nuevoEstado === 'confirmado' && clienteUid) await sumarPuntos(clienteUid, 30);
      toast(nuevoEstado === 'confirmado' ? '✓ Turno confirmado — +30 pts al cliente' : '✗ Turno cancelado');
      fetchTurnos();
    } catch {
      toast('Error al actualizar el turno');
    }
  }

  async function handleToggleFijo(turnoId, esFijoActual) {
    try {
      const nuevoValor = !esFijoActual;
      await actualizarTurnoFijo(turnoId, nuevoValor);
      toast(nuevoValor ? '✓ Turno convertido en Turno Fijo semanal' : '✓ Se quitó la recurrencia fija del turno');
      fetchTurnos();
    } catch (err) {
      console.error(err);
      toast('Error al actualizar turno fijo');
    }
  }

  function generarHorariosDiaAdmin(fechaStr) {
    const diasSemanaMapa = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    if (!fechaStr || !configState?.dias) return [];
    const dateObj = new Date(fechaStr + 'T12:00:00');
    const diaNombre = diasSemanaMapa[dateObj.getDay()];
    const diaConfig = configState.dias[diaNombre];
    const apertura = diaConfig?.apertura || '07:00';
    const cierre = diaConfig?.cierre || '23:00';
    const [hA, mA] = apertura.split(':').map(Number);
    const [hC, mC] = cierre.split(':').map(Number);
    const servObj = servicios.find(s => s.id === nuevoFijo.servicio_id) || servicios[0];
    const duracionMin = parseInt(servObj?.duracion, 10) || Number(configState.duracion) || 30;
    const bloqueosHoy = (configState.bloqueos || []).filter(b => b.dia === diaNombre);
    const slots = [];
    let actualMin = hA * 60 + mA;
    const limiteMin = hC * 60 + mC;
    while (actualMin < limiteMin) {
      const hh = String(Math.floor(actualMin / 60)).padStart(2, '0');
      const mm = String(actualMin % 60).padStart(2, '0');
      const horaStr = `${hh}:${mm}`;
      const slotFin = actualMin + duracionMin;
      const bloqueado = bloqueosHoy.some(b => {
        if (!b.inicio || !b.fin) return false;
        const [hbI, mbI] = b.inicio.split(':').map(Number);
        const [hbF, mbF] = b.fin.split(':').map(Number);
        const bI = hbI * 60 + mbI;
        const bF = hbF * 60 + mbF;
        return bF > bI && actualMin < bF && slotFin > bI;
      });
      if (!bloqueado) slots.push(horaStr);
      actualMin += duracionMin;
    }
    return slots;
  }

  async function handleCrearTurnoFijo(e) {
    e.preventDefault();
    let clienteUid = null;
    let clienteName = '';
    let clienteEmail = '';

    if (modoClienteFijo === 'registrado') {
      const cli = clientes.find(c => c.uid === nuevoFijo.cliente_uid);
      if (!cli) {
        toast('Seleccioná un cliente de la lista');
        return;
      }
      clienteUid = cli.uid;
      clienteName = cli.name || cli.email;
      clienteEmail = cli.email || 'sin-email@turnero.local';
    } else {
      if (!nuevoFijo.cliente_name.trim()) {
        toast('Ingresá el nombre del cliente');
        return;
      }
      clienteName = nuevoFijo.cliente_name.trim();
      clienteEmail = nuevoFijo.cliente_email.trim() || 'manual@turnero.local';
    }

    if (!nuevoFijo.fecha || !nuevoFijo.hora) {
      toast('Seleccioná fecha de inicio y horario');
      return;
    }

    const servObj = servicios.find(s => s.id === nuevoFijo.servicio_id) || servicios[0] || { name: 'Corte Clásico', precio: 9000, duracion: 30 };

    setCreandoFijo(true);
    try {
      await crearTurno({
        cliente_uid: clienteUid,
        cliente_email: clienteEmail,
        cliente_name: clienteName,
        fecha: nuevoFijo.fecha,
        hora: nuevoFijo.hora.slice(0, 5),
        servicio: servObj.name,
        precio: servObj.precio ?? 0,
        es_fijo: true,
        duracion: parseInt(servObj.duracion, 10) || 30,
        estado: 'confirmado',
      });
      toast(`✓ Turno fijo otorgado a ${clienteName}`);
      setShowNuevoFijo(false);
      setNuevoFijo(prev => ({ ...prev, cliente_uid: '', cliente_name: '', cliente_email: '' }));
      fetchTurnos();
    } catch (err) {
      console.error(err);
      toast('Error al otorgar el turno fijo');
    } finally {
      setCreandoFijo(false);
    }
  }

  function abrirOtorgarFijoParaCliente(cliente) {
    setModoClienteFijo('registrado');
    setNuevoFijo(prev => ({
      ...prev,
      cliente_uid: cliente.uid,
      servicio_id: prev.servicio_id || (servicios[0]?.id ?? ''),
      fecha: prev.fecha || getFechaLocalISO(),
    }));
    setShowNuevoFijo(true);
    setActiveTab('turnos-fijos');
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

    async function handleAddProducto() {
      try {
        await crearProducto({ name: 'Nuevo Producto', descripcion: '', precio: 0, categoria: 'Hombre', activo: true });
        toast('Producto agregado');
        fetchProducts();
      } catch (err) {
        console.error("Error al crear producto:", err);
        toast('Error al crear producto');
      }
    }

    async function handleUploadImage(id, file) {
      if (!file) return;
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}-${Math.random()}.${fileExt}`;
        const filePath = `productos/${fileName}`;
        
        toast('Subiendo imagen...');

        const { error: uploadError } = await supabase.storage
          .from('productos')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from('productos').getPublicUrl(filePath);
        
        // Use the existing handleUpdateProducto to update the imagen_url
        await handleUpdateProducto(id, 'imagen_url', data.publicUrl);
        toast('Imagen actualizada con éxito');
      } catch (err) {
        console.error('Error al subir imagen:', err);
        toast('Error al subir imagen. ¿Existe el bucket "productos"?');
      }
    }

    async function handleUpdateProducto(id, field, value) {
      try {
        await actualizarProducto(id, { [field]: field === 'precio' ? parseInt(value) || 0 : value });
        toast('Producto actualizado');
        fetchProducts();
      } catch {
        toast('Error al actualizar');
      }
    }

    async function handleDelProducto(id) {
      if (!window.confirm('¿Eliminar producto?')) return;
      try {
        await eliminarProducto(id);
        toast('Producto eliminado');
        fetchProducts();
      } catch {
        toast('Error al eliminar');
      }
    }

    async function handleAddServicio() {
      try {
        await crearServicio({ name: 'Nuevo Servicio', descripcion: '', precio: 0, duracion: 45, activo: true });
        toast('Servicio agregado');
        fetchServicios();
      } catch (err) {
        console.error("Error al crear servicio:", err);
        toast('Error al crear servicio');
      }
    }

    async function handleUpdateServicio(id, field, value) {
      try {
        await actualizarServicio(id, { [field]: field === 'precio' || field === 'duracion' ? parseInt(value) || 0 : value });
        toast('Servicio actualizado');
        fetchServicios();
      } catch {
        toast('Error al actualizar');
      }
    }

    async function handleDelServicio(id) {
      if (!window.confirm('¿Eliminar servicio?')) return;
      try {
        await eliminarServicio(id);
        toast('Servicio eliminado');
        fetchServicios();
      } catch {
        toast('Error al eliminar');
      }
    }

  if (user?.role !== 'admin' && !user?.permiso_horarios) return null;

  const statCards = [
    { label: 'Cortes esta semana', value: stats.semana, icon: <TrendingUp size={22} />, color: '#3b82f6' },
    { label: 'Cortes este mes',    value: stats.mes,    icon: <Calendar size={22} />,   color: '#10b981' },
    { label: 'Cortes este año',    value: stats.anio,   icon: <Users size={22} />,      color: '#111' },
  ];

  const TABS = [
    { id: 'turnos',         label: 'Próximos Turnos',    icon: <Clock size={15} /> },
    { id: 'turnos-fijos',   label: 'Turnos Fijos',      icon: <RefreshCw size={15} /> },
    user?.role === 'admin' && { id: 'clientes',       label: 'Clientes',          icon: <Users size={15} /> },
    user?.role === 'admin' && { id: 'puntos',         label: 'Puntos',             icon: <Star size={15} /> },
    user?.role === 'admin' && { id: 'productos',      label: 'Productos',          icon: <Package size={15} /> },
    user?.role === 'admin' && { id: 'servicios',      label: 'Servicios',          icon: <Scissors size={15} /> },
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
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Próximos Turnos</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{turnosHoy.length} turnos</span>
              </div>
              {loadingTurnos ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando turnos...</p>
              ) : turnosHoy.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay turnos próximos.</p>
              ) : (() => {
                const turnosAgrupados = turnosHoy.reduce((groups, turno) => {
                  const date = turno.fecha;
                  if (!groups[date]) {
                    groups[date] = [];
                  }
                  groups[date].push(turno);
                  return groups;
                }, {});

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {Object.keys(turnosAgrupados).map(fecha => {
                      const turnosDelDia = turnosAgrupados[fecha];
                      const cabeceraText = formatFechaCabecera(fecha);
                      
                      return (
                        <div key={fecha} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px', background: '#fff', boxShadow: 'var(--shadow-subtle)' }}>
                          {/* Cabecera del día */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingBottom: '12px',
                            borderBottom: '1px solid var(--border-color)',
                            marginBottom: '12px'
                          }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#111' }}>
                              {cabeceraText}
                            </h4>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)'
                            }}>
                              {turnosDelDia.length} {turnosDelDia.length === 1 ? 'turno' : 'turnos'}
                            </span>
                          </div>

                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                              <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)' }}>
                                  <th style={{ padding: '8px 0', width: '90px' }}>Hora</th>
                                  <th style={{ padding: '8px 0' }}>Cliente</th>
                                  <th style={{ padding: '8px 0' }}>Servicio</th>
                                  <th style={{ padding: '8px 0' }}>Estado</th>
                                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {turnosDelDia.map(turno => (
                                  <tr key={turno.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 0', fontWeight: '600' }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={13} style={{ color: 'var(--text-muted)' }} /> {turno.hora.slice(0, 5)}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px 0', fontSize: '0.9rem', fontWeight: '500' }}>{turno.cliente_name}</td>
                                    <td style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                      <div>{turno.servicio}</div>
                                      <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>
                                        Duración: {turno.duracion ?? 45} min
                                        {turno.es_fijo && (
                                          <span style={{
                                            marginLeft: '8px',
                                            padding: '2px 6px',
                                            borderRadius: '3px',
                                            fontSize: '0.62rem',
                                            fontWeight: '700',
                                            background: '#e0f2fe',
                                            color: '#0369a1',
                                          }}>
                                            FIJO
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ padding: '12px 0' }}>
                                      <span style={{
                                        padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: '600',
                                        background: turno.estado === 'confirmado' ? '#dcfce7' : turno.estado === 'cancelado' ? '#fee2e2' : '#f3f4f6',
                                        color:      turno.estado === 'confirmado' ? '#16a34a' : turno.estado === 'cancelado' ? '#dc2626' : '#6b7280',
                                      }}>
                                        {turno.estado.toUpperCase()}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                      <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'center' }}>
                                        <button
                                          onClick={() => handleToggleFijo(turno.id, turno.es_fijo)}
                                          style={{
                                            color: turno.es_fijo ? '#0369a1' : '#64748b',
                                            background: turno.es_fijo ? '#e0f2fe' : '#f1f5f9',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            padding: '4px 8px',
                                            fontSize: '0.72rem',
                                            fontWeight: '600',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontFamily: 'inherit'
                                          }}
                                          title={turno.es_fijo ? 'Quitar condición de Turno Fijo' : 'Otorgar Turno Fijo semanal'}
                                        >
                                          <RefreshCw size={12} />
                                          {turno.es_fijo ? 'Quitar Fijo' : 'Hacer Fijo'}
                                        </button>
                                        {turno.estado !== 'confirmado' && (
                                          <button onClick={() => handleEstado(turno.id, turno.cliente_uid, 'confirmado')} style={{ color: 'var(--success)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Confirmar"><Check size={16} /></button>
                                        )}
                                        {turno.estado !== 'cancelado' && (
                                          <button onClick={() => handleEstado(turno.id, turno.cliente_uid, 'cancelado')} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Cancelar"><X size={16} /></button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── TURNOS FIJOS ────────────────────────────────────────── */}
          {activeTab === 'turnos-fijos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '4px' }}>Turnos Fijos (Recurrentes)</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{turnosFijos.length} {turnosFijos.length === 1 ? 'turno fijo activo' : 'turnos fijos activos'}</span>
                </div>
                <button
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowNuevoFijo(v => !v)}
                >
                  {showNuevoFijo ? <><X size={15} /> Cerrar formulario</> : <><Plus size={15} /> Otorgar Turno Fijo</>}
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                Estos turnos se reservan automáticamente todas las semanas en el mismo día y horario. Desde acá podés otorgar un nuevo turno fijo a un cliente, quitarle la recurrencia semanal o cancelarlo.
              </p>

              {/* Formulario para otorgar un nuevo Turno Fijo */}
              {showNuevoFijo && (
                <form
                  onSubmit={handleCrearTurnoFijo}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    marginBottom: '24px',
                    background: '#f8fafc',
                  }}
                >
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '14px', color: '#111' }}>
                    Otorgar Nuevo Turno Fijo Semanal
                  </h4>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setModoClienteFijo('registrado')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: modoClienteFijo === 'registrado' ? '1px solid #111' : '1px solid var(--border-color)',
                        background: modoClienteFijo === 'registrado' ? '#111' : '#fff',
                        color: modoClienteFijo === 'registrado' ? '#fff' : '#111',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      Cliente registrado
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoClienteFijo('manual')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: modoClienteFijo === 'manual' ? '1px solid #111' : '1px solid var(--border-color)',
                        background: modoClienteFijo === 'manual' ? '#111' : '#fff',
                        color: modoClienteFijo === 'manual' ? '#fff' : '#111',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      Ingresar nombre manual
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
                    {modoClienteFijo === 'registrado' ? (
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Cliente</label>
                        <select
                          className="input-field"
                          value={nuevoFijo.cliente_uid}
                          onChange={e => setNuevoFijo({ ...nuevoFijo, cliente_uid: e.target.value })}
                          required
                        >
                          <option value="">— Seleccionar cliente —</option>
                          {clientes.map(c => (
                            <option key={c.uid} value={c.uid}>
                              {c.name} ({c.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label">Nombre del cliente</label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Ej: Juan Pérez"
                            value={nuevoFijo.cliente_name}
                            onChange={e => setNuevoFijo({ ...nuevoFijo, cliente_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label className="input-label">Email (opcional)</label>
                          <input
                            type="email"
                            className="input-field"
                            placeholder="cliente@email.com"
                            value={nuevoFijo.cliente_email}
                            onChange={e => setNuevoFijo({ ...nuevoFijo, cliente_email: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Servicio</label>
                      <select
                        className="input-field"
                        value={nuevoFijo.servicio_id}
                        onChange={e => setNuevoFijo({ ...nuevoFijo, servicio_id: e.target.value })}
                      >
                        {servicios.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} (${s.precio?.toLocaleString('es-AR')} — {s.duracion} min)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">
                        Fecha de inicio
                        {nuevoFijo.fecha && (
                          <span style={{ marginLeft: '6px', color: '#0369a1', fontWeight: '700', fontSize: '0.78rem' }}>
                            (Cada {new Date(nuevoFijo.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long' })})
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        className="input-field"
                        min={getFechaLocalISO()}
                        value={nuevoFijo.fecha}
                        onChange={e => setNuevoFijo({ ...nuevoFijo, fecha: e.target.value })}
                        required
                      />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label">Horario fijo</label>
                      {(() => {
                        const slotsDia = generarHorariosDiaAdmin(nuevoFijo.fecha);
                        if (slotsDia.length > 0) {
                          return (
                            <select
                              className="input-field"
                              value={nuevoFijo.hora}
                              onChange={e => setNuevoFijo({ ...nuevoFijo, hora: e.target.value })}
                              required
                            >
                              {!slotsDia.includes(nuevoFijo.hora) && (
                                <option value={nuevoFijo.hora}>{nuevoFijo.hora}</option>
                              )}
                              {slotsDia.map(h => {
                                const ocupado = horasOcupadasFijo.includes(h);
                                return (
                                  <option key={h} value={h}>
                                    {h} hs {ocupado ? '(Ocupado en esa fecha)' : '(Libre)'}
                                  </option>
                                );
                              })}
                            </select>
                          );
                        }
                        return (
                          <input
                            type="time"
                            className="input-field"
                            value={nuevoFijo.hora}
                            onChange={e => setNuevoFijo({ ...nuevoFijo, hora: e.target.value })}
                            required
                          />
                        );
                      })()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={() => setShowNuevoFijo(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={creandoFijo}
                      style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                    >
                      {creandoFijo ? 'Guardando...' : 'Confirmar Turno Fijo'}
                    </button>
                  </div>
                </form>
              )}

              {loadingTurnos ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando turnos fijos...</p>
              ) : turnosFijos.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay turnos fijos registrados.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.82rem', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 0' }}>Día y Hora Semanal</th>
                        <th style={{ padding: '10px 0' }}>Cliente</th>
                        <th style={{ padding: '10px 0' }}>Servicio</th>
                        <th style={{ padding: '10px 0', textAlign: 'right' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turnosFijos.map(turno => {
                        const diaSemana = new Date(turno.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long' });
                        const diaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
                        return (
                          <tr key={turno.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '14px 0', fontWeight: '600' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1' }}>
                                <RefreshCw size={14} /> Todos los {diaCap} — {turno.hora.slice(0, 5)} hs
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '400' }}>
                                <Calendar size={13} /> Desde el {turno.fecha.split('-').reverse().join('/')}
                              </span>
                            </td>
                            <td style={{ padding: '14px 0', fontSize: '0.95rem', fontWeight: '500' }}>{turno.cliente_name}</td>
                            <td style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                              <div>{turno.servicio}</div>
                              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>
                                Duración: {turno.duracion ?? 45} min
                              </div>
                            </td>
                            <td style={{ padding: '14px 0', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleToggleFijo(turno.id, true)}
                                  style={{
                                    color: '#475569',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '5px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit'
                                  }}
                                  title="Quita la repetición semanal pero mantiene el turno único"
                                >
                                  Quitar Fijo
                                </button>
                                <button
                                  onClick={() => handleEstado(turno.id, turno.cliente_uid, 'cancelado')}
                                  style={{
                                    color: 'var(--danger)',
                                    background: '#fee2e2',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '5px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: '600',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit'
                                  }}
                                  title="Cancelar Turno Fijo Permanente"
                                >
                                  <X size={14} /> Cancelar Fijo
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.82rem', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 0' }}>Nombre</th>
                        <th style={{ padding: '10px 0' }}>Email</th>
                        <th style={{ padding: '10px 0' }}>Rol</th>
                        <th style={{ padding: '10px 0', textAlign: 'center' }}>Turno Fijo</th>
                        <th style={{ padding: '10px 0', textAlign: 'center' }}>Permisos (Horarios)</th>
                        <th style={{ padding: '10px 0', textAlign: 'right' }}>Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map((c, i) => {
                        const fijosDelCliente = turnosFijos.filter(tf => tf.cliente_uid === c.uid || (tf.cliente_email && tf.cliente_email === c.email));
                        return (
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
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                {fijosDelCliente.map(tf => {
                                  const diaCorto = new Date(tf.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' });
                                  return (
                                    <span
                                      key={tf.id}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: '#e0f2fe',
                                        color: '#0369a1',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600'
                                      }}
                                    >
                                      {diaCorto.toUpperCase()} {tf.hora.slice(0, 5)}
                                      <button
                                        onClick={() => handleEstado(tf.id, tf.cliente_uid, 'cancelado')}
                                        style={{
                                          border: 'none',
                                          background: 'none',
                                          color: '#dc2626',
                                          cursor: 'pointer',
                                          padding: 0,
                                          display: 'inline-flex',
                                          alignItems: 'center'
                                        }}
                                        title="Cancelar este Turno Fijo"
                                      >
                                        <X size={13} />
                                      </button>
                                    </span>
                                  );
                                })}
                                <button
                                  onClick={() => abrirOtorgarFijoParaCliente(c)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.76rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    border: '1px solid var(--border-color)',
                                    background: '#fff',
                                    color: '#111',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontFamily: 'inherit'
                                  }}
                                >
                                  <Plus size={12} /> Otorgar Fijo
                                </button>
                              </div>
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
                        );
                      })}
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
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Gestión de Productos</h3>
                <button className="btn-outline" onClick={handleAddProducto} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>+ Agregar Producto</button>
              </div>
              <div className="grid grid-cols-2">
                {products.map((p) => (
                  <div key={p.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                    <div className="input-group">
                      <label className="input-label">Nombre</label>
                      <input type="text" className="input-field" defaultValue={p.name} onBlur={(e) => handleUpdateProducto(p.id, 'name', e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Descripción</label>
                      <textarea className="input-field" defaultValue={p.descripcion} rows="2" onBlur={(e) => handleUpdateProducto(p.id, 'descripcion', e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Categoría</label>
                      <select className="input-field" defaultValue={p.categoria || 'Hombre'} onChange={(e) => handleUpdateProducto(p.id, 'categoria', e.target.value)}>
                        <option value="Hombre">Hombre</option>
                        <option value="Mujer">Mujer</option>
                        <option value="Unisex">Unisex</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Precio ($)</label>
                      <input type="number" className="input-field" defaultValue={p.precio} onBlur={(e) => handleUpdateProducto(p.id, 'precio', e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Imagen</label>
                      {p.imagen_url && (
                        <div style={{ marginBottom: '8px' }}>
                          <img src={p.imagen_url} alt="Producto" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="input-field" 
                        style={{ padding: '6px' }}
                        onChange={(e) => handleUploadImage(p.id, e.target.files[0])} 
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => handleDelProducto(p.id)} className="btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '6px 12px', fontSize: '0.8rem' }}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SERVICIOS ────────────────────────────────────────────── */}
          {activeTab === 'servicios' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Servicios y Precios</h3>
                <button className="btn-outline" onClick={handleAddServicio} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>+ Agregar</button>
              </div>
              <div className="grid grid-cols-2">
                {servicios.map((s) => (
                  <div key={s.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                    <div className="input-group">
                      <label className="input-label">Nombre</label>
                      <input type="text" className="input-field" defaultValue={s.name} onBlur={(e) => handleUpdateServicio(s.id, 'name', e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Descripción</label>
                      <textarea className="input-field" defaultValue={s.descripcion} rows="2" onBlur={(e) => handleUpdateServicio(s.id, 'descripcion', e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div className="input-group" style={{ flex: 1 }}>
                        <label className="input-label">Precio ($)</label>
                        <input type="number" className="input-field" defaultValue={s.precio} onBlur={(e) => handleUpdateServicio(s.id, 'precio', e.target.value)} />
                      </div>
                      <div className="input-group" style={{ flex: 1 }}>
                        <label className="input-label">Duración (min)</label>
                        <input type="number" className="input-field" defaultValue={s.duracion} onBlur={(e) => handleUpdateServicio(s.id, 'duracion', e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => handleDelServicio(s.id)} className="btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '6px 12px', fontSize: '0.8rem' }}>Eliminar</button>
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
                <label className="input-label" style={{ marginBottom: '14px', display: 'block', fontWeight: '600' }}>Horarios por Día de Atención</label>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => {
                    const dayData = configState.dias?.[d] || { activo: false, apertura: '10:00', cierre: '18:00' };
                    return (
                      <div key={d} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        background: dayData.activo ? '#fff' : '#f9f9f9',
                        transition: 'all 0.15s ease',
                        opacity: dayData.activo ? 1 : 0.7,
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        {/* Checkbox + Day Label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={dayData.activo}
                            onChange={e => {
                              const newDias = { ...configState.dias };
                              newDias[d] = { ...dayData, activo: e.target.checked };
                              setConfigState({ ...configState, dias: newDias });
                            }}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#111' }}
                          />
                          <span style={{ fontWeight: '600', fontSize: '0.95rem', minWidth: '36px' }}>{d}</span>
                        </div>

                        {/* Time pickers (only relevant if active) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="time"
                            disabled={!dayData.activo}
                            value={dayData.apertura}
                            onChange={e => {
                              const newDias = { ...configState.dias };
                              newDias[d] = { ...dayData, apertura: e.target.value };
                              setConfigState({ ...configState, dias: newDias });
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              fontSize: '0.85rem',
                              fontFamily: 'inherit',
                              background: dayData.activo ? '#fff' : '#eee',
                              cursor: dayData.activo ? 'pointer' : 'not-allowed'
                            }}
                          />
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>a</span>
                          <input
                            type="time"
                            disabled={!dayData.activo}
                            value={dayData.cierre}
                            onChange={e => {
                              const newDias = { ...configState.dias };
                              newDias[d] = { ...dayData, cierre: e.target.value };
                              setConfigState({ ...configState, dias: newDias });
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              fontSize: '0.85rem',
                              fontFamily: 'inherit',
                              background: dayData.activo ? '#fff' : '#eee',
                              cursor: dayData.activo ? 'pointer' : 'not-allowed'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Intervalos Bloqueados */}
              <div className="input-group" style={{ marginTop: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <label className="input-label" style={{ margin: 0, fontWeight: '600', fontSize: '1rem' }}>Descansos / Intervalos Bloqueados</label>
                  <button
                    type="button"
                    onClick={() => {
                      const currentBloqueos = configState.bloqueos || [];
                      setConfigState({
                        ...configState,
                        bloqueos: [...currentBloqueos, { dia: 'Lun', inicio: '13:00', fin: '15:00' }]
                      });
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
                    + Agregar Descanso
                  </button>
                </div>
                
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '-8px', marginBottom: '16px' }}>
                  Ingresá los lapsos en los que no podés atender (por ejemplo, siesta o almuerzo) para que el turnero inhabilite automáticamente los turnos de esos horarios.
                </p>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {(!configState.bloqueos || configState.bloqueos.length === 0) && (
                    <div style={{
                      padding: '16px',
                      border: '1px dashed var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      background: '#fafafa'
                    }}>
                      No tenés descansos programados. Estás disponible de corrido durante las horas de atención.
                    </div>
                  )}

                  {configState.bloqueos && configState.bloqueos.map((bloqueo, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: '#fff',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.88rem', fontWeight: '500', color: 'var(--text-muted)' }}>Día:</span>
                        <select
                          value={bloqueo.dia}
                          onChange={e => {
                            const newBloqueos = [...configState.bloqueos];
                            newBloqueos[idx] = { ...bloqueo, dia: e.target.value };
                            setConfigState({ ...configState, bloqueos: newBloqueos });
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>De:</span>
                        <input
                          type="time"
                          value={bloqueo.inicio}
                          onChange={e => {
                            const newBloqueos = [...configState.bloqueos];
                            newBloqueos[idx] = { ...bloqueo, inicio: e.target.value };
                            setConfigState({ ...configState, bloqueos: newBloqueos });
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
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>a:</span>
                        <input
                          type="time"
                          value={bloqueo.fin}
                          onChange={e => {
                            const newBloqueos = [...configState.bloqueos];
                            newBloqueos[idx] = { ...bloqueo, fin: e.target.value };
                            setConfigState({ ...configState, bloqueos: newBloqueos });
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
                        <button
                          type="button"
                          onClick={() => {
                            const newBloqueos = configState.bloqueos.filter((_, i) => i !== idx);
                            setConfigState({ ...configState, bloqueos: newBloqueos });
                          }}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            marginLeft: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fce8e6'; e.currentTarget.style.color = 'var(--danger)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
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
  return getFechaLocalISO(d);
}

function formatFechaCabecera(fechaStr) {
  const hoyStr = getFechaLocalISO();
  
  const mananaDate = new Date();
  mananaDate.setDate(mananaDate.getDate() + 1);
  const mananaStr = getFechaLocalISO(mananaDate);
  
  const dateObj = new Date(fechaStr + 'T12:00:00');
  const formattedDate = dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const capitalized = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  
  if (fechaStr === hoyStr) {
    return `Hoy — ${capitalized}`;
  } else if (fechaStr === mananaStr) {
    return `Mañana — ${capitalized}`;
  }
  
  return capitalized;
}
