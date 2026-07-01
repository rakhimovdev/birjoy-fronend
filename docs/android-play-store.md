# BirJoy Android Release Guide

Last updated: June 26, 2026

## Overview

BirJoy now includes a hardened Capacitor Android wrapper for the app package `uz.birjoy.app`.

- App name: `BirJoy`
- Supported Android versions: Android 10 and newer (`minSdkVersion = 29`)
- Launch mode: opens the live website `https://www.bir-joy.uz` inside the native shell
- Native additions: splash screen, launcher icons, offline fallback page, App Links, external browser handling, native Google sign-in bridge, native camera/gallery integration
- Repo-side verification completed on June 26, 2026:
  - `npm run build`
  - `npx tsc --noEmit`
  - `npx cap sync android`
  - `npm run check` in `backend`

## Production architecture note

BirJoy still uses Capacitor `server.url` because the current product requirement is to load the live BirJoy website inside the Android app. This remains a Play review and reliability risk because the official Capacitor guidance does not treat `server.url` as the preferred long-term production architecture.

What has been done to reduce that risk inside the repo:

- `frontend/mobile-shell/offline.html` now provides a native fallback when the network or live site is unavailable
- `frontend/src/components/providers/NativeAppBridge.tsx` handles deep links and external browser redirects
- `frontend/src/components/auth/GoogleAuthSection.tsx` uses native Google sign-in on Android instead of relying on WebView popup behavior
- `frontend/capacitor.config.ts` now supports `CAPACITOR_LOAD_REMOTE_SITE=false` for a future migration to bundled first-party web assets

Current release recommendation:

- Keep `CAPACITOR_LOAD_REMOTE_SITE=true` while the live-site requirement remains
- Plan a later migration away from `server.url` when the web app can be bundled locally

## Environment files

The repo now includes:

- `backend/.env.example`
- `frontend/.env.example`

Important backend variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_IDS`

Important frontend variables:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `CAPACITOR_LOAD_REMOTE_SITE`
- `CAPACITOR_LIVE_SITE_URL`

## Android permissions and capabilities

Current Android manifest intent is to stay minimal.

- Declared permission: `android.permission.INTERNET`
- Camera hardware is marked optional with `android.hardware.camera.any`
- No location permission is declared
- No storage/media permission is declared
- File uploads and image selection rely on the Android system picker and Capacitor camera APIs only when the user chooses to add photos

## Google authentication

### Repo behavior

- Web browsers keep using the existing Google web flow
- Android native uses `BirJoyAuthPlugin` to get a Google ID token and then sends that token to the existing backend `/api/auth/google` endpoint
- Google sign-in cancellations no longer show hard failure messages
- Backend config is checked before showing the Google action

### Manual Google Cloud Console steps

1. Keep the existing **Web application OAuth client**
2. Create an **Android OAuth client**
3. Use package name: `uz.birjoy.app`
4. Add the release signing certificate fingerprint for the Android client
5. Keep `GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set to the **Web client ID**
6. Add every allowed client ID to `GOOGLE_CLIENT_IDS` in the backend if the Android and web client IDs differ

## Deep links and App Links

Configured in the app:

- `https://www.bir-joy.uz/*`
- `https://bir-joy.uz/*`
- `birjoy://app/*`

Public asset links file:

- Path: `frontend/public/.well-known/assetlinks.json`
- Public URL after deployment: `https://www.bir-joy.uz/.well-known/assetlinks.json`

The repo intentionally uses a placeholder value:

- `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT`

Replace it after your real signing key exists.

### Exact command to get the SHA-256 fingerprint

```bash
keytool -list -v \
  -keystore /absolute/path/outside/repo/birjoy-upload-keystore.jks \
  -alias birjoy-upload | grep 'SHA256:'
```

### If Google Play App Signing changes the certificate

If Play Console shows a different **app signing certificate** than your upload key, update `assetlinks.json` again with the Play app signing SHA-256 fingerprint before rolling out verified App Links.

## Privacy policy and account deletion

Public pages included in the frontend:

- Privacy Policy: `https://www.bir-joy.uz/privacy-policy`
- Account deletion instructions: `https://www.bir-joy.uz/account-deletion`

In-app deletion support:

- Backend endpoint: `DELETE /api/auth/me`
- Protected by auth middleware
- Deletes the current user
- Deletes ads owned by that user
- Deletes orders for those ads
- Deletes orders linked by `customerUserId`
- Removes deleted ad IDs from other users’ favorites

Before release:

- Replace or confirm the privacy support contact details on the public pages
- Make sure support channels are actively monitored

## Play listing content

### Suggested category

- `Shopping`

### Content rating guidance

- Complete the IARC questionnaire honestly
- Because BirJoy contains user-generated listings, seller contact details, and buyer interactions, expect a result closer to `Teen` than `Everyone`
- Do not mark the app as designed for children

### Short description

Buy, sell, and manage classifieds across Uzbekistan with BirJoy.

### Full description

BirJoy is a multilingual classifieds marketplace built for Uzbekistan. Discover products and services, post listings, save favorites, and manage buying interest from one mobile app.

With BirJoy, you can:

- Browse listings by category
- Publish ads with photos, price, condition, and location
- Sign in with email, password, or Google
- Save favorite listings
- Receive order requests connected to your listings
- Manage your account directly from the app

The Android app adds native Google sign-in support, offline recovery, deep link handling, and native image selection for a smoother experience on Android 10 and newer devices.

### Feature graphic recommendations

- Prepare a `1024 x 500` PNG
- Use the BirJoy wordmark and app mark together
- Keep the composition bright and commerce-focused
- Use one simple message such as `Buy and sell across Uzbekistan`

## Signing and release bundle

### Keep secrets outside the repo

- Do not commit the real keystore
- Do not commit passwords
- Do not keep production signing files in Git
- `frontend/android/keystore.properties.example` now points to an absolute path outside the repo on purpose

### Example local signing file

Create `frontend/android/keystore.properties` locally and keep it untracked:

```properties
storeFile=/absolute/path/outside/repo/birjoy-upload-keystore.jks
storePassword=CHANGE_ME
keyAlias=birjoy-upload
keyPassword=CHANGE_ME
```

### Create a release keystore if you do not already have one

```bash
keytool -genkeypair -v \
  -keystore /absolute/path/outside/repo/birjoy-upload-keystore.jks \
  -alias birjoy-upload \
  -keyalg RSA \
  -keysize 4096 \
  -validity 9125
```

### Exact commands to build a signed `.aab`

```bash
cd "/home/muhammadali/Desktop/new project/frontend"
npx cap sync android
cd android
./gradlew clean bundleRelease
```

Expected output:

- `frontend/android/app/build/outputs/bundle/release/app-release.aab`

## Remaining manual steps

1. Put the real environment values into `backend/.env` and `frontend/.env`
2. Move any real keystore out of the repository tree if it is currently inside the project
3. Generate or locate the real upload keystore
4. Fill local `frontend/android/keystore.properties`
5. Replace the placeholder SHA-256 in `frontend/public/.well-known/assetlinks.json`
6. Deploy the frontend so the new `assetlinks.json`, privacy policy, and account deletion page are public
7. Deploy the backend so the hardened auth/account-deletion flow is live
8. Create the Android OAuth client in Google Cloud Console
9. Verify App Links against the Play app signing certificate if Play re-signs the app
10. Build the signed `.aab` on a machine with Android SDK and Gradle access
11. Test Google sign-in, photo upload, deep links, and offline recovery on real Android hardware

## Known residual risks

1. `server.url` remains a production architecture risk until BirJoy stops depending on the live site for every session
2. App stability still depends on the uptime and mobile compatibility of `https://www.bir-joy.uz`
3. Auth tokens are still stored in browser local storage, which is common for web apps but weaker than a more hardened mobile-native session model
4. `assetlinks.json` will not verify until the placeholder SHA-256 is replaced with the real certificate fingerprint
