#!/usr/bin/env bash
# Reliable Expo / Metro start for physical Android/iOS devices.
# Fixes "Cannot connect to Expo CLI" caused by Wi‑Fi IP drift or different subnets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-lan}" # lan | tunnel | usb

detect_lan_ip() {
  local ip=""
  if command -v ipconfig >/dev/null 2>&1; then
    ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
    if [[ -z "$ip" ]]; then
      ip="$(ipconfig getifaddr en1 2>/dev/null || true)"
    fi
  fi
  if [[ -z "$ip" ]]; then
    ip="$(
      python3 - <<'PY' 2>/dev/null || true
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
try:
    s.connect(("8.8.8.8", 80))
    print(s.getsockname()[0])
finally:
    s.close()
PY
    )"
  fi
  echo "$ip"
}

case "$MODE" in
  tunnel)
    echo "▶ Starting Expo with tunnel (works across Wi‑Fi / hotspot changes)"
    exec npx expo start -c --tunnel
    ;;
  usb)
    if ! command -v adb >/dev/null 2>&1; then
      echo "adb not found. Install Android platform-tools, then retry."
      exit 1
    fi
    if ! adb devices | awk 'NR>1 && $2=="device"{found=1} END{exit !found}'; then
      echo "No Android device in 'adb devices'."
      echo "Enable USB debugging, plug in the phone, allow the Mac, then retry:"
      echo "  npm run start:usb"
      exit 1
    fi
    echo "▶ Setting adb reverse for Metro (8081) and local API (4000)"
    adb reverse tcp:8081 tcp:8081
    adb reverse tcp:4000 tcp:4000 || true
    echo "▶ Starting Expo (device reaches Metro via USB localhost)"
    export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1
    exec npx expo start -c --localhost
    ;;
  lan|*)
    IP="$(detect_lan_ip)"
    if [[ -z "$IP" ]]; then
      echo "Could not detect LAN IP. Falling back to Expo defaults."
      echo "If you still see 'Cannot connect to Expo CLI', use: npm run start:tunnel"
      exec npx expo start -c
    fi
    echo "▶ Detected LAN IP: $IP"
    echo "  Phone + Mac must be on the SAME Wi‑Fi (disable Android Wi‑Fi assistant)."
    echo "  Metro host forced to $IP (avoids stale 192.168.x.x after network change)."
    echo "  Local API tip: EXPO_PUBLIC_API_URL=http://$IP:4000/api"
    export REACT_NATIVE_PACKAGER_HOSTNAME="$IP"
    exec npx expo start -c
    ;;
esac
