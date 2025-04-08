#!/bin/bash

SCRIPT_PATH="/Users/user/docker/address-verify/start_app_mac.sh"
CRON_LOG="/tmp/addressverify.out"

echo "🧹 Removing old LaunchAgent if it exists..."
PLIST_PATH="$HOME/Library/LaunchAgents/com.addressverify.startup.plist"
if [ -f "$PLIST_PATH" ]; then
  launchctl unload "$PLIST_PATH" 2>/dev/null
  rm -f "$PLIST_PATH"
  echo "✅ Removed LaunchAgent: $PLIST_PATH"
fi

echo "📝 Adding @reboot cron job..."
CRON_JOB="@reboot /bin/bash \"$SCRIPT_PATH\" >> \"$CRON_LOG\" 2>&1"

# Avoid duplicate entries
(crontab -l 2>/dev/null | grep -v 'start_app_mac.sh'; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added:"
echo "$CRON_JOB"
echo ""
echo "💡 It will run automatically on reboot."
echo "📄 Logs: $CRON_LOG"
