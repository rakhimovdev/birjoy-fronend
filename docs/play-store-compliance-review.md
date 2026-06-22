# BirJoy Play Store Compliance Review

Last updated: June 22, 2026

## Findings

### 1. Remote `server.url` production usage

- Severity: High
- Status: Mitigated but not eliminated
- Detail: Capacitor officially marks `server.url` and `allowNavigation` as not intended for production use. BirJoy currently uses this pattern because the requirement is to open the live website inside the Android app.

### 2. Account deletion was missing

- Severity: High
- Status: Addressed
- Detail: BirJoy allowed account creation but previously had no working delete-account flow. The app now includes:
  - backend `DELETE /api/auth/me`
  - in-app delete action from profile
  - public account deletion page

### 3. Google sign-in via WebView popup

- Severity: High
- Status: Addressed
- Detail: Web Google popup flows are unreliable in Android WebView. BirJoy now uses a native Google sign-in bridge on Android and continues using the existing web flow elsewhere.

### 4. TypeScript and ESLint are ignored during web production builds

- Severity: Medium
- Status: Open
- Detail: `frontend/next.config.ts` disables TypeScript and ESLint failures in production builds. This should be reversed before a major rollout.

### 5. Default admin credentials exist in backend env parsing

- Severity: High
- Status: Open
- Detail: The backend still defines fallback admin credentials in `backend/src/config/env.js`. Production must override them with strong secrets.

### 6. Local storage token persistence

- Severity: Medium
- Status: Open
- Detail: Auth tokens are stored in browser local storage. This is common in web apps but increases exposure on compromised devices. Long-term hardening should consider shorter token lifetime and rotation.

### 7. Privacy policy was missing

- Severity: High
- Status: Addressed
- Detail: BirJoy now includes a public privacy policy page suitable for Play listing disclosure.

## Recommended next hardening wave

1. Move away from remote `server.url` to a bundled first-party web build if possible.
2. Re-enable type checking and linting in production builds.
3. Add runtime monitoring and crash reporting before scale-up.
4. Replace any template support contact fields with monitored production contacts.
5. Verify `assetlinks.json` against the Play app signing certificate before release.
