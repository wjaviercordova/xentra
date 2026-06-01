-- =====================================================
-- XENTRA - Sistema completo de Movimientos de Inventario
-- =====================================================

-- Actualizar la tabla de movimientos para incluir todos los motivos
DROP TABLE IF EXISTS movimientos_inventario CASCADE;

CREATE TABLE movimientos_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID REFERENCES inventario(id) ON DELETE CASCADE,
  
  -- Tipo de movimiento principal
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'transferencia')),
  
  -- Motivo específico del movimiento
  motivo TEXT NOT NULL CHECK (motivo IN (
    'inventario_inicial',
    'compra',
    'venta', 
    'ajuste_positivo',
    'ajuste_negativo',
    'devolucion_cliente',
    'devolucion_proveedor',
    'merma',
    'transferencia_entrada',
    'transferencia_salida',
    'produccion',
    'consumo_produccion'
  )),
  
  -- Cantidades del movimiento
  cantidad_anterior INTEGER NOT NULL,
  cantidad_movimiento INTEGER NOT NULL,
  cantidad_nueva INTEGER NOT NULL,
  
  -- Costos (para valorización del inventario)
  costo_unitario DECIMAL(10,2),
  valor_total DECIMAL(12,2),
  
  -- Referencias adicionales
  documento_referencia TEXT, -- Número de factura, orden de compra, etc.
  ubicacion_origen UUID REFERENCES ubicaciones(id),
  ubicacion_destino UUID REFERENCES ubicaciones(id),
  
  -- Relaciones con otros módulos
  venta_id UUID, -- Referencia a la venta que causó el movimiento
  compra_id UUID, -- Referencia a la compra que causó el movimiento
  
  -- Observaciones
  observaciones TEXT,
  
  -- Auditoría
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE
);

-- Índices optimizados
CREATE INDEX idx_movimientos_inventario_fecha ON movimientos_inventario(created_at DESC);
CREATE INDEX idx_movimientos_inventario_tipo ON movimientos_inventario(tipo);
CREATE INDEX idx_movimientos_inventario_motivo ON movimientos_inventario(motivo);
CREATE INDEX idx_movimientos_inventario_empresa ON movimientos_inventario(empresa_id);
CREATE INDEX idx_movimientos_inventario_inventario ON movimientos_inventario(inventario_id);
CREATE INDEX idx_movimientos_inventario_documento ON movimientos_inventario(documento_referencia);

-- RLS para movimientos
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios solo ven movimientos de su empresa" ON movimientos_inventario
  FOR ALL USING (
    empresa_id IN (
      SELECT empresa_id FROM perfiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- Función actualizada para movimientos completos
-- =====================================================

CREATE OR REPLACE FUNCTION realizar_movimiento_inventario_completo(
  p_inventario_id UUID,
  p_tipo TEXT,
  p_motivo TEXT,
  p_cantidad INTEGER,
  p_costo_unitario DECIMAL DEFAULT NULL,
  p_documento_referencia TEXT DEFAULT NULL,
  p_ubicacion_origen UUID DEFAULT NULL,
  p_ubicacion_destino UUID DEFAULT NULL,
  p_venta_id UUID DEFAULT NULL,
  p_compra_id UUID DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL,
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
  v_valor_total DECIMAL;
  v_empresa_id UUID;
  v_resultado JSON;
BEGIN
  -- Obtener información del inventario actual
  SELECT i.*, i.empresa_id INTO v_inventario
  FROM inventario i
  WHERE i.id = p_inventario_id;

  IF NOT FOUND THEN
    RETURN '{"error": "Inventario no encontrado"}'::JSON;
  END IF;

  v_empresa_id := v_inventario.empresa_id;

  -- Validar tipo y motivo
  IF NOT (p_tipo IN ('entrada', 'salida', 'ajuste', 'transferencia')) THEN
    RETURN '{"error": "Tipo de movimiento no válido"}'::JSON;
  END IF;

  -- Calcular nuevo stock según el tipo de movimiento
  CASE p_tipo
    WHEN 'entrada' THEN
      v_nuevo_stock := v_inventario.stock_actual + p_cantidad;
    WHEN 'salida' THEN
      v_nuevo_stock := v_inventario.stock_actual - p_cantidad;
      -- Verificar que no quede en negativo
      IF v_nuevo_stock < 0 THEN
        RETURN json_build_object(
          'error', 'Stock insuficiente',
          'stock_actual', v_inventario.stock_actual,
          'cantidad_solicitada', p_cantidad
        );
      END IF;
    WHEN 'ajuste' THEN
      v_nuevo_stock := p_cantidad; -- Ajuste absoluto
    WHEN 'transferencia' THEN
      v_nuevo_stock := v_inventario.stock_actual - p_cantidad;
      IF v_nuevo_stock < 0 THEN
        RETURN '{"error": "Stock insuficiente para transferencia"}'::JSON;
      END IF;
    ELSE
      RETURN '{"error": "Tipo de movimiento no válido"}'::JSON;
  END CASE;

  -- Calcular valor total del movimiento
  v_valor_total := COALESCE(p_costo_unitario, v_inventario.costo_promedio) * p_cantidad;

  -- Actualizar el stock en inventario
  UPDATE inventario 
  SET 
    stock_actual = v_nuevo_stock,
    ultimo_movimiento = NOW(),
    -- Actualizar costo promedio si es una entrada con costo
    costo_promedio = CASE 
      WHEN p_tipo = 'entrada' AND p_costo_unitario IS NOT NULL THEN
        -- Costo promedio ponderado
        CASE 
          WHEN stock_actual = 0 THEN p_costo_unitario
          ELSE ((stock_actual * costo_promedio) + (p_cantidad * p_costo_unitario)) / (stock_actual + p_cantidad)
        END
      ELSE costo_promedio
    END
  WHERE id = p_inventario_id;

  -- Registrar el movimiento en historial
  INSERT INTO movimientos_inventario (
    inventario_id,
    tipo,
    motivo,
    cantidad_anterior,
    cantidad_movimiento,
    cantidad_nueva,
    costo_unitario,
    valor_total,
    documento_referencia,
    ubicacion_origen,
    ubicacion_destino,
    venta_id,
    compra_id,
    observaciones,
    usuario_id,
    empresa_id,
    created_at
  ) VALUES (
    p_inventario_id,
    p_tipo,
    p_motivo,
    v_inventario.stock_actual,
    p_cantidad,
    v_nuevo_stock,
    COALESCE(p_costo_unitario, v_inventario.costo_promedio),
    v_valor_total,
    p_documento_referencia,
    p_ubicacion_origen,
    p_ubicacion_destino,
    p_venta_id,
    p_compra_id,
    p_observaciones,
    COALESCE(p_usuario_id, auth.uid()),
    v_empresa_id,
    NOW()
  ) RETURNING id INTO v_movimiento_id;

  -- Retornar resultado exitoso
  v_resultado := json_build_object(
    'success', true,
    'movimiento_id', v_movimiento_id,
    'stock_anterior', v_inventario.stock_actual,
    'stock_nuevo', v_nuevo_stock,
    'diferencia', (v_nuevo_stock - v_inventario.stock_actual),
    'valor_movimiento', v_valor_total
  );

  RETURN v_resultado;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', 'Error interno: ' || SQLERRM
    );
END;
$$;

-- =====================================================
-- Función para obtener Movimientos completos
-- =====================================================

CREATE OR REPLACE FUNCTION obtener_movimientos_producto(
  p_inventario_id UUID,
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL,
  p_limite INTEGER DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  fecha TIMESTAMP WITH TIME ZONE,
  tipo TEXT,
  motivo TEXT,
  documento TEXT,
  cantidad_anterior INTEGER,
  entradas INTEGER,
  salidas INTEGER,
  cantidad_nueva INTEGER,
  costo_unitario DECIMAL,
  valor_total DECIMAL,
  observaciones TEXT,
  usuario_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.created_at,
    m.tipo,
    m.motivo,
    m.documento_referencia,
    m.cantidad_anterior,
    CASE WHEN m.tipo IN ('entrada', 'ajuste') AND m.cantidad_nueva > m.cantidad_anterior 
         THEN m.cantidad_movimiento ELSE 0 END as entradas,
    CASE WHEN m.tipo IN ('salida', 'ajuste') AND m.cantidad_nueva < m.cantidad_anterior 
         THEN m.cantidad_movimiento ELSE 0 END as salidas,
    m.cantidad_nueva,
    m.costo_unitario,
    m.valor_total,
    m.observaciones,
    COALESCE(u.email, 'Sistema') as usuario_email
  FROM movimientos_inventario m
  LEFT JOIN auth.users u ON m.usuario_id = u.id
  WHERE m.inventario_id = p_inventario_id
    AND (p_fecha_inicio IS NULL OR DATE(m.created_at) >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR DATE(m.created_at) <= p_fecha_fin)
  ORDER BY m.created_at DESC
  LIMIT p_limite;
END;
$$;

-- =====================================================
-- Función para resumen de movimientos por motivo
-- =====================================================

CREATE OR REPLACE FUNCTION resumen_movimientos_por_motivo(
  p_empresa_id UUID,
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL
)
RETURNS TABLE(
  motivo TEXT,
  total_entradas INTEGER,
  total_salidas INTEGER,
  valor_entradas DECIMAL,
  valor_salidas DECIMAL,
  cantidad_movimientos BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.motivo,
    COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.cantidad_movimiento ELSE 0 END), 0)::INTEGER as total_entradas,
    COALESCE(SUM(CASE WHEN m.tipo = 'salida' THEN m.cantidad_movimiento ELSE 0 END), 0)::INTEGER as total_salidas,
    COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.valor_total ELSE 0 END), 0) as valor_entradas,
    COALESCE(SUM(CASE WHEN m.tipo = 'salida' THEN m.valor_total ELSE 0 END), 0) as valor_salidas,
    COUNT(*) as cantidad_movimientos
  FROM movimientos_inventario m
  WHERE m.empresa_id = p_empresa_id
    AND (p_fecha_inicio IS NULL OR DATE(m.created_at) >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR DATE(m.created_at) <= p_fecha_fin)
  GROUP BY m.motivo
  ORDER BY cantidad_movimientos DESC;
END;
$$;