-- =====================================================
-- XENTRA - Sincronizar portada de imagenes_galeria con imagen_url
-- Estrategia recomendada:
-- 1) imagenes_galeria es la fuente de verdad
-- 2) una sola imagen puede tener es_portada = true
-- 3) imagen_url se sincroniza automaticamente con la portada
-- =====================================================

BEGIN;

-- =====================================================
-- A) Funcion para normalizar portada y sincronizar imagen_url
-- =====================================================
CREATE OR REPLACE FUNCTION public.sincronizar_portada_producto()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  portada_url text;
  portada_count integer := 0;
BEGIN
  -- Si no hay galeria valida, mantener coherencia minima
  IF NEW.imagenes_galeria IS NULL
     OR jsonb_typeof(NEW.imagenes_galeria) <> 'array'
     OR jsonb_array_length(NEW.imagenes_galeria) = 0 THEN
    RETURN NEW;
  END IF;

  -- Si imagenes_galeria viene como array de objetos, normalizar es_portada
  SELECT COUNT(*)
  INTO portada_count
  FROM jsonb_array_elements(NEW.imagenes_galeria) AS item
  WHERE COALESCE((item->>'es_portada')::boolean, false) = true;

  -- Si hay mas de una portada, dejar solo la primera
  IF portada_count > 1 THEN
    NEW.imagenes_galeria := (
      WITH items AS (
        SELECT item, ordinality
        FROM jsonb_array_elements(NEW.imagenes_galeria) WITH ORDINALITY AS t(item, ordinality)
      ), primera_portada AS (
        SELECT MIN(ordinality) AS ord
        FROM items
        WHERE COALESCE((item->>'es_portada')::boolean, false) = true
      )
      SELECT jsonb_agg(
        CASE
          WHEN i.ordinality = p.ord THEN jsonb_set(i.item, '{es_portada}', 'true'::jsonb, true)
          ELSE jsonb_set(i.item, '{es_portada}', 'false'::jsonb, true)
        END
        ORDER BY i.ordinality
      )
      FROM items i
      CROSS JOIN primera_portada p
    );
  END IF;

  -- Si no hay portada marcada:
  -- 1) intentar usar imagen_url si coincide con una imagen de la galeria
  -- 2) si no coincide, usar la primera imagen de la galeria
  IF portada_count = 0 THEN
    IF NEW.imagen_url IS NOT NULL THEN
      NEW.imagenes_galeria := (
        WITH items AS (
          SELECT item, ordinality
          FROM jsonb_array_elements(NEW.imagenes_galeria) WITH ORDINALITY AS t(item, ordinality)
        ), match_url AS (
          SELECT MIN(ordinality) AS ord
          FROM items
          WHERE item->>'url' = NEW.imagen_url
        )
        SELECT jsonb_agg(
          CASE
            WHEN m.ord IS NOT NULL AND i.ordinality = m.ord THEN jsonb_set(i.item, '{es_portada}', 'true'::jsonb, true)
            WHEN m.ord IS NULL AND i.ordinality = 1 THEN jsonb_set(i.item, '{es_portada}', 'true'::jsonb, true)
            ELSE jsonb_set(i.item, '{es_portada}', 'false'::jsonb, true)
          END
          ORDER BY i.ordinality
        )
        FROM items i
        LEFT JOIN match_url m ON true
      );
    ELSE
      NEW.imagenes_galeria := (
        SELECT jsonb_agg(
          CASE
            WHEN ordinality = 1 THEN jsonb_set(item, '{es_portada}', 'true'::jsonb, true)
            ELSE jsonb_set(item, '{es_portada}', 'false'::jsonb, true)
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(NEW.imagenes_galeria) WITH ORDINALITY AS t(item, ordinality)
      );
    END IF;
  END IF;

  -- Sincronizar imagen_url con la portada definitiva
  SELECT item->>'url'
  INTO portada_url
  FROM jsonb_array_elements(NEW.imagenes_galeria) AS item
  WHERE COALESCE((item->>'es_portada')::boolean, false) = true
  LIMIT 1;

  NEW.imagen_url := portada_url;

  RETURN NEW;
END;
$$;

-- =====================================================
-- B) Trigger para mantener sincronizacion automatica
-- =====================================================
DROP TRIGGER IF EXISTS trigger_sincronizar_portada_producto ON public.productos;

CREATE TRIGGER trigger_sincronizar_portada_producto
BEFORE INSERT OR UPDATE OF imagenes_galeria, imagen_url
ON public.productos
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_portada_producto();

-- =====================================================
-- C) Backfill inicial para productos actuales
-- Si no hay portada marcada, usa la primera imagen de la galeria
-- y sincroniza imagen_url
-- =====================================================
UPDATE public.productos
SET
  imagenes_galeria = imagenes_galeria,
  updated_at = NOW()
WHERE imagenes_galeria IS NOT NULL
  AND jsonb_typeof(imagenes_galeria) = 'array'
  AND jsonb_array_length(imagenes_galeria) > 0;

COMMIT;

-- =====================================================
-- D) Verificacion rapida
-- =====================================================
SELECT
  codigo,
  nombre,
  imagen_url,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(COALESCE(imagenes_galeria, '[]'::jsonb)) AS img
    WHERE COALESCE((img->>'es_portada')::boolean, false) = true
  ) AS total_portadas,
  (
    SELECT img->>'url'
    FROM jsonb_array_elements(COALESCE(imagenes_galeria, '[]'::jsonb)) AS img
    WHERE COALESCE((img->>'es_portada')::boolean, false) = true
    LIMIT 1
  ) AS url_portada_json
FROM public.productos
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid
ORDER BY orden_visualizacion DESC, codigo;
