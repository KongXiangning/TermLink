# Claude Skill Card: android-local-build-debug

Use this when you need repeatable Android real-device debug on TermLink.

## Trigger Phrases

- "build and install debug apk"
- "run adb debug loop"
- "collect TermLink logcat"
- "validate local server config on device"

## Runbook (Repo Root)

1. Doctor:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\adb-doctor.ps1
```

2. Build APK:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\build-debug-apk.ps1
```

3. Install + launch:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\install-debug-apk.ps1 -Serial da34332c
```

4. Stream logs:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\android-local-build-debug\scripts\logcat-termlink.ps1 -Serial da34332c
```

## Notes

- Preferred devices: `da34332c`, then `MQS7N19402011743`.
- Always pass `-Serial` when multiple devices are online.
- If build JDK is not auto-detected, pass `-JdkHome <path>` to `build-debug-apk.ps1`.
