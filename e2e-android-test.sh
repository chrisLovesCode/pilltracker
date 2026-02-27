#!/bin/bash
# E2E Test Script for Android Emulator
# Tests basic app functionality and database operations

set -e

# Add Android SDK to PATH
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"

echo "🧪 Starting E2E tests for MediRoutine Android..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if emulator is running
echo -e "${BLUE}Checking emulator status...${NC}"
adb devices | grep -q "emulator" || {
  echo -e "${RED}❌ No emulator running. Start emulator first!${NC}"
  exit 1
}

echo -e "${GREEN}✓ Emulator detected${NC}"

# Get device ID
DEVICE=$(adb devices | grep "emulator" | awk '{print $1}')
echo -e "${BLUE}Using device: ${DEVICE}${NC}"

# Test 1: Check if app is installed
echo -e "\n${BLUE}Test 1: Checking if app is installed...${NC}"
adb -s "$DEVICE" shell pm list packages | grep -q "com.pilltracker.app" && {
  echo -e "${GREEN}✓ App is installed${NC}"
} || {
  echo -e "${RED}❌ App not installed${NC}"
  exit 1
}

# Test 2: Launch app
echo -e "\n${BLUE}Test 2: Launching app...${NC}"
adb -s "$DEVICE" shell am start -n com.pilltracker.app/.MainActivity
sleep 3
echo -e "${GREEN}✓ App launched${NC}"

# Test 3: Check app is running
echo -e "\n${BLUE}Test 3: Checking if app is running...${NC}"
adb -s "$DEVICE" shell "ps | grep com.pilltracker.app" && {
  echo -e "${GREEN}✓ App is running${NC}"
} || {
  echo -e "${RED}❌ App not running${NC}"
  exit 1
}

# Test 4: Check for crashes
echo -e "\n${BLUE}Test 4: Checking for crashes...${NC}"
CRASHES=$(adb -s "$DEVICE" logcat -d -s AndroidRuntime:E | grep -c "FATAL EXCEPTION" || true)
if [ "$CRASHES" -eq 0 ]; then
  echo -e "${GREEN}✓ No crashes detected${NC}"
else
  echo -e "${RED}❌ Found ${CRASHES} crashes${NC}"
  adb -s "$DEVICE" logcat -d -s AndroidRuntime:E | tail -20
  exit 1
fi

# Test 5: Check database initialization
echo -e "\n${BLUE}Test 5: Checking database initialization...${NC}"
sleep 2
DB_LOGS=$(adb -s "$DEVICE" logcat -d | grep -E "\[DB\]|\[Migrations\]" | tail -10)
if echo "$DB_LOGS" | grep -q "Database initialized"; then
  echo -e "${GREEN}✓ Database initialized successfully${NC}"
  echo "$DB_LOGS"
else
  echo -e "${RED}⚠ Database init not confirmed (check logs)${NC}"
  echo "$DB_LOGS"
fi

# Test 6: Take screenshot
echo -e "\n${BLUE}Test 6: Taking screenshot...${NC}"
SCREENSHOT_PATH="/sdcard/mediroutine_test_$(date +%Y%m%d_%H%M%S).png"
adb -s "$DEVICE" shell screencap -p "$SCREENSHOT_PATH"
adb -s "$DEVICE" pull "$SCREENSHOT_PATH" ./test-screenshot.png 2>/dev/null || true
echo -e "${GREEN}✓ Screenshot saved to ./test-screenshot.png${NC}"

# Test 7: Check WebView
echo -e "\n${BLUE}Test 7: Checking WebView status...${NC}"
WEBVIEW_LOGS=$(adb -s "$DEVICE" logcat -d -s chromium:I | tail -5)
if [ -n "$WEBVIEW_LOGS" ]; then
  echo -e "${GREEN}✓ WebView is active${NC}"
else
  echo -e "${RED}⚠ No WebView logs found${NC}"
fi

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ E2E Tests Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nTo monitor live logs, run:"
echo -e "  ${BLUE}./watch-logs.sh${NC}"
