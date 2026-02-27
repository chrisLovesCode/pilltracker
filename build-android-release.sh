#!/bin/bash

set -euo pipefail

# Build a release APK with the production web bundle (no debug UI),
# and copy it into "Latest Android Release/mediroutine_v<package.json version>.apk".

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

APP_VERSION="$(node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); process.stdout.write(p.version);")"
APK_FILENAME="mediroutine_v${APP_VERSION}.apk"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$PATH:$ANDROID_HOME/platform-tools"

if [ -d "/opt/homebrew/opt/openjdk@21" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "[1/4] Building web (production)..."
npm run build >/dev/null

echo "[2/4] Syncing Capacitor (android)..."
npx cap sync android >/dev/null

echo "[3/4] Building release APK..."
cd android
./gradlew :app:assembleRelease -Pmediroutine.viteMode=production --quiet
cd "$ROOT_DIR"

OUT_DIR="$ROOT_DIR/Latest Android Release"
mkdir -p "$OUT_DIR"

# Depending on signing config, Gradle may output signed or unsigned release APK.
APK_PATH=""
if [ -f "$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk" ]; then
  APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
elif [ -f "$ROOT_DIR/android/app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
  APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/release/app-release-unsigned.apk"
else
  echo "ERROR: Release APK not found under android/app/build/outputs/apk/release/"
  ls -la "$ROOT_DIR/android/app/build/outputs/apk/release/" || true
  exit 1
fi

cp -f "$APK_PATH" "$OUT_DIR/$APK_FILENAME"
echo "[4/4] Copied to: $OUT_DIR/$APK_FILENAME"
