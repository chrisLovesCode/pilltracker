#!/bin/bash
# Watch Android Emulator Logs
# Filters logs for PillTracker app, database, and migration events

# Add Android SDK to PATH
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"

echo "📱 Watching PillTracker Android logs..."
echo "Press Ctrl+C to stop"
echo "========================================"

# Get device ID
DEVICE=$(adb devices | grep "emulator" | awk '{print $1}')

if [ -z "$DEVICE" ]; then
  echo "❌ No emulator running!"
  exit 1
fi

echo "Device: $DEVICE"
echo "========================================"

# Clear old logs and start watching
adb -s "$DEVICE" logcat -c
adb -s "$DEVICE" logcat \
  -s "chromium:I" \
  -s "CapacitorSQLite:D" \
  -s "AndroidRuntime:E" \
  | grep --line-buffered -E "\[DB\]|\[Migrations\]|PillTracker|FATAL|ERROR|capacitor" \
  | while read -r line; do
    # Colorize output
    if echo "$line" | grep -q "ERROR\|FATAL"; then
      echo -e "\033[0;31m$line\033[0m"  # Red
    elif echo "$line" | grep -q "\[DB\]"; then
      echo -e "\033[0;32m$line\033[0m"  # Green
    elif echo "$line" | grep -q "\[Migrations\]"; then
      echo -e "\033[0;34m$line\033[0m"  # Blue
    else
      echo "$line"
    fi
  done
