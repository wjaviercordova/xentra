# XENTRA - Sistema de Gestión Comercial Multi-Inquilino

## 🏢 Descripción del Sistema

**XENTRA** es un sistema de gestión comercial SaaS multi-inquilino diseñado específicamente para PyMEs, con enfoque en rapidez operativa y control total de inventario.

### ✨ Características Principales

- **🏢 Multi-Tenant**: Arquitectura multi-empresa, multi-ubicación y multi-usuario
- **📦 Motor de Inventario Universal (Kardex)**: Sistema unificado de movimientos de inventario
- **🛍️ POS de Alta Velocidad**: Punto de venta optimizado para atajos de teclado
- **🔄 Transferencias Inteligentes**: Gestión de stock entre ubicaciones
- **🔒 Seguridad RLS**: Row Level Security nativo de PostgreSQL

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Mantine UI + Tailwind CSS
- **Estado Global**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Base de Datos**: PostgreSQL con Row Level Security (RLS)

### Modelo de Datos Multi-Tenant

```sql
empresas → ubicaciones → perfiles_usuario
    ↓           ↓
categorias   productos → variantes → stock_actual
    ↓           ↓           ↓
proveedores  movimientos_cabecera → movimientos_detalle
                ↓
          motivos_movimiento
```

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd xentrastock
```

### 2. Configurar Variables de Entorno

Crear archivo `.env.local`:

```env
# Configuración de Supabase
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key

# Configuración de la aplicación
VITE_APP_NAME=Xentra
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION="XENTRA Sistema de Gestión"
```

### 3. Ejecutar Script de Instalación

```bash
chmod +x setup.sh
./setup.sh
```

### 4. Configurar Base de Datos en Supabase

Ejecutar en orden los siguientes scripts SQL en tu proyecto de Supabase:

1. `database/schema.sql` - Estructura de tablas y RLS
2. `database/kardex_triggers.sql` - Lógica de Kardex automático
3. `database/seed_data.sql` - Datos iniciales (opcional)

### 5. Iniciar la Aplicación

```bash
npm install
npm run dev
```

## 📊 Características del Sistema

### 🏢 Multi-Tenant (Multi-Empresa)

- **Aislamiento total** por empresa usando RLS
- **Multi-ubicación**: Cada empresa puede tener múltiples sucursales/almacenes
- **Multi-usuario**: Roles y permisos por usuario y ubicación

### 📦 Motor de Inventario (Kardex Universal)

**Concepto clave**: No existen tablas separadas de compras/ventas. Todo cambio de stock se registra en `movimientos_inventario` (Maestro-Detalle).

#### Flujo del Kardex:

1. **Motivos de Movimiento** definen si suma o resta stock (`es_adicion`)
2. **Movimientos Cabecera** agrupa la operación (Venta, Compra, Ajuste, etc.)
3. **Movimientos Detalle** registra cada producto afectado
4. **Trigger automático** actualiza `stock_actual` en tiempo real

#### Ejemplo de Movimientos:

```sql
-- Compra (suma stock)
COMPRA: es_adicion = true
- Producto A: +50 unidades

-- Venta (resta stock)
VENTA: es_adicion = false
- Producto A: -10 unidades

-- Stock resultante: 40 unidades
```

### 🛍️ POS (Punto de Venta) de Alta Velocidad

Interface diseñada para máxima productividad:

#### Atajos de Teclado:
- **F1**: Focus en búsqueda de productos
- **F2**: Procesar pago
- **F3**: Limpiar venta
- **F4**: Cambiar método de pago
- **Enter**: Agregar producto seleccionado
- **Delete**: Eliminar último item
- **Escape**: Cancelar/limpiar

#### Características:
- **Búsqueda inteligente** por SKU o nombre
- **Validación de stock** en tiempo real
- **Múltiples métodos de pago**
- **Generación automática** de movimientos de kardex

### 🔄 Módulo de Transferencias

Gestión de stock entre ubicaciones con validación automática:

1. **Crear transferencia** (estado: PENDIENTE)
2. **Validar stock** en ubicación de origen
3. **Procesar transferencia** (estado: PROCESADO)
4. **Crear movimientos** automáticos de salida y entrada

### 🔒 Seguridad Row Level Security (RLS)

Cada tabla está protegida por políticas RLS que utilizan `empresa_id`:

```sql
-- Función de seguridad
CREATE FUNCTION get_user_empresa_id() RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT empresa_id 
        FROM public.perfiles_usuario 
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política de ejemplo
CREATE POLICY "Usuarios ven solo datos de su empresa" ON productos
    FOR ALL USING (empresa_id = get_user_empresa_id());
```

## 🎯 Estructura del Proyecto

```
xentrastock/
├── src/
│   ├── components/
│   │   ├── Auth/           # Autenticación
│   │   ├── Layout/         # Layout principal
│   │   ├── POS/           # Punto de venta
│   │   ├── Inventario/    # Gestión de productos
│   │   └── Transferencias/ # Transferencias
│   ├── stores/            # Estados Zustand
│   ├── lib/              # Configuración Supabase
│   └── utils/            # Utilidades
├── database/
│   ├── schema.sql        # Estructura DB + RLS
│   ├── kardex_triggers.sql # Lógica Kardex
│   └── seed_data.sql     # Datos iniciales
└── docs/                 # Documentación
```

## 🔧 Funcionalidades Implementadas

### ✅ Completado

- **Sistema de autenticación** con Supabase Auth
- **Store global** con Zustand (empresa, ubicación, sesión)
- **Layout responsive** con Mantine UI
- **Componente POS** con atajos de teclado
- **Esquema de base de datos** completo con RLS
- **Triggers de Kardex** automáticos
- **Validaciones de transferencia**

### 🚧 En Desarrollo

- Módulo de Inventario (CRUD productos/variantes)
- Módulo de Transferencias (UI completa)
- Reportes de Kardex
- Módulo de Configuración
- Dashboard principal

### 📋 Por Implementar

- Reportes avanzados
- Facturación electrónica
- API REST
- App móvil
- Módulo de compras
- CRM básico

## 🎮 Uso del Sistema

### Inicializar Nueva Empresa

```sql
SELECT inicializar_empresa(
    'Mi Empresa',           -- Nombre empresa
    '12345678901',         -- RUC/NIT
    'Sucursal Principal',  -- Nombre ubicación
    'user-uuid',           -- ID usuario
    'Juan Pérez',          -- Nombre usuario
    'juan@empresa.com'     -- Email usuario
);
```

### Crear Producto Simple

```sql
SELECT crear_producto_simple(
    'empresa-uuid',        -- ID empresa
    'categoria-uuid',      -- ID categoría
    'PROD001',             -- Código producto
    'Mi Producto',         -- Nombre
    10.00,                 -- Precio compra
    15.00,                 -- Precio venta
    100,                   -- Stock inicial
    'ubicacion-uuid'       -- ID ubicación
);
```

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -am 'Agregar nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@xentra.com
- Documentación: [docs.xentra.com](https://docs.xentra.com)

---

**XENTRA** - Sistema de Gestión Comercial para PyMEs 🚀