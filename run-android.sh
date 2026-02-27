#!/bin/bash

# =============================================================================
# MediRoutine Android Build & Deploy Script
# =============================================================================
# Automatisiert: Build → Sync → Install → Run auf Android Emulator
#
# Usage: ./run-android.sh
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MediRoutine Android Build & Deploy${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Set Java Environment
echo -e "${YELLOW}[1/5] Setting up Java environment...${NC}"
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
java -version
echo -e "${GREEN}✓ Java configured${NC}\n"

# Step 2: Build Web App
echo -e "${YELLOW}[2/5] Building web app...${NC}"
npm run build:android
echo -e "${GREEN}✓ Web build complete${NC}\n"

# Step 3: Sync to Android
echo -e "${YELLOW}[3/5] Syncing to Android...${NC}"
npx cap sync android
echo -e "${GREEN}✓ Capacitor sync complete${NC}\n"

# Step 4: Build & Install APK
echo -e "${YELLOW}[4/5] Building and installing APK...${NC}"
cd android
./gradlew installDebug
cd ..
echo -e "${GREEN}✓ APK installed on device/emulator${NC}\n"

# Best-effort: pre-grant runtime permission for notifications (Android 13+) to avoid blocking dialogs.
adb shell pm grant com.pilltracker.app android.permission.POST_NOTIFICATIONS 2>/dev/null || true

# Step 5: Success message
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Deployment successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "App is now running on your Android device/emulator.\n"
echo -e "To view logs, run:"
echo -e "${BLUE}  cd android && ./gradlew --no-daemon -q app:logcatDebug${NC}\n"
