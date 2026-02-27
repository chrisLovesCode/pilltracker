#!/bin/bash

# =============================================================================
# MediRoutine E2E Test Runner
# =============================================================================
# Führt vollständige E2E Tests für alle CRUD-Operationen aus
#
# Usage: ./run-e2e-tests.sh
# Optional: ./run-e2e-tests.sh --skip-build (überspringt Build-Schritte)
# =============================================================================

set -e  # Exit on error
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_BUILD=false
OPEN_REPORT=false
for arg in "$@"; do
    if [[ "$arg" == "--skip-build" ]]; then
        SKIP_BUILD=true
    fi
    if [[ "$arg" == "--open-report" ]]; then
        OPEN_REPORT=true
    fi
done

PREFLIGHT_TIMEOUT_SEC="${PREFLIGHT_TIMEOUT_SEC:-240}"
TEST_TIMEOUT_SEC="${TEST_TIMEOUT_SEC:-420}"
GRADLE_COMMON_ARGS=(
  "-Pmediroutine.copyWeb=false"
  "--console=plain"
)

run_gradle_with_timeout() {
    local timeout_sec="$1"
    shift

    local timed_out_file
    timed_out_file=$(mktemp)
    echo "0" > "$timed_out_file"

    "$@" &
    local cmd_pid=$!

    (
        sleep "$timeout_sec"
        if kill -0 "$cmd_pid" 2>/dev/null; then
            echo "1" > "$timed_out_file"
            kill -TERM "$cmd_pid" 2>/dev/null || true
            sleep 5
            kill -KILL "$cmd_pid" 2>/dev/null || true
        fi
    ) &
    local watchdog_pid=$!

    local cmd_exit=0
    if wait "$cmd_pid"; then
        cmd_exit=0
    else
        cmd_exit=$?
    fi

    kill "$watchdog_pid" 2>/dev/null || true
    wait "$watchdog_pid" 2>/dev/null || true

    local timed_out
    timed_out=$(cat "$timed_out_file")
    rm -f "$timed_out_file"

    if [ "$timed_out" = "1" ]; then
        return 124
    fi
    return "$cmd_exit"
}

print_latest_test_artifacts() {
    local latest_dir
    latest_dir=$(ls -td app/build/outputs/androidTest-results/connected/debug/*/ 2>/dev/null | head -n 1 || true)
    if [ -z "$latest_dir" ]; then
        echo -e "${YELLOW}Keine AndroidTest-Artefakte gefunden.${NC}"
        return
    fi

    local test_log="${latest_dir}testlog/test-results.log"
    local logcat_file
    logcat_file=$(ls -t "${latest_dir}"logcat-*.txt 2>/dev/null | head -n 1 || true)

    if [ -f "$test_log" ]; then
        echo -e "\n${BLUE}Instrumentation Log:${NC}"
        echo -e "${BLUE}  $test_log${NC}"
        tail -n 60 "$test_log" 2>/dev/null || true
    fi

    if [ -n "$logcat_file" ]; then
        echo -e "\n${BLUE}Logcat (latest):${NC}"
        echo -e "${BLUE}  $logcat_file${NC}"
        tail -n 80 "$logcat_file" 2>/dev/null || true
    fi
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MediRoutine E2E Tests${NC}"
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
DEVICE=$(adb devices | awk '$2=="device"{print $1; exit}')
if [ -n "$DEVICE" ]; then
    export ANDROID_SERIAL="$DEVICE"
    echo -e "${BLUE}Using device: $DEVICE${NC}"
    adb -s "$DEVICE" shell pm grant com.pilltracker.app android.permission.POST_NOTIFICATIONS >/dev/null 2>&1 || true
fi

if [ "$SKIP_BUILD" = false ]; then
    # Step 3: Build Web App
    echo -e "${YELLOW}[3/6] Building web app...${NC}"
    npm run build:android > /dev/null 2>&1
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
if run_gradle_with_timeout "$PREFLIGHT_TIMEOUT_SEC" \
  ./gradlew :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=com.pilltracker.app.MediRoutineE2ETest#test00_preflightDbInit \
  "${GRADLE_COMMON_ARGS[@]}"; then
    PREFLIGHT_EXIT_CODE=0
else
    PREFLIGHT_EXIT_CODE=$?
fi

if [ $PREFLIGHT_EXIT_CODE -ne 0 ]; then
    cd ..
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  ✗ Preflight FAILED (DB/UI not ready)${NC}"
    echo -e "${RED}========================================${NC}"
    if [ $PREFLIGHT_EXIT_CODE -eq 124 ]; then
        echo -e "${RED}Grund: Preflight-Timeout nach ${PREFLIGHT_TIMEOUT_SEC}s${NC}"
    fi
    cd android
    print_latest_test_artifacts
    cd ..
    echo -e "\n${BLUE}Test Report:${NC}"
    echo -e "${BLUE}  file://$(pwd)/android/app/build/reports/androidTests/connected/debug/index.html${NC}\n"
    exit $PREFLIGHT_EXIT_CODE
fi

echo -e "${GREEN}✓ Preflight PASSED${NC}\n"

# Run each test method individually (fail-fast on first failure/timeout).
TEST_METHODS=(
  "test01_createMedicationAndTrack"
  "test02_groupTrackAllUpdatesLastIntake"
  "test02_openDbInfo"
  "test03_openNotificationsDebug"
  "test04_medicationNotificationsScheduleAndFire"
  "test05_notificationsE2E"
  "test06_printCardsViewOpens"
  "test07_dueBadgeReappearsForLaterSlotAfterEarlierTrack"
)

TEST_EXIT_CODE=0
FAILED_TEST=""
for TEST_METHOD in "${TEST_METHODS[@]}"; do
    echo -e "${YELLOW}Running ${TEST_METHOD}...${NC}"
    if run_gradle_with_timeout "$TEST_TIMEOUT_SEC" \
      ./gradlew :app:connectedDebugAndroidTest \
      -Pandroid.testInstrumentationRunnerArguments.class=com.pilltracker.app.MediRoutineE2ETest#${TEST_METHOD} \
      "${GRADLE_COMMON_ARGS[@]}"; then
        echo -e "${GREEN}✓ ${TEST_METHOD} passed${NC}\n"
    else
        TEST_EXIT_CODE=$?
        FAILED_TEST="$TEST_METHOD"
        echo -e "${RED}✗ ${TEST_METHOD} failed${NC}\n"
        break
    fi
done
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
    if [ -n "$FAILED_TEST" ]; then
        echo -e "${RED}Failed test: ${FAILED_TEST}${NC}"
    fi
    if [ $TEST_EXIT_CODE -eq 124 ]; then
        echo -e "${RED}Grund: Test-Timeout nach ${TEST_TIMEOUT_SEC}s${NC}"
    fi
    cd android
    print_latest_test_artifacts
    cd ..
fi

echo -e "\n${BLUE}Test Report:${NC}"
echo -e "${BLUE}  file://$(pwd)/android/app/build/reports/androidTests/connected/debug/index.html${NC}\n"

# Optional: open report in browser if explicitly requested.
if [ "$OPEN_REPORT" = true ] && command -v open &> /dev/null; then
    open android/app/build/reports/androidTests/connected/debug/index.html 2>/dev/null || true
fi

exit $TEST_EXIT_CODE
