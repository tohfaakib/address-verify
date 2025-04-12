#!/bin/bash

SCRIPT_PATH="/Users/user/docker/av_test/address-verify/start_app_mac_test.sh"
CRON_LOG="/tmp/addressverify_test.out"

echo "🧹 Removing old LaunchAgent if it exists..."
PLIST_PATH="$HOME/Library/LaunchAgents/com.addressverifytest.startup.plist"
if [ -f "$PLIST_PATH" ]; then
  launchctl unload "$PLIST_PATH" 2>/dev/null
  rm -f "$PLIST_PATH"
  echo "✅ Removed: $PLIST_PATH"
fi

echo "📝 Adding @reboot cron job for test version..."
CRON_JOB="@reboot /bin/bash \"$SCRIPT_PATH\" >> \"$CRON_LOG\" 2>&1"

(crontab -l 2>/dev/null | grep -v 'start_app_mac_test.sh'; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added:"
echo "$CRON_JOB"
echo "📄 Logs: $CRON_LOG"
