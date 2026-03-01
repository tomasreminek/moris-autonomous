#!/bin/bash
# Disable automatic updates

echo "🛑 Disabling automatic updates..."

# Remove MORIS update from crontab
crontab -l | grep -v "moris-autonomous/scripts/update.sh" | crontab -

echo "✅ Auto-updates disabled"
echo "You can still update manually: ./scripts/update.sh"
