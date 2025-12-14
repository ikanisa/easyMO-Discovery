#!/bin/bash
# Quick PWA Setup Script
# Run this after cloning the repository

set -e

echo "🚀 easyMO PWA Setup"
echo "==================="
echo ""

# 1. Install PWA dependencies
echo "📦 Installing PWA dependencies..."
npm install workbox-window idb-keyval
npm install -D vite-plugin-pwa

echo ""
echo "✅ Dependencies installed"
echo ""

# 2. Create directories if they don't exist
echo "📁 Creating directory structure..."
mkdir -p public/icons public/screenshots hooks components/pwa types scripts

echo ""
echo "✅ Directories created"
echo ""

# 3. Generate icons (if ImageMagick is available)
echo "🎨 Checking for ImageMagick to generate icons..."
if command -v convert &> /dev/null; then
    echo "✅ ImageMagick found, generating icons..."
    ./scripts/generate-pwa-icons.sh
else
    echo "⚠️  ImageMagick not found. Icons already exist or generate manually."
    echo "   Install: brew install imagemagick"
fi

echo ""
echo "✅ PWA Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run dev' to start development server"
echo "  2. Test PWA features in Chrome DevTools > Application > Service Workers"
echo "  3. Test installation prompt"
echo ""
