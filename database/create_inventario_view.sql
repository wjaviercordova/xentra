-- =====================================================
-- XENTRA - Vista para compatibilidad con inventario
-- =====================================================

-- Crear vista inventario que mapee desde stock_actual
CREATE OR REPLACE VIEW public.inventario AS
SELECT 
    sa.id,
    sa.empresa_id,
    v.producto_id,
    sa.variante_id,
    sa.ubicacion_id,
    sa.cantidad_actual as stock_actual,
    COALESCE(p.stock_minimo, 0) as stock_minimo,
    COALESCE(p.stock_maximo, 0) as stock_maximo,
    sa.costo_promedio,
    sa.fecha_ultima_actualizacion::text as ultimo_movimiento
FROM public.stock_actual sa
JOIN public.variantes v ON sa.variante_id = v.id
JOIN public.productos p ON v.producto_id = p.id;

-- Grant permisos a authenticated users
GRANT SELECT ON public.inventario TO authenticated;

-- Crear políticas RLS para la vista
ALTER VIEW public.inventario SET ROW LEVEL SECURITY ON;

CREATE POLICY "Usuarios pueden ver inventario de su empresa" ON public.inventario
    FOR SELECT USING (
        empresa_id IN (
            SELECT pu.empresa_id 
            FROM public.perfiles_usuario pu 
            WHERE pu.id = auth.uid()
        )
    );