-- =====================================================
-- XENTRA - Datos Iniciales y Configuración
-- Script para insertar datos básicos del sistema
-- =====================================================

-- =====================================================
-- FUNCIÓN: Inicializar datos para nueva empresa
-- =====================================================
CREATE OR REPLACE FUNCTION inicializar_empresa(
    p_empresa_nombre VARCHAR(200),
    p_usuario_id UUID,
    p_usuario_nombre VARCHAR(200),
    p_usuario_email VARCHAR(100),
    p_empresa_ruc VARCHAR(20) DEFAULT NULL,
    p_ubicacion_nombre VARCHAR(200) DEFAULT 'Principal'
)
RETURNS UUID AS $$
DECLARE
    v_empresa_id UUID;
    v_ubicacion_id UUID;
BEGIN
    -- 1. Crear empresa
    INSERT INTO public.empresas (
        nombre,
        ruc_nit,
        activo,
        plan_suscripcion
    ) VALUES (
        p_empresa_nombre,
        p_empresa_ruc,
        true,
        'basico'
    ) RETURNING id INTO v_empresa_id;
    
    -- 2. Crear ubicación principal
    INSERT INTO public.ubicaciones (
        empresa_id,
        nombre,
        es_principal,
        tipo,
        activo
    ) VALUES (
        v_empresa_id,
        p_ubicacion_nombre,
        true,
        'sucursal',
        true
    ) RETURNING id INTO v_ubicacion_id;
    
    -- 3. Crear perfil de usuario
    INSERT INTO public.perfiles_usuario (
        id,
        empresa_id,
        nombre_completo,
        rol,
        ubicacion_predeterminada_id,
        activo
    ) VALUES (
        p_usuario_id,
        v_empresa_id,
        p_usuario_nombre,
        'admin',
        v_ubicacion_id,
        true
    );
    
    -- 4. Crear motivos de movimiento estándar
    INSERT INTO public.motivos_movimiento (empresa_id, codigo, nombre, es_adicion, requiere_documento) VALUES
    -- Entradas
    (v_empresa_id, 'COMPRA', 'Compra de Mercadería', true, true),
    (v_empresa_id, 'DEVOLUCION', 'Devolución de Cliente', true, false),
    (v_empresa_id, 'AJUSTE_POS', 'Ajuste Positivo', true, false),
    (v_empresa_id, 'PRODUCCION', 'Producción Interna', true, false),
    (v_empresa_id, 'TRANSF_IN', 'Transferencia Entrada', true, false),
    (v_empresa_id, 'INICIAL', 'Stock Inicial', true, false),
    
    -- Salidas
    (v_empresa_id, 'VENTA', 'Venta', false, true),
    (v_empresa_id, 'MERMA', 'Merma/Pérdida', false, false),
    (v_empresa_id, 'AJUSTE_NEG', 'Ajuste Negativo', false, false),
    (v_empresa_id, 'DEVOLUCION_PROV', 'Devolución a Proveedor', false, false),
    (v_empresa_id, 'TRANSF_OUT', 'Transferencia Salida', false, false);
    
    -- 5. Crear categorías básicas
    INSERT INTO public.categorias (empresa_id, nombre, descripcion, orden) VALUES
    (v_empresa_id, 'General', 'Productos generales', 1),
    (v_empresa_id, 'Electrónicos', 'Productos electrónicos', 2),
    (v_empresa_id, 'Ropa', 'Vestimenta y accesorios', 3),
    (v_empresa_id, 'Hogar', 'Artículos para el hogar', 4),
    (v_empresa_id, 'Servicios', 'Servicios prestados', 5);
    
    RETURN v_empresa_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error inicializando empresa: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Crear producto con variante simple
-- =====================================================
CREATE OR REPLACE FUNCTION crear_producto_simple(
    p_empresa_id UUID,
    p_categoria_id UUID,
    p_codigo VARCHAR(50),
    p_nombre VARCHAR(200),
    p_precio_compra DECIMAL(12,2) DEFAULT 0,
    p_precio_venta DECIMAL(12,2) DEFAULT 0,
    p_stock_inicial INTEGER DEFAULT 0,
    p_ubicacion_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_producto_id UUID;
    v_variante_id UUID;
    v_motivo_inicial_id UUID;
    v_movimiento_cabecera_id UUID;
BEGIN
    -- 1. Crear producto
    INSERT INTO public.productos (
        empresa_id,
        categoria_id,
        codigo,
        nombre,
        precio_compra,
        precio_venta,
        tiene_variantes
    ) VALUES (
        p_empresa_id,
        p_categoria_id,
        p_codigo,
        p_nombre,
        p_precio_compra,
        p_precio_venta,
        false
    ) RETURNING id INTO v_producto_id;
    
    -- 2. Crear variante principal
    INSERT INTO public.variantes (
        empresa_id,
        producto_id,
        sku,
        nombre,
        precio_compra,
        precio_venta
    ) VALUES (
        p_empresa_id,
        v_producto_id,
        p_codigo, -- SKU igual al código del producto
        p_nombre,
        p_precio_compra,
        p_precio_venta
    ) RETURNING id INTO v_variante_id;
    
    -- 3. Si hay stock inicial, crear movimiento
    IF p_stock_inicial > 0 AND p_ubicacion_id IS NOT NULL THEN
        -- Obtener motivo de stock inicial
        SELECT id INTO v_motivo_inicial_id
        FROM public.motivos_movimiento
        WHERE empresa_id = p_empresa_id AND codigo = 'INICIAL'
        LIMIT 1;
        
        -- Crear cabecera de movimiento
        INSERT INTO public.movimientos_cabecera (
            empresa_id,
            ubicacion_id,
            motivo_movimiento_id,
            numero_documento,
            observaciones,
            total_documento,
            fecha_movimiento
        ) VALUES (
            p_empresa_id,
            p_ubicacion_id,
            v_motivo_inicial_id,
            'INICIAL-' || p_codigo,
            'Stock inicial del producto',
            p_stock_inicial * p_precio_compra,
            NOW()
        ) RETURNING id INTO v_movimiento_cabecera_id;
        
        -- Crear detalle de movimiento
        INSERT INTO public.movimientos_detalle (
            empresa_id,
            movimiento_cabecera_id,
            variante_id,
            ubicacion_id,
            cantidad,
            precio_unitario,
            subtotal
        ) VALUES (
            p_empresa_id,
            v_movimiento_cabecera_id,
            v_variante_id,
            p_ubicacion_id,
            p_stock_inicial,
            p_precio_compra,
            p_stock_inicial * p_precio_compra
        );
    END IF;
    
    RETURN v_producto_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creando producto: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DATOS DE EJEMPLO (Opcional)
-- =====================================================

-- Ejemplo de inserción de empresa demo
/*
DO $$
DECLARE
    v_empresa_id UUID;
    v_ubicacion_id UUID;
    v_categoria_id UUID;
BEGIN
    -- Solo ejecutar si no existen empresas
    IF (SELECT COUNT(*) FROM public.empresas) = 0 THEN
        
        -- Crear empresa demo
        v_empresa_id := inicializar_empresa(
            'Empresa Demo',                                    -- p_empresa_nombre
            '00000000-0000-0000-0000-000000000000',           -- p_usuario_id
            'Administrador Demo',                             -- p_usuario_nombre
            'admin@empresademo.com',                          -- p_usuario_email
            '12345678901',                                    -- p_empresa_ruc (opcional)
            'Sucursal Principal'                              -- p_ubicacion_nombre (opcional)
        );
        
        -- Obtener ubicación principal
        SELECT id INTO v_ubicacion_id
        FROM public.ubicaciones
        WHERE empresa_id = v_empresa_id AND es_principal = true
        LIMIT 1;
        
        -- Obtener categoría general
        SELECT id INTO v_categoria_id
        FROM public.categorias
        WHERE empresa_id = v_empresa_id AND nombre = 'General'
        LIMIT 1;
        
        -- Crear productos demo
        PERFORM crear_producto_simple(
            v_empresa_id,
            v_categoria_id,
            'PROD001',
            'Producto Demo 1',
            10.00,
            15.00,
            100,
            v_ubicacion_id
        );
        
        PERFORM crear_producto_simple(
            v_empresa_id,
            v_categoria_id,
            'PROD002',
            'Producto Demo 2',
            20.00,
            30.00,
            50,
            v_ubicacion_id
        );
        
        RAISE NOTICE 'Datos demo creados exitosamente';
    END IF;
END $$;
*/

-- =====================================================
-- FUNCIÓN: Limpiar datos de empresa (Para testing)
-- =====================================================
CREATE OR REPLACE FUNCTION limpiar_empresa(p_empresa_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Eliminar en orden para respetar foreign keys
    DELETE FROM public.movimientos_detalle WHERE empresa_id = p_empresa_id;
    DELETE FROM public.movimientos_cabecera WHERE empresa_id = p_empresa_id;
    DELETE FROM public.transferencias_detalle WHERE empresa_id = p_empresa_id;
    DELETE FROM public.transferencias WHERE empresa_id = p_empresa_id;
    DELETE FROM public.stock_actual WHERE empresa_id = p_empresa_id;
    DELETE FROM public.variantes WHERE empresa_id = p_empresa_id;
    DELETE FROM public.productos WHERE empresa_id = p_empresa_id;
    DELETE FROM public.categorias WHERE empresa_id = p_empresa_id;
    DELETE FROM public.proveedores WHERE empresa_id = p_empresa_id;
    DELETE FROM public.motivos_movimiento WHERE empresa_id = p_empresa_id;
    DELETE FROM public.perfiles_usuario WHERE empresa_id = p_empresa_id;
    DELETE FROM public.ubicaciones WHERE empresa_id = p_empresa_id;
    DELETE FROM public.empresas WHERE id = p_empresa_id;
    
    RAISE NOTICE 'Empresa % limpiada exitosamente', p_empresa_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;