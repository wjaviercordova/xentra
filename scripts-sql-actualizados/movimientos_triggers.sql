-- =====================================================
-- XENTRA - Lógica de Movimientos de Inventario Universal
-- Trigger para Actualización Automática de Stock
-- =====================================================

-- =====================================================
-- FUNCIÓN: Actualizar Stock Automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION actualizar_stock_movimientos()
RETURNS TRIGGER AS $$
DECLARE
    v_motivo_es_adicion BOOLEAN;
    v_stock_actual_record RECORD;
    v_nueva_cantidad INTEGER;
    v_nuevo_costo_promedio DECIMAL(12,2);
    v_costo_total_anterior DECIMAL(12,2);
    v_costo_total_nuevo DECIMAL(12,2);
BEGIN
    -- Obtener información del motivo de movimiento
    SELECT es_adicion INTO v_motivo_es_adicion
    FROM public.motivos_movimiento mm
    INNER JOIN public.movimientos_cabecera mc ON mc.motivo_movimiento_id = mm.id
    WHERE mc.id = NEW.movimiento_cabecera_id;

    -- Buscar el registro de stock actual
    SELECT * INTO v_stock_actual_record
    FROM public.stock_actual
    WHERE empresa_id = NEW.empresa_id
      AND variante_id = NEW.variante_id
      AND ubicacion_id = NEW.ubicacion_id;

    -- Si no existe el registro, crearlo con cantidad 0
    IF v_stock_actual_record IS NULL THEN
        INSERT INTO public.stock_actual (
            empresa_id,
            variante_id,
            ubicacion_id,
            cantidad_actual,
            costo_promedio,
            fecha_ultima_actualizacion
        )
        VALUES (
            NEW.empresa_id,
            NEW.variante_id,
            NEW.ubicacion_id,
            0,
            0,
            NOW()
        );
        
        SELECT * INTO v_stock_actual_record
        FROM public.stock_actual
        WHERE empresa_id = NEW.empresa_id
          AND variante_id = NEW.variante_id
          AND ubicacion_id = NEW.ubicacion_id;
    END IF;

    -- Calcular nueva cantidad según el tipo de movimiento
    IF v_motivo_es_adicion THEN
        -- Movimiento de entrada (Compra, Ajuste Positivo, etc.)
        v_nueva_cantidad := v_stock_actual_record.cantidad_actual + NEW.cantidad;
        
        -- Calcular nuevo costo promedio ponderado
        IF v_nueva_cantidad > 0 AND NEW.precio_unitario > 0 THEN
            v_costo_total_anterior := v_stock_actual_record.cantidad_actual * v_stock_actual_record.costo_promedio;
            v_costo_total_nuevo := NEW.cantidad * NEW.precio_unitario;
            v_nuevo_costo_promedio := (v_costo_total_anterior + v_costo_total_nuevo) / v_nueva_cantidad;
        ELSE
            v_nuevo_costo_promedio := v_stock_actual_record.costo_promedio;
        END IF;
    ELSE
        -- Movimiento de salida (Venta, Ajuste Negativo, etc.)
        v_nueva_cantidad := v_stock_actual_record.cantidad_actual - NEW.cantidad;
        
        -- Validar que no quede stock negativo
        IF v_nueva_cantidad < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente. Stock actual: %, Cantidad a restar: %', 
                v_stock_actual_record.cantidad_actual, NEW.cantidad;
        END IF;
        
        -- Mantener el costo promedio en salidas
        v_nuevo_costo_promedio := v_stock_actual_record.costo_promedio;
    END IF;

    -- Actualizar el stock actual
    UPDATE public.stock_actual
    SET cantidad_actual = v_nueva_cantidad,
        costo_promedio = v_nuevo_costo_promedio,
        fecha_ultima_actualizacion = NOW()
    WHERE id = v_stock_actual_record.id;

    -- Log del movimiento para auditoría
    RAISE INFO 'Stock actualizado - Variante: %, Ubicación: %, Stock anterior: %, Movimiento: %, Stock nuevo: %',
        NEW.variante_id, NEW.ubicacion_id, v_stock_actual_record.cantidad_actual, NEW.cantidad, v_nueva_cantidad;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Aplicar actualización de stock después de INSERT
-- =====================================================
DROP TRIGGER IF EXISTS trigger_actualizar_stock_movimientos ON public.movimientos_detalle;
CREATE TRIGGER trigger_actualizar_stock_movimientos
    AFTER INSERT ON public.movimientos_detalle
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_stock_movimientos();

-- =====================================================
-- FUNCIÓN: Validar Stock antes de Transferencias
-- =====================================================
CREATE OR REPLACE FUNCTION validar_stock_transferencia()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_disponible INTEGER;
BEGIN
    -- Solo validar cuando se cambia el estado a PROCESADO
    IF NEW.estado = 'PROCESADO' AND OLD.estado != 'PROCESADO' THEN
        
        -- Validar stock para cada item de la transferencia
        FOR v_stock_disponible IN 
            SELECT COALESCE(sa.cantidad_actual, 0)
            FROM public.transferencias_detalle td
            LEFT JOIN public.stock_actual sa ON (
                sa.variante_id = td.variante_id 
                AND sa.ubicacion_id = NEW.ubicacion_origen_id
                AND sa.empresa_id = NEW.empresa_id
            )
            WHERE td.transferencia_id = NEW.id
              AND td.cantidad_solicitada > COALESCE(sa.cantidad_actual, 0)
        LOOP
            RAISE EXCEPTION 'Stock insuficiente en ubicación de origen para procesar la transferencia';
        END LOOP;

        -- Si llegamos aquí, hay stock suficiente. Crear movimientos de inventario
        -- Primero crear la cabecera de salida (ubicación origen)
        INSERT INTO public.movimientos_cabecera (
            empresa_id,
            ubicacion_id,
            motivo_movimiento_id,
            numero_documento,
            referencia_documento,
            observaciones,
            usuario_id,
            fecha_movimiento
        )
        SELECT 
            NEW.empresa_id,
            NEW.ubicacion_origen_id,
            mm.id, -- Motivo "Transferencia Salida"
            NEW.numero_transferencia,
            'TRANSFERENCIA_OUT',
            CONCAT('Transferencia a: ', uo.nombre),
            NEW.usuario_procesa_id,
            NOW()
        FROM public.motivos_movimiento mm, public.ubicaciones uo
        WHERE mm.codigo = 'TRANSF_OUT' 
          AND mm.empresa_id = NEW.empresa_id
          AND uo.id = NEW.ubicacion_destino_id;

        -- Crear detalles de salida
        INSERT INTO public.movimientos_detalle (
            empresa_id,
            movimiento_cabecera_id,
            variante_id,
            ubicacion_id,
            cantidad,
            precio_unitario,
            subtotal
        )
        SELECT 
            NEW.empresa_id,
            (SELECT id FROM public.movimientos_cabecera 
             WHERE numero_documento = NEW.numero_transferencia 
               AND ubicacion_id = NEW.ubicacion_origen_id 
             ORDER BY created_at DESC LIMIT 1),
            td.variante_id,
            NEW.ubicacion_origen_id,
            td.cantidad_solicitada,
            COALESCE(sa.costo_promedio, 0),
            td.cantidad_solicitada * COALESCE(sa.costo_promedio, 0)
        FROM public.transferencias_detalle td
        LEFT JOIN public.stock_actual sa ON (
            sa.variante_id = td.variante_id 
            AND sa.ubicacion_id = NEW.ubicacion_origen_id
            AND sa.empresa_id = NEW.empresa_id
        )
        WHERE td.transferencia_id = NEW.id;

        -- Crear cabecera de entrada (ubicación destino)
        INSERT INTO public.movimientos_cabecera (
            empresa_id,
            ubicacion_id,
            motivo_movimiento_id,
            numero_documento,
            referencia_documento,
            observaciones,
            usuario_id,
            fecha_movimiento
        )
        SELECT 
            NEW.empresa_id,
            NEW.ubicacion_destino_id,
            mm.id, -- Motivo "Transferencia Entrada"
            NEW.numero_transferencia,
            'TRANSFERENCIA_IN',
            CONCAT('Transferencia desde: ', uo.nombre),
            NEW.usuario_procesa_id,
            NOW()
        FROM public.motivos_movimiento mm, public.ubicaciones uo
        WHERE mm.codigo = 'TRANSF_IN' 
          AND mm.empresa_id = NEW.empresa_id
          AND uo.id = NEW.ubicacion_origen_id;

        -- Crear detalles de entrada
        INSERT INTO public.movimientos_detalle (
            empresa_id,
            movimiento_cabecera_id,
            variante_id,
            ubicacion_id,
            cantidad,
            precio_unitario,
            subtotal
        )
        SELECT 
            NEW.empresa_id,
            (SELECT id FROM public.movimientos_cabecera 
             WHERE numero_documento = NEW.numero_transferencia 
               AND ubicacion_id = NEW.ubicacion_destino_id 
             ORDER BY created_at DESC LIMIT 1),
            td.variante_id,
            NEW.ubicacion_destino_id,
            td.cantidad_solicitada,
            COALESCE(sa.costo_promedio, 0),
            td.cantidad_solicitada * COALESCE(sa.costo_promedio, 0)
        FROM public.transferencias_detalle td
        LEFT JOIN public.stock_actual sa ON (
            sa.variante_id = td.variante_id 
            AND sa.ubicacion_id = NEW.ubicacion_origen_id
            AND sa.empresa_id = NEW.empresa_id
        )
        WHERE td.transferencia_id = NEW.id;

        -- Actualizar fecha de procesado
        NEW.fecha_procesado := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Aplicar validación y procesado de transferencias
-- =====================================================
DROP TRIGGER IF EXISTS trigger_validar_stock_transferencia ON public.transferencias;
CREATE TRIGGER trigger_validar_stock_transferencia
    BEFORE UPDATE ON public.transferencias
    FOR EACH ROW
    EXECUTE FUNCTION validar_stock_transferencia();

-- =====================================================
-- DATOS INICIALES: Motivos de Movimiento Estándar
-- =====================================================
-- Nota: Estos registros deben insertarse manualmente para cada empresa
-- o mediante una función de inicialización

/*
-- Ejemplo de inserción de motivos estándar (ejecutar por cada empresa)
INSERT INTO public.motivos_movimiento (empresa_id, codigo, nombre, es_adicion, requiere_documento) VALUES
-- Entradas
('EMPRESA_UUID', 'COMPRA', 'Compra de Mercadería', true, true),
('EMPRESA_UUID', 'DEVOLUCION', 'Devolución de Cliente', true, false),
('EMPRESA_UUID', 'AJUSTE_POS', 'Ajuste Positivo', true, false),
('EMPRESA_UUID', 'PRODUCCION', 'Producción Interna', true, false),
('EMPRESA_UUID', 'TRANSF_IN', 'Transferencia Entrada', true, false),

-- Salidas
('EMPRESA_UUID', 'VENTA', 'Venta', false, true),
('EMPRESA_UUID', 'MERMA', 'Merma/Pérdida', false, false),
('EMPRESA_UUID', 'AJUSTE_NEG', 'Ajuste Negativo', false, false),
('EMPRESA_UUID', 'DEVOLUCION_PROV', 'Devolución a Proveedor', false, false),
('EMPRESA_UUID', 'TRANSF_OUT', 'Transferencia Salida', false, false);
*/

-- =====================================================
-- FUNCIÓN AUXILIAR: Consultar Movimientos de una Variante
-- =====================================================
CREATE OR REPLACE FUNCTION consultar_movimientos_variante(
    p_empresa_id UUID,
    p_variante_id UUID,
    p_ubicacion_id UUID DEFAULT NULL,
    p_fecha_desde DATE DEFAULT NULL,
    p_fecha_hasta DATE DEFAULT NULL
)
RETURNS TABLE (
    fecha_movimiento TIMESTAMP WITH TIME ZONE,
    motivo VARCHAR(100),
    documento VARCHAR(50),
    es_entrada BOOLEAN,
    cantidad INTEGER,
    precio_unitario DECIMAL(12,2),
    saldo_cantidad INTEGER,
    costo_promedio DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH movimientos_inventario AS (
        SELECT 
            mc.fecha_movimiento,
            mm.nombre as motivo,
            mc.numero_documento as documento,
            mm.es_adicion as es_entrada,
            md.cantidad,
            md.precio_unitario,
            ROW_NUMBER() OVER (ORDER BY mc.fecha_movimiento, mc.created_at) as rn
        FROM public.movimientos_detalle md
        INNER JOIN public.movimientos_cabecera mc ON mc.id = md.movimiento_cabecera_id
        INNER JOIN public.motivos_movimiento mm ON mm.id = mc.motivo_movimiento_id
        WHERE md.empresa_id = p_empresa_id
          AND md.variante_id = p_variante_id
          AND (p_ubicacion_id IS NULL OR md.ubicacion_id = p_ubicacion_id)
          AND (p_fecha_desde IS NULL OR mc.fecha_movimiento::DATE >= p_fecha_desde)
          AND (p_fecha_hasta IS NULL OR mc.fecha_movimiento::DATE <= p_fecha_hasta)
        ORDER BY mc.fecha_movimiento, mc.created_at
    ),
    movimientos_con_saldo AS (
        SELECT 
            km.*,
            SUM(CASE WHEN es_entrada THEN cantidad ELSE -cantidad END) 
                OVER (ORDER BY rn ROWS UNBOUNDED PRECEDING) as saldo_cantidad
        FROM movimientos_inventario km
    )
    SELECT 
        kcs.fecha_movimiento,
        kcs.motivo,
        kcs.documento,
        kcs.es_entrada,
        kcs.cantidad,
        kcs.precio_unitario,
        kcs.saldo_cantidad,
        -- Obtener costo promedio actual
        COALESCE(sa.costo_promedio, 0)
    FROM movimientos_con_saldo kcs
    LEFT JOIN public.stock_actual sa ON (
        sa.empresa_id = p_empresa_id 
        AND sa.variante_id = p_variante_id
        AND (p_ubicacion_id IS NULL OR sa.ubicacion_id = p_ubicacion_id)
    )
    ORDER BY kcs.fecha_movimiento, kcs.rn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;