#!/bin/bash
# Check if updates are available

cd /data/workspace/moris-autonomous

git fetch origin main

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "📦 Updates available!"
    echo "Current: $LOCAL"
    echo "Latest:  $REMOTE"
    echo ""
    echo "To update, run: ./scripts/update.sh"
else
    echo "✅ Up to date"
fi
