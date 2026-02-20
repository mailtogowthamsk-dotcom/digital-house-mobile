# Building Android APK

This project uses **Expo EAS Build** (cloud). The `preview` profile is configured to produce an **APK** (not AAB) for easy sideloading.

## Steps

1. **From the `mobile` folder**, ensure you're logged in to Expo:
   ```bash
   npx eas login
   ```

2. **Start the Android build:**
   ```bash
   npm run build:android
   ```
   Or:
   ```bash
   npx eas build --platform android --profile preview
   ```

3. **Wait for the build** on Expo’s servers (link appears in the terminal). When it finishes, you’ll get a **download link for the APK**.

4. **Install** the APK on a device (sideload or share the link).

## Notes

- **First time:** EAS may ask to create/select a project; confirm with your Expo account.
- **APK output:** The `preview` profile uses `gradleCommand: ":app:assembleRelease"`, which produces an APK. Use the downloaded file to install on any Android device.
- **Env:** Build uses your `app.json` / `eas.json` and the latest code. For production API URL, set `EXPO_PUBLIC_API_URL` in EAS **Environment variables** (eas.json env or EAS dashboard) so the APK points at your backend.
