# Real Device Checklist – Digital House Mobile

Use this to verify the app works on a **physical Android or iOS device**.

## 0. “Cannot connect to Expo CLI” (LogBox warning)

This is **not an app bug**. The phone loaded JS once, then lost the Metro/HMR socket to your Mac (Wi‑Fi IP changed, different subnet, hotspot, or Android Wi‑Fi assistant).

**Fix (pick one):**

1. **Best on flaky Wi‑Fi / hotspot:** stop Metro (`Ctrl+C`), then:
   ```bash
   cd mobile && npm run start:tunnel
   ```
   Reopen the app / scan the new QR (development build, not Expo Go if you use native modules).

2. **Same Wi‑Fi LAN (fast):**
   ```bash
   cd mobile && npm run start:lan
   ```
   Script detects the current Mac IP and sets `REACT_NATIVE_PACKAGER_HOSTNAME` so Metro does not keep advertising a stale `192.168.x.x`.

3. **USB (most stable locally):** enable USB debugging, plug phone in, confirm `adb devices` shows the device, then:
   ```bash
   cd mobile && npm run start:usb
   ```
   This runs `adb reverse tcp:8081 tcp:8081` so the phone reaches Metro via USB.

Also check:

- Phone and Mac on the **same** network; on Realme/Oppo disable **Wi‑Fi assistant** / auto mobile-data switch.
- After Wi‑Fi change, update `mobile/.env` `EXPO_PUBLIC_API_URL=http://YOUR_NEW_MAC_IP:4000/api` and restart Expo.
- You can **Dismiss** the warning to keep using the already-bundled app; Fast Refresh / reload will stay broken until Metro reconnects.

## 1. API URL (required)

- **Real device cannot use `localhost`.** Use your computer’s LAN IP so the phone and Mac are on the same Wi‑Fi.
- In `mobile/.env` set:
  - **Local backend:** `EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:4000/api`
  - **Production:** `EXPO_PUBLIC_API_URL=https://www.infosensetechnologies.com/digitalhouse/backend/api` (must include **www**)
- Get your Mac IP: `ipconfig getifaddr en0` (or `ifconfig | grep "inet " | grep -v 127.0.0.1`)
- Restart Expo after changing `.env`: `npm run start:lan` (or `start:tunnel`)

## 2. Android

- **Permissions:** App has `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `CAMERA` in `app.json`. Grant when prompted.
- **HTTP (local testing):** Android 9+ blocks plain HTTP by default. `usesCleartextTraffic` is enabled in `app.json` for dev builds. If API calls fail with “cleartext not permitted”, use a production HTTPS URL or a tunnel (e.g. ngrok) for local backend.
- **Image upload:** Picker may return `content://` URIs. Code copies to a temp `file://` before upload; no change needed.
- **SecureStore:** Wrapped in try/catch to avoid crashes if keystore isn’t ready.

### Realme / Oppo / ColorOS (common “works on iPhone, fails on Android”)

If login works once then feed/messages stop loading:

1. **Wi‑Fi assistant / Smart network switch** — Settings → Wi‑Fi → disable “Wi‑Fi assistant” or “Auto switch to mobile data”. When enabled, the phone may use **mobile data** while Wi‑Fi is on, so `http://192.168.x.x` (your Mac) becomes unreachable.
2. **Battery optimization** — Settings → Battery → App battery management → Digital House → **Don’t optimize** / Allow background activity.
3. **Same Wi‑Fi** — Phone and computer must be on the same network; confirm Mac IP with `ipconfig getifaddr en0` and update `mobile/.env`.
4. **Production testing** — On Realme away from your desk, use  
   `EXPO_PUBLIC_API_URL=https://www.infosensetechnologies.com/digitalhouse/backend/api`  
   then `npm run start:lan` or `start:tunnel`.

## 3. iOS

- **Permissions:** `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, `NSMicrophoneUsageDescription` are in `app.json`. Grant when prompted.
- **Image upload:** Uses `file://` or asset URI; no extra handling needed.

## 4. What’s already handled for device

- **Token storage:** SecureStore on iOS/Android; localStorage only on web.
- **API client:** Uses `EXPO_PUBLIC_API_URL`; 30s timeout; 401/403 handling; token on every request.
- **Image picker:** MIME from `asset.mimeType` or URI; safe filename for `content://` on Android.
- **Media upload:** Android `content://` → temp file then `FileSystem.uploadAsync`.
- **Error boundary:** `AppErrorBoundary` catches JS errors and shows “Try again”.
- **expo-updates:** Disabled in `app.json` to avoid launch issues.

## 5. Quick test flow on device

1. Backend running (local or production).
2. `.env` has correct `EXPO_PUBLIC_API_URL` for that backend.
3. `npm run start:lan` (or `start:tunnel` / `start:usb`), then open on device (**development build** for Google Sign-In / push).
4. **Landing** → **Register** or **Login** (OTP if enabled).
5. **Home** loads (summary + feed).
6. **Create Post** → pick image → upload → submit.
7. **Post detail** → like, comment; **Profile** → edit profile.

## 6. If something fails on device

- **“Cannot connect to Expo CLI”:** See section 0.
- **“Cannot reach server”:** Same Wi‑Fi as Mac? Correct IP in `.env`? Backend running and reachable (e.g. `curl http://YOUR_MAC_IP:4000/health` from another machine)?
- **Upload fails:** Check backend `/api/media/upload-url` and R2/config. On device, check Metro/Expo logs for the error.
- **App crashes:** Use `adb logcat` (Android) or Xcode console (iOS) for native stack trace; check for red errors in Metro.
