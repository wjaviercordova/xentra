-- =====================================================
-- XENTRA - Datos de Prueba Completos
-- Ejecutar DESPUÉS del script de instalación
-- =====================================================

-- 1. Crear empresa de prueba y obtener su ID
INSERT INTO public.empresas (id, nombre, ruc_nit, direccion) 
VALUES (
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Empresa Demo XENTRA', 
    '12345678901', 
    'Av. Principal 123, Lima'
) ON CONFLICT (ruc_nit) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    direccion = EXCLUDED.direccion;

-- 2. Crear ubicaciones de prueba
INSERT INTO public.ubicaciones (id, empresa_id, nombre, direccion, es_principal, tipo) 
SELECT * FROM (VALUES
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        'Almacén Principal',
        'Av. Principal 123',
        true,
        'almacen'
    ),
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        'Tienda Centro',
        'Jr. Comercio 456',
        false,
        'sucursal'
    )
) AS ubicaciones_data(id, empresa_id, nombre, direccion, es_principal, tipo)
WHERE NOT EXISTS (
    SELECT 1 FROM public.ubicaciones 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = ubicaciones_data.nombre
);

-- 3. Crear categorías de prueba
INSERT INTO public.categorias (id, empresa_id, nombre, descripcion) 
SELECT * FROM (VALUES
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        'Electrónicos',
        'Productos electrónicos y tecnológicos'
    ),
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        'Ropa',
        'Prendas de vestir y accesorios'
    )
) AS categorias_data(id, empresa_id, nombre, descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM public.categorias 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = categorias_data.nombre
);

-- 4. Crear proveedores de prueba
INSERT INTO public.proveedores (id, empresa_id, nombre, ruc_nit, contacto, telefono) 
SELECT * FROM (VALUES
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        'Proveedor Tech SAC',
        '20123456789',
        'Juan Pérez',
        '999-888-777'
    ),
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        'Textiles del Sur EIRL',
        '20987654321',
        'María González',
        '888-777-666'
    )
) AS proveedores_data(id, empresa_id, nombre, ruc_nit, contacto, telefono)
WHERE NOT EXISTS (
    SELECT 1 FROM public.proveedores 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = proveedores_data.nombre
);

-- 5. Crear productos de prueba
WITH categoria_electronica AS (
    SELECT id FROM public.categorias 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Electrónicos' 
    LIMIT 1
),
categoria_ropa AS (
    SELECT id FROM public.categorias 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Ropa' 
    LIMIT 1
),
proveedor_tech AS (
    SELECT id FROM public.proveedores 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Proveedor Tech SAC' 
    LIMIT 1
),
proveedor_textil AS (
    SELECT id FROM public.proveedores 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Textiles del Sur EIRL' 
    LIMIT 1
)
INSERT INTO public.productos (id, empresa_id, categoria_id, proveedor_id, codigo, nombre, descripcion, precio_compra, precio_venta, tiene_variantes) 
SELECT * FROM (VALUES
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        (SELECT id FROM categoria_electronica),
        (SELECT id FROM proveedor_tech),
        'LAPTOP001',
        'Laptop Dell Inspiron 15',
        'Laptop Dell Inspiron 15 - 8GB RAM, 256GB SSD',
        2500.00,
        3200.00,
        true
    ),
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        (SELECT id FROM categoria_electronica),
        (SELECT id FROM proveedor_tech),
        'MOUSE001',
        'Mouse Inalámbrico Logitech',
        'Mouse inalámbrico con receptor USB',
        45.00,
        65.00,
        false
    ),
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        (SELECT id FROM categoria_ropa),
        (SELECT id FROM proveedor_textil),
        'CAMISA001',
        'Camisa Casual Manga Larga',
        'Camisa casual de algodón',
        80.00,
        120.00,
        true
    )
) AS productos_data(id, empresa_id, categoria_id, proveedor_id, codigo, nombre, descripcion, precio_compra, precio_venta, tiene_variantes)
ON CONFLICT (empresa_id, codigo) DO NOTHING;

-- 6. Crear variantes de prueba
WITH producto_laptop AS (
    SELECT id FROM public.productos 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'LAPTOP001' 
    LIMIT 1
),
producto_mouse AS (
    SELECT id FROM public.productos 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'MOUSE001' 
    LIMIT 1
),
producto_camisa AS (
    SELECT id FROM public.productos 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'CAMISA001' 
    LIMIT 1
)
INSERT INTO public.variantes (id, empresa_id, producto_id, sku, nombre, atributos, precio_compra, precio_venta)
SELECT * FROM (VALUES
    -- Variantes de Laptop
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        (SELECT id FROM producto_laptop),
        'LAPTOP001-I5-8GB',
        'Laptop Dell Inspiron 15 - Intel i5, 8GB RAM',
        '{"procesador": "Intel i5", "ram": "8GB", "almacenamiento": "256GB SSD"}',
        2500.00,
        3200.00
    ),
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        (SELECT id FROM producto_laptop),
        'LAPTOP001-I7-16GB',
        'Laptop Dell Inspiron 15 - Intel i7, 16GB RAM',
        '{"procesador": "Intel i7", "ram": "16GB", "almacenamiento": "512GB SSD"}',
        3200.00,
        4000.00
    ),
    -- Variante única de Mouse
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        (SELECT id FROM producto_mouse),
        'MOUSE001-NEGRO',
        'Mouse Inalámbrico Logitech - Negro',
        '{"color": "Negro"}',
        45.00,
        65.00
    ),
    -- Variantes de Camisa
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        (SELECT id FROM producto_camisa),
        'CAMISA001-AZUL-M',
        'Camisa Casual - Azul Talla M',
        '{"color": "Azul", "talla": "M"}',
        80.00,
        120.00
    ),
    (
        gen_random_uuid(),
        '70330390-9e39-4662-8f9e-97e1a2e16342',
        (SELECT id FROM producto_camisa),
        'CAMISA001-BLANCA-L',
        'Camisa Casual - Blanca Talla L',
        '{"color": "Blanca", "talla": "L"}',
        80.00,
        120.00
    )
) AS variantes_data(id, empresa_id, producto_id, sku, nombre, atributos, precio_compra, precio_venta)
ON CONFLICT (empresa_id, sku) DO NOTHING;

-- 7. Crear stock inicial
WITH ubicacion_almacen AS (
    SELECT id FROM public.ubicaciones 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Almacén Principal' 
    LIMIT 1
),
ubicacion_tienda AS (
    SELECT id FROM public.ubicaciones 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND nombre = 'Tienda Centro' 
    LIMIT 1
)
INSERT INTO public.stock_actual (empresa_id, variante_id, ubicacion_id, cantidad_actual, costo_promedio)
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    v.id,
    u.id,
    CASE 
        WHEN v.sku LIKE '%LAPTOP%' THEN 5
        WHEN v.sku LIKE '%MOUSE%' THEN 25
        WHEN v.sku LIKE '%CAMISA%' THEN 15
        ELSE 10
    END as cantidad,
    v.precio_compra
FROM public.variantes v
CROSS JOIN (
    SELECT id FROM ubicacion_almacen
    UNION ALL
    SELECT id FROM ubicacion_tienda
) u
WHERE v.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
ON CONFLICT (empresa_id, variante_id, ubicacion_id) DO UPDATE SET
    cantidad_actual = EXCLUDED.cantidad_actual,
    costo_promedio = EXCLUDED.costo_promedio;

-- =====================================================
-- VERIFICACIÓN DE DATOS CREADOS
-- =====================================================

-- Ver empresas creadas
SELECT 'EMPRESAS' as tabla, COUNT(*) as registros FROM public.empresas WHERE id = '70330390-9e39-4662-8f9e-97e1a2e16342'
UNION ALL
-- Ver ubicaciones
SELECT 'UBICACIONES', COUNT(*) FROM public.ubicaciones WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
UNION ALL
-- Ver productos
SELECT 'PRODUCTOS', COUNT(*) FROM public.productos WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
UNION ALL
-- Ver variantes
SELECT 'VARIANTES', COUNT(*) FROM public.variantes WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
UNION ALL
-- Ver stock
SELECT 'STOCK', COUNT(*) FROM public.stock_actual WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342';

-- Ver detalle del stock creado
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
ORDER BY p.nombre, v.nombre, u.nombre;