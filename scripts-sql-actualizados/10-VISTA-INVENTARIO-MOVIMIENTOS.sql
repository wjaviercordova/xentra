-- =====================================================
-- XENTRA - Vista para el Formulario de Movimientos Mejorado
-- =====================================================

-- Vista optimizada que integra toda la información de inventario necesaria
-- para el formulario de movimientos con mejor rendimiento

CREATE OR REPLACE VIEW vista_inventario_completo AS
WITH stock_resumen AS (
  SELECT 
    sa.variante_id,
    sa.cantidad_actual,
    sa.costo_promedio,
    sa.fecha_ultima_actualizacion,
    u.nombre as nombre_ubicacion,
    sa.empresa_id
  FROM stock_actual sa
  LEFT JOIN ubicaciones u ON sa.ubicacion_id = u.id
),
variantes_info AS (
  SELECT 
    v.id as variante_id,
    v.sku,
    v.nombre as nombre_variante,
    v.barcode,
    v.ean,
    v.peso,
    v.imagen_url,
    v.precio_venta,
    v.stock_minimo,
    v.stock_maximo,
    v.atributos_dinamicos,
    p.nombre as nombre_producto,
    c.nombre as nombre_categoria,
    v.empresa_id
  FROM variantes v
  LEFT JOIN productos p ON v.producto_id = p.id
  LEFT JOIN categorias c ON p.categoria_id = c.id
  WHERE v.activo = true
)
SELECT 
  vi.variante_id,
  vi.sku,
  vi.nombre_variante,
  vi.nombre_producto,
  vi.nombre_categoria,
  vi.barcode,
  vi.ean,
  vi.peso,
  vi.imagen_url,
  vi.precio_venta,
  vi.stock_minimo,
  vi.stock_maximo,
  vi.atributos_dinamicos,
  COALESCE(sr.cantidad_actual, 0) as cantidad_actual,
  COALESCE(sr.costo_promedio, 0) as costo_promedio,
  COALESCE(sr.nombre_ubicacion, 'Sin ubicación') as nombre_ubicacion,
  sr.fecha_ultima_actualizacion,
  vi.empresa_id
FROM variantes_info vi
LEFT JOIN stock_resumen sr ON vi.variante_id = sr.variante_id 
  AND vi.empresa_id = sr.empresa_id
WHERE vi.empresa_id IS NOT NULL;

-- Índices para optimizar el rendimiento
CREATE INDEX IF NOT EXISTS idx_vista_inventario_empresa 
ON stock_actual (empresa_id);

CREATE INDEX IF NOT EXISTS idx_vista_inventario_cantidad 
ON stock_actual (cantidad_actual) 
WHERE cantidad_actual > 0;

-- Comentarios para documentar la vista
COMMENT ON VIEW vista_inventario_completo IS 
'Vista optimizada que combina información de variantes, productos, categorías y stock actual para el formulario de movimientos. Incluye solo productos activos con información completa de inventario.';

-- Confirmar la creación de la vista
SELECT 'Vista vista_inventario_completo creada exitosamente ✅' as resultado;