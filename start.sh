#!/bin/bash

# W-BOT Quick Starter
# Use this after running build.sh once

clear

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                                                      ║"
echo "║   ██╗    ██╗    ██████╗   ██████╗  ████████╗        ║"
echo "║   ██║    ██║    ██╔══██╗ ██╔═══██╗ ╚══██╔══╝        ║"
echo "║   ██║ █╗ ██║    ██████╔╝ ██║   ██║    ██║           ║"
echo "║   ██║███╗██║    ██╔══██╗ ██║   ██║    ██║           ║"
echo "║   ╚███╔███╔╝    ██████╔╝ ╚██████╔╝    ██║           ║"
echo "║    ╚══╝╚══╝     ╚═════╝   ╚═════╝     ╚═╝           ║"
echo "║                                                      ║"
echo "║         W-BOT WhatsApp AI Assistant                  ║"
echo "║         Created by AVDALLAH                          ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Show current time
echo "🕐 Started at: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: No API key found!"
    echo "📝 Please run ./build.sh first to setup your API key"
    echo ""
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "❌ ERROR: Dependencies not installed!"
    echo "📦 Please run ./build.sh first to install dependencies"
    echo ""
    exit 1
fi

# Check API key in .env
if ! grep -q "GROQ_API_KEY" .env || [ ! -s .env ]; then
    echo "❌ ERROR: Invalid API key in .env file"
    echo "🔑 Please run ./build.sh to update your API key"
    echo ""
    exit 1
fi

# Create auth directory if not exists
mkdir -p auth

echo "✅ All checks passed!"
echo ""
echo "🚀 Launching W-BOT..."
echo ""
echo "📱 Quick Guide:"
echo "   1. Scan QR code with WhatsApp"
echo "   2. Type @wbot followed by your message"
echo "   3. Bot responds with AI answers"
echo ""
echo "⚡ To stop: Press Ctrl+C"
echo "🔧 To change API key: Run ./build.sh"
echo ""
echo "────────────────────────────────────────────────────"
echo ""

# Wait 1 second before starting
sleep 1

# Start the bot
node index.js
