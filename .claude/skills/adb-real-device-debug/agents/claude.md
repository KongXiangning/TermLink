# Claude Skill Card: adb-real-device-debug

Use this when you need the repository-local version of the old global adb real-device debug workflow for TermLink.

## Trigger Phrases

- "run adb real-device debug"
- "install debug apk on phone"
- "collect TermLink logcat on device"
- "reproduce Android connection issue on real device"

## Runbook (Repo Root)

1. Doctor:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\adb-real-device-debug\scripts\adb-doctor.ps1
```

2. Ensure local server:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\adb-real-device-debug\scripts\ensure-local-server.ps1
```

3. Build APK:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\adb-real-device-debug\scripts\build-debug-apk.ps1
```

4. Install + launch:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\adb-real-device-debug\scripts\install-debug-apk.ps1 -Serial da34332c
```

5. Stream logs:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\adb-real-device-debug\scripts\logcat-termlink.ps1 -Serial da34332c
```

6. Validate server config:
```powershell
powershell -ExecutionPolicy Bypass -File .\skills\adb-real-device-debug\scripts\validate-server-config.ps1
```

## Notes

- Preferred devices: `da34332c`, then `MQS7N19402011743`.
- Always pass `-Serial` when multiple devices are online.
- The wrapper scripts intentionally reuse `android-local-build-debug` so Codex and Claude stay on one implementation.
- If build JDK is not auto-detected, pass `-JdkHome <path>` to `build-debug-apk.ps1`.
