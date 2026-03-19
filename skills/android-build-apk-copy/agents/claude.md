# Claude Skill Card: android-build-apk-copy

Use this when you only need a compiled APK artifact and want it copied to `E:\project\TermLink`.

## Trigger Phrases

- "只编译 APK 并复制"
- "build apk only"
- "compile apk and copy to E drive"

## Runbook (Repo Root)

```powershell
powershell -ExecutionPolicy Bypass -File .\skills\android-build-apk-copy\scripts\build-apk-and-copy.ps1
```

## Optional

```powershell
powershell -ExecutionPolicy Bypass -File .\skills\android-build-apk-copy\scripts\build-apk-and-copy.ps1 -OutDir E:\project\TermLink -OutName app-debug.apk -JdkHome D:\ProgramCode\openjdk\jdk-21
```

## Notes

- This skill does not install APK to device.
- Default output is `E:\project\TermLink\app-debug.apk`.
