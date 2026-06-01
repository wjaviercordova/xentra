# 📋 XENTRA - Sistema de Movimientos de Inventario Completo

## 🎯 **Descripción del Sistema**

XENTRA ahora incluye un **sistema completo de movimientos de inventario** que maneja todas las entradas, salidas y movimientos de stock con diferentes motivos que afectan el inventario.

---

## 📊 **Tipos de Movimientos Disponibles**

### 🔵 **ENTRADAS DE INVENTARIO**
- **📦 Inventario Inicial**: Stock inicial al crear el inventario
- **🛒 Compra**: Entradas por compras a proveedores
- **↩️ Devolución de Cliente**: Productos devueltos por clientes
- **📈 Ajuste Positivo**: Correcciones positivas de inventario
- **🏭 Producción**: Productos terminados de procesos de producción
- **📥 Transferencia Entrada**: Recepción desde otras ubicaciones

### 🔴 **SALIDAS DE INVENTARIO**
- **💰 Venta**: Salidas por ventas realizadas (integrado con POS)
- **↪️ Devolución a Proveedor**: Productos devueltos a proveedores
- **📉 Merma/Pérdida**: Productos perdidos, dañados o vencidos
- **📉 Ajuste Negativo**: Correcciones negativas de inventario
- **🏭 Consumo Producción**: Materias primas consumidas en producción
- **📤 Transferencia Salida**: Envío a otras ubicaciones

### ⚖️ **AJUSTES**
- **📈 Ajuste Positivo**: Aumentar stock por correcciones
- **📉 Ajuste Negativo**: Disminuir stock por correcciones

---

## 🚀 **Cómo Acceder a los Movimientos**

### **Opción 1: Desde el Menú Principal**
1. **Expandir "Gestión de Inventarios"** en el menú lateral izquierdo
2. **Clic en "Movimientos"** para acceso directo
3. Acceso completo a la gestión de movimientos

### **Opción 2: Desde el Módulo de Stocks**
1. **Expandir "Gestión de Inventarios"** → **"Stocks"**
2. **Clic en "Movimientos Completos"** en la parte superior
3. Se abre en modal pantalla completa

---

## 📋 **Funcionalidades de Movimientos**

### **🗂️ Tab "Movimientos por Producto"**
- **Filtros avanzados**: Producto, fechas, motivos
- **Información del producto**: Stock actual, costo promedio, último movimiento
- **Vista detallada**: 
  - Fecha y hora del movimiento
  - Motivo específico con colores distintivos
  - Stock anterior, entradas, salidas, stock final
  - Costo unitario y valor total del movimiento
  - Usuario que realizó el movimiento

### **📊 Tab "Resumen de Movimientos"**
- **Análisis por período**: Filtros de fecha inicio/fin
- **Resumen por motivo**: 
  - Total de entradas y salidas por cada motivo
  - Valores monetarios de entradas y salidas
  - Cantidad de movimientos registrados

---

## ➕ **Registrar Nuevos Movimientos**

### **Paso a Paso:**
1. **Clic en "Nuevo Movimiento"**
2. **Seleccionar el producto** (muestra stock actual)
3. **Elegir tipo de movimiento**: Entrada, Salida o Ajuste
4. **Seleccionar motivo específico** (opciones dinámicas según el tipo)
5. **Ingresar cantidad** (validación de stock disponible)
6. **Costo unitario** (opcional, para actualizar costo promedio)
7. **Documento de referencia** (ej: Factura #001, Orden #123)
8. **Observaciones** (comentarios adicionales)
9. **Clic en "Registrar Movimiento"**

---

## 🔧 **Características Técnicas**

### **✅ Validaciones Automáticas**
- **Stock suficiente** para salidas y transferencias
- **Campos obligatorios** validados
- **Tipos de movimientos** coherentes con motivos

### **📈 Cálculo Automático de Costos**
- **Costo promedio ponderado** actualizado automáticamente
- **Valorización del inventario** en tiempo real
- **Historial de costos** por movimiento

### **🔄 Integración Completa**
- **POS integrado**: Ventas registran automáticamente salidas
- **Cache inteligente**: Performance optimizada
- **Auditoría completa**: Usuario, fecha, hora de cada movimiento

### **📊 Reportes y Exportación**
- **Integrado con módulo de reportes**
- **Exportación Excel/PDF** disponible
- **Análisis de rotación** y valorización

---

## 🎨 **Interfaz y Usabilidad**

### **🌈 Colores por Motivo**
- **Azul**: Inventario inicial
- **Verde**: Compras
- **Naranja**: Ventas
- **Verde azulado**: Ajustes positivos
- **Rojo**: Ajustes negativos, mermas
- **Cian**: Devoluciones de clientes
- **Amarillo**: Devoluciones a proveedores
- **Violeta**: Transferencias entrada
- **Uva**: Transferencias salida
- **Índigo**: Producción
- **Rosa**: Consumo producción

### **📱 Diseño Responsive**
- **Compatible con móviles** y tablets
- **Modal pantalla completa** para mejor visualización
- **Filtros colapsables** en dispositivos pequeños

---

## 🔗 **Flujo de Trabajo Recomendado**

### **Para Control Diario:**
1. **Revisar alertas** de stock bajo desde el dashboard
2. **Registrar entradas** por compras recibidas
3. **Registrar salidas** por ventas (automático desde POS)
4. **Ajustes según inventario físico** periódico

### **Para Análisis:**
1. **Usar "Resumen de Movimientos"** para análisis por período
2. **Filtrar por motivo específico** para estudiar tendencias
3. **Exportar reportes** para análisis detallado
4. **Revisar rotación** desde el módulo de reportes

### **Para Auditoría:**
1. **Movimientos por producto** muestra trazabilidad completa
2. **Información del usuario** en cada movimiento
3. **Documentos de referencia** vinculados
4. **Historial inmutable** para auditorías

---

## ⚡ **Beneficios del Sistema**

- ✅ **Trazabilidad completa** de todos los movimientos
- ✅ **Control de costos** con promedio ponderado automático
- ✅ **Integración POS** para ventas automáticas
- ✅ **Reportes gerenciales** integrados
- ✅ **Auditoría completa** con usuarios y fechas
- ✅ **Exportación** a Excel y PDF
- ✅ **Performance optimizada** con cache inteligente
- ✅ **Interfaz intuitiva** con colores y filtros
- ✅ **Validaciones automáticas** para evitar errores
- ✅ **Responsive design** para uso móvil

---

*XENTRA - Sistema ERP Completo para PYMES*  
*Versión: Semanas 4-5 - Reportes y Movimientos de Inventario Completado*