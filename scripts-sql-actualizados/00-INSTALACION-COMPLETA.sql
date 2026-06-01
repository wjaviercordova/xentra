-- =====================================================
-- XENTRA - Script de Instalación Completo
-- EJECUTAR EN ORDEN EN SUPABASE SQL EDITOR
-- =====================================================

-- PASO 1: Crear estructura base (tablas, RLS, políticas)
-- Copiar y ejecutar todo el contenido de: schema.sql

-- PASO 2: Crear funciones y triggers de movimientos
-- Copiar y ejecutar todo el contenido de: movimientos_triggers.sql

-- PASO 3: Crear función para consulta de movimientos (OPCIONAL)
-- Copiar y ejecutar todo el contenido de: movimientos_completo.sql

-- =====================================================
-- DATOS DE PRUEBA BÁSICOS (EJECUTAR PASO 4 DESPUÉS)
-- =====================================================

-- Crear empresa de prueba (con ID fijo para facilidad)
INSERT INTO public.empresas (id, nombre, ruc_nit, direccion) 
VALUES (
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Empresa Demo XENTRA', 
    '12345678901', 
    'Av. Principal 123, Lima'
) ON CONFLICT (ruc_nit) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    direccion = EXCLUDED.direccion;

-- PASO 4: Para datos completos de prueba, ejecutar:
-- 01-DATOS-PRUEBA-COMPLETOS.sql

-- =====================================================
-- VERIFICACIÓN DE INSTALACIÓN
-- =====================================================

-- Verificar tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('empresas', 'ubicaciones', 'productos', 'variantes', 'stock_actual', 'movimientos_detalle');

-- Verificar funciones creadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%movimientos%';

-- Verificar triggers creados
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%movimientos%';