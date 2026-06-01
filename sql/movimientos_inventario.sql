-- =====================================================
-- XENTRA - Función para movimientos de inventario
-- =====================================================

-- Función para realizar movimientos de inventario
CREATE OR REPLACE FUNCTION realizar_movimiento_inventario(
  p_inventario_id UUID,
  p_tipo TEXT,
  p_cantidad INTEGER,
  p_motivo TEXT,
  p_ubicacion_destino UUID DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inventario RECORD;
  v_nuevo_stock INTEGER;
  v_movimiento_id UUID;
  v_resultado JSON;
BEGIN
  -- Obtener información del inventario actual
  SELECT * INTO v_inventario
  FROM inventario
  WHERE id = p_inventario_id;

  IF NOT FOUND THEN
    RETURN '{"error": "Inventario no encontrado"}'::JSON;
  END IF;

  -- Calcular nuevo stock según el tipo de movimiento
  CASE p_tipo
    WHEN 'entrada' THEN
      v_nuevo_stock := v_inventario.stock_actual + p_cantidad;
    WHEN 'salida' THEN
      v_nuevo_stock := v_inventario.stock_actual - p_cantidad;
      -- Verificar que no quede en negativo
      IF v_nuevo_stock < 0 THEN
        RETURN '{"error": "Stock insuficiente"}'::JSON;
      END IF;
    WHEN 'ajuste' THEN
      v_nuevo_stock := p_cantidad; -- Ajuste absoluto
    ELSE
      RETURN '{"error": "Tipo de movimiento no válido"}'::JSON;
  END CASE;

  -- Actualizar el stock en inventario
  UPDATE inventario 
  SET 
    stock_actual = v_nuevo_stock,
    ultimo_movimiento = NOW()
  WHERE id = p_inventario_id;

  -- Registrar el movimiento en historial
  INSERT INTO movimientos_inventario (
    inventario_id,
    tipo,
    cantidad_anterior,
    cantidad_movimiento,
    cantidad_nueva,
    motivo,
    usuario_id,
    created_at
  ) VALUES (
    p_inventario_id,
    p_tipo,
    v_inventario.stock_actual,
    p_cantidad,
    v_nuevo_stock,
    p_motivo,
    COALESCE(p_usuario_id, auth.uid()),
    NOW()
  ) RETURNING id INTO v_movimiento_id;

  -- Retornar resultado exitoso
  v_resultado := json_build_object(
    'success', true,
    'movimiento_id', v_movimiento_id,
    'stock_anterior', v_inventario.stock_actual,
    'stock_nuevo', v_nuevo_stock,
    'diferencia', (v_nuevo_stock - v_inventario.stock_actual)
  );

  RETURN v_resultado;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', 'Error interno: ' || SQLERRM
    );
END;
$$;

-- Crear tabla de movimientos de inventario si no existe
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID REFERENCES inventario(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'transferencia')),
  cantidad_anterior INTEGER NOT NULL,
  cantidad_movimiento INTEGER NOT NULL,
  cantidad_nueva INTEGER NOT NULL,
  motivo TEXT,
  ubicacion_destino UUID REFERENCES ubicaciones(id),
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Auditoría
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_fecha ON movimientos_inventario(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_tipo ON movimientos_inventario(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_empresa ON movimientos_inventario(empresa_id);

-- RLS para movimientos
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios solo ven movimientos de su empresa" ON movimientos_inventario
  FOR ALL USING (
    empresa_id IN (
      SELECT empresa_id FROM perfiles WHERE user_id = auth.uid()
    )
  );

-- Función para obtener historial de movimientos
CREATE OR REPLACE FUNCTION obtener_historial_inventario(
  p_inventario_id UUID,
  p_limite INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  tipo TEXT,
  cantidad_anterior INTEGER,
  cantidad_movimiento INTEGER,
  cantidad_nueva INTEGER,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  usuario_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.tipo,
    m.cantidad_anterior,
    m.cantidad_movimiento,
    m.cantidad_nueva,
    m.motivo,
    m.created_at,
    COALESCE(u.email, 'Sistema') as usuario_email
  FROM movimientos_inventario m
  LEFT JOIN auth.users u ON m.usuario_id = u.id
  WHERE m.inventario_id = p_inventario_id
  ORDER BY m.created_at DESC
  LIMIT p_limite;
END;
$$;