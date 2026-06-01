#!/usr/bin/env bash
set -euo pipefail

# XENTRA - Script de parada de servicios  
# ======================================

PORT=5175

echo "🏢 XENTRA - Deteniendo servicios..."
echo "=================================="

# Detener procesos en el puerto principal
if lsof -ti tcp:$PORT >/dev/null 2>&1; then
  echo "🛑 Cerrando procesos en puerto $PORT..."
  lsof -ti tcp:$PORT | xargs -r kill -9 2>/dev/null || true
  sleep 1
fi

# Detener cualquier proceso Vite que pueda estar corriendo en otros puertos
VITE_PIDS=$(ps aux | grep '[v]ite' | grep -E 'xentrastock|XENTRA' | awk '{print $2}' || true)
if [[ -n "$VITE_PIDS" ]]; then
  echo "🧹 Cerrando procesos Vite de XENTRA..."
  echo "$VITE_PIDS" | xargs -r kill -9 2>/dev/null || true
fi

# Limpiar puertos comunes de Vite si están ocupados por el proyecto
for port in 5173 5174 5175 5176; do
  if lsof -ti tcp:$port >/dev/null 2>&1; then
    # Verificar si el proceso es de este proyecto
    PROCESS_CMD=$(lsof -ti tcp:$port | xargs -r ps -p | grep -E 'vite|npm.*dev' | grep -v grep || true)
    if [[ -n "$PROCESS_CMD" ]]; then
      echo "🧹 Liberando puerto $port..."
      lsof -ti tcp:$port | xargs -r kill -9 2>/dev/null || true
    fi
  fi
done

sleep 2

echo ""
echo "✅ Servicios de XENTRA detenidos"
echo "🔓 Puerto $PORT liberado"
echo "🧹 Limpieza completada"