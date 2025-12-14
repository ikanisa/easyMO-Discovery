#!/bin/bash
# Generate PWA icons from SVG source
# Prerequisites: ImageMagick (brew install imagemagick) or use online converter

set -e

SIZES=(72 96 128 144 152 192 384 512)
SOURCE="public/icon.svg"
OUTPUT_DIR="public/icons"

echo "🎨 PWA Icon Generator"
echo "====================="

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "✅ ImageMagick found, generating icons..."
    
    for size in "${SIZES[@]}"; do
        echo "  📱 Generating ${size}x${size}..."
        convert -background none -resize "${size}x${size}" "$SOURCE" "$OUTPUT_DIR/icon-${size}.png"
    done
    
    # Generate maskable icon with safe zone padding (icon should be 80% of canvas)
    echo "  🎭 Generating maskable icon..."
    convert -background "#0f172a" -gravity center -resize 410x410 -extent 512x512 "$SOURCE" "$OUTPUT_DIR/maskable-512.png"
    
    echo ""
    echo "✅ Icons generated successfully in $OUTPUT_DIR"
    ls -la "$OUTPUT_DIR"
else
    echo "❌ ImageMagick not found!"
    echo ""
    echo "Install with: brew install imagemagick"
    echo ""
    echo "Or use these online tools:"
    echo "  - https://realfavicongenerator.net/"
    echo "  - https://www.pwabuilder.com/imageGenerator"
    echo "  - https://maskable.app/editor"
    echo ""
    echo "Generate icons in these sizes: ${SIZES[*]}"
    echo "Plus a maskable-512.png with safe zone padding"
    exit 1
fi
