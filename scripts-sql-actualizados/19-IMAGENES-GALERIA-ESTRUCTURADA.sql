-- =====================================================
-- XENTRA - Evolucion de imagenes_galeria a JSON estructurado
-- Estrategia recomendada:
-- 1) Storage plano por producto en una sola carpeta
-- 2) Clasificacion por metadatos en JSONB
-- 3) imagen_url se mantiene como foto de portada
-- =====================================================

BEGIN;

-- =====================================================
-- A) Funcion validadora para imagenes_galeria
-- =====================================================
CREATE OR REPLACE FUNCTION public.validar_imagenes_galeria_estructurada(data jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item jsonb;
BEGIN
  IF data IS NULL THEN
    RETURN true;
  END IF;

  IF jsonb_typeof(data) <> 'array' THEN
    RETURN false;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(data)
  LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      RETURN false;
    END IF;

    IF NOT (item ? 'url') OR jsonb_typeof(item->'url') <> 'string' THEN
      RETURN false;
    END IF;

    IF item ? 'alt' AND jsonb_typeof(item->'alt') <> 'string' THEN
      RETURN false;
    END IF;

    IF item ? 'categoria' AND jsonb_typeof(item->'categoria') <> 'string' THEN
      RETURN false;
    END IF;

    IF item ? 'activo_en_web' AND jsonb_typeof(item->'activo_en_web') <> 'boolean' THEN
      RETURN false;
    END IF;

    IF item ? 'activo_en_erp' AND jsonb_typeof(item->'activo_en_erp') <> 'boolean' THEN
      RETURN false;
    END IF;

    IF item ? 'orden' AND jsonb_typeof(item->'orden') <> 'number' THEN
      RETURN false;
    END IF;

    IF item ? 'temporada' AND jsonb_typeof(item->'temporada') <> 'string' THEN
      RETURN false;
    END IF;

    IF item ? 'es_portada' AND jsonb_typeof(item->'es_portada') <> 'boolean' THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- =====================================================
-- B) Normalizacion de arrays antiguos de strings -> objetos
-- =====================================================
UPDATE public.productos p
SET imagenes_galeria = sub.normalized_gallery
FROM (
  SELECT
    p2.id,
    jsonb_agg(
      jsonb_build_object(
        'url', img.value #>> '{}',
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
        'es_portada', false
      )
      ORDER BY img.ordinality
    ) AS normalized_gallery
  FROM public.productos p2
  CROSS JOIN LATERAL jsonb_array_elements(p2.imagenes_galeria) WITH ORDINALITY AS img(value, ordinality)
  WHERE p2.imagenes_galeria IS NOT NULL
    AND jsonb_typeof(p2.imagenes_galeria) = 'array'
    AND jsonb_array_length(p2.imagenes_galeria) > 0
    AND jsonb_typeof(p2.imagenes_galeria->0) = 'string'
  GROUP BY p2.id, p2.nombre
) sub
WHERE p.id = sub.id;

-- =====================================================
-- C) Endurecer constraint con estructura valida
-- =====================================================
ALTER TABLE public.productos
  DROP CONSTRAINT IF EXISTS productos_imagenes_galeria_array_chk;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'productos_imagenes_galeria_estructurada_chk'
      AND conrelid = 'public.productos'::regclass
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_imagenes_galeria_estructurada_chk
      CHECK (public.validar_imagenes_galeria_estructurada(imagenes_galeria));
  END IF;
END $$;

COMMENT ON COLUMN public.productos.imagenes_galeria IS
'Galeria estructurada en JSONB. Cada item admite url, alt, categoria, activo_en_web, activo_en_erp, orden, temporada, es_portada. imagen_url se usa como portada principal.';

COMMIT;

-- =====================================================
-- Referencia de categorias sugeridas
-- =====================================================
-- galeria_tienda: fotos comerciales visibles en la tienda
-- promocion_temporada: banners o imagenes comerciales temporales
-- inventario_tecnico: cortes internos, empaque, bodega, fichas tecnicas
