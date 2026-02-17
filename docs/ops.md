# TermLink Ops Checklist

## 1. Nginx mTLS Deployment Checklist

- Confirm server TLS cert/key paths are valid and readable by Nginx.
- Enable client cert verification (`ssl_verify_client on` or equivalent mTLS policy).
- Configure trusted client CA chain (`ssl_client_certificate`).
- Keep mTLS host allowlist aligned across:
  - Nginx exposed hostnames
  - Android profile `allowedHosts` (or `TERMLINK_MTLS_ALLOWED_HOSTS` fallback)
- Validate server endpoint with:
  - Browser access for server cert trust
  - Android client-cert handshake in app (Terminal + Sessions API path)

## 2. Android Build Environment Checklist

- JDK 21 installed and active.
- Android SDK/Build Tools installed via Android Studio.
- Run asset sync before build:

```bash
npm run android:sync
```

- Build debug APK:

```bash
cd android
./gradlew :app:compileDebugKotlin :app:assembleDebug
```

- Expected artifact:
  - `android/app/build/outputs/apk/debug/app-debug.apk`

## 3. Release Safety Checklist

Even when only building debug in this phase, keep release checks in pipeline:

```bash
npm run android:check-release-config
```

- Must pass before any release packaging.
- Do not release with:
  - `server.cleartext=true`
  - `server.androidScheme="http"`
  - `server.url` using `http://`

## 4. Phase 7 Acceptance Record

- Deliverable: debug APK only.
- Build output: `android/app/build/outputs/apk/debug/app-debug.apk`
- Commit hash: `e7da46d`
- Build timestamp (UTC): `2026-02-17T06:51:14Z`
