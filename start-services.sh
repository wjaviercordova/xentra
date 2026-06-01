#!/usr/bin/env bash
set -euo pipefail

# XENTRA - Script de inicio de servicios
# ====================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=5175

echo "🏢 XENTRA - Sistema de Gestión de Inventario"
echo "============================================="

# Verificar si el puerto está en uso
if lsof -ti tcp:$PORT >/dev/null 2>&1; then
  echo "🔄 Liberando puerto $PORT..."
  lsof -ti tcp:$PORT | xargs kill -9 2>/dev/null || true
  sleep 2
  echo "✅ Puerto $PORT liberado"
fi

# Verificar que existe package.json
if [[ ! -f "$ROOT_DIR/package.json" ]]; then
  echo "❌ Error: No se encontró package.json en $ROOT_DIR"
  exit 1
fi

# Verificar que las dependencias están instaladas
if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "📦 Instalando dependencias..."
  cd "$ROOT_DIR"
  npm install
fi

echo "🚀 Iniciando XENTRA Vite Dev Server en puerto $PORT..."
echo "📍 URL: http://localhost:$PORT"
echo "⚡ Presiona Ctrl+C para detener el servidor"
echo ""

cd "$ROOT_DIR"
exec npm run dev -- --port $PORT --host 0.0.0.0