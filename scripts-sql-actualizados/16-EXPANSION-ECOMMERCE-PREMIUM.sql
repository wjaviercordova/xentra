-- =====================================================
-- XENTRA - Expansion para Tienda Online Premium
-- Cambios en productos y variantes para SEO, catalogo y checkout
-- =====================================================

-- Recomendacion:
-- 1) Ejecutar primero en staging
-- 2) Validar datos y app
-- 3) Ejecutar en produccion

BEGIN;

-- =====================================================
-- A) PRODUCTOS: SEO + galeria + orden visual
-- =====================================================

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS slug character varying,
  ADD COLUMN IF NOT EXISTS imagenes_galeria jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS orden_visualizacion integer DEFAULT 0;

-- Slug sin espacios al inicio/fin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'productos_slug_trim_chk'
      AND conrelid = 'public.productos'::regclass
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_slug_trim_chk
      CHECK (slug IS NULL OR btrim(slug) = slug);
  END IF;
END $$;

-- Galeria debe ser un arreglo JSON
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'productos_imagenes_galeria_array_chk'
      AND conrelid = 'public.productos'::regclass
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_imagenes_galeria_array_chk
      CHECK (
        imagenes_galeria IS NULL
        OR jsonb_typeof(imagenes_galeria) = 'array'
      );
  END IF;
END $$;

-- Orden visual no negativo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'productos_orden_visualizacion_chk'
      AND conrelid = 'public.productos'::regclass
  ) THEN
    ALTER TABLE public.productos
      ADD CONSTRAINT productos_orden_visualizacion_chk
      CHECK (orden_visualizacion >= 0);
  END IF;
END $$;

-- Unicidad de slug por empresa (solo cuando slug no es null)
CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_empresa_slug_not_null
  ON public.productos (empresa_id, slug)
  WHERE slug IS NOT NULL;

-- Indices utiles para tienda online
CREATE INDEX IF NOT EXISTS idx_productos_empresa_orden_visualizacion
  ON public.productos (empresa_id, orden_visualizacion DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_productos_empresa_slug
  ON public.productos (empresa_id, slug);

-- =====================================================
-- B) VARIANTES: promociones + dimensiones para checkout
-- =====================================================

ALTER TABLE public.variantes
  ADD COLUMN IF NOT EXISTS precio_promocional numeric(12,2),
  ADD COLUMN IF NOT EXISTS dimensiones jsonb;

-- Precio promocional valido
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'variantes_precio_promocional_chk'
      AND conrelid = 'public.variantes'::regclass
  ) THEN
    ALTER TABLE public.variantes
      ADD CONSTRAINT variantes_precio_promocional_chk
      CHECK (
        precio_promocional IS NULL
        OR (
          precio_promocional >= 0
          AND (precio_venta IS NULL OR precio_promocional <= precio_venta)
        )
      );
  END IF;
END $$;

-- Dimensiones como objeto {largo, ancho, grosor} numericos positivos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'variantes_dimensiones_chk'
      AND conrelid = 'public.variantes'::regclass
  ) THEN
    ALTER TABLE public.variantes
      ADD CONSTRAINT variantes_dimensiones_chk
      CHECK (
        dimensiones IS NULL
        OR (
          jsonb_typeof(dimensiones) = 'object'
          AND dimensiones ? 'largo'
          AND dimensiones ? 'ancho'
          AND dimensiones ? 'grosor'
          AND jsonb_typeof(dimensiones->'largo') = 'number'
          AND jsonb_typeof(dimensiones->'ancho') = 'number'
          AND jsonb_typeof(dimensiones->'grosor') = 'number'
          AND (dimensiones->>'largo')::numeric > 0
          AND (dimensiones->>'ancho')::numeric > 0
          AND (dimensiones->>'grosor')::numeric > 0
        )
      );
  END IF;
END $$;

-- Indices utiles para promociones y busquedas de variantes
CREATE INDEX IF NOT EXISTS idx_variantes_empresa_precio_promocional
  ON public.variantes (empresa_id, precio_promocional)
  WHERE precio_promocional IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variantes_dimensiones_gin
  ON public.variantes
  USING GIN (dimensiones);

-- =====================================================
-- C) Comentarios de documentacion
-- =====================================================

COMMENT ON COLUMN public.productos.slug IS
'URL amigable SEO por producto. Recomendado: minusculas y guiones. Unico por empresa.';

COMMENT ON COLUMN public.productos.imagenes_galeria IS
'Galeria del producto para e-commerce. JSON array de URLs de imagen.';

COMMENT ON COLUMN public.productos.orden_visualizacion IS
'Orden manual para priorizar productos en catalogo online.';

COMMENT ON COLUMN public.variantes.precio_promocional IS
'Precio promocional temporal para checkout y ofertas.';

COMMENT ON COLUMN public.variantes.dimensiones IS
'Objeto JSON con largo, ancho y grosor para calculo logistico.';

COMMIT;

-- =====================================================
-- D) Backfill opcional (ejecutar manualmente si lo deseas)
-- =====================================================
-- Este bloque NO se ejecuta automaticamente.
-- Descomenta solo si quieres inicializar slug en productos existentes.

-- UPDATE public.productos
-- SET slug = lower(regexp_replace(btrim(nombre), '[^a-zA-Z0-9]+', '-', 'g'))
-- WHERE slug IS NULL;

-- Nota:
-- Si tienes nombres repetidos por empresa, ajusta los slugs manualmente
-- para cumplir la unicidad (empresa_id, slug).
