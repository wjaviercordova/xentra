-- =====================================================
-- XENTRA - Datos de Prueba MUY Simples (Sin Conflicts)
-- =====================================================

-- Solo crear los datos mínimos necesarios para probar

-- 1. Verificar empresa (ya existe)
SELECT 'Empresa existe:', COUNT(*) FROM public.empresas WHERE id = '70330390-9e39-4662-8f9e-97e1a2e16342';

-- 2. Crear solo categoría si no existe
INSERT INTO public.categorias (empresa_id, nombre, descripcion) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Productos Demo',
    'Categoría para productos de prueba'
WHERE NOT EXISTS (
    SELECT 1 FROM public.categorias 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Productos Demo'
);

-- 3. Crear solo proveedor si no existe
INSERT INTO public.proveedores (empresa_id, nombre, ruc_nit) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Proveedor Demo',
    '20111111111'
WHERE NOT EXISTS (
    SELECT 1 FROM public.proveedores 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Proveedor Demo'
);

-- 4. Crear productos usando las primeras categoría/proveedor/ubicación disponibles
INSERT INTO public.productos (empresa_id, categoria_id, proveedor_id, codigo, nombre, precio_compra, precio_venta) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    (SELECT id FROM public.categorias WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' LIMIT 1),
    (SELECT id FROM public.proveedores WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' LIMIT 1),
    'DEMO001',
    'Producto Demo 1',
    100.00,
    150.00
WHERE NOT EXISTS (
    SELECT 1 FROM public.productos 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'DEMO001'
);

INSERT INTO public.productos (empresa_id, categoria_id, proveedor_id, codigo, nombre, precio_compra, precio_venta) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    (SELECT id FROM public.categorias WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' LIMIT 1),
    (SELECT id FROM public.proveedores WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' LIMIT 1),
    'DEMO002',
    'Producto Demo 2',
    50.00,
    80.00
WHERE NOT EXISTS (
    SELECT 1 FROM public.productos 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'DEMO002'
);

-- 5. Crear variantes
INSERT INTO public.variantes (empresa_id, producto_id, sku, nombre, precio_compra, precio_venta)
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    p.id,
    p.codigo || '-VAR1',
    p.nombre || ' - Variante 1',
    p.precio_compra,
    p.precio_venta
FROM public.productos p
WHERE p.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND p.codigo IN ('DEMO001', 'DEMO002')
  AND NOT EXISTS (
    SELECT 1 FROM public.variantes 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND sku = p.codigo || '-VAR1'
  );

-- 6. Crear stock usando ubicaciones existentes
INSERT INTO public.stock_actual (empresa_id, variante_id, ubicacion_id, cantidad_actual, costo_promedio)
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    v.id,
    u.id,
    50,  -- Cantidad fija
    v.precio_compra
FROM public.variantes v
CROSS JOIN (
    -- Usar cualquier ubicación que ya exista
    SELECT id FROM public.ubicaciones 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    LIMIT 2
) u
WHERE v.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND v.sku LIKE 'DEMO%'
  AND NOT EXISTS (
    SELECT 1 FROM public.stock_actual 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
      AND variante_id = v.id 
      AND ubicacion_id = u.id
  );

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Contar todo lo creado
SELECT 
    'UBICACIONES DISPONIBLES' as item, 
    COUNT(*) as cantidad 
FROM public.ubicaciones 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'

UNION ALL

SELECT 
    'PRODUCTOS CREADOS', 
    COUNT(*) 
FROM public.productos 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND codigo LIKE 'DEMO%'

UNION ALL

SELECT 
    'VARIANTES CREADAS', 
    COUNT(*) 
FROM public.variantes 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND sku LIKE 'DEMO%'

UNION ALL

SELECT 
    'STOCK CREADO', 
    COUNT(*) 
FROM public.stock_actual 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342';

-- Ver el stock con detalles
SELECT 
    p.codigo,
    p.nombre as producto,
    v.sku,
    v.nombre as variante,
    u.nombre as ubicacion,
    sa.cantidad_actual,
    sa.costo_promedio
FROM public.stock_actual sa
JOIN public.variantes v ON sa.variante_id = v.id
JOIN public.productos p ON v.producto_id = p.id
JOIN public.ubicaciones u ON sa.ubicacion_id = u.id
WHERE sa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND p.codigo LIKE 'DEMO%'
ORDER BY p.codigo, u.nombre;