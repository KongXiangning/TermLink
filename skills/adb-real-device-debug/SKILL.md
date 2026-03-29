---
name: adb-real-device-debug
description: Project-local real-device Android debugging workflow for TermLink with adb. Use when installing debug APKs, selecting a target device, launching the app, collecting logcat, or reproducing mobile connectivity issues.
---

# ADB Real Device Debug

Use this skill when you want the old global Codex `adb-real-device-debug` workflow, but from the repository-local skill layout shared by Codex and Claude.

Run commands from repository root:
`E:\coding\TermLink`

## Target Devices

Use this priority by default:
1. `da34332c`
2. `MQS7N19402011743`

If multiple devices are online, always pass `-Serial`.

## Quick Start

1. Doctor and confirm device selection:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/adb-doctor.ps1
```

2. Ensure local server is reachable:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/ensure-local-server.ps1
```

3. Build debug APK:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1
```

4. Install and launch:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial da34332c
```

5. Stream logs:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/logcat-termlink.ps1 -Serial da34332c
```

6. Validate server config:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/validate-server-config.ps1
```

## Standard Debug Loop

1. Run doctor and ensure the local server:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/adb-doctor.ps1
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/ensure-local-server.ps1
```

2. Rebuild and reinstall:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/build-debug-apk.ps1
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/install-debug-apk.ps1 -Serial da34332c
```

3. Relaunch after reinstall if needed:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/launch-termlink.ps1 -Serial da34332c
```

4. Reproduce issue and collect logs:
```powershell
powershell -ExecutionPolicy Bypass -File ./skills/adb-real-device-debug/scripts/logcat-termlink.ps1 -Serial da34332c
```

## Rules

- This skill keeps the legacy `adb-real-device-debug` name but reuses the shared implementation in `skills/android-local-build-debug/scripts`.
- Always use `adb -s <serial>` in scripts and manual commands.
- Keep package fixed to `com.termlink.app`.
- Prefer PID-filtered logcat; fall back to tag filter if PID is unavailable.
- Use JDK 21 for Android build.
- Store private validation URL in `local-config.ps1` beside this skill (gitignored).
