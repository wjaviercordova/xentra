-- =====================================================
-- XENTRA - Integración de Plantillas de Atributos con Productos/Categorías
-- =====================================================

-- Este script crea la integración entre las plantillas de atributos dinámicos
-- y las categorías de productos para facilitar su uso en SKUs/Variantes

-- 1. Agregar columna para vincular plantilla predeterminada por categoría
ALTER TABLE public.categorias 
ADD COLUMN IF NOT EXISTS plantilla_atributos_predeterminada UUID REFERENCES public.plantillas_atributos(id);

-- 2. Agregar columna para asociar plantilla específica a cada variante
ALTER TABLE public.variantes 
ADD COLUMN IF NOT EXISTS plantilla_atributos_id UUID REFERENCES public.plantillas_atributos(id);

-- Comentario de la nueva columna
COMMENT ON COLUMN public.variantes.plantilla_atributos_id IS 'Plantilla de atributos específica utilizada para esta variante';

-- 3. Crear función para obtener plantilla recomendada por producto
CREATE OR REPLACE FUNCTION obtener_plantilla_recomendada_producto(p_producto_id UUID)
RETURNS TABLE (
    plantilla_id UUID,
    plantilla_nombre VARCHAR,
    sector_negocio VARCHAR,
    total_atributos BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.id as plantilla_id,
        pa.nombre as plantilla_nombre,
        pa.sector_negocio,
        COUNT(da.id) as total_atributos
    FROM public.productos p
    JOIN public.categorias c ON p.categoria_id = c.id
    JOIN public.plantillas_atributos pa ON pa.empresa_id = p.empresa_id
    LEFT JOIN public.definiciones_atributos da ON da.plantilla_id = pa.id
    WHERE p.id = p_producto_id
      AND pa.es_activa = true
    GROUP BY pa.id, pa.nombre, pa.sector_negocio
    ORDER BY 
        CASE WHEN pa.id = c.plantilla_atributos_predeterminada THEN 0 ELSE 1 END,
        pa.es_predeterminada DESC,
        total_atributos DESC;
END;
$$;

-- 4. Crear vista para variantes con información completa de atributos
CREATE OR REPLACE VIEW vista_variantes_con_atributos AS
SELECT 
    v.*,
    p.codigo as producto_codigo,
    p.nombre as producto_nombre,
    c.nombre as categoria_nombre,
    c.plantilla_atributos_predeterminada,
    -- Información de plantilla usada (da prioridad a la específica de la variante)
    CASE 
        WHEN v.plantilla_atributos_id IS NOT NULL THEN (
            SELECT pa.nombre 
            FROM public.plantillas_atributos pa
            WHERE pa.id = v.plantilla_atributos_id
        )
        WHEN v.atributos IS NOT NULL AND c.plantilla_atributos_predeterminada IS NOT NULL THEN (
            SELECT pa.nombre 
            FROM public.plantillas_atributos pa
            WHERE pa.id = c.plantilla_atributos_predeterminada
        )
        ELSE NULL 
    END as plantilla_detectada,
    -- Contar atributos definidos
    CASE 
        WHEN v.atributos IS NOT NULL THEN (
            SELECT COUNT(*)::INTEGER
            FROM jsonb_object_keys(v.atributos) keys
        )
        ELSE 0
    END as total_atributos_definidos
FROM public.variantes v
JOIN public.productos p ON v.producto_id = p.id
JOIN public.categorias c ON p.categoria_id = c.id;

-- 5. Función para validar atributos requeridos de una variante
CREATE OR REPLACE FUNCTION validar_atributos_variante(
    p_variante_id UUID,
    p_plantilla_id UUID DEFAULT NULL
) RETURNS TABLE (
    es_valida BOOLEAN,
    atributos_faltantes TEXT[],
    atributos_invalidos TEXT[]
) LANGUAGE plpgsql AS $$
DECLARE
    v_atributos JSONB;
    v_plantilla_id UUID;
    v_plantilla_especifica UUID;
    faltantes TEXT[] := '{}';
    invalidos TEXT[] := '{}';
BEGIN
    -- Obtener atributos y plantilla específica de la variante
    SELECT atributos, plantilla_atributos_id INTO v_atributos, v_plantilla_especifica
    FROM public.variantes 
    WHERE id = p_variante_id;
    
    -- Determinar qué plantilla usar (prioridad: parámetro > específica > predeterminada)
    IF p_plantilla_id IS NOT NULL THEN
        v_plantilla_id := p_plantilla_id;
    ELSIF v_plantilla_especifica IS NOT NULL THEN
        v_plantilla_id := v_plantilla_especifica;
    ELSE
        -- Usar plantilla predeterminada de la categoría
        SELECT plantilla_atributos_predeterminada INTO v_plantilla_id
        FROM vista_variantes_con_atributos
        WHERE id = p_variante_id;
    END IF;
    
    -- Verificar atributos requeridos
    IF v_plantilla_id IS NOT NULL THEN
        -- Atributos requeridos faltantes
        SELECT array_agg(da.campo_nombre) INTO faltantes
        FROM public.definiciones_atributos da
        WHERE da.plantilla_id = v_plantilla_id
          AND da.es_requerido = true
          AND (v_atributos IS NULL OR NOT v_atributos ? da.campo_nombre);
        
        -- Atributos con valores inválidos (para selecciones)
        SELECT array_agg(da.campo_nombre) INTO invalidos
        FROM public.definiciones_atributos da
        WHERE da.plantilla_id = v_plantilla_id
          AND da.tipo_dato = 'seleccion'
          AND v_atributos ? da.campo_nombre
          AND NOT (v_atributos ->> da.campo_nombre = ANY(
              SELECT jsonb_array_elements_text(da.opciones_predefinidas)
          ));
    END IF;
    
    RETURN QUERY SELECT 
        (COALESCE(array_length(faltantes, 1), 0) = 0 AND 
         COALESCE(array_length(invalidos, 1), 0) = 0) as es_valida,
        COALESCE(faltantes, '{}') as atributos_faltantes,
        COALESCE(invalidos, '{}') as atributos_invalidos;
END;
$$;

-- 6. Crear índice para búsquedas por atributos
CREATE INDEX IF NOT EXISTS idx_variantes_atributos_gin ON public.variantes USING gin (atributos);

-- 7. Función para buscar variantes por atributos específicos
CREATE OR REPLACE FUNCTION buscar_variantes_por_atributos(
    p_empresa_id UUID,
    p_filtros JSONB -- ej: {"color": "Rojo", "talla": "M"}
) RETURNS TABLE (
    variante_id UUID,
    sku VARCHAR,
    nombre VARCHAR,
    atributos_coincidentes JSONB
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as variante_id,
        v.sku,
        v.nombre,
        v.atributos as atributos_coincidentes
    FROM public.variantes v
    WHERE v.empresa_id = p_empresa_id
      AND v.activo = true
      AND v.atributos @> p_filtros;
END;
$$;

-- 8. Comentarios de documentación
COMMENT ON FUNCTION obtener_plantilla_recomendada_producto IS 'Obtiene plantillas de atributos recomendadas para un producto específico';
COMMENT ON VIEW vista_variantes_con_atributos IS 'Vista completa de variantes con información de atributos y plantillas';
COMMENT ON FUNCTION validar_atributos_variante IS 'Valida que una variante tenga todos los atributos requeridos';
COMMENT ON FUNCTION buscar_variantes_por_atributos IS 'Busca variantes que coincidan con atributos específicos';

-- =====================================================
-- DATOS DE EJEMPLO - ASIGNACIÓN DE PLANTILLAS A CATEGORÍAS
-- =====================================================

-- Asignar plantillas predeterminadas a categorías existentes
UPDATE public.categorias 
SET plantilla_atributos_predeterminada = (
    SELECT pa.id 
    FROM public.plantillas_atributos pa 
    WHERE pa.sector_negocio = 'tecnologia' 
      AND pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
    LIMIT 1
)
WHERE nombre ILIKE '%tecnolog%' OR nombre ILIKE '%electronic%' OR nombre ILIKE '%comput%';

UPDATE public.categorias 
SET plantilla_atributos_predeterminada = (
    SELECT pa.id 
    FROM public.plantillas_atributos pa 
    WHERE pa.sector_negocio = 'textil' 
      AND pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
    LIMIT 1
)
WHERE nombre ILIKE '%ropa%' OR nombre ILIKE '%textil%' OR nombre ILIKE '%prenda%';

UPDATE public.categorias 
SET plantilla_atributos_predeterminada = (
    SELECT pa.id 
    FROM public.plantillas_atributos pa 
    WHERE pa.sector_negocio = 'hogar' 
      AND pa.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
    LIMIT 1
)
WHERE nombre ILIKE '%hogar%' OR nombre ILIKE '%casa%' OR nombre ILIKE '%mueble%';

-- =====================================================
-- CONSULTAS DE VERIFICACIÓN
-- =====================================================

-- Ver categorías con plantillas asignadas
SELECT 
    c.nombre as categoria,
    pa.nombre as plantilla_predeterminada,
    pa.sector_negocio,
    COUNT(da.id) as total_atributos
FROM public.categorias c
LEFT JOIN public.plantillas_atributos pa ON c.plantilla_atributos_predeterminada = pa.id
LEFT JOIN public.definiciones_atributos da ON da.plantilla_id = pa.id
WHERE c.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
GROUP BY c.id, c.nombre, pa.nombre, pa.sector_negocio
ORDER BY c.nombre;

-- Ver variantes con sus atributos actuales
SELECT 
    v.sku,
    v.nombre as variante,
    p.nombre as producto,
    c.nombre as categoria,
    v.atributos,
    CASE 
        WHEN v.atributos IS NOT NULL THEN (
            SELECT COUNT(*)::INTEGER
            FROM jsonb_object_keys(v.atributos) keys
        )
        ELSE 0
    END as total_atributos
FROM public.variantes v
JOIN public.productos p ON v.producto_id = p.id  
JOIN public.categorias c ON p.categoria_id = c.id
WHERE v.empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
ORDER BY v.sku;

-- Mensaje de confirmación
SELECT 'Integración de plantillas de atributos con productos completada! 🎉' as mensaje;