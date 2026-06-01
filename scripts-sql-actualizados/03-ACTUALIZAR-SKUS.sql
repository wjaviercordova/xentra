-- =====================================================
-- XENTRA - Actualización de Tabla Variantes a SKUs
-- =====================================================

-- 1. Agregar los campos faltantes a la tabla variantes
ALTER TABLE public.variantes 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50),
ADD COLUMN IF NOT EXISTS ean VARCHAR(13),
ADD COLUMN IF NOT EXISTS peso DECIMAL(10,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS costo_promedio DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- 2. Actualizar comentarios de la tabla para reflejar que son SKUs
COMMENT ON TABLE public.variantes IS 'SKUs - Unidades de Mantenimiento de Stock (Stock Keeping Units)';
COMMENT ON COLUMN public.variantes.sku IS 'Código único del SKU';
COMMENT ON COLUMN public.variantes.nombre IS 'Nombre descriptivo del SKU';
COMMENT ON COLUMN public.variantes.barcode IS 'Código de barras para escáner';
COMMENT ON COLUMN public.variantes.ean IS 'Código EAN-13 europeo';
COMMENT ON COLUMN public.variantes.peso IS 'Peso en kilogramos para logística';
COMMENT ON COLUMN public.variantes.costo_promedio IS 'Costo promedio actualizado del SKU';
COMMENT ON COLUMN public.variantes.imagen_url IS 'URL de imagen específica del SKU (si difiere del producto padre)';
COMMENT ON COLUMN public.variantes.atributos IS 'Atributos específicos del SKU en formato JSON';

-- 3. Actualizar los SKUs existentes con datos de ejemplo realistas
UPDATE public.variantes 
SET 
    barcode = CASE sku
        WHEN 'LAPTOP001-I5-8GB' THEN '7501234567890'
        WHEN 'MOUSE001-NEGRO' THEN '7501234567891'
        ELSE NULL
    END,
    ean = CASE sku
        WHEN 'LAPTOP001-I5-8GB' THEN '1234567890123'
        WHEN 'MOUSE001-NEGRO' THEN '1234567890124'
        ELSE NULL
    END,
    peso = CASE sku
        WHEN 'LAPTOP001-I5-8GB' THEN 2.5
        WHEN 'MOUSE001-NEGRO' THEN 0.12
        ELSE 0.0
    END,
    costo_promedio = precio_compra,
    atributos = CASE sku
        WHEN 'LAPTOP001-I5-8GB' THEN '{"procesador": "Intel Core i5", "ram": "8GB DDR4", "almacenamiento": "256GB SSD", "pantalla": "15.6 pulgadas", "color": "Plateado", "garantia": "2 años"}'::jsonb
        WHEN 'MOUSE001-NEGRO' THEN '{"color": "Negro", "tipo": "Inalámbrico", "dpi": "1600", "botones": "3", "bateria": "AAA x2", "compatibilidad": "Windows/Mac/Linux"}'::jsonb
        ELSE atributos
    END
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342';

-- 4. Crear SKUs adicionales de ejemplo con diferentes características
INSERT INTO public.variantes (empresa_id, producto_id, sku, nombre, atributos, precio_compra, precio_venta, barcode, ean, peso, costo_promedio, stock_minimo, stock_maximo)
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    prod.id,
    'LAPTOP001-I7-16GB',
    'Laptop Dell Inspiron 15 - Intel i7, 16GB RAM',
    '{"procesador": "Intel Core i7", "ram": "16GB DDR4", "almacenamiento": "512GB SSD", "pantalla": "15.6 pulgadas", "color": "Negro", "garantia": "2 años"}'::jsonb,
    3200.00,
    4100.00,
    '7501234567892',
    '1234567890125',
    2.7,
    3200.00,
    2,
    20
FROM public.productos prod
WHERE prod.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND prod.codigo = 'LAPTOP001'
  AND NOT EXISTS (
    SELECT 1 FROM public.variantes 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND sku = 'LAPTOP001-I7-16GB'
  );

INSERT INTO public.variantes (empresa_id, producto_id, sku, nombre, atributos, precio_compra, precio_venta, barcode, ean, peso, costo_promedio, stock_minimo, stock_maximo)
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    prod.id,
    'MOUSE001-BLANCO',
    'Mouse Inalámbrico Logitech - Blanco',
    '{"color": "Blanco", "tipo": "Inalámbrico", "dpi": "1600", "botones": "3", "bateria": "AAA x2", "compatibilidad": "Windows/Mac/Linux"}'::jsonb,
    45.00,
    65.00,
    '7501234567893',
    '1234567890126',
    0.12,
    45.00,
    5,
    50
FROM public.productos prod
WHERE prod.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND prod.codigo = 'MOUSE001'
  AND NOT EXISTS (
    SELECT 1 FROM public.variantes 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND sku = 'MOUSE001-BLANCO'
  );

-- 5. Crear stock para los nuevos SKUs
INSERT INTO public.stock_actual (empresa_id, variante_id, ubicacion_id, cantidad_actual, costo_promedio)
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    v.id,
    u.id,
    15,  -- Cantidad inicial para nuevos SKUs
    v.precio_compra
FROM public.variantes v
CROSS JOIN public.ubicaciones u
WHERE v.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND u.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND v.sku IN ('LAPTOP001-I7-16GB', 'MOUSE001-BLANCO')
  AND NOT EXISTS (
    SELECT 1 FROM public.stock_actual 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
      AND variante_id = v.id 
      AND ubicacion_id = u.id
  );

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Ver todos los SKUs con sus características completas
SELECT 
    p.codigo as producto_codigo,
    p.nombre as producto,
    v.sku,
    v.nombre as sku_nombre,
    v.barcode,
    v.ean,
    v.peso,
    v.precio_compra,
    v.precio_venta,
    v.costo_promedio,
    v.stock_minimo,
    v.stock_maximo,
    v.atributos,
    CASE WHEN v.imagen_url IS NOT NULL THEN 'Sí' ELSE 'No' END as tiene_imagen_propia
FROM public.variantes v
JOIN public.productos p ON v.producto_id = p.id
WHERE v.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
ORDER BY p.codigo, v.sku;

-- Resumen de SKUs por producto
SELECT 
    p.codigo as producto,
    p.nombre,
    COUNT(v.id) as total_skus,
    STRING_AGG(v.sku, ', ' ORDER BY v.sku) as skus_disponibles
FROM public.productos p
LEFT JOIN public.variantes v ON p.id = v.producto_id AND v.empresa_id = p.empresa_id
WHERE p.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
GROUP BY p.codigo, p.nombre
ORDER BY p.codigo;