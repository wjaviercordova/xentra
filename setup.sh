#!/bin/bash

# =====================================================
# XENTRA - Script de Inicialización del Proyecto
# =====================================================

echo "🚀 Inicializando XENTRA - Sistema de Gestión Comercial"
echo "=================================================="

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Verificar instalación de Supabase CLI (opcional)
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI encontrado"
else
    echo "⚠️  Supabase CLI no encontrado. Para instalar:"
    echo "   npm install -g supabase"
fi

# Crear directorios necesarios
echo "📁 Creando estructura de directorios..."
mkdir -p src/components/{Auth,Layout,POS,Inventario,Transferencias,Reportes}
mkdir -p src/hooks
mkdir -p src/utils
mkdir -p src/types
mkdir -p database/migrations
mkdir -p docs

# Verificar archivo .env.local
if [ -f ".env.local" ]; then
    echo "✅ Archivo .env.local encontrado"
else
    echo "⚠️  Archivo .env.local no encontrado"
    echo "   Por favor configura las variables de Supabase"
fi

echo ""
echo "🎯 Próximos pasos para completar la configuración:"
echo "=================================================="
echo "1. Configurar Supabase:"
echo "   - Ejecutar: supabase init (si usas Supabase CLI)"
echo "   - Ejecutar los scripts SQL en tu proyecto de Supabase:"
echo "     * database/schema.sql"
echo "     * database/kardex_triggers.sql"
echo "     * database/seed_data.sql"
echo ""
echo "2. Inicializar datos:"
echo "   - Ejecutar la función inicializar_empresa() en tu DB"
echo "   - Crear un usuario de prueba en Supabase Auth"
echo ""
echo "3. Ejecutar la aplicación:"
echo "   npm run dev"
echo ""
echo "📚 Documentación:"
echo "   - Diseño SQL: database/schema.sql"
echo "   - Triggers Kardex: database/kardex_triggers.sql"
echo "   - Componente POS: src/components/POS/PuntoDeVenta.tsx"
echo ""
echo "🎉 ¡Proyecto XENTRA inicializado correctamente!"