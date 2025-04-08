#!/bin/bash

APP_SCRIPT="/Users/user/docker/address-verify/start_app_mac.sh"
PLIST_NAME="com.addressverify.startup"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

echo "🛠 Creating LaunchAgent plist at $PLIST_PATH..."

cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
 "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$PLIST_NAME</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$APP_SCRIPT</string>
  </array>

  <key>RunAtLoad</key>
  <true/>

  <key>StandardOutPath</key>
  <string>/tmp/addressverify.out</string>

  <key>StandardErrorPath</key>
  <string>/tmp/addressverify.err</string>
</dict>
</plist>
EOF

echo "📦 Loading LaunchAgent..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "✅ Startup script registered with macOS!"
echo "📄 Logs will be written to:"
echo "   stdout: /tmp/addressverify.out"
echo "   stderr: /tmp/addressverify.err"

# Optional: Start immediately to test
read -p "🚀 Do you want to test the launch now? [y/N] " run_now
if [[ "$run_now" == "y" || "$run_now" == "Y" ]]; then
  launchctl start "$PLIST_NAME"
  echo "🎉 Started. Check logs in /tmp."
fi
