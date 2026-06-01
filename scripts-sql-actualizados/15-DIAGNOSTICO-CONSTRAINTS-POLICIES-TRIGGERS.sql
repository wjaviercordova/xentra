-- =====================================================
-- XENTRA - Diagnostico de constraints/policies/triggers
-- Solo lectura: NO modifica datos ni estructura
-- =====================================================

-- Recomendacion:
-- 1) Ejecutar este script completo en Supabase SQL Editor
-- 2) Revisar resultados con estado OK/MISSING

-- =====================================================
-- A) Verificar UNIQUE constraints esperados
-- =====================================================
WITH expected_unique AS (
  SELECT * FROM (VALUES
    ('public', 'categorias', 'UNIQUE (empresa_id, nombre)'),
    ('public', 'proveedores', 'UNIQUE (empresa_id, nombre)'),
    ('public', 'productos', 'UNIQUE (empresa_id, codigo)'),
    ('public', 'variantes', 'UNIQUE (empresa_id, sku)'),
    ('public', 'stock_actual', 'UNIQUE (empresa_id, variante_id, ubicacion_id)'),
    ('public', 'motivos_movimiento', 'UNIQUE (empresa_id, codigo)'),
    ('public', 'transferencias', 'UNIQUE (empresa_id, numero_transferencia)'),
    ('public', 'ubicaciones', 'UNIQUE (empresa_id, es_principal)')
  ) AS t(schema_name, table_name, expected_fragment)
), existing_unique AS (
  SELECT
    ns.nspname AS schema_name,
    cls.relname AS table_name,
    c.conname,
    regexp_replace(pg_get_constraintdef(c.oid), '\\s+', ' ', 'g') AS constraint_def
  FROM pg_constraint c
  JOIN pg_class cls ON cls.oid = c.conrelid
  JOIN pg_namespace ns ON ns.oid = cls.relnamespace
  WHERE c.contype = 'u'
)
SELECT
  'UNIQUE_CONSTRAINT' AS check_type,
  e.schema_name,
  e.table_name,
  e.expected_fragment AS expected,
  CASE WHEN EXISTS (
    SELECT 1
    FROM existing_unique x
    WHERE x.schema_name = e.schema_name
      AND x.table_name = e.table_name
      AND x.constraint_def ILIKE ('%' || e.expected_fragment || '%')
  ) THEN 'OK' ELSE 'MISSING' END AS status
FROM expected_unique e
ORDER BY e.table_name;

-- =====================================================
-- B) Verificar RLS habilitado por tabla
-- =====================================================
WITH expected_rls AS (
  SELECT * FROM (VALUES
    ('public', 'empresas'),
    ('public', 'ubicaciones'),
    ('public', 'perfiles_usuario'),
    ('public', 'categorias'),
    ('public', 'proveedores'),
    ('public', 'productos'),
    ('public', 'variantes'),
    ('public', 'stock_actual'),
    ('public', 'motivos_movimiento'),
    ('public', 'movimientos_cabecera'),
    ('public', 'movimientos_detalle'),
    ('public', 'transferencias'),
    ('public', 'transferencias_detalle')
  ) AS t(schema_name, table_name)
)
SELECT
  'RLS_ENABLED' AS check_type,
  e.schema_name,
  e.table_name,
  CASE WHEN c.relrowsecurity THEN 'OK' ELSE 'MISSING' END AS status
FROM expected_rls e
LEFT JOIN pg_class c ON c.oid = format('%I.%I', e.schema_name, e.table_name)::regclass
ORDER BY e.table_name;

-- =====================================================
-- C) Verificar policies RLS esperadas
-- =====================================================
WITH expected_policies AS (
  SELECT * FROM (VALUES
    ('public', 'empresas', 'Usuarios pueden ver su propia empresa'),
    ('public', 'ubicaciones', 'Usuarios pueden ver ubicaciones de su empresa'),
    ('public', 'perfiles_usuario', 'Usuarios pueden ver perfiles de su empresa'),
    ('public', 'categorias', 'Usuarios pueden gestionar categorías de su empresa'),
    ('public', 'proveedores', 'Usuarios pueden gestionar proveedores de su empresa'),
    ('public', 'productos', 'Usuarios pueden gestionar productos de su empresa'),
    ('public', 'variantes', 'Usuarios pueden gestionar variantes de su empresa'),
    ('public', 'stock_actual', 'Usuarios pueden ver stock de su empresa'),
    ('public', 'motivos_movimiento', 'Usuarios pueden gestionar motivos de su empresa'),
    ('public', 'movimientos_cabecera', 'Usuarios pueden gestionar movimientos de su empresa'),
    ('public', 'movimientos_detalle', 'Usuarios pueden gestionar detalle movimientos de su empresa'),
    ('public', 'transferencias', 'Usuarios pueden gestionar transferencias de su empresa'),
    ('public', 'transferencias_detalle', 'Usuarios pueden gestionar detalle transferencias de su empresa')
  ) AS t(schema_name, table_name, policy_name)
)
SELECT
  'RLS_POLICY' AS check_type,
  e.schema_name,
  e.table_name,
  e.policy_name AS expected,
  CASE WHEN p.policyname IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status
FROM expected_policies e
LEFT JOIN pg_policies p
  ON p.schemaname = e.schema_name
 AND p.tablename = e.table_name
 AND p.policyname = e.policy_name
ORDER BY e.table_name, e.policy_name;

-- =====================================================
-- D) Verificar funciones esperadas
-- =====================================================
WITH expected_functions AS (
  SELECT * FROM (VALUES
    ('public', 'get_user_empresa_id'),
    ('public', 'update_updated_at_column'),
    ('public', 'actualizar_stock_movimientos'),
    ('public', 'validar_stock_transferencia'),
    ('public', 'consultar_movimientos_variante')
  ) AS t(schema_name, function_name)
)
SELECT
  'FUNCTION' AS check_type,
  e.schema_name,
  e.function_name AS expected,
  CASE WHEN EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = e.schema_name
      AND p.proname = e.function_name
  ) THEN 'OK' ELSE 'MISSING' END AS status
FROM expected_functions e
ORDER BY e.function_name;

-- =====================================================
-- E) Verificar triggers esperados
-- =====================================================
WITH expected_triggers AS (
  SELECT * FROM (VALUES
    ('public', 'movimientos_detalle', 'trigger_actualizar_stock_movimientos'),
    ('public', 'transferencias', 'trigger_validar_stock_transferencia'),
    ('public', 'empresas', 'update_empresas_updated_at'),
    ('public', 'ubicaciones', 'update_ubicaciones_updated_at'),
    ('public', 'perfiles_usuario', 'update_perfiles_usuario_updated_at'),
    ('public', 'categorias', 'update_categorias_updated_at'),
    ('public', 'proveedores', 'update_proveedores_updated_at'),
    ('public', 'productos', 'update_productos_updated_at'),
    ('public', 'variantes', 'update_variantes_updated_at')
  ) AS t(schema_name, table_name, trigger_name)
)
SELECT
  'TRIGGER' AS check_type,
  e.schema_name,
  e.table_name,
  e.trigger_name AS expected,
  CASE WHEN t.trigger_name IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status
FROM expected_triggers e
LEFT JOIN information_schema.triggers t
  ON t.trigger_schema = e.schema_name
 AND t.event_object_table = e.table_name
 AND t.trigger_name = e.trigger_name
ORDER BY e.table_name, e.trigger_name;

-- =====================================================
-- F) Duplicados que bloquearian UNIQUE constraints
-- =====================================================
-- Ejecuta este bloque para validar antes de crear UNIQUEs faltantes.

SELECT 'categorias(empresa_id,nombre)' AS unique_target, empresa_id, nombre, COUNT(*)
FROM public.categorias
GROUP BY empresa_id, nombre
HAVING COUNT(*) > 1
UNION ALL
SELECT 'proveedores(empresa_id,nombre)', empresa_id, nombre, COUNT(*)
FROM public.proveedores
GROUP BY empresa_id, nombre
HAVING COUNT(*) > 1
UNION ALL
SELECT 'productos(empresa_id,codigo)', empresa_id, codigo, COUNT(*)
FROM public.productos
GROUP BY empresa_id, codigo
HAVING COUNT(*) > 1
UNION ALL
SELECT 'variantes(empresa_id,sku)', empresa_id, sku, COUNT(*)
FROM public.variantes
GROUP BY empresa_id, sku
HAVING COUNT(*) > 1
UNION ALL
SELECT 'motivos_movimiento(empresa_id,codigo)', empresa_id, codigo, COUNT(*)
FROM public.motivos_movimiento
GROUP BY empresa_id, codigo
HAVING COUNT(*) > 1
UNION ALL
SELECT 'transferencias(empresa_id,numero_transferencia)', empresa_id, numero_transferencia, COUNT(*)
FROM public.transferencias
GROUP BY empresa_id, numero_transferencia
HAVING COUNT(*) > 1;

-- =====================================================
-- G) Resumen de pendientes (MISSING)
-- =====================================================
WITH checks AS (
  -- Unique
  SELECT
    'UNIQUE_CONSTRAINT' AS check_type,
    e.table_name AS object_name,
    CASE WHEN EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class cls ON cls.oid = c.conrelid
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      WHERE c.contype = 'u'
        AND ns.nspname = e.schema_name
        AND cls.relname = e.table_name
        AND regexp_replace(pg_get_constraintdef(c.oid), '\\s+', ' ', 'g') ILIKE ('%' || e.expected_fragment || '%')
    ) THEN 'OK' ELSE 'MISSING' END AS status
  FROM (
    SELECT * FROM (VALUES
      ('public', 'categorias', 'UNIQUE (empresa_id, nombre)'),
      ('public', 'proveedores', 'UNIQUE (empresa_id, nombre)'),
      ('public', 'productos', 'UNIQUE (empresa_id, codigo)'),
      ('public', 'variantes', 'UNIQUE (empresa_id, sku)'),
      ('public', 'stock_actual', 'UNIQUE (empresa_id, variante_id, ubicacion_id)'),
      ('public', 'motivos_movimiento', 'UNIQUE (empresa_id, codigo)'),
      ('public', 'transferencias', 'UNIQUE (empresa_id, numero_transferencia)'),
      ('public', 'ubicaciones', 'UNIQUE (empresa_id, es_principal)')
    ) AS t(schema_name, table_name, expected_fragment)
  ) e
  UNION ALL
  -- RLS enabled
  SELECT
    'RLS_ENABLED',
    e.table_name,
    CASE WHEN c.relrowsecurity THEN 'OK' ELSE 'MISSING' END
  FROM (
    SELECT * FROM (VALUES
      ('public', 'empresas'), ('public', 'ubicaciones'), ('public', 'perfiles_usuario'),
      ('public', 'categorias'), ('public', 'proveedores'), ('public', 'productos'),
      ('public', 'variantes'), ('public', 'stock_actual'), ('public', 'motivos_movimiento'),
      ('public', 'movimientos_cabecera'), ('public', 'movimientos_detalle'),
      ('public', 'transferencias'), ('public', 'transferencias_detalle')
    ) AS t(schema_name, table_name)
  ) e
  LEFT JOIN pg_class c ON c.oid = format('%I.%I', e.schema_name, e.table_name)::regclass
  UNION ALL
  -- Triggers
  SELECT
    'TRIGGER',
    e.table_name || '.' || e.trigger_name,
    CASE WHEN t.trigger_name IS NOT NULL THEN 'OK' ELSE 'MISSING' END
  FROM (
    SELECT * FROM (VALUES
      ('public', 'movimientos_detalle', 'trigger_actualizar_stock_movimientos'),
      ('public', 'transferencias', 'trigger_validar_stock_transferencia'),
      ('public', 'empresas', 'update_empresas_updated_at'),
      ('public', 'ubicaciones', 'update_ubicaciones_updated_at'),
      ('public', 'perfiles_usuario', 'update_perfiles_usuario_updated_at'),
      ('public', 'categorias', 'update_categorias_updated_at'),
      ('public', 'proveedores', 'update_proveedores_updated_at'),
      ('public', 'productos', 'update_productos_updated_at'),
      ('public', 'variantes', 'update_variantes_updated_at')
    ) AS t(schema_name, table_name, trigger_name)
  ) e
  LEFT JOIN information_schema.triggers t
    ON t.trigger_schema = e.schema_name
   AND t.event_object_table = e.table_name
   AND t.trigger_name = e.trigger_name
)
SELECT check_type, COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'MISSING') AS missing
FROM checks
GROUP BY check_type
ORDER BY check_type;
