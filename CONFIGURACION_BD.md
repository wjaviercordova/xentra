# 🔧 CONFIGURACIÓN DE BASE DE DATOS SUPABASE - XENTRA

## 🎯 Problema Identificado
La tabla `inventario` no existe en la base de datos. El código ha sido actualizado para usar la tabla `stock_actual` que está definida en el schema.

## 📋 Pasos para Configurar la Base de Datos

### 1. **Acceder al Panel de Supabase**
- Ve a: https://szheqarnqtfkbdoyozca.supabase.co
- Inicia sesión en tu cuenta de Supabase

### 2. **Ejecutar Scripts en Orden**
Ve a **SQL Editor** y ejecuta estos archivos en este orden:

#### **Script 1: Schema Principal**
```bash
database/schema.sql
```
- Crea todas las tablas principales
- Configura Row Level Security (RLS)
- Establece políticas de seguridad

#### **Script 2: Triggers de Movimientos**
```bash
database/movimientos_triggers.sql
```
- Configura triggers automáticos para movimientos
- Mantiene sincronizado el stock actual

#### **Script 3: Datos Iniciales (Opcional)**
```bash
database/seed_data.sql
```
- Datos de prueba para testing
- Empresas, productos, categorías de ejemplo

### 3. **Verificar Configuración**
Después de ejecutar los scripts, verifica que existan estas tablas:
- ✅ `empresas`
- ✅ `ubicaciones`
- ✅ `productos`
- ✅ `variantes`
- ✅ `stock_actual`
- ✅ `movimientos_cabecera`
- ✅ `movimientos_detalle`

### 4. **Crear Usuario y Empresa**
1. Registra un usuario desde la app (http://localhost:5174)
2. El sistema automáticamente:
   - Creará el perfil del usuario
   - Te permitirá crear/seleccionar una empresa
   - Configurará los permisos RLS

## 🔄 Cambios Realizados en el Código

### **InventarioManagement.tsx**
- ✅ Cambiado de tabla `inventario` → `stock_actual`
- ✅ Actualizada estructura de datos para coincidir con schema
- ✅ Ajustadas las relaciones: `producto` → `variante.producto`
- ✅ Modificados filtros y cálculos

### **URLs y Navegación**
- ✅ `/inventario` → `/stocks`
- ✅ `/kardex` → `/movimientos`
- ✅ Menú reorganizado bajo "Gestión de Inventarios"

## 🚀 Estado Actual del Sistema

### **Listo para Usar:**
- ✅ Interfaz de usuario actualizada
- ✅ Navegación corregida
- ✅ Código adaptado a schema real

### **Pendiente:**
- ⚠️ Ejecutar scripts SQL en Supabase
- ⚠️ Crear datos iniciales (empresa, productos)
- ⚠️ Registrar usuario y configurar empresa

## 🎉 Próximos Pasos

1. **Ejecuta los scripts SQL** en el panel de Supabase
2. **Regresa a http://localhost:5174/stocks**
3. **El sistema debería mostrar la interfaz sin errores**
4. **Crea tus primeros productos y stock**

---
*Una vez ejecutados los scripts, el sistema estará completamente funcional con todas las mejoras implementadas.*