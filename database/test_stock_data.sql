-- =====================================================
-- XENTRA - Datos de prueba para stock_actual
-- =====================================================

-- Insertar algunos datos de prueba si no existen datos de empresas, ubicaciones, productos, variantes
-- Nota: Este script debe ejecutarse después de tener datos básicos configurados

-- Ejemplo de INSERT para stock_actual (ajustar IDs según tu base de datos)
INSERT INTO public.stock_actual (empresa_id, variante_id, ubicacion_id, cantidad_actual, costo_promedio)
VALUES 
  -- Necesitarás reemplazar estos UUIDs con los reales de tu base de datos
  ('70330390-9e39-4662-8f9e-97e1a2e16342', 'uuid-variante-1', 'uuid-ubicacion-1', 50, 15.50),
  ('70330390-9e39-4662-8f9e-97e1a2e16342', 'uuid-variante-2', 'uuid-ubicacion-1', 25, 32.00),
  ('70330390-9e39-4662-8f9e-97e1a2e16342', 'uuid-variante-3', 'uuid-ubicacion-2', 0, 45.75)
ON CONFLICT (empresa_id, variante_id, ubicacion_id) 
DO UPDATE SET 
  cantidad_actual = EXCLUDED.cantidad_actual,
  costo_promedio = EXCLUDED.costo_promedio,
  fecha_ultima_actualizacion = NOW();