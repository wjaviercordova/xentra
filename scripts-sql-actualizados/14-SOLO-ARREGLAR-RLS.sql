-- =====================================================
-- XENTRA - Solo Arreglar Políticas RLS (Sin tocar ubicaciones)
-- =====================================================

-- 1. Verificar ubicaciones existentes (solo consulta)
SELECT 
    'Ubicaciones actuales:' as info,
    COUNT(*) as total_ubicaciones
FROM public.ubicaciones 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342';

-- 2. Mostrar ubicaciones existentes
SELECT 
    'Ubicaciones disponibles:' as info,
    id,
    nombre,
    activo,
    COALESCE(es_principal, false) as es_principal
FROM public.ubicaciones 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
ORDER BY COALESCE(es_principal, false) DESC, nombre;

-- 3. Habilitar RLS si no está habilitado
ALTER TABLE public.movimientos_cabecera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_detalle ENABLE ROW LEVEL SECURITY;

-- 4. Crear política temporal PERMISIVA para desarrollo (SOLO PARA PRUEBAS)
DO $$ 
BEGIN
    -- Eliminar políticas anteriores si existen
    DROP POLICY IF EXISTS empresa_movimientos_cabecera_policy ON public.movimientos_cabecera;
    DROP POLICY IF EXISTS empresa_movimientos_detalle_policy ON public.movimientos_detalle;
    DROP POLICY IF EXISTS temp_movimientos_cabecera_policy ON public.movimientos_cabecera;
    DROP POLICY IF EXISTS temp_movimientos_detalle_policy ON public.movimientos_detalle;
    
    -- Crear políticas temporales MUY PERMISIVAS para desarrollo
    CREATE POLICY temp_dev_movimientos_cabecera_policy ON public.movimientos_cabecera
    FOR ALL USING (true) WITH CHECK (true);
    
    CREATE POLICY temp_dev_movimientos_detalle_policy ON public.movimientos_detalle  
    FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 5. Verificar políticas RLS creadas
SELECT 
    'Políticas RLS movimientos_cabecera:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'movimientos_cabecera';

SELECT 
    'Políticas RLS movimientos_detalle:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'movimientos_detalle';

-- 6. Mensaje de confirmación
SELECT 'Políticas RLS configuradas para desarrollo ✅' as resultado;