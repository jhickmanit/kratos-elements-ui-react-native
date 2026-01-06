#!/bin/bash

# Android Passkey Testing Setup Script
# This script helps configure Kratos for passkey testing with ngrok

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Android Passkey Testing Setup ==="
echo ""

# Check if ngrok URL is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <ngrok-https-url>"
    echo ""
    echo "Example: $0 https://abc123.ngrok-free.app"
    echo ""
    echo "Steps:"
    echo "1. Start ngrok: ngrok http 4480"
    echo "2. Copy the HTTPS URL (e.g., https://abc123.ngrok-free.app)"
    echo "3. Run this script with that URL"
    exit 1
fi

NGROK_URL="$1"
# Extract domain from URL (remove https://)
NGROK_DOMAIN="${NGROK_URL#https://}"
NGROK_DOMAIN="${NGROK_DOMAIN#http://}"
# Remove trailing slash if present
NGROK_DOMAIN="${NGROK_DOMAIN%/}"

echo "Ngrok URL: $NGROK_URL"
echo "Ngrok Domain: $NGROK_DOMAIN"
echo ""

# Update Kratos config
KRATOS_CONFIG="$PROJECT_DIR/.docker/kratos/kratos.yml"
echo "Updating Kratos config..."

# Create a backup
cp "$KRATOS_CONFIG" "$KRATOS_CONFIG.backup"

# Use sed to update the passkey RP ID and origins
# This is a simple approach - for production, use yq or similar
sed -i.tmp "s|id: localhost|id: $NGROK_DOMAIN|g" "$KRATOS_CONFIG"
sed -i.tmp "s|- http://localhost:8081|- $NGROK_URL|g" "$KRATOS_CONFIG"
sed -i.tmp "s|- http://localhost:4433|- $NGROK_URL|g" "$KRATOS_CONFIG"
rm -f "$KRATOS_CONFIG.tmp"

echo "Updated Kratos passkey config with domain: $NGROK_DOMAIN"
echo ""

# Update .env file
ENV_FILE="$PROJECT_DIR/.env"
echo "Updating .env file..."
if [ -f "$ENV_FILE" ]; then
    # Update existing EXPO_PUBLIC_ORY_PROJECT_URL
    sed -i.tmp "s|EXPO_PUBLIC_ORY_PROJECT_URL=.*|EXPO_PUBLIC_ORY_PROJECT_URL=$NGROK_URL|g" "$ENV_FILE"
    rm -f "$ENV_FILE.tmp"
else
    echo "EXPO_PUBLIC_ORY_PROJECT_URL=$NGROK_URL" > "$ENV_FILE"
fi
echo "Updated .env with ORY URL: $NGROK_URL"
echo ""

echo "=== Next Steps ==="
echo ""
echo "1. Get your Android signing key SHA256 fingerprint:"
echo "   cd android && ./gradlew signingReport | grep -A1 'SHA-256'"
echo ""
echo "2. Update .docker/assetlinks.json with your fingerprint"
echo ""
echo "3. Restart Docker services:"
echo "   cd .docker && docker-compose down && docker-compose up -d"
echo ""
echo "4. Verify assetlinks.json is accessible:"
echo "   curl $NGROK_URL/.well-known/assetlinks.json"
echo ""
echo "5. Run the Android app:"
echo "   npx expo run:android"
echo ""
echo "To restore original config later:"
echo "   cp $KRATOS_CONFIG.backup $KRATOS_CONFIG"
echo ""
