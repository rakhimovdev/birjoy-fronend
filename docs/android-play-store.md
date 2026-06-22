# BirJoy Android Release Guide

Last updated: June 22, 2026

## Overview

This project now includes a Capacitor Android wrapper for BirJoy with:

- Android app ID: `uz.birjoy.app`
- App name: `BirJoy`
- Native splash screen and Android launcher icons generated from the BirJoy logo
- Android 10+ support (`minSdkVersion = 29`)
- Offline fallback page for initial load failures
- Native camera/gallery support for listing images
- Native Google sign-in bridge for Android WebView reliability
- App Links and custom deep link handling
- Signing config templates for release builds

## Important architectural note

BirJoy currently uses `server.url` to load the live website inside Capacitor. Capacitor's official config docs state that `server.url` and `server.allowNavigation` are intended for live reload and are **not intended for production**. This setup satisfies the current requirement to open the live website inside the app, but it remains a long-term review and reliability risk compared with bundling first-party web assets locally.

## Files added or changed

- `capacitor.config.ts`
- `android/`
- `mobile-shell/offline.html`
- `public/.well-known/assetlinks.json`
- `src/components/providers/NativeAppBridge.tsx`
- `src/components/auth/GoogleAuthSection.tsx`
- `src/app/ads/create/page.tsx`
- `src/app/privacy-policy/page.tsx`
- `src/app/account-deletion/page.tsx`
- Backend account deletion endpoint: `DELETE /api/auth/me`

## Google authentication setup

### Required Google Cloud Console items

1. Keep your existing **Web application OAuth client**.
2. Create an **Android OAuth client** with:
   - Package name: `uz.birjoy.app`
   - SHA-1 certificate fingerprint from the signing key used by the Android build
3. Keep `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` pointed at the **Web client ID**.
4. Add both client IDs to `GOOGLE_CLIENT_IDS` on the backend if they differ.

### Why this matters

The Android wrapper uses a native Google sign-in plugin to obtain an ID token, then sends that token to the existing backend `/api/auth/google` endpoint. This avoids relying on the Google web popup inside Android WebView.

## Deep links and app links

### Configured

- `https://www.bir-joy.uz/*`
- `https://bir-joy.uz/*`
- `birjoy://app/*`

### Production note

`public/.well-known/assetlinks.json` currently uses the generated **upload key** fingerprint:

- `30:2A:10:D6:51:E3:F7:83:70:B9:C5:EF:58:9F:36:D8:7E:59:44:E9:B1:FB:BA:83:1F:DD:4E:8B:3B:7D:48:A4`

If Google Play App Signing re-signs the release with a different **app signing certificate**, replace this fingerprint before rolling out production App Links.

## Play listing content

### App category recommendation

- Primary category: `Shopping`

### Content rating guidance

- Complete the IARC questionnaire honestly.
- Because BirJoy includes user-generated listings, buyer/seller contact details, and marketplace interactions, a result around `Teen` is more realistic than assuming `Everyone`.
- Do not mark the app for children.

### Short description

Buy, sell, and manage classifieds across Uzbekistan with BirJoy.

### Full description

BirJoy is a multilingual classifieds marketplace built for Uzbekistan. Discover products and services, post listings, save favorites, and manage buying interest from one mobile app.

With BirJoy, you can:

- Browse marketplace listings by category
- Publish ads with photos, price, condition, and location
- Sign in securely with email, password, or Google
- Save favorite listings for later
- Receive order requests tied to your listings
- Manage your account directly from the app

The Android app is designed for fast marketplace access, reliable Google authentication, native photo upload support, and smoother mobile performance on Android 10 and newer devices.

### Privacy Policy URL

- Recommended public URL: `https://www.bir-joy.uz/privacy-policy`

### Account deletion URL

- Recommended public URL: `https://www.bir-joy.uz/account-deletion`

### Feature graphic recommendations

- Use the official BirJoy wordmark and app icon mark together.
- Keep the background bright and commerce-oriented using the existing BirJoy blue and orange gradients.
- Show one clear message only, such as: `Buy and sell across Uzbekistan`.
- Prepare a clean `1024 x 500` PNG for Play Store feature graphics and verify the latest asset rules inside Play Console before submission.

## Privacy policy checklist

- Publish `https://www.bir-joy.uz/privacy-policy`
- Add the same URL in Play Console
- Ensure the policy matches real data collection and support channels before launch
- Replace template contact references if your monitored privacy contact differs

## Release signing

### Files

- Upload keystore: `keystore/birjoy-upload-keystore.jks`
- Gradle properties: `android/keystore.properties`
- Template: `android/keystore.properties.example`

### Generated upload key certificate

- SHA-1: `AD:24:82:E0:C1:EF:99:B9:5F:19:AB:A2:B6:53:9E:CE:3E:87:67:00`
- SHA-256: `30:2A:10:D6:51:E3:F7:83:70:B9:C5:EF:58:9F:36:D8:7E:59:44:E9:B1:FB:BA:83:1F:DD:4E:8B:3B:7D:48:A4`

## Build steps

1. Deploy the latest frontend to `https://www.bir-joy.uz`.
2. Deploy the backend changes so `/api/auth/me` account deletion works in production.
3. In Google Cloud Console:
   - Create or verify the Android OAuth client
   - Add the correct SHA-1 for the signing certificate
4. In Play Console:
   - Create the app
   - Enroll in Play App Signing
   - Compare the Play **app signing** certificate with `public/.well-known/assetlinks.json`
   - Update `assetlinks.json` if Play uses a different certificate
5. Sync Capacitor:
   - `npx cap sync android`
6. Open Android Studio on `frontend/android`.
7. Confirm `google-services.json` is not required unless you later add Firebase-native features.
8. Build the release bundle:
   - `./gradlew bundleRelease`
9. Output location:
   - `android/app/build/outputs/bundle/release/app-release.aab`

## Verification checklist

- App launches the live site
- Offline launch shows the native fallback page
- Native Google sign-in works on a real Android device
- Gallery and camera listing uploads work on Android 10, 13, and a recent Pixel/Samsung device
- App links open the app from `bir-joy.uz` URLs
- Telegram and Instagram links open outside the app
- Account deletion works from profile
- Privacy policy and account deletion URLs are reachable without login

## Known residual risks

1. `server.url` is still a production risk because Capacitor does not recommend this pattern for production apps.
2. `next.config.ts` currently ignores TypeScript and ESLint errors during web builds, which increases regression risk.
3. The app depends on the public website uptime and mobile-web compatibility for every production session.
4. `assetlinks.json` must be updated if Play App Signing uses a different certificate than the upload key.
