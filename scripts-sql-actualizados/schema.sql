-- =====================================================
-- XENTRA - Sistema de Gestión Comercial Multi-Tenant
-- Diseño de Base de Datos con Row Level Security (RLS)
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLA: empresas (Maestro de empresas/inquilinos)
-- =====================================================
CREATE TABLE public.empresas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    ruc_nit VARCHAR(20) UNIQUE,
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    logo_url TEXT,
    configuracion JSONB DEFAULT '{}', -- Configuraciones específicas por empresa
    activo BOOLEAN DEFAULT true,
    plan_suscripcion VARCHAR(20) DEFAULT 'basico', -- basico, premium, enterprise
    fecha_vencimiento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: ubicaciones (Sucursales/Almacenes por empresa)
-- =====================================================
CREATE TABLE public.ubicaciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    es_principal BOOLEAN DEFAULT false,
    tipo VARCHAR(20) DEFAULT 'sucursal', -- sucursal, almacen, local
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT ubicaciones_empresa_principal UNIQUE(empresa_id, es_principal) DEFERRABLE INITIALLY DEFERRED
);

-- =====================================================
-- TABLA: perfiles_usuario (Perfiles extendidos de auth.users)
-- =====================================================
CREATE TABLE public.perfiles_usuario (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(200) NOT NULL,
    telefono VARCHAR(20),
    avatar_url TEXT,
    rol VARCHAR(20) DEFAULT 'empleado', -- admin, gerente, empleado, vendedor
    ubicacion_predeterminada_id UUID REFERENCES public.ubicaciones(id),
    permisos JSONB DEFAULT '{}', -- Permisos específicos por módulo
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: categorias (Categorías de productos)
-- =====================================================
CREATE TABLE public.categorias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria_padre_id UUID REFERENCES public.categorias(id),
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT categorias_empresa_nombre UNIQUE(empresa_id, nombre)
);

-- =====================================================
-- TABLA: proveedores (Maestro de proveedores)
-- =====================================================
CREATE TABLE public.proveedores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    ruc_nit VARCHAR(20),
    direccion TEXT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    contacto VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT proveedores_empresa_nombre UNIQUE(empresa_id, nombre)
);

-- =====================================================
-- TABLA: productos (Maestro de productos base)
-- =====================================================
CREATE TABLE public.productos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES public.categorias(id),
    proveedor_id UUID REFERENCES public.proveedores(id),
    codigo VARCHAR(50) NOT NULL, -- Código interno del producto
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    marca VARCHAR(100),
    unidad_medida VARCHAR(20) DEFAULT 'UNIDAD', -- UNIDAD, KG, LT, M, etc.
    precio_compra DECIMAL(12,2) DEFAULT 0,
    precio_venta DECIMAL(12,2) DEFAULT 0,
    margen_ganancia DECIMAL(5,2) DEFAULT 0, -- Porcentaje
    tiene_variantes BOOLEAN DEFAULT false,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT productos_empresa_codigo UNIQUE(empresa_id, codigo)
);

-- =====================================================
-- TABLA: variantes (Variantes de productos: talla, color, medida)
-- =====================================================
CREATE TABLE public.variantes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES public.productos(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL, -- SKU único de la variante
    nombre VARCHAR(200) NOT NULL, -- Ej: "Camisa Azul - Talla M"
    atributos JSONB DEFAULT '{}', -- {talla: "M", color: "Azul", medida: "38"}
    precio_compra DECIMAL(12,2),
    precio_venta DECIMAL(12,2),
    stock_minimo INTEGER DEFAULT 0,
    stock_maximo INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT variantes_empresa_sku UNIQUE(empresa_id, sku)
);

-- =====================================================
-- TABLA: stock_actual (Stock actual por variante y ubicación)
-- =====================================================
CREATE TABLE public.stock_actual (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    variante_id UUID REFERENCES public.variantes(id) ON DELETE CASCADE,
    ubicacion_id UUID REFERENCES public.ubicaciones(id) ON DELETE CASCADE,
    cantidad_actual INTEGER DEFAULT 0,
    costo_promedio DECIMAL(12,2) DEFAULT 0, -- Para valorización
    fecha_ultima_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT stock_actual_unique UNIQUE(empresa_id, variante_id, ubicacion_id)
);

-- =====================================================
-- TABLA: motivos_movimiento (Maestro de motivos)
-- =====================================================
CREATE TABLE public.motivos_movimiento (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    es_adicion BOOLEAN NOT NULL, -- true: suma stock, false: resta stock
    requiere_documento BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT motivos_empresa_codigo UNIQUE(empresa_id, codigo)
);

-- =====================================================
-- TABLA: movimientos_cabecera (Cabecera de movimientos)
-- =====================================================
CREATE TABLE public.movimientos_cabecera (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    ubicacion_id UUID REFERENCES public.ubicaciones(id),
    motivo_movimiento_id UUID REFERENCES public.motivos_movimiento(id),
    numero_documento VARCHAR(50), -- Factura, Boleta, Orden, etc.
    referencia_documento VARCHAR(100), -- Documento de referencia
    observaciones TEXT,
    total_documento DECIMAL(12,2) DEFAULT 0,
    usuario_id UUID REFERENCES public.perfiles_usuario(id),
    fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: movimientos_detalle (Detalle de movimientos - MOVIMIENTOS DE INVENTARIO)
-- =====================================================
CREATE TABLE public.movimientos_detalle (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    movimiento_cabecera_id UUID REFERENCES public.movimientos_cabecera(id) ON DELETE CASCADE,
    variante_id UUID REFERENCES public.variantes(id),
    ubicacion_id UUID REFERENCES public.ubicaciones(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: transferencias (Transferencias entre ubicaciones)
-- =====================================================
CREATE TABLE public.transferencias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    numero_transferencia VARCHAR(50) NOT NULL,
    ubicacion_origen_id UUID REFERENCES public.ubicaciones(id),
    ubicacion_destino_id UUID REFERENCES public.ubicaciones(id),
    usuario_solicita_id UUID REFERENCES public.perfiles_usuario(id),
    usuario_procesa_id UUID REFERENCES public.perfiles_usuario(id),
    estado VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, PROCESADO, CANCELADO
    observaciones TEXT,
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_procesado TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT transferencias_empresa_numero UNIQUE(empresa_id, numero_transferencia)
);

-- =====================================================
-- TABLA: transferencias_detalle (Detalle de transferencias)
-- =====================================================
CREATE TABLE public.transferencias_detalle (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    transferencia_id UUID REFERENCES public.transferencias(id) ON DELETE CASCADE,
    variante_id UUID REFERENCES public.variantes(id),
    cantidad_solicitada INTEGER NOT NULL,
    cantidad_procesada INTEGER DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS DE SEGURIDAD
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_actual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos_movimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_cabecera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias_detalle ENABLE ROW LEVEL SECURITY;

-- Función para obtener la empresa_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT empresa_id 
        FROM public.perfiles_usuario 
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas RLS para empresas
CREATE POLICY "Usuarios pueden ver su propia empresa" ON public.empresas
    FOR SELECT USING (id = get_user_empresa_id());

-- Políticas RLS para ubicaciones
CREATE POLICY "Usuarios pueden ver ubicaciones de su empresa" ON public.ubicaciones
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas RLS para perfiles_usuario
CREATE POLICY "Usuarios pueden ver perfiles de su empresa" ON public.perfiles_usuario
    FOR ALL USING (empresa_id = get_user_empresa_id() OR id = auth.uid());

-- Políticas RLS para categorias
CREATE POLICY "Usuarios pueden gestionar categorías de su empresa" ON public.categorias
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas RLS para proveedores
CREATE POLICY "Usuarios pueden gestionar proveedores de su empresa" ON public.proveedores
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas RLS para productos
CREATE POLICY "Usuarios pueden gestionar productos de su empresa" ON public.productos
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas RLS para variantes
CREATE POLICY "Usuarios pueden gestionar variantes de su empresa" ON public.variantes
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas RLS para stock_actual
CREATE POLICY "Usuarios pueden ver stock de su empresa" ON public.stock_actual
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas RLS para motivos_movimiento
CREATE POLICY "Usuarios pueden gestionar motivos de su empresa" ON public.motivos_movimiento
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas RLS para movimientos_cabecera
CREATE POLICY "Usuarios pueden gestionar movimientos de su empresa" ON public.movimientos_cabecera
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas RLS para movimientos_detalle
CREATE POLICY "Usuarios pueden gestionar detalle movimientos de su empresa" ON public.movimientos_detalle
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas RLS para transferencias
CREATE POLICY "Usuarios pueden gestionar transferencias de su empresa" ON public.transferencias
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- Políticas RLS para transferencias_detalle
CREATE POLICY "Usuarios pueden gestionar detalle transferencias de su empresa" ON public.transferencias_detalle
    FOR ALL USING (empresa_id = get_user_empresa_id());

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para búsquedas frecuentes
CREATE INDEX idx_ubicaciones_empresa ON public.ubicaciones(empresa_id);
CREATE INDEX idx_perfiles_usuario_empresa ON public.perfiles_usuario(empresa_id);
CREATE INDEX idx_productos_empresa_codigo ON public.productos(empresa_id, codigo);
CREATE INDEX idx_variantes_empresa_sku ON public.variantes(empresa_id, sku);
CREATE INDEX idx_stock_actual_variante_ubicacion ON public.stock_actual(variante_id, ubicacion_id);
CREATE INDEX idx_movimientos_cabecera_fecha ON public.movimientos_cabecera(fecha_movimiento);
CREATE INDEX idx_movimientos_detalle_cabecera ON public.movimientos_detalle(movimiento_cabecera_id);

-- =====================================================
-- TRIGGERS DE AUDITORÍA
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de updated_at
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ubicaciones_updated_at BEFORE UPDATE ON public.ubicaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perfiles_usuario_updated_at BEFORE UPDATE ON public.perfiles_usuario
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON public.proveedores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON public.productos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_variantes_updated_at BEFORE UPDATE ON public.variantes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();