#!/bin/bash
# MORIS Auto-Updater
# Run this script to update MORIS safely

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

MORIS_DIR="/data/workspace/moris-autonomous"
BACKUP_DIR="./backups/auto-update"
LOG_FILE="/var/log/moris-update.log"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if MORIS directory exists
if [ ! -d "$MORIS_DIR" ]; then
    error "MORIS directory not found: $MORIS_DIR"
    exit 1
fi

cd "$MORIS_DIR"

log "🔍 Checking for updates..."

# Fetch latest changes
git fetch origin main

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "unknown")

if [ "$LOCAL" = "$REMOTE" ]; then
    log "✅ Already up to date (version: $VERSION)"
    exit 0
fi

log "📦 New version available!"
log "Current: $LOCAL"
log "Remote: $REMOTE"

# Create backup
log "💾 Creating backup..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/moris-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='data' \
    --exclude='logs' \
    --exclude='.git' \
    .

log "✅ Backup created: $BACKUP_FILE"

# Pull latest changes
log "⬇️  Updating code..."
git pull origin main

# Check for dependency changes
if git diff HEAD~1 HEAD --name-only | grep -q "package.json"; then
    log "📦 Dependencies changed, running npm install..."
    cd core && npm ci --production && cd ..
fi

# Rebuild Docker images
log "🔨 Rebuilding Docker images..."
docker-compose build --no-cache

# Rolling restart (zero downtime)
log "🔄 Restarting services..."
docker-compose up -d

# Health check
log "🏥 Running health checks..."
sleep 15

HEALTHY=true

# Check core service
if ! curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    error "❌ Core health check failed!"
    HEALTHY=false
fi

# Check dashboard
if ! curl -sf http://localhost:3005 > /dev/null 2>&1; then
    error "❌ Dashboard health check failed!"
    HEALTHY=false
fi

if [ "$HEALTHY" = true ]; then
    log "✅ Update successful! All services healthy."
    
    # Notify via Telegram if configured
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=✅ MORIS updated successfully!%0A%0AVersion: $VERSION%0ABackup: $BACKUP_FILE" \
            > /dev/null 2>&1
    fi
    
    # Clean old backups (keep last 5)
    ls -t "$BACKUP_DIR"/moris-backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
    
    exit 0
else
    error "❌ Update failed! Rolling back..."
    
    # Rollback
    git reset --hard "$LOCAL"
    docker-compose down
    docker-compose up -d
    
    # Restore from backup
    log "↩️  Restoring from backup..."
    tar -xzf "$BACKUP_FILE" -C "$MORIS_DIR"
    docker-compose build
    docker-compose up -d
    
    error "🔄 Rollback complete. Check logs: $LOG_FILE"
    
    # Notify failure
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=❌ MORIS update failed! Rolled back to previous version." \
            > /dev/null 2>&1
    fi
    
    exit 1
fi
