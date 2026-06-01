-- =====================================================
-- XENTRA - Agregar Atributos Multi-Valor (Colores, Tallas, etc.)
-- =====================================================
-- Ejecutar en el Editor SQL de Supabase

-- Agregar atributos multi-valor a plantilla Textil
INSERT INTO public.definiciones_atributos (
    plantilla_id,
    campo_nombre,
    campo_etiqueta,
    tipo_dato,
    es_requerido,
    orden,
    descripcion,
    opciones_predefinidas
) 
SELECT 
    pa.id as plantilla_id,
    'colores_disponibles' as campo_nombre,
    'Colores Disponibles' as campo_etiqueta,
    'multiple' as tipo_dato,
    false as es_requerido,
    15 as orden,
    'Selecciona todos los colores disponibles para este producto' as descripcion,
    '["Blanco", "Negro", "Gris", "Azul", "Rojo", "Verde", "Amarillo", "Rosa", "Beige", "Marrón", "Naranja", "Violeta"]'::jsonb as opciones_predefinidas
FROM public.plantillas_atributos pa
WHERE pa.sector_negocio = 'textil' 
  AND pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND NOT EXISTS (
    SELECT 1 FROM public.definiciones_atributos da 
    WHERE da.plantilla_id = pa.id AND da.campo_nombre = 'colores_disponibles'
  );

-- Agregar tallas múltiples a plantilla Textil
INSERT INTO public.definiciones_atributos (
    plantilla_id,
    campo_nombre,
    campo_etiqueta,
    tipo_dato,
    es_requerido,
    orden,
    descripcion,
    opciones_predefinidas
) 
SELECT 
    pa.id as plantilla_id,
    'tallas_disponibles' as campo_nombre,
    'Tallas Disponibles' as campo_etiqueta,
    'multiple' as tipo_dato,
    false as es_requerido,
    16 as orden,
    'Selecciona todas las tallas disponibles para este producto' as descripcion,
    '["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Talla única"]'::jsonb as opciones_predefinidas
FROM public.plantillas_atributos pa
WHERE pa.sector_negocio = 'textil' 
  AND pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND NOT EXISTS (
    SELECT 1 FROM public.definiciones_atributos da 
    WHERE da.plantilla_id = pa.id AND da.campo_nombre = 'tallas_disponibles'
  );

-- Agregar atributos multi-valor a plantilla Tecnología
INSERT INTO public.definiciones_atributos (
    plantilla_id,
    campo_nombre,
    campo_etiqueta,
    tipo_dato,
    es_requerido,
    orden,
    descripcion,
    opciones_predefinidas
) 
SELECT 
    pa.id as plantilla_id,
    'conectividad' as campo_nombre,
    'Opciones de Conectividad' as campo_etiqueta,
    'multiple' as tipo_dato,
    false as es_requerido,
    15 as orden,
    'Selecciona todas las opciones de conectividad disponibles' as descripcion,
    '["WiFi", "Bluetooth", "USB-C", "USB-A", "HDMI", "Ethernet", "Jack 3.5mm", "Wireless", "NFC", "Thunderbolt"]'::jsonb as opciones_predefinidas
FROM public.plantillas_atributos pa
WHERE pa.sector_negocio = 'tecnologia' 
  AND pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND NOT EXISTS (
    SELECT 1 FROM public.definiciones_atributos da 
    WHERE da.plantilla_id = pa.id AND da.campo_nombre = 'conectividad'
  );

-- Agregar sistemas operativos compatibles
INSERT INTO public.definiciones_atributos (
    plantilla_id,
    campo_nombre,
    campo_etiqueta,
    tipo_dato,
    es_requerido,
    orden,
    descripcion,
    opciones_predefinidas
) 
SELECT 
    pa.id as plantilla_id,
    'sistemas_compatibles' as campo_nombre,
    'Sistemas Operativos Compatibles' as campo_etiqueta,
    'multiple' as tipo_dato,
    false as es_requerido,
    16 as orden,
    'Sistemas operativos con los que es compatible' as descripcion,
    '["Windows 11", "Windows 10", "macOS", "Linux", "iOS", "Android", "Chrome OS", "Ubuntu"]'::jsonb as opciones_predefinidas
FROM public.plantillas_atributos pa
WHERE pa.sector_negocio = 'tecnologia' 
  AND pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND NOT EXISTS (
    SELECT 1 FROM public.definiciones_atributos da 
    WHERE da.plantilla_id = pa.id AND da.campo_nombre = 'sistemas_compatibles'
  );

-- Agregar atributos multi-valor a plantilla Hogar
INSERT INTO public.definiciones_atributos (
    plantilla_id,
    campo_nombre,
    campo_etiqueta,
    tipo_dato,
    es_requerido,
    orden,
    descripcion,
    opciones_predefinidas
) 
SELECT 
    pa.id as plantilla_id,
    'espacios_uso' as campo_nombre,
    'Espacios de Uso' as campo_etiqueta,
    'multiple' as tipo_dato,
    false as es_requerido,
    15 as orden,
    'Espacios del hogar donde se puede usar este producto' as descripcion,
    '["Sala", "Cocina", "Dormitorio", "Baño", "Comedor", "Estudio", "Jardín", "Balcón", "Lavandería", "Garaje"]'::jsonb as opciones_predefinidas
FROM public.plantillas_atributos pa
WHERE pa.sector_negocio = 'hogar' 
  AND pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
  AND NOT EXISTS (
    SELECT 1 FROM public.definiciones_atributos da 
    WHERE da.plantilla_id = pa.id AND da.campo_nombre = 'espacios_uso'
  );

-- Verificación de atributos multi-valor creados
SELECT 
    pa.sector_negocio,
    pa.nombre as plantilla,
    da.campo_etiqueta,
    da.tipo_dato,
    jsonb_array_length(da.opciones_predefinidas) as total_opciones,
    da.opciones_predefinidas
FROM public.plantillas_atributos pa
JOIN public.definiciones_atributos da ON pa.id = da.plantilla_id
WHERE da.tipo_dato = 'multiple'
  AND pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
ORDER BY pa.sector_negocio, da.orden;

-- Mensaje de confirmación
SELECT '✅ Atributos multi-valor agregados exitosamente! Ahora puedes usar colores múltiples, tallas, conectividad, etc. 🎨' as mensaje;