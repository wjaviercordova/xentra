-- =====================================================
-- XENTRA - Health Check BD (Pre-Frontend)
-- Objetivo: validar que la BD esta lista para iniciar frontend
-- =====================================================

-- Instrucciones:
-- 1) Ejecuta el script completo en Supabase SQL Editor
-- 2) Revisa primero la seccion "DETALLE DE HALLAZGOS"
-- 3) Revisa despues "RESUMEN POR SEVERIDAD" y "VEREDICTO FINAL"

BEGIN;

DROP TABLE IF EXISTS tmp_health_findings;
CREATE TEMP TABLE tmp_health_findings (
  id bigserial PRIMARY KEY,
  severity text NOT NULL, -- CRITICAL, WARNING, INFO
  check_group text NOT NULL,
  check_name text NOT NULL,
  issue_count bigint NOT NULL,
  details text
);

-- =====================================================
-- A) Estructura base requerida
-- =====================================================

-- Tablas criticas
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'estructura',
  'tablas_criticas_faltantes',
  COUNT(*) FILTER (WHERE t.table_name IS NULL),
  'Faltan tablas base esperadas en public'
FROM (
  VALUES
    ('empresas'), ('ubicaciones'), ('perfiles_usuario'), ('categorias'),
    ('proveedores'), ('productos'), ('variantes'), ('stock_actual'),
    ('motivos_movimiento'), ('movimientos_cabecera'), ('movimientos_detalle'),
    ('transferencias'), ('transferencias_detalle')
) exp(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public'
 AND t.table_name = exp.table_name;

-- Columnas e-commerce requeridas
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'estructura',
  'columnas_ecommerce_faltantes',
  COUNT(*) FILTER (WHERE c.column_name IS NULL),
  'Faltan columnas e-commerce en productos/variantes'
FROM (
  VALUES
    ('productos', 'slug'),
    ('productos', 'imagenes_galeria'),
    ('productos', 'orden_visualizacion'),
    ('variantes', 'precio_promocional'),
    ('variantes', 'dimensiones')
) exp(table_name, column_name)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = exp.table_name
 AND c.column_name = exp.column_name;

-- Vista para tienda online
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  CASE WHEN v.table_name IS NULL THEN 'WARNING' ELSE 'INFO' END,
  'estructura',
  'vista_tienda_online',
  CASE WHEN v.table_name IS NULL THEN 1 ELSE 0 END,
  'Vista esperada: public.v_productos_tienda_online'
FROM (
  SELECT table_name
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name = 'v_productos_tienda_online'
) v
RIGHT JOIN (SELECT 1 AS x) d ON true;

-- =====================================================
-- B) Seguridad / Automatizacion
-- =====================================================

-- Trigger sincronizacion portada
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'WARNING' ELSE 'INFO' END,
  'automatizacion',
  'trigger_sincronizar_portada_producto',
  CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END,
  'Trigger esperado en public.productos'
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'productos'
  AND trigger_name = 'trigger_sincronizar_portada_producto';

-- Funcion sincronizacion portada
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'WARNING' ELSE 'INFO' END,
  'automatizacion',
  'funcion_sincronizar_portada_producto',
  CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END,
  'Funcion esperada: public.sincronizar_portada_producto'
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'sincronizar_portada_producto';

-- RLS habilitado en tablas criticas
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'seguridad',
  'rls_deshabilitado_tablas_criticas',
  COUNT(*) FILTER (WHERE c.relrowsecurity = false),
  'Hay tablas criticas sin RLS habilitado'
FROM (
  VALUES
    ('empresas'), ('ubicaciones'), ('perfiles_usuario'), ('categorias'),
    ('proveedores'), ('productos'), ('variantes'), ('stock_actual'),
    ('motivos_movimiento'), ('movimientos_cabecera'), ('movimientos_detalle'),
    ('transferencias'), ('transferencias_detalle')
) exp(table_name)
JOIN pg_class c ON c.oid = format('public.%I', exp.table_name)::regclass;

-- =====================================================
-- C) Calidad de datos relacional
-- =====================================================

-- Variantes sin producto asociado
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'datos',
  'variantes_sin_producto',
  COUNT(*),
  'Variantes con producto_id inexistente'
FROM public.variantes v
LEFT JOIN public.productos p ON p.id = v.producto_id
WHERE v.producto_id IS NOT NULL
  AND p.id IS NULL;

-- Stock con variante inexistente
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'datos',
  'stock_sin_variante',
  COUNT(*),
  'Stock_actual con variante_id inexistente'
FROM public.stock_actual s
LEFT JOIN public.variantes v ON v.id = s.variante_id
WHERE s.variante_id IS NOT NULL
  AND v.id IS NULL;

-- Movimientos detalle sin cabecera
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'datos',
  'movimientos_detalle_sin_cabecera',
  COUNT(*),
  'movimientos_detalle con movimiento_cabecera_id inexistente'
FROM public.movimientos_detalle d
LEFT JOIN public.movimientos_cabecera c ON c.id = d.movimiento_cabecera_id
WHERE d.movimiento_cabecera_id IS NOT NULL
  AND c.id IS NULL;

-- Stock negativo
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'datos',
  'stock_negativo',
  COUNT(*),
  'Hay registros con cantidad_actual < 0'
FROM public.stock_actual
WHERE cantidad_actual < 0;

-- =====================================================
-- D) Calidad de datos e-commerce
-- =====================================================

-- Slug faltante en productos activos
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'WARNING',
  'ecommerce',
  'slug_faltante_en_activos',
  COUNT(*),
  'Productos activos sin slug (afecta SEO/rutas)'
FROM public.productos
WHERE activo = true
  AND (slug IS NULL OR btrim(slug) = '');

-- Slug duplicado por empresa
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'ecommerce',
  'slug_duplicado_por_empresa',
  COUNT(*),
  'Duplicados de (empresa_id, slug)'
FROM (
  SELECT empresa_id, slug
  FROM public.productos
  WHERE slug IS NOT NULL
  GROUP BY empresa_id, slug
  HAVING COUNT(*) > 1
) x;

-- imagenes_galeria con formato no array
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'ecommerce',
  'imagenes_galeria_no_array',
  COUNT(*),
  'imagenes_galeria debe ser array JSONB'
FROM public.productos
WHERE imagenes_galeria IS NOT NULL
  AND jsonb_typeof(imagenes_galeria) <> 'array';

-- productos con galeria de objetos pero sin portada
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'WARNING',
  'ecommerce',
  'galeria_objetos_sin_portada',
  COUNT(*),
  'No existe item con es_portada=true'
FROM public.productos p
WHERE p.imagenes_galeria IS NOT NULL
  AND jsonb_typeof(p.imagenes_galeria) = 'array'
  AND jsonb_array_length(p.imagenes_galeria) > 0
  AND jsonb_typeof(p.imagenes_galeria->0) = 'object'
  AND (
    SELECT COUNT(*)
    FROM jsonb_array_elements(p.imagenes_galeria) img
    WHERE COALESCE((img->>'es_portada')::boolean, false) = true
  ) = 0;

-- productos con multiples portadas
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'WARNING',
  'ecommerce',
  'galeria_objetos_con_multiples_portadas',
  COUNT(*),
  'Existe mas de un item con es_portada=true'
FROM public.productos p
WHERE p.imagenes_galeria IS NOT NULL
  AND jsonb_typeof(p.imagenes_galeria) = 'array'
  AND jsonb_array_length(p.imagenes_galeria) > 0
  AND jsonb_typeof(p.imagenes_galeria->0) = 'object'
  AND (
    SELECT COUNT(*)
    FROM jsonb_array_elements(p.imagenes_galeria) img
    WHERE COALESCE((img->>'es_portada')::boolean, false) = true
  ) > 1;

-- imagen_url desincronizada respecto a portada
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'WARNING',
  'ecommerce',
  'imagen_url_desincronizada',
  COUNT(*),
  'imagen_url != url de la portada en imagenes_galeria'
FROM public.productos p
WHERE p.imagenes_galeria IS NOT NULL
  AND jsonb_typeof(p.imagenes_galeria) = 'array'
  AND jsonb_array_length(p.imagenes_galeria) > 0
  AND jsonb_typeof(p.imagenes_galeria->0) = 'object'
  AND COALESCE(p.imagen_url, '') <> COALESCE(
    (
      SELECT img->>'url'
      FROM jsonb_array_elements(p.imagenes_galeria) img
      WHERE COALESCE((img->>'es_portada')::boolean, false) = true
      LIMIT 1
    ),
    ''
  );

-- precio_promocional invalido
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'ecommerce',
  'precio_promocional_invalido',
  COUNT(*),
  'precio_promocional < 0 o > precio_venta'
FROM public.variantes
WHERE precio_promocional IS NOT NULL
  AND (
    precio_promocional < 0
    OR (precio_venta IS NOT NULL AND precio_promocional > precio_venta)
  );

-- dimensiones invalidas
INSERT INTO tmp_health_findings (severity, check_group, check_name, issue_count, details)
SELECT
  'CRITICAL',
  'ecommerce',
  'dimensiones_invalidas',
  COUNT(*),
  'dimensiones debe tener largo/ancho/grosor numericos > 0'
FROM public.variantes v
WHERE v.dimensiones IS NOT NULL
  AND (
    jsonb_typeof(v.dimensiones) <> 'object'
    OR NOT (v.dimensiones ? 'largo' AND v.dimensiones ? 'ancho' AND v.dimensiones ? 'grosor')
    OR jsonb_typeof(v.dimensiones->'largo') <> 'number'
    OR jsonb_typeof(v.dimensiones->'ancho') <> 'number'
    OR jsonb_typeof(v.dimensiones->'grosor') <> 'number'
    OR (v.dimensiones->>'largo')::numeric <= 0
    OR (v.dimensiones->>'ancho')::numeric <= 0
    OR (v.dimensiones->>'grosor')::numeric <= 0
  );

-- =====================================================
-- E) Resultado detallado
-- =====================================================
SELECT
  severity,
  check_group,
  check_name,
  issue_count,
  details
FROM tmp_health_findings
WHERE issue_count > 0
ORDER BY
  CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,
  check_group,
  check_name;

-- =====================================================
-- F) Resumen por severidad
-- =====================================================
SELECT
  severity,
  COUNT(*) FILTER (WHERE issue_count > 0) AS checks_con_hallazgos,
  COALESCE(SUM(issue_count) FILTER (WHERE issue_count > 0), 0) AS total_issues
FROM tmp_health_findings
GROUP BY severity
ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END;

-- =====================================================
-- G) Veredicto final
-- =====================================================
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM tmp_health_findings
      WHERE severity = 'CRITICAL' AND issue_count > 0
    ) THEN 'NO APTO PARA FRONTEND (resolver CRITICAL)'
    WHEN EXISTS (
      SELECT 1 FROM tmp_health_findings
      WHERE severity = 'WARNING' AND issue_count > 0
    ) THEN 'APTO CON OBSERVACIONES (revisar WARNING)'
    ELSE 'APTO PARA FRONTEND'
  END AS veredicto,
  NOW() AS evaluado_en;

COMMIT;
