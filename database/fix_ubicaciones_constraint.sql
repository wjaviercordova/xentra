-- =====================================================
-- XENTRA - Corrección de restricción de ubicaciones principales
-- =====================================================

-- 1. Eliminar la restricción incorrecta
ALTER TABLE public.ubicaciones DROP CONSTRAINT IF EXISTS ubicaciones_empresa_principal;

-- 2. Crear índice único parcial que solo aplique cuando es_principal = true
-- Esto permite múltiples ubicaciones con es_principal = false 
-- pero solo una con es_principal = true por empresa
CREATE UNIQUE INDEX ubicaciones_empresa_principal_unique 
ON public.ubicaciones (empresa_id) 
WHERE es_principal = true;

-- 3. Verificar que no hay datos inconsistentes
-- Solo debe haber máximo una ubicación principal por empresa
DO $$
DECLARE
    empresa_record RECORD;
    principal_count INTEGER;
BEGIN
    FOR empresa_record IN SELECT id FROM public.empresas LOOP
        SELECT COUNT(*) INTO principal_count 
        FROM public.ubicaciones 
        WHERE empresa_id = empresa_record.id AND es_principal = true;
        
        IF principal_count > 1 THEN
            RAISE NOTICE 'Empresa % tiene % ubicaciones principales. Corrigiendo...', 
                empresa_record.id, principal_count;
            
            -- Mantener solo la primera como principal, el resto como false
            UPDATE public.ubicaciones 
            SET es_principal = false
            WHERE empresa_id = empresa_record.id 
            AND es_principal = true 
            AND id NOT IN (
                SELECT id 
                FROM public.ubicaciones 
                WHERE empresa_id = empresa_record.id 
                AND es_principal = true 
                ORDER BY created_at ASC 
                LIMIT 1
            );
        END IF;
    END LOOP;
END $$;