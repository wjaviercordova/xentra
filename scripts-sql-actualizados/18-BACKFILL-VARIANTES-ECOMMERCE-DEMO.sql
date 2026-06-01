-- =====================================================
-- XENTRA - Backfill demo para variantes e-commerce
-- Completa: precio_promocional, dimensiones
-- =====================================================

-- Caracteristicas:
-- 1) Idempotente: se puede ejecutar varias veces
-- 2) No pisa datos ya definidos manualmente
-- 3) Aplica solo a empresa y SKUs indicados

BEGIN;

WITH demo_data AS (
  SELECT *
  FROM (
    VALUES
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'AMF60X40'::varchar,
        18.50::numeric(12,2),
        '{"largo": 60, "ancho": 40, "grosor": 15}'::jsonb
      ),
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'CAM001'::varchar,
        65.00::numeric(12,2),
        '{"largo": 200, "ancho": 135, "grosor": 120}'::jsonb
      ),
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'EBL100X1'::varchar,
        0.90::numeric(12,2),
        '{"largo": 200, "ancho": 100, "grosor": 1}'::jsonb
      ),
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'ENE100X1'::varchar,
        1.15::numeric(12,2),
        '{"largo": 200, "ancho": 100, "grosor": 1}'::jsonb
      ),
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'ESB100X2'::varchar,
        2.10::numeric(12,2),
        '{"largo": 200, "ancho": 100, "grosor": 2}'::jsonb
      ),
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'CIMP135'::varchar,
        159.90::numeric(12,2),
        '{"largo": 190, "ancho": 135, "grosor": 23}'::jsonb
      ),
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'ESB001-03'::varchar,
        3.20::numeric(12,2),
        '{"largo": 200, "ancho": 100, "grosor": 3}'::jsonb
      )
  ) AS x(empresa_id, sku, precio_promocional, dimensiones)
)
UPDATE public.variantes v
SET
  precio_promocional = CASE
    WHEN v.precio_promocional IS NULL
      THEN LEAST(d.precio_promocional, COALESCE(v.precio_venta, d.precio_promocional))
    ELSE v.precio_promocional
  END,
  dimensiones = CASE
    WHEN v.dimensiones IS NULL
      THEN d.dimensiones
    ELSE v.dimensiones
  END,
  updated_at = NOW()
FROM demo_data d
WHERE v.empresa_id = d.empresa_id
  AND v.sku = d.sku;

COMMIT;

-- =====================================================
-- Verificacion posterior
-- =====================================================
SELECT
  sku,
  nombre,
  precio_venta,
  precio_promocional,
  dimensiones
FROM public.variantes
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid
  AND sku IN ('AMF60X40', 'CAM001', 'EBL100X1', 'ENE100X1', 'ESB100X2', 'CIMP135', 'ESB001-03')
ORDER BY sku;
