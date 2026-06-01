-- =====================================================
-- XENTRA - Verificación Detallada de Políticas RLS y Estructuras
-- =====================================================

-- 1. Verificar políticas RLS en movimientos_cabecera
SELECT 
    'Políticas RLS movimientos_cabecera:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'movimientos_cabecera';

-- 2. Verificar políticas RLS en movimientos_detalle
SELECT 
    'Políticas RLS movimientos_detalle:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'movimientos_detalle';

-- 3. Verificar columnas exactas de movimientos_cabecera
SELECT 
    'Columnas movimientos_cabecera:' as info,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'movimientos_cabecera' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar columnas exactas de movimientos_detalle  
SELECT 
    'Columnas movimientos_detalle:' as info,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'movimientos_detalle' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificar si existe tabla ubicaciones
SELECT 
    'Tabla ubicaciones existe:' as info,
    COUNT(*) as existe
FROM information_schema.tables 
WHERE table_name = 'ubicaciones' 
  AND table_schema = 'public';

-- 6. Si existe ubicaciones, mostrar datos
SELECT 
    'Ubicaciones disponibles:' as info,
    id,
    nombre,
    activo,
    empresa_id
FROM public.ubicaciones 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND activo = true
ORDER BY nombre
LIMIT 10;

-- 7. Verificar si stock_actual tiene ubicacion_id
SELECT 
    'Columnas stock_actual:' as info,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'stock_actual' 
  AND table_schema = 'public'
  AND column_name LIKE '%ubicacion%'
ORDER BY ordinal_position;

-- 8. Mensaje de confirmación
SELECT 'Verificación completa terminada ✅' as resultado;