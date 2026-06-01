-- =====================================================
-- XENTRA - Verificar y Corregir tabla categorías
-- =====================================================
-- Ejecutar en el Editor SQL de Supabase

-- 1. Verificar estructura de tabla categorías
SELECT 
    'Estructura actual de tabla categorías:' as info,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'categorias' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Agregar columna activo si no existe (para mantener consistencia)
ALTER TABLE public.categorias 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 3. Actualizar registros existentes para que tengan activo = true
UPDATE public.categorias 
SET activo = COALESCE(activo, true) 
WHERE activo IS NULL;

-- 4. Verificar datos existentes
SELECT 
    'Datos actuales en categorías:' as info,
    id,
    nombre,
    activo,
    empresa_id,
    plantilla_atributos_predeterminada
FROM public.categorias 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
ORDER BY nombre
LIMIT 10;

-- 5. Mensaje de confirmación
SELECT 'Verificación de tabla categorías completada ✅' as resultado;