-- =====================================================
-- XENTRA - ORDEN DE EJECUCIÓN DE SCRIPTS SQL
-- =====================================================

/*
EJECUTAR EN ESTE ORDEN EXACTO EN SUPABASE SQL EDITOR:

📋 ORDEN OBLIGATORIO:

1️⃣ PRIMERO: schema.sql
   - Crea todas las tablas principales
   - Configura RLS (Row Level Security)
   - Crea políticas de seguridad
   - Crea índices

2️⃣ SEGUNDO: movimientos_triggers.sql  
   - Crea funciones para manejo de stock
   - Crea triggers automáticos
   - Configura lógica de movimientos de inventario

3️⃣ TERCERO: 01-DATOS-PRUEBA-COMPLETOS.sql
   - Crea empresa de prueba
   - Crea ubicaciones, categorías, proveedores
   - Crea productos y variantes
   - Crea stock inicial para probar

📋 ORDEN OPCIONAL:

4️⃣ OPCIONAL: movimientos_completo.sql
   - Funciones adicionales para consultas complejas
   - Solo necesario si usas funcionalidades avanzadas

5️⃣ VERIFICACIÓN: 02-VERIFICACION-COMPLETA.sql
   - Script para verificar que todo esté correcto
   - No crea nada, solo consulta y verifica

=====================================================
PASOS DETALLADOS:
=====================================================

PASO 1: Abrir Supabase
- Ve a: https://szheqarnqtfkbdoyozca.supabase.co
- Click en "SQL Editor"

PASO 2: Ejecutar schema.sql
- Copiar TODO el contenido de schema.sql
- Pegar en SQL Editor
- Click "Run" 
- Verificar que no haya errores

PASO 3: Ejecutar movimientos_triggers.sql
- Copiar TODO el contenido de movimientos_triggers.sql
- Pegar en SQL Editor (nuevo query)
- Click "Run"
- Verificar que no haya errores

PASO 4: Ejecutar datos de prueba
- Copiar TODO el contenido de 01-DATOS-PRUEBA-COMPLETOS.sql
- Pegar en SQL Editor (nuevo query)
- Click "Run"
- Verificar que se crearon los datos

PASO 5: Verificar instalación
- Copiar TODO el contenido de 02-VERIFICACION-COMPLETA.sql
- Pegar en SQL Editor (nuevo query)
- Click "Run"
- Revisar que todos los conteos sean correctos

=====================================================
¿QUÉ ESPERAR DESPUÉS DE CADA PASO?
=====================================================

Después de schema.sql:
✅ Se crean ~15 tablas
✅ No errores de ejecución

Después de movimientos_triggers.sql:
✅ Se crean 2-3 funciones
✅ Se crean 1-2 triggers
✅ No errores de ejecución

Después de datos de prueba:
✅ 1 empresa creada
✅ 2 ubicaciones creadas
✅ 3 productos creados
✅ 5 variantes creadas
✅ 10+ registros de stock creados

Después de verificación:
✅ Todos los conteos correctos
✅ Stock visible con productos y ubicaciones

=====================================================
⚠️ IMPORTANTE: 
=====================================================

- EJECUTAR EN ORDEN - no saltarse pasos
- Un script a la vez - no ejecutar varios juntos
- Revisar errores antes de continuar
- Si hay error, parar y resolver antes de seguir

Una vez completado todo:
🎉 Ve a http://localhost:5174/stocks
🎉 Deberías ver productos y stock en la interfaz
*/