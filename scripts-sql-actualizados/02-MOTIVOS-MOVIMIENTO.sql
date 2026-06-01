-- =====================================================
-- XENTRA - Motivos de Movimiento de Inventario
-- =====================================================

-- Crear un perfil de usuario de prueba
INSERT INTO public.perfiles_usuario (id, empresa_id, nombre_completo, rol, activo)
SELECT 
    '00000000-0000-0000-0000-000000000000',
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'Usuario Demo',
    'admin',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.perfiles_usuario 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
);

-- Crear motivos de movimiento básicos para la empresa
INSERT INTO public.motivos_movimiento (empresa_id, codigo, nombre, es_adicion, requiere_documento, activo) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'INV_INICIAL',
    'Inventario Inicial',
    true,
    false,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.motivos_movimiento 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'INV_INICIAL'
);

INSERT INTO public.motivos_movimiento (empresa_id, codigo, nombre, es_adicion, requiere_documento, activo) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'COMPRA',
    'Compra de Mercadería',
    true,
    true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.motivos_movimiento 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'COMPRA'
);

INSERT INTO public.motivos_movimiento (empresa_id, codigo, nombre, es_adicion, requiere_documento, activo) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'DEVOL_CLI',
    'Devolución de Cliente',
    true,
    true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.motivos_movimiento 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'DEVOL_CLI'
);

INSERT INTO public.motivos_movimiento (empresa_id, codigo, nombre, es_adicion, requiere_documento, activo) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'AJUSTE_POS',
    'Ajuste Positivo',
    true,
    false,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.motivos_movimiento 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'AJUSTE_POS'
);

-- MOTIVOS DE SALIDA (es_adicion = false)
INSERT INTO public.motivos_movimiento (empresa_id, codigo, nombre, es_adicion, requiere_documento, activo) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'VENTA',
    'Venta',
    false,
    true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.motivos_movimiento 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'VENTA'
);

INSERT INTO public.motivos_movimiento (empresa_id, codigo, nombre, es_adicion, requiere_documento, activo) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'DEVOL_PROV',
    'Devolución a Proveedor',
    false,
    true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.motivos_movimiento 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'DEVOL_PROV'
);

INSERT INTO public.motivos_movimiento (empresa_id, codigo, nombre, es_adicion, requiere_documento, activo) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'MERMA',
    'Merma/Pérdida',
    false,
    false,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.motivos_movimiento 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'MERMA'
);

INSERT INTO public.motivos_movimiento (empresa_id, codigo, nombre, es_adicion, requiere_documento, activo) 
SELECT 
    '70330390-9e39-4662-8f9e-97e1a2e16342',
    'AJUSTE_NEG',
    'Ajuste Negativo',
    false,
    false,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.motivos_movimiento 
    WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342' 
    AND codigo = 'AJUSTE_NEG'
);

-- Verificar motivos creados
SELECT 
    codigo,
    nombre,
    CASE 
        WHEN es_adicion = true THEN 'ENTRADA'
        ELSE 'SALIDA'
    END as tipo,
    requiere_documento,
    activo
FROM public.motivos_movimiento 
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'
ORDER BY es_adicion DESC, nombre;