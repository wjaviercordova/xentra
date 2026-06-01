-- =====================================================
-- XENTRA - Verificación y Corrección para Movimientos
-- =====================================================
-- Ejecutar en el Editor SQL de Supabase

-- 1. Verificar tablas existentes para movimientos
SELECT 
    'Tablas relacionadas con movimientos:' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%movimiento%'
ORDER BY table_name;

-- 2. Verificar estructura de motivos_movimiento
SELECT 
    'Estructura de motivos_movimiento:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'motivos_movimiento' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar datos de motivos existentes
SELECT 
    'Motivos disponibles:' as info,
    id,
    nombre,
    codigo,
    activo,
    empresa_id
FROM public.motivos_movimiento 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND activo = true
ORDER BY nombre
LIMIT 10;

-- 4. Verificar estructura de movimientos_cabecera
SELECT 
    'Estructura de movimientos_cabecera:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'movimientos_cabecera' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificar estructura de movimientos_detalle
SELECT 
    'Estructura de movimientos_detalle:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'movimientos_detalle' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Mensaje de confirmación
SELECT 'Verificación de tablas de movimientos completada ✅' as resultado;