#!/bin/bash
# Script para linkear el paquete localmente
# Uso: ./scripts/link.sh

set -e

echo "🔗 Preparando el paquete para desarrollo local..."
echo ""

# Compilar primero
echo "📦 Compilando el proyecto..."
npm run build

echo ""
echo "✅ Compilación completada"
echo ""
echo "📋 Para usar este paquete en otro proyecto:"
echo ""
echo "1. En este directorio, ejecuta:"
echo "   npm link"
echo ""
echo "2. En tu otro proyecto, ejecuta:"
echo "   npm link @ai-orchestration/core"
echo ""
echo "3. Para desvincular, en tu otro proyecto ejecuta:"
echo "   npm unlink @ai-orchestration/core"
echo ""
echo "💡 Alternativamente, puedes usar 'npm pack' para crear un tarball"
echo "   y luego instalarlo con: npm install ./@ai-orchestration/core-0.1.0.tgz"

