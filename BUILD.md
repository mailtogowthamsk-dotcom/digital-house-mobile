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

## Login OTP email not received on real device (APK)

The APK talks to the **backend URL** set at build time (`EXPO_PUBLIC_API_URL` in EAS). That backend must be the one where **SMTP is configured and working** (same server where you get mail in local Expo).

1. **Set EAS env** so the APK hits the correct backend:
   - In [expo.dev](https://expo.dev) → your project → **Build** → **Environment variables**, add:
   - `EXPO_PUBLIC_API_URL` = your production API base URL ending with `/api` (e.g. `https://infosensetechnologies.com/digitalhouse/backend/api`).
   - Rebuild the APK after changing env so the new URL is baked in.

2. **Backend SMTP (cPanel / production):** On the server the APK uses, set in backend `.env`:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` / `MAIL_FROM`, `SMTP_FROM_NAME`
   - Production uses Mailcow: `SMTP_HOST=mail.konguvettuvagounder.com`, port `587` + STARTTLS (`SMTP_ENCRYPTION=tls`).
   - Use a reliable SMTP so OTP emails are not blocked or delayed. If mail fails, the app will now show: *"Could not send verification email. Please try again or contact support."*
