-- =====================================================
-- XENTRA - Normalizar imagenes_galeria a objetos JSONB
-- Caso: actualmente imagenes_galeria = array de strings (URLs)
-- Objetivo: convertir a array de objetos con metadatos de uso
-- =====================================================

BEGIN;

-- 1) Convertir solo registros que todavia tienen array de strings
--    No toca filas que ya esten normalizadas (array de objetos)
UPDATE public.productos p
SET
  imagenes_galeria = sub.galeria_normalizada,
  updated_at = NOW()
FROM (
  SELECT
    p2.id,
    jsonb_agg(
      jsonb_build_object(
        'url',
          replace(
            img.value #>> '{}',
            '/productos/',
            '/productos-imagenes/'
          ),
        'alt', p2.nombre || ' - Imagen ' || img.ordinality,
        'categoria', CASE
          WHEN lower(img.value #>> '{}') LIKE '%promo%' OR lower(img.value #>> '{}') LIKE '%temporada%'
            THEN 'promocion_temporada'
          WHEN lower(img.value #>> '{}') LIKE '%estructura%' OR lower(img.value #>> '{}') LIKE '%interna%' OR lower(img.value #>> '{}') LIKE '%empaque%'
            THEN 'inventario_tecnico'
          ELSE 'galeria_tienda'
        END,
        'activo_en_web', CASE
          WHEN lower(img.value #>> '{}') LIKE '%estructura%' OR lower(img.value #>> '{}') LIKE '%interna%' OR lower(img.value #>> '{}') LIKE '%empaque%'
            THEN false
          ELSE true
        END,
        'activo_en_erp', true,
        'orden', img.ordinality,
        'temporada', CASE
          WHEN lower(img.value #>> '{}') LIKE '%promo%' OR lower(img.value #>> '{}') LIKE '%temporada%'
            THEN 'campana-general'
          ELSE NULL
        END,
        'es_portada', false
      )
      ORDER BY img.ordinality
    ) AS galeria_normalizada
  FROM public.productos p2
  CROSS JOIN LATERAL jsonb_array_elements(p2.imagenes_galeria) WITH ORDINALITY AS img(value, ordinality)
  WHERE p2.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid
    AND p2.codigo IN ('COL001', 'CAM001', 'ALM001', 'ESB001', 'ESN001')
    AND p2.imagenes_galeria IS NOT NULL
    AND jsonb_typeof(p2.imagenes_galeria) = 'array'
    AND jsonb_array_length(p2.imagenes_galeria) > 0
    AND jsonb_typeof(p2.imagenes_galeria->0) = 'string'
  GROUP BY p2.id, p2.nombre
) sub
WHERE p.id = sub.id;

COMMIT;

-- =====================================================
-- Verificacion rapida
-- =====================================================
SELECT
  p.codigo,
  p.nombre,
  jsonb_typeof(p.imagenes_galeria) AS tipo,
  jsonb_array_length(COALESCE(p.imagenes_galeria, '[]'::jsonb)) AS total,
  (
    SELECT count(*)
    FROM jsonb_array_elements(COALESCE(p.imagenes_galeria, '[]'::jsonb)) x
    WHERE COALESCE((x->>'activo_en_web')::boolean, false) = true
  ) AS activas_web,
  (
    SELECT count(*)
    FROM jsonb_array_elements(COALESCE(p.imagenes_galeria, '[]'::jsonb)) x
    WHERE (x->>'categoria') = 'inventario_tecnico'
  ) AS tecnicas
FROM public.productos p
WHERE p.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid
  AND p.codigo IN ('COL001', 'CAM001', 'ALM001', 'ESB001', 'ESN001')
ORDER BY p.orden_visualizacion DESC, p.codigo;

-- =====================================================
-- Ejemplo de consumo tienda online (solo visibles en web)
-- =====================================================
-- SELECT codigo, nombre,
--   (
--     SELECT jsonb_agg(img ORDER BY (img->>'orden')::int)
--     FROM jsonb_array_elements(imagenes_galeria) img
--     WHERE COALESCE((img->>'activo_en_web')::boolean, false) = true
--   ) AS imagenes_web
-- FROM public.productos
-- WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid;
