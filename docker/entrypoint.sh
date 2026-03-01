#!/bin/sh
# 🚀 OpenClaw + MORIS Autonomous Entrypoint

set -e

echo "🚀 Starting OpenClaw with MORIS Autonomous..."
echo "================================================"
# Nastavení výchozí tier pokud není zadán
if [ -z "$MORIS_TIER" ]; then
    MORIS_TIER="free"
    export MORIS_TIER
fi

echo "🎯 MORIS Tier: $MORIS_TIER"

# Příprava dat
mkdir -p /data/openclaw/extensions
mkdir -p /data/openclaw/data

# Symlink pluginu do extensions
if [ ! -L "/data/openclaw/extensions/moris-autonomous" ]; then
    ln -sf /app/extensions/moris-autonomous /data/openclaw/extensions/
    echo "📦 Plugin linked"
fi

# Spuštění OpenClaw v pozadí
echo "🔌 Starting OpenClaw Gateway..."
openclaw start --config /data/openclaw/config.yaml &
OPENCLAW_PID=$!

# Čekání na start
echo "⏳ Waiting for OpenClaw..."
sleep 5

# Kontrola zdraví
echo "🩺 Health check..."
until curl -s http://localhost:3456/health >/dev/null 2>&1; do
    echo "   Still starting..."
    sleep 2
done
echo "✅ OpenClaw is running"

# Povolení pluginu
echo "🔧 Enabling MORIS plugin..."
openclaw plugins enable moris-autonomous || echo "   Plugin might already be enabled"

# Nastavení admin hesla
if [ -n "$ADMIN_PASSWORD" ]; then
    echo "🔑 Setting admin credentials..."
    # Plugin si vezme heslo z env
fi

# Spuštění MORIS serveru
echo "🧠 Starting MORIS agents..."
cd /app/extensions/moris-autonomous
export ADMIN_PASSWORD=${ADMIN_PASSWORD:-demo-admin-2024}
export PORT=${MORIS_HTTP_PORT:-3001}
export WEBSOCKET_PORT=${MORIS_WS_PORT:-3002}

node core/main.js &
MORIS_PID=$!

echo ""
echo "================================================"
echo "✅ MORIS Autonomous is ready!"
echo ""
echo "🌐 Dashboard: http://localhost:3001"
echo "🔌 Gateway:   http://localhost:3456"
echo "📚 Docs:      https://docs.openclaw.ai/plugins/moris-autonomous"
echo ""
echo "================================================"

# Auto-update job
if [ "$AUTO_UPDATE" = "true" ]; then
    echo "🔄 Auto-update enabled (interval: ${PLUGIN_CHECK_INTERVAL}s)"
    (
        while true; do
            sleep ${PLUGIN_CHECK_INTERVAL:-3600}
            /usr/local/bin/auto-update
        done
    ) &
fi

# Wait pro oba procesy
wait $OPENCLAW_PID $MORIS_PID
