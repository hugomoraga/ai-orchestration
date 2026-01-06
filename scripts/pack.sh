#!/bin/bash
# Script para crear un tarball del paquete
# Uso: ./scripts/pack.sh

set -e

echo "📦 Creando paquete para distribución local..."
echo ""

# Compilar primero
echo "🔨 Compilando..."
npm run build

echo ""
echo "📦 Creando tarball..."
npm pack

PACKAGE_NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
TARBALL="${PACKAGE_NAME}-${VERSION}.tgz"

echo ""
echo "✅ Tarball creado: ${TARBALL}"
echo ""
echo "📋 Para instalar en otro proyecto:"
echo ""
echo "1. Copia el archivo ${TARBALL} a tu otro proyecto"
echo ""
echo "2. En tu otro proyecto, ejecuta:"
echo "   npm install ./${TARBALL}"
echo ""
echo "   O desde la ruta absoluta:"
echo "   npm install /ruta/completa/a/${TARBALL}"
echo ""
echo "💡 El paquete se instalará como dependencia local"

