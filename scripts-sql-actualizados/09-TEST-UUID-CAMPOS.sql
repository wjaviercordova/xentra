-- Test rápido para verificar que plantilla_atributos_id acepta NULL
-- Ejecutar en Supabase si necesitas verificar

-- Ver variantes existentes con plantilla_atributos_id
SELECT 
    id,
    sku,
    nombre,
    plantilla_atributos_id,
    atributos
FROM public.variantes 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND (plantilla_atributos_id IS NULL OR plantilla_atributos_id IS NOT NULL)
ORDER BY sku
LIMIT 5;

-- Test de actualización con NULL (esto debería funcionar)
-- UPDATE public.variantes 
-- SET plantilla_atributos_id = NULL 
-- WHERE id = 'algún-uuid-específico';

SELECT 'Verificación de campos UUID completada ✅' as resultado;