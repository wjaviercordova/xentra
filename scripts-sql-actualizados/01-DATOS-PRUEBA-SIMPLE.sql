-- =====================================================
-- XENTRA - Datos de Prueba Simplificados (Sin Errores)
-- Ejecutar este script en lugar del anterior
-- =====================================================

-- 1. Asegurar que existe la empresa de prueba
INSERT INTO public.empresas (id, nombre, ruc_nit, direccion) 
VALUES (
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Empresa Demo XENTRA', 
    '12345678901', 
    'Av. Principal 123, Lima'
) ON CONFLICT (ruc_nit) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    direccion = EXCLUDED.direccion;

-- 2. Crear ubicaciones (solo si no existen)
INSERT INTO public.ubicaciones (empresa_id, nombre, direccion, es_principal, tipo) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Almacén Principal',
    'Av. Principal 123',
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.ubicaciones WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' AND es_principal = true) 
        THEN false 
        ELSE true 
    END,
    'almacen'
WHERE NOT EXISTS (
    SELECT 1 FROM public.ubicaciones 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Almacén Principal'
);

INSERT INTO public.ubicaciones (empresa_id, nombre, direccion, es_principal, tipo) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Tienda Centro',
    'Jr. Comercio 456',
    false,
    'sucursal'
WHERE NOT EXISTS (
    SELECT 1 FROM public.ubicaciones 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Tienda Centro'
);

-- 3. Crear categorías
INSERT INTO public.categorias (empresa_id, nombre, descripcion) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Electrónicos',
    'Productos electrónicos y tecnológicos'
WHERE NOT EXISTS (
    SELECT 1 FROM public.categorias 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Electrónicos'
);

INSERT INTO public.categorias (empresa_id, nombre, descripcion) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Ropa',
    'Prendas de vestir y accesorios'
WHERE NOT EXISTS (
    SELECT 1 FROM public.categorias 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Ropa'
);

-- 4. Crear proveedores
INSERT INTO public.proveedores (empresa_id, nombre, ruc_nit, contacto, telefono) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Proveedor Tech SAC',
    '20123456789',
    'Juan Pérez',
    '999-888-777'
WHERE NOT EXISTS (
    SELECT 1 FROM public.proveedores 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Proveedor Tech SAC'
);

-- 5. Crear productos
INSERT INTO public.productos (empresa_id, categoria_id, proveedor_id, codigo, nombre, descripcion, precio_compra, precio_venta) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    c.id,
    p.id,
    'LAPTOP001',
    'Laptop Dell Inspiron 15',
    'Laptop Dell Inspiron 15 - 8GB RAM, 256GB SSD',
    2500.00,
    3200.00
FROM public.categorias c, public.proveedores p
WHERE c.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND c.nombre = 'Electrónicos'
  AND p.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND p.nombre = 'Proveedor Tech SAC'
  AND NOT EXISTS (
    SELECT 1 FROM public.productos 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'LAPTOP001'
  );

INSERT INTO public.productos (empresa_id, categoria_id, proveedor_id, codigo, nombre, descripcion, precio_compra, precio_venta) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    c.id,
    p.id,
    'MOUSE001',
    'Mouse Inalámbrico Logitech',
    'Mouse inalámbrico con receptor USB',
    45.00,
    65.00
FROM public.categorias c, public.proveedores p
WHERE c.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND c.nombre = 'Electrónicos'
  AND p.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND p.nombre = 'Proveedor Tech SAC'
  AND NOT EXISTS (
    SELECT 1 FROM public.productos 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'MOUSE001'
  );

-- 6. Crear variantes
INSERT INTO public.variantes (empresa_id, producto_id, sku, nombre, atributos, precio_compra, precio_venta)
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    prod.id,
    'LAPTOP001-I5-8GB',
    'Laptop Dell Inspiron 15 - Intel i5, 8GB RAM',
    '{"procesador": "Intel i5", "ram": "8GB", "almacenamiento": "256GB SSD"}',
    2500.00,
    3200.00
FROM public.productos prod
WHERE prod.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND prod.codigo = 'LAPTOP001'
  AND NOT EXISTS (
    SELECT 1 FROM public.variantes 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND sku = 'LAPTOP001-I5-8GB'
  );

INSERT INTO public.variantes (empresa_id, producto_id, sku, nombre, atributos, precio_compra, precio_venta)
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    prod.id,
    'MOUSE001-NEGRO',
    'Mouse Inalámbrico Logitech - Negro',
    '{"color": "Negro"}',
    45.00,
    65.00
FROM public.productos prod
WHERE prod.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND prod.codigo = 'MOUSE001'
  AND NOT EXISTS (
    SELECT 1 FROM public.variantes 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND sku = 'MOUSE001-NEGRO'
  );

-- 7. Crear stock inicial
INSERT INTO public.stock_actual (empresa_id, variante_id, ubicacion_id, cantidad_actual, costo_promedio)
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    v.id,
    u.id,
    25,  -- Cantidad inicial
    v.precio_compra
FROM public.variantes v
CROSS JOIN public.ubicaciones u
WHERE v.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND u.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND NOT EXISTS (
    SELECT 1 FROM public.stock_actual 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
      AND variante_id = v.id 
      AND ubicacion_id = u.id
  );

-- =====================================================
-- VERIFICACIÓN DE DATOS CREADOS
-- =====================================================

-- Verificar datos creados
SELECT 
    'UBICACIONES' as tipo, 
    COUNT(*) as cantidad 
FROM public.ubicaciones 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'

UNION ALL

SELECT 
    'PRODUCTOS', 
    COUNT(*) 
FROM public.productos 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'

UNION ALL

SELECT 
    'VARIANTES', 
    COUNT(*) 
FROM public.variantes 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'

UNION ALL

SELECT 
    'STOCK', 
    COUNT(*) 
FROM public.stock_actual 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342';

-- Ver el stock creado con detalles
SELECT 
    p.nombre as producto,
    v.nombre as variante,
    u.nombre as ubicacion,
    sa.cantidad_actual,
    sa.costo_promedio
FROM public.stock_actual sa
JOIN public.variantes v ON sa.variante_id = v.id
JOIN public.productos p ON v.producto_id = p.id
JOIN public.ubicaciones u ON sa.ubicacion_id = u.id
WHERE sa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
ORDER BY p.nombre, u.nombre;