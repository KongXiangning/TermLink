#ifndef StageRoot
  #error StageRoot define is required
#endif
#ifndef OutputDir
  #error OutputDir define is required
#endif
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{A40B94DF-66E8-4B77-A899-18761B0B35D4}
AppName=TermLink
AppVersion={#AppVersion}
AppPublisher=TermLink
DefaultDirName={localappdata}\Programs\TermLink
DefaultGroupName=TermLink
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
OutputDir={#OutputDir}
OutputBaseFilename=TermLink-Setup-win-x64-v{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=TermLink
UninstallDisplayIcon={app}\TermLink-Config.cmd
CloseApplications=no
RestartApplications=no
SetupLogging=yes

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Shortcuts:"
Name: "autostart"; Description: "Start TermLink when I sign in"; GroupDescription: "Startup:"; Flags: unchecked

[Files]
Source: "{#StageRoot}\*"; DestDir: "{app}"; Excludes: "persistent\*"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{app}\persistent\config"; Flags: uninsneveruninstall
Name: "{app}\persistent\runtime"; Flags: uninsneveruninstall
Name: "{app}\persistent\data"; Flags: uninsneveruninstall
Name: "{app}\persistent\logs"; Flags: uninsneveruninstall
Name: "{app}\persistent\run"; Flags: uninsneveruninstall
Name: "{app}\persistent\certs"; Flags: uninsneveruninstall

[Icons]
Name: "{group}\TermLink Configuration"; Filename: "{app}\TermLink-Config.cmd"; WorkingDir: "{app}"
Name: "{group}\Start TermLink"; Filename: "{app}\Start-TermLink.cmd"; WorkingDir: "{app}"
Name: "{group}\Stop TermLink"; Filename: "{app}\Stop-TermLink.cmd"; WorkingDir: "{app}"
Name: "{group}\Uninstall TermLink"; Filename: "{uninstallexe}"
Name: "{autodesktop}\TermLink"; Filename: "{app}\TermLink-Config.cmd"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\TermLink-Config.cmd"; Description: "Open TermLink Configuration"; Flags: postinstall nowait skipifsilent

[Code]
function PowerShellPath(): String;
begin
  Result := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
end;

function RunCli(const Operation: String): Boolean;
var
  ResultCode: Integer;
  Params: String;
begin
  Params := '-NoProfile -ExecutionPolicy Bypass -File "' +
    ExpandConstant('{app}\tools\windows\termlink-config.ps1') + '" ' + Operation +
    ' -InstallRoot "' + ExpandConstant('{app}') + '" -Json';
  Result := Exec(PowerShellPath(), Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  if FileExists(ExpandConstant('{app}\tools\windows\termlink-config.ps1')) then
    RunCli('stop');
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Attempt: Integer;
  Healthy: Boolean;
begin
  if CurStep = ssPostInstall then
  begin
    if not RunCli('start') then
      RaiseException('TermLink failed to start after installation.');
    if WizardIsTaskSelected('autostart') and not RunCli('autostart enable') then
      RaiseException('TermLink was installed, but autostart registration failed.');
    Healthy := False;
    for Attempt := 1 to 20 do
    begin
      if RunCli('health -TimeoutSeconds 2') then
      begin
        Healthy := True;
        Break;
      end;
      Sleep(250);
    end;
    if not Healthy then
      RaiseException('TermLink failed its post-install health check.');
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    RunCli('stop');
    RunCli('autostart disable');
  end;
end;
