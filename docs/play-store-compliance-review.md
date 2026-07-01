# BirJoy Play Store Compliance Review

Last updated: June 26, 2026

## Findings

### 1. Remote `server.url` production usage

- Severity: High
- Status: Mitigated but not eliminated
- Detail: BirJoy still loads the live site inside Capacitor because that is the current product requirement. The repo now adds offline recovery, deep-link handling, and a native Google bridge so the shell provides real native value, but the long-term risk remains until first-party assets are bundled locally.

### 2. Google sign-in reliability in Android WebView

- Severity: High
- Status: Addressed inside the repo
- Detail: Android now uses a native Google sign-in bridge instead of relying on a WebView popup. Browser mode still keeps the normal web flow.

### 3. Account deletion compliance

- Severity: High
- Status: Addressed inside the repo
- Detail: BirJoy now exposes:
  - authenticated backend deletion with `DELETE /api/auth/me`
  - in-app delete action from the profile page
  - public `account-deletion` page reachable without login
  - cleanup of ads, related orders, and deleted-ad favorites

### 4. Privacy policy availability

- Severity: High
- Status: Addressed inside the repo
- Detail: BirJoy now includes a public privacy policy page suitable for Play Store disclosure.

### 5. Unsafe admin fallback credentials

- Severity: High
- Status: Addressed inside the repo
- Detail: The backend no longer silently falls back to built-in admin credentials. Admin login, password, and display name must now be supplied through environment variables unless the developer explicitly opts into insecure dev defaults.

### 6. Next.js production build strictness

- Severity: Medium
- Status: Addressed and verified
- Detail: `frontend/next.config.ts` no longer ignores TypeScript or ESLint build failures. Verified on June 26, 2026 with:
  - `npm run build`
  - `npx tsc --noEmit`

### 7. Signing material stored inside the repo tree

- Severity: High
- Status: Partially addressed
- Detail: The repo now ignores signing files and the template points to a path outside the repo, but any real local keystore still needs to be moved out of the project directory manually.

### 8. Asset Links certificate fingerprint

- Severity: Medium
- Status: Manual follow-up required
- Detail: `frontend/public/.well-known/assetlinks.json` intentionally contains a placeholder SHA-256 fingerprint until the final release certificate is available.

### 9. Minimal Android permissions

- Severity: Low
- Status: Addressed inside the repo
- Detail: The Android manifest is limited to `INTERNET`, with optional camera hardware support and no declared location or storage permissions.

### 10. Local storage token persistence

- Severity: Medium
- Status: Open
- Detail: User auth tokens still live in browser local storage. This is acceptable for the current hybrid web architecture but remains weaker than a more hardened native session storage model.

## What still must happen outside the repo

1. Create or confirm the Android OAuth client in Google Cloud Console
2. Generate or choose the production upload keystore
3. Replace the `assetlinks.json` placeholder fingerprint
4. Confirm the Play app signing certificate and update App Links if needed
5. Build the signed `.aab` on a machine with Android SDK access
6. Test the release on real Android hardware
7. Replace any template privacy/support contacts with monitored production contacts

## Recommended next hardening wave

1. Move away from remote `server.url` and ship bundled first-party web assets inside the app
2. Reduce reliance on local storage for long-lived auth state
3. Add crash reporting and runtime monitoring before wide rollout
4. Add real-device Android regression testing for sign-in, uploads, and deep links
