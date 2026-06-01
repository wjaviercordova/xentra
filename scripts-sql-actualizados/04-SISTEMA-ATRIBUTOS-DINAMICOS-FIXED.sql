-- =====================================================
-- XENTRA - Sistema de Atributos Dinámicos Parametrizables (VERSIÓN CORREGIDA)
-- =====================================================

-- 1. TABLA DE PLANTILLAS DE ATRIBUTOS POR CATEGORÍA
CREATE TABLE IF NOT EXISTS public.plantillas_atributos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
    sector_negocio VARCHAR(100) NOT NULL, -- 'calzado', 'textil', 'alimenticio', 'hogar', 'tecnologia', etc.
    nombre VARCHAR(100) NOT NULL, -- Nombre de la plantilla ej: "Ropa Casual", "Calzado Deportivo"
    descripcion TEXT,
    es_activa BOOLEAN DEFAULT true,
    es_predeterminada BOOLEAN DEFAULT false, -- Si es la plantilla por defecto para la categoría
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 2. TABLA DE DEFINICIÓN DE CAMPOS DE ATRIBUTOS
CREATE TABLE IF NOT EXISTS public.definiciones_atributos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plantilla_id UUID NOT NULL REFERENCES public.plantillas_atributos(id) ON DELETE CASCADE,
    campo_nombre VARCHAR(100) NOT NULL, -- 'color', 'talla', 'peso', etc.
    campo_etiqueta VARCHAR(100) NOT NULL, -- 'Color', 'Talla', 'Peso (kg)'
    tipo_dato VARCHAR(50) NOT NULL, -- 'texto', 'numero', 'decimal', 'seleccion', 'multiple', 'boolean', 'fecha'
    es_requerido BOOLEAN DEFAULT false,
    orden INTEGER DEFAULT 0,
    opciones_predefinidas JSONB, -- Para campos de selección: ["Rojo", "Azul", "Verde"]
    validaciones JSONB, -- Reglas de validación: {"min": 0, "max": 100, "pattern": "^[A-Z]"}
    unidad_medida VARCHAR(20), -- 'kg', 'cm', 'pulgadas', etc.
    descripcion TEXT,
    
    CONSTRAINT unique_campo_plantilla UNIQUE(plantilla_id, campo_nombre)
);

-- 3. ÍNDICES PARA RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_plantillas_empresa_categoria ON public.plantillas_atributos(empresa_id, categoria_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_sector ON public.plantillas_atributos(sector_negocio);
CREATE INDEX IF NOT EXISTS idx_definiciones_plantilla ON public.definiciones_atributos(plantilla_id);

-- 4. COMENTARIOS DE DOCUMENTACIÓN
COMMENT ON TABLE public.plantillas_atributos IS 'Plantillas de atributos configurables por categoría y sector de negocio';
COMMENT ON TABLE public.definiciones_atributos IS 'Definición de campos específicos para cada plantilla de atributos';

-- =====================================================
-- DATOS DE EJEMPLO POR SECTOR - VERSIÓN SIMPLIFICADA SIN ERRORES
-- =====================================================

-- Eliminar plantillas existentes para evitar duplicados
DELETE FROM public.plantillas_atributos WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342';

-- 1. PLANTILLA PARA HOGAR
INSERT INTO public.plantillas_atributos (empresa_id, sector_negocio, nombre, descripcion, es_predeterminada) 
VALUES (
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'hogar',
    'Productos para el Hogar',
    'Atributos estándar para productos de hogar y decoración',
    true
);

-- 2. PLANTILLA PARA TECNOLOGÍA
INSERT INTO public.plantillas_atributos (empresa_id, sector_negocio, nombre, descripcion, es_predeterminada) 
VALUES (
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'tecnologia',
    'Productos Tecnológicos',
    'Atributos para equipos electrónicos y tecnológicos',
    false
);

-- 3. PLANTILLA PARA CALZADO
INSERT INTO public.plantillas_atributos (empresa_id, sector_negocio, nombre, descripcion) 
VALUES (
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'calzado',
    'Calzado General',
    'Atributos estándar para productos de calzado'
);

-- 4. PLANTILLA PARA TEXTIL
INSERT INTO public.plantillas_atributos (empresa_id, sector_negocio, nombre, descripcion) 
VALUES (
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'textil',
    'Prendas de Vestir',
    'Atributos para ropa y productos textiles'
);

-- 5. PLANTILLA PARA ALIMENTICIO
INSERT INTO public.plantillas_atributos (empresa_id, sector_negocio, nombre, descripcion) 
VALUES (
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'alimenticio',
    'Productos Alimenticios',
    'Atributos para alimentos y bebidas'
);

-- =====================================================
-- DEFINICIONES DE ATRIBUTOS - SECTOR HOGAR
-- =====================================================

-- Color para Hogar
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'color',
    'Color',
    'seleccion',
    true,
    1,
    '["Blanco", "Beige", "Gris", "Negro", "Azul", "Verde", "Rojo", "Rosa", "Amarillo"]'::jsonb,
    'Color principal del producto'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'hogar';

-- Firmeza para Hogar
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'firmeza',
    'Nivel de Firmeza',
    'seleccion',
    false,
    2,
    '["Extra Suave", "Suave", "Media", "Firme", "Extra Firme"]'::jsonb,
    'Nivel de firmeza del colchón o cojín'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'hogar';

-- Medida para Hogar
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, validaciones, unidad_medida, descripcion)
SELECT 
    pa.id,
    'medida',
    'Medidas',
    'texto',
    true,
    3,
    '{"pattern": "^\\d+x\\d+(x\\d+)?$", "placeholder": "Ej: 105x190 o 105x190x25"}'::jsonb,
    'cm',
    'Dimensiones del producto (largo x ancho x alto)'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'hogar';

-- Material para Hogar
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'material',
    'Material',
    'seleccion',
    false,
    4,
    '["Algodón", "Poliéster", "Lino", "Memory Foam", "Latex", "Microfibra", "Seda"]'::jsonb,
    'Material principal del producto'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'hogar';

-- =====================================================
-- DEFINICIONES DE ATRIBUTOS - SECTOR TECNOLOGÍA
-- =====================================================

-- Procesador para Tecnología
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'procesador',
    'Procesador',
    'seleccion',
    false,
    1,
    '["Intel Core i3", "Intel Core i5", "Intel Core i7", "Intel Core i9", "AMD Ryzen 3", "AMD Ryzen 5", "AMD Ryzen 7", "AMD Ryzen 9"]'::jsonb,
    'Tipo de procesador'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'tecnologia';

-- RAM para Tecnología
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'ram',
    'Memoria RAM',
    'seleccion',
    false,
    2,
    '["4GB", "8GB", "16GB", "32GB", "64GB"]'::jsonb,
    'Cantidad de memoria RAM'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'tecnologia';

-- =====================================================
-- DEFINICIONES DE ATRIBUTOS - SECTOR CALZADO
-- =====================================================

-- Talla para Calzado
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'talla',
    'Talla',
    'seleccion',
    true,
    1,
    '["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"]'::jsonb,
    'Talla del calzado'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'calzado';

-- Color para Calzado
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'color',
    'Color',
    'seleccion',
    true,
    2,
    '["Negro", "Marrón", "Blanco", "Gris", "Azul", "Rojo", "Verde"]'::jsonb,
    'Color del calzado'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'calzado';

-- =====================================================
-- DEFINICIONES DE ATRIBUTOS - SECTOR TEXTIL
-- =====================================================

-- Talla para Textil
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'talla',
    'Talla',
    'seleccion',
    true,
    1,
    '["XS", "S", "M", "L", "XL", "XXL", "XXXL"]'::jsonb,
    'Talla de la prenda'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'textil';

-- Color para Textil
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'color',
    'Color',
    'seleccion',
    true,
    2,
    '["Negro", "Blanco", "Azul", "Rojo", "Verde", "Amarillo", "Gris", "Rosa", "Morado"]'::jsonb,
    'Color de la prenda'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'textil';

-- =====================================================
-- DEFINICIONES DE ATRIBUTOS - SECTOR ALIMENTICIO
-- =====================================================

-- Sabor para Alimenticio
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'sabor',
    'Sabor',
    'seleccion',
    false,
    1,
    '["Original", "Chocolate", "Vainilla", "Fresa", "Limón", "Naranja"]'::jsonb,
    'Sabor del producto'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'alimenticio';

-- Presentación para Alimenticio
INSERT INTO public.definiciones_atributos (plantilla_id, campo_nombre, campo_etiqueta, tipo_dato, es_requerido, orden, opciones_predefinidas, descripcion)
SELECT 
    pa.id,
    'presentacion',
    'Presentación',
    'seleccion',
    false,
    2,
    '["Botella", "Lata", "Caja", "Bolsa", "Frasco", "Sobre"]'::jsonb,
    'Tipo de envase o presentación'
FROM public.plantillas_atributos pa
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
  AND pa.sector_negocio = 'alimenticio';

-- =====================================================
-- VERIFICACIONES Y CONSULTAS FINALES
-- =====================================================

-- Ver todas las plantillas creadas
SELECT 
    pa.sector_negocio,
    pa.nombre as plantilla,
    pa.descripcion,
    COUNT(da.id) as total_campos,
    STRING_AGG(da.campo_etiqueta, ', ' ORDER BY da.orden) as campos_disponibles
FROM public.plantillas_atributos pa
LEFT JOIN public.definiciones_atributos da ON pa.id = da.plantilla_id
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
GROUP BY pa.sector_negocio, pa.nombre, pa.descripcion, pa.id
ORDER BY pa.sector_negocio, pa.nombre;

-- Ver definición completa de atributos por sector
SELECT 
    pa.sector_negocio,
    pa.nombre as plantilla,
    da.campo_nombre,
    da.campo_etiqueta,
    da.tipo_dato,
    da.es_requerido,
    da.opciones_predefinidas,
    da.unidad_medida,
    da.descripcion
FROM public.plantillas_atributos pa
JOIN public.definiciones_atributos da ON pa.id = da.plantilla_id
WHERE pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
ORDER BY pa.sector_negocio, pa.nombre, da.orden;

-- Mensaje de confirmación
SELECT 'Sistema de atributos dinámicos instalado correctamente! 🎉' as mensaje;