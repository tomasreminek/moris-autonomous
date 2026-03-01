#!/bin/bash
# Setup automatic updates via cron

echo "🔄 Setting up automatic updates..."

# Add to crontab (run every Sunday at 3:00 AM)
(crontab -l 2>/dev/null; echo "0 3 * * 0 /data/workspace/moris-autonomous/scripts/update.sh >> /var/log/moris-update.log 2>&1") | crontab -

echo "✅ Auto-update scheduled: Every Sunday at 3:00 AM"
echo "📄 Logs: /var/log/moris-update.log"
echo ""
echo "To disable: crontab -e and remove the line"
