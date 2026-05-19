-- ═══════════════════════════════════════════════════════════════════
-- SCHEMA — Nahuel Bersano Turnero
-- Pegar en: Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════

-- ── Tabla: clientes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  uid       TEXT PRIMARY KEY,            -- Firebase UID
  email     TEXT UNIQUE NOT NULL,
  name      TEXT,
  avatar    TEXT,
  role      TEXT DEFAULT 'client',       -- 'client' | 'admin'
  permiso_horarios BOOLEAN DEFAULT FALSE, -- Si tiene permiso para cambiar horarios y duraciones
  puntos    INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: turnos ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turnos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_uid   TEXT REFERENCES clientes(uid) ON DELETE SET NULL,
  cliente_email TEXT NOT NULL,
  cliente_name  TEXT NOT NULL,
  servicio      TEXT NOT NULL,
  fecha         DATE NOT NULL,
  hora          TIME NOT NULL,
  precio        INTEGER NOT NULL,
  es_fijo       BOOLEAN DEFAULT FALSE,     -- Si es un turno fijo / recurrente semanal
  duracion      INTEGER DEFAULT 45,        -- Duración en minutos (cambiable)
  estado        TEXT DEFAULT 'pendiente', -- 'pendiente' | 'confirmado' | 'cancelado'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: productos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  descripcion TEXT,
  precio      INTEGER,
  imagen_url  TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: servicios ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servicios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  descripcion TEXT,
  precio      INTEGER NOT NULL,
  duracion    INTEGER DEFAULT 45,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: promociones_puntos ─────────────────────────────────────────
-- (para el futuro sistema de canjes)
CREATE TABLE IF NOT EXISTS promociones_puntos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  puntos_requeridos INTEGER NOT NULL,
  activa          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: configuraciones ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuraciones (
  clave       TEXT PRIMARY KEY,
  valor       JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Configuración por defecto para horarios de turnos
INSERT INTO configuraciones (clave, valor) VALUES
  ('horarios', '{"apertura": "10:00", "cierre": "18:00", "duracion": 45, "dias": ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]}'::jsonb)
ON CONFLICT (clave) DO NOTHING;

-- ── Función: sumar_puntos ─────────────────────────────────────────────
-- Llamada con supabase.rpc('sumar_puntos', { p_uid, p_puntos })
CREATE OR REPLACE FUNCTION sumar_puntos(p_uid TEXT, p_puntos INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE clientes
  SET puntos = puntos + p_puntos
  WHERE uid = p_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Índices de rendimiento ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_turnos_fecha    ON turnos(fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_cliente  ON turnos(cliente_uid);
CREATE INDEX IF NOT EXISTS idx_turnos_estado   ON turnos(estado);

-- ── Row Level Security (RLS) ─────────────────────────────────────────
-- Para permitir que el admin edite y vea todo sin problemas, desactivamos RLS.
-- (Si en el futuro se requiere mayor seguridad, se pueden volver a activar y crear políticas detalladas)
ALTER TABLE turnos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicios DISABLE ROW LEVEL SECURITY;
ALTER TABLE configuraciones DISABLE ROW LEVEL SECURITY;

-- Datos de ejemplo (opcional)
INSERT INTO productos (name, descripcion, precio) VALUES
  ('Cera Mate Premium', 'Fijación fuerte, sin brillo. Ideal para cortes modernos.', 8500),
  ('Aceite para Barba', 'Hidratación profunda con aroma neutro.', 6000)
ON CONFLICT DO NOTHING;

INSERT INTO servicios (name, descripcion, precio, duracion) VALUES
  ('Corte Clásico', 'Corte de pelo a tijera o máquina con lavado incluido.', 8000, 45),
  ('Corte y Barba', 'Servicio completo de corte de pelo y perfilado de barba.', 12000, 60),
  ('Perfilado de Barba', 'Arreglo, rebaje y perfilado de barba con navaja.', 5000, 30)
ON CONFLICT DO NOTHING;
