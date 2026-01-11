#!/bin/bash

# W-BOT Installer with API key save feature
# Created by AVDALLAH

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
echo "║         W-BOT WhatsApp AI Installer                  ║"
echo "║         Created by AVDALLAH                          ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Show current time
echo "🕐 Current time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed!"
    echo ""
    echo "📥 Please install Node.js v16 or higher from:"
    echo "   https://nodejs.org/"
    echo ""
    echo "Then run this script again."
    echo ""
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
echo "✅ Node.js v$NODE_VERSION detected"

if [ $NODE_MAJOR -lt 16 ]; then
    echo "❌ Node.js version too old (needs v16+)"
    echo "📥 Please update Node.js and try again"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ ERROR: npm is not installed!"
    exit 1
fi
echo "✅ npm is installed"
echo ""

# Check if .env file exists and has API key
if [ -f .env ] && grep -q "GROQ_API_KEY" .env && [ -s .env ]; then
    CURRENT_API_KEY=$(grep GROQ_API_KEY .env | cut -d'=' -f2)
    echo "🔑 Found existing API key: ${CURRENT_API_KEY:0:10}..."
    echo ""
    
    while true; do
        read -p "Do you want to change the API key? (y/N): " CHANGE_KEY
        case $CHANGE_KEY in
            [Yy]* )
                read -p "Enter new Groq API key: " API_KEY
                if [ -z "$API_KEY" ]; then
                    echo "❌ ERROR: API key cannot be empty!"
                    exit 1
                fi
                echo "GROQ_API_KEY=$API_KEY" > .env
                echo "✅ API key updated"
                break
                ;;
            [Nn]*|"" )
                echo "✅ Using existing API key"
                break
                ;;
            * )
                echo "Please answer yes (y) or no (n)"
                ;;
        esac
    done
else
    # Ask for API key
    echo "🔑 GROQ API KEY SETUP"
    echo "────────────────────────────────────────────────────"
    echo "You need a Groq API key (it's FREE):"
    echo "1. Go to: https://console.groq.com"
    echo "2. Sign up and create API key"
    echo "3. Copy your key and paste it below"
    echo ""
    
    read -p "Enter your Groq API key: " API_KEY
    
    # Validate API key
    if [ -z "$API_KEY" ]; then
        echo "❌ ERROR: API key cannot be empty!"
        exit 1
    fi
    
    # Create .env file
    echo "GROQ_API_KEY=$API_KEY" > .env
    echo "✅ API key saved to .env file"
fi

echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    echo "This may take a minute..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ ERROR: Failed to install dependencies"
        exit 1
    fi
    
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

echo ""

# Create auth directory
mkdir -p auth
echo "✅ Session directory ready"
echo ""

# Ask if user wants to start the bot now
echo "🎉 SETUP COMPLETE!"
echo "────────────────────────────────────────────────────"
echo ""
read -p "Do you want to start W-BOT now? (Y/n): " START_NOW

if [[ $START_NOW == "n" || $START_NOW == "N" ]]; then
    echo ""
    echo "📋 Commands to start W-BOT later:"
    echo "   ./start.sh          - Quick start"
    echo "   node index.js       - Manual start"
    echo ""
    echo "🔑 Your API key is saved in .env file"
    echo "⚡ Run ./build.sh again to change API key"
    echo ""
    exit 0
fi

echo ""
echo "🚀 Starting W-BOT WhatsApp AI Assistant..."
echo ""
echo "📱 NEXT STEPS:"
echo "   1. Scan the QR code with WhatsApp"
echo "   2. In WhatsApp, mention: @wbot Hello!"
echo "   3. Bot will reply with AI answers"
echo ""
echo "⚡ To stop the bot: Press Ctrl+C"
echo ""
echo "────────────────────────────────────────────────────"
echo ""

# Wait 2 seconds before starting
sleep 2

# Start the bot
node index.js
