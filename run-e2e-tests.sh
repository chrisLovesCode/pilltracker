#!/bin/bash

# =============================================================================
# PillTracker E2E Test Runner
# =============================================================================
# Führt vollständige E2E Tests für alle CRUD-Operationen aus
#
# Usage: ./run-e2e-tests.sh
# Optional: ./run-e2e-tests.sh --skip-build (überspringt Build-Schritte)
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_BUILD=false
if [[ "$1" == "--skip-build" ]]; then
    SKIP_BUILD=true
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  PillTracker E2E Tests${NC}"
echo -e "${BLUE}  CRUD Operations Testing${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Set Java Environment
echo -e "${YELLOW}[1/6] Setting up Java environment...${NC}"
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
java -version 2>&1 | head -1
echo -e "${GREEN}✓ Java configured${NC}\n"

# Step 2: Check Emulator
echo -e "${YELLOW}[2/6] Checking Android Emulator...${NC}"
DEVICE_COUNT=$(adb devices | grep -c "device$" || true)
if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo -e "${RED}✗ Kein Emulator gefunden!${NC}"
    echo -e "${YELLOW}Bitte starte einen Emulator mit:${NC}"
    echo -e "${BLUE}  emulator -avd <name>${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Emulator verbunden ($DEVICE_COUNT device)${NC}\n"

# Best-effort: pre-grant runtime permissions to avoid blocking dialogs (Android 13+).
DEVICE=$(adb devices | awk '/emulator|device/{print $1; exit}')
if [ -n "$DEVICE" ]; then
    adb -s "$DEVICE" shell pm grant com.pilltracker.app android.permission.POST_NOTIFICATIONS 2>/dev/null || true
fi

if [ "$SKIP_BUILD" = false ]; then
    # Step 3: Build Web App
    echo -e "${YELLOW}[3/6] Building web app...${NC}"
    npm run build > /dev/null 2>&1
    echo -e "${GREEN}✓ Web build complete${NC}\n"

    # Step 4: Sync to Android
    echo -e "${YELLOW}[4/6] Syncing to Android...${NC}"
    npx cap sync android > /dev/null 2>&1
    echo -e "${GREEN}✓ Capacitor sync complete${NC}\n"
    
    # Step 5: Fix ProGuard
    echo -e "${YELLOW}[5/6] Fixing ProGuard configs...${NC}"
    sed -i '' "s/proguard-android.txt/proguard-android-optimize.txt/g" \
        node_modules/@capacitor/filesystem/android/build.gradle 2>/dev/null || true
    sed -i '' "s/proguard-android.txt/proguard-android-optimize.txt/g" \
        node_modules/@capacitor/local-notifications/android/build.gradle 2>/dev/null || true
    echo -e "${GREEN}✓ ProGuard fixed${NC}\n"
else
    echo -e "${YELLOW}[3-5/6] Skipping build steps...${NC}\n"
fi

# Step 6: Run E2E Tests
echo -e "${YELLOW}[6/6] Running E2E CRUD tests...${NC}"
cd android

# Preflight: run only the DB/UI readiness test first and abort early on failure.
echo -e "${YELLOW}Preflight: DB init + UI ready...${NC}"
./gradlew :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=com.pilltracker.app.PillTrackerE2ETest#test00_preflightDbInit \
  --quiet 2>&1 | grep -E "(Starting|Tests|FAILED|PASSED|completed|FAILURES|Exception|AssertionError)" || true
PREFLIGHT_EXIT_CODE=${PIPESTATUS[0]}

if [ $PREFLIGHT_EXIT_CODE -ne 0 ]; then
    cd ..
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ✗ Preflight FAILED (DB/UI not ready)${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "\n${BLUE}Test Report:${NC}"
    echo -e "${BLUE}  file://$(pwd)/android/app/build/reports/androidTests/connected/debug/index.html${NC}\n"
    exit $PREFLIGHT_EXIT_CODE
fi

echo -e "${GREEN}✓ Preflight PASSED${NC}\n"

./gradlew :app:connectedDebugAndroidTest --quiet 2>&1 | grep -E "(Starting|Tests|FAILED|PASSED|completed|FAILURES|Exception|AssertionError)" || true
TEST_EXIT_CODE=${PIPESTATUS[0]}
cd ..

# Parse results
echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ All Tests PASSED!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ✗ Some Tests FAILED${NC}"
    echo -e "${RED}========================================${NC}"
fi

echo -e "\n${BLUE}Test Report:${NC}"
echo -e "${BLUE}  file://$(pwd)/android/app/build/reports/androidTests/connected/debug/index.html${NC}\n"

# Open report automatically
if command -v open &> /dev/null; then
    open android/app/build/reports/androidTests/connected/debug/index.html 2>/dev/null || true
fi

exit $TEST_EXIT_CODE
