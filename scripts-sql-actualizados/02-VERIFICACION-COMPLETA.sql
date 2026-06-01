-- =====================================================
-- XENTRA - Script de Verificación Completa
-- Ejecutar para verificar que todo funcione correctamente
-- =====================================================

-- 1. VERIFICAR ESTRUCTURA DE TABLAS
SELECT 
    'TABLAS PRINCIPALES' as verificacion,
    COUNT(*) as encontradas,
    6 as esperadas
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('empresas', 'ubicaciones', 'productos', 'variantes', 'stock_actual', 'movimientos_detalle');

-- 2. VERIFICAR FUNCIONES CREADAS
SELECT 
    'FUNCIONES DE MOVIMIENTOS' as verificacion,
    COUNT(*) as encontradas,
    'Variable' as esperadas
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%movimientos%';

-- 3. VERIFICAR TRIGGERS
SELECT 
    'TRIGGERS DE MOVIMIENTOS' as verificacion,
    COUNT(*) as encontradas,
    'Variable' as esperadas
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%movimientos%';

-- 4. VERIFICAR DATOS DE PRUEBA
SELECT 
    'EMPRESA DE PRUEBA' as verificacion,
    COUNT(*) as encontradas,
    1 as esperadas
FROM public.empresas 
WHERE id = '70330390-9e39-4662-8f9e-97e1a2e16342';

-- 5. VERIFICAR STOCK DISPONIBLE
SELECT 
    'REGISTROS DE STOCK' as verificacion,
    COUNT(*) as encontradas,
    '10+' as esperadas
FROM public.stock_actual 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342';

-- =====================================================
-- PRUEBA DE CONSULTA DE STOCKS (Como hace la aplicación)
-- =====================================================

SELECT 
    sa.id,
    sa.empresa_id,
    sa.variante_id,
    sa.ubicacion_id,
    sa.cantidad_actual,
    sa.costo_promedio,
    sa.fecha_ultima_actualizacion,
    
    -- Información de variante
    v.sku,
    v.nombre as variante_nombre,
    
    -- Información de producto
    p.nombre as producto_nombre,
    p.codigo as producto_codigo,
    
    -- Información de ubicación
    u.nombre as ubicacion_nombre,
    u.tipo as ubicacion_tipo
    
FROM public.stock_actual sa
JOIN public.variantes v ON sa.variante_id = v.id
JOIN public.productos p ON v.producto_id = p.id
JOIN public.ubicaciones u ON sa.ubicacion_id = u.id
WHERE sa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
ORDER BY sa.fecha_ultima_actualizacion DESC
LIMIT 5;

-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
/*
Si todo está correcto, deberías ver:
- 6 tablas principales encontradas
- Al menos 1 función de movimientos
- Al menos 1 trigger de movimientos  
- 1 empresa de prueba
- 10+ registros de stock
- 5 registros de stock con toda la información relacionada

Si no ves estos resultados:
1. Ejecutar schema.sql
2. Ejecutar movimientos_triggers.sql
3. Ejecutar 01-DATOS-PRUEBA-COMPLETOS.sql
*/