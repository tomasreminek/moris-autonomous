#!/bin/sh
# 🔄 Auto-update MORIS Plugin

echo "🔄 Checking for updates..."

cd /app/extensions/moris-autonomous || exit 1

# Git pull (nebo npm update)
if [ -d ".git" ]; then
    git fetch origin
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "📥 Update available: $LOCAL -> $REMOTE"
        git pull origin main
        npm install --production
        
        echo "✅ Plugin updated!"
        
        # Restart MORIS (nebo celý container)
        pkill -f "node core/main.js" || true
        # OpenClaw si plugin znovu načte
    else
        echo "✅ Plugin is up to date"
    fi
else
    # NPM update fallback
    npm update @community/moris-autonomous
fi

# Log
echo "🕐 Updated at: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
