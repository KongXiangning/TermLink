[CmdletBinding()]
param(
    [string]$InstallRoot,
    [switch]$SmokeTest,
    [ValidateRange(1, 65535)]
    [int]$ExercisePort,
    [switch]$Json,
    [string]$PreviewPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Import-Module (Join-Path $PSScriptRoot 'TermLink.Windows.psm1') -Force

function New-TermLinkButton {
    param([string]$Name, [string]$Text, [int]$Left, [int]$Top, [int]$Width = 104)
    $button = New-Object System.Windows.Forms.Button
    $button.Name = $Name
    $button.Text = $Text
    $button.SetBounds($Left, $Top, $Width, 32)
    $button.AccessibleName = $Text
    return $button
}

function New-TermLinkConfigForm {
    param([string]$Root)

    $form = New-Object System.Windows.Forms.Form
    $form.Name = 'TermLinkConfigForm'
    $form.Text = 'TermLink Configuration'
    $form.StartPosition = 'CenterScreen'
    $form.ClientSize = New-Object System.Drawing.Size(760, 540)
    $form.MinimumSize = New-Object System.Drawing.Size(700, 520)
    $form.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi
    $form.Font = New-Object System.Drawing.Font('Segoe UI', 9)

    $title = New-Object System.Windows.Forms.Label
    $title.Name = 'TitleLabel'
    $title.Text = 'TermLink for Windows'
    $title.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 16)
    $title.SetBounds(20, 16, 360, 36)

    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Name = 'ServiceStatusLabel'
    $statusLabel.Text = 'Status: checking...'
    $statusLabel.Font = New-Object System.Drawing.Font('Segoe UI Semibold', 10)
    $statusLabel.SetBounds(22, 62, 360, 25)
    $statusLabel.AccessibleName = 'Service status'

    $rootLabel = New-Object System.Windows.Forms.Label
    $rootLabel.Name = 'InstallRootLabel'
    $rootLabel.Text = "Install root: $Root"
    $rootLabel.AutoEllipsis = $true
    $rootLabel.SetBounds(22, 90, 710, 22)
    $rootLabel.Anchor = 'Top, Left, Right'

    $separator = New-Object System.Windows.Forms.Label
    $separator.BorderStyle = 'Fixed3D'
    $separator.SetBounds(20, 120, 720, 2)
    $separator.Anchor = 'Top, Left, Right'

    $portLabel = New-Object System.Windows.Forms.Label
    $portLabel.Text = 'Port'
    $portLabel.SetBounds(22, 143, 42, 24)

    $portBox = New-Object System.Windows.Forms.TextBox
    $portBox.Name = 'PortTextBox'
    $portBox.SetBounds(68, 140, 90, 27)
    $portBox.AccessibleName = 'TermLink port'

    $applyPort = New-TermLinkButton 'ApplyPortButton' 'Apply port' 170 137 112
    $refresh = New-TermLinkButton 'RefreshButton' 'Refresh' 624 56 112
    $refresh.Anchor = 'Top, Right'

    $start = New-TermLinkButton 'StartButton' 'Start' 22 194
    $stop = New-TermLinkButton 'StopButton' 'Stop' 136 194
    $restart = New-TermLinkButton 'RestartButton' 'Restart' 250 194
    $health = New-TermLinkButton 'HealthButton' 'Health check' 364 194 116

    $autostartLabel = New-Object System.Windows.Forms.Label
    $autostartLabel.Name = 'AutostartStatusLabel'
    $autostartLabel.Text = 'Autostart: checking...'
    $autostartLabel.SetBounds(22, 247, 330, 24)
    $autostartLabel.AccessibleName = 'Autostart status'
    $enableAutostart = New-TermLinkButton 'EnableAutostartButton' 'Enable autostart' 364 240 140
    $disableAutostart = New-TermLinkButton 'DisableAutostartButton' 'Disable autostart' 514 240 146

    $openPage = New-TermLinkButton 'OpenPageButton' 'Open TermLink' 22 294 132
    $openLogs = New-TermLinkButton 'OpenLogsButton' 'Open logs' 164 294 116
    $mtls = New-TermLinkButton 'EnableMtlsButton' 'Enable mTLS' 290 294 126
    $mtls.AccessibleDescription = 'Generate certificates, restart TermLink, and verify mutual TLS.'

    $detailLabel = New-Object System.Windows.Forms.Label
    $detailLabel.Text = 'Operation details'
    $detailLabel.SetBounds(22, 350, 180, 24)

    $details = New-Object System.Windows.Forms.TextBox
    $details.Name = 'DetailsTextBox'
    $details.Multiline = $true
    $details.ReadOnly = $true
    $details.ScrollBars = 'Vertical'
    $details.BackColor = [System.Drawing.SystemColors]::Window
    $details.SetBounds(22, 377, 714, 138)
    $details.Anchor = 'Top, Bottom, Left, Right'
    $details.AccessibleName = 'Operation details'

    $form.Controls.AddRange(@(
        $title, $statusLabel, $rootLabel, $separator, $portLabel, $portBox,
        $applyPort, $refresh, $start, $stop, $restart, $health,
        $autostartLabel, $enableAutostart, $disableAutostart,
        $openPage, $openLogs, $mtls, $detailLabel, $details
    ))

    $refreshView = {
        try {
            $status = Get-TermLinkServiceStatus -InstallRoot $Root
            $statusLabel.Text = 'Status: {0}  |  {1}://localhost:{2}' -f $status.Status, $status.Protocol, $status.Port
            $statusLabel.ForeColor = if ($status.Running) { [System.Drawing.Color]::DarkGreen } else { [System.Drawing.Color]::DarkSlateGray }
            $portBox.Text = [string]$status.ConfiguredPort
            $autostart = Get-TermLinkAutostartStatus -InstallRoot $Root
            $autostartLabel.Text = if ($autostart.Enabled) { "Autostart: enabled ($($autostart.Backend))" } else { 'Autostart: disabled' }
            $start.Enabled = -not $status.Running
            $stop.Enabled = $status.Running
            $restart.Enabled = $status.Running
            $details.Text = @(
                "Install root: $($status.InstallRoot)"
                "Logs: $($status.LogRoot)"
                "Process: $($status.Detail)"
                $(if ($status.RestartRequired) { 'Configuration changed; restart is required.' } else { 'Configuration matches the running service.' })
            ) -join [Environment]::NewLine
        } catch {
            $statusLabel.Text = 'Status: error'
            $statusLabel.ForeColor = [System.Drawing.Color]::DarkRed
            $details.Text = $_.Exception.Message
        }
    }.GetNewClosure()

    $runOperation = {
        param([scriptblock]$Operation)
        $form.UseWaitCursor = $true
        $operationText = $null
        try {
            $result = & $Operation
            $operationText = ($result | Format-List | Out-String).Trim()
        } catch {
            $operationText = "Error: $($_.Exception.Message)"
            [System.Windows.Forms.MessageBox]::Show($form, $_.Exception.Message, 'TermLink', 'OK', 'Error') | Out-Null
        } finally {
            $form.UseWaitCursor = $false
            & $refreshView
            if (-not [string]::IsNullOrWhiteSpace($operationText)) { $details.Text = $operationText }
        }
    }.GetNewClosure()

    $refresh.Add_Click(({ & $refreshView }.GetNewClosure()))
    $applyPort.Add_Click(({
        & $runOperation { Set-TermLinkPort -InstallRoot $Root -Port $portBox.Text }
    }.GetNewClosure()))
    $start.Add_Click(({ & $runOperation { Start-TermLinkService -InstallRoot $Root } }.GetNewClosure()))
    $stop.Add_Click(({ & $runOperation { Stop-TermLinkService -InstallRoot $Root } }.GetNewClosure()))
    $restart.Add_Click(({ & $runOperation { Restart-TermLinkService -InstallRoot $Root } }.GetNewClosure()))
    $health.Add_Click(({ & $runOperation { Invoke-TermLinkHealthCheck -InstallRoot $Root } }.GetNewClosure()))
    $enableAutostart.Add_Click(({ & $runOperation { Enable-TermLinkAutostart -InstallRoot $Root -Confirm:$false } }.GetNewClosure()))
    $disableAutostart.Add_Click(({ & $runOperation { Disable-TermLinkAutostart -InstallRoot $Root -Confirm:$false } }.GetNewClosure()))
    $openPage.Add_Click(({ & $runOperation { Open-TermLinkPage -InstallRoot $Root -Confirm:$false } }.GetNewClosure()))
    $openLogs.Add_Click(({ & $runOperation { Open-TermLinkLogDirectory -InstallRoot $Root -Confirm:$false } }.GetNewClosure()))
    $mtls.Add_Click(({
        $answer = [System.Windows.Forms.MessageBox]::Show(
            $form,
            'Generate a new CA, server certificate, and client package, then restart TermLink?',
            'Enable TermLink mTLS',
            'YesNo',
            'Warning'
        )
        if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
            & $runOperation { Enable-TermLinkMtls -InstallRoot $Root -Confirm:$false }
        }
    }.GetNewClosure()))

    $form.Tag = [pscustomobject]@{
        RefreshView = $refreshView
        BoundOperations = @('status', 'port', 'start', 'stop', 'restart', 'autostart-enable', 'autostart-disable', 'mtls-enable', 'health', 'open-page', 'open-logs')
    }
    return $form
}

$resolvedRoot = (Get-TermLinkContext -InstallRoot $InstallRoot).InstallRoot
$window = New-TermLinkConfigForm -Root $resolvedRoot
try {
    if ($SmokeTest) {
        & $window.Tag.RefreshView
        $exercisedPortValue = $null
        if ($ExercisePort -gt 0) {
            $originalOpacity = $window.Opacity
            $originalShowInTaskbar = $window.ShowInTaskbar
            try {
                $window.ShowInTaskbar = $false
                $window.Opacity = 0
                $window.Show()
                [System.Windows.Forms.Application]::DoEvents()
                $window.Controls['PortTextBox'].Text = [string]$ExercisePort
                $window.Controls['ApplyPortButton'].PerformClick()
                [System.Windows.Forms.Application]::DoEvents()
            } finally {
                $window.Hide()
                $window.Opacity = $originalOpacity
                $window.ShowInTaskbar = $originalShowInTaskbar
            }
            $storedPort = [int](Get-TermLinkConfiguration -InstallRoot $resolvedRoot).port
            if ($storedPort -ne $ExercisePort) {
                throw "GUI port exercise failed: expected $ExercisePort, got $storedPort."
            }
            $exercisedPortValue = $storedPort
        }
        if (-not [string]::IsNullOrWhiteSpace($PreviewPath)) {
            $previewFullPath = [System.IO.Path]::GetFullPath($PreviewPath)
            $previewDirectory = Split-Path -Parent $previewFullPath
            if (-not (Test-Path -LiteralPath $previewDirectory)) { New-Item -ItemType Directory -Path $previewDirectory -Force | Out-Null }
            $bitmap = New-Object System.Drawing.Bitmap($window.Width, $window.Height)
            try {
                $window.Show()
                [System.Windows.Forms.Application]::DoEvents()
                $window.DrawToBitmap($bitmap, (New-Object System.Drawing.Rectangle(0, 0, $window.Width, $window.Height)))
                $bitmap.Save($previewFullPath, [System.Drawing.Imaging.ImageFormat]::Png)
            } finally {
                $window.Hide()
                $bitmap.Dispose()
            }
        }
        $result = [pscustomobject]@{
            FormTitle = $window.Text
            InstallRoot = $resolvedRoot
            ControlNames = @($window.Controls | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Name) } | ForEach-Object { $_.Name })
            BoundOperations = @($window.Tag.BoundOperations)
            MtlsEnabled = [bool]$window.Controls['EnableMtlsButton'].Enabled
            StatusText = [string]$window.Controls['ServiceStatusLabel'].Text
            ExercisedPort = $exercisedPortValue
        }
        if ($Json) { $result | ConvertTo-Json -Depth 5 -Compress } else { $result | Format-List }
    } else {
        [System.Windows.Forms.Application]::EnableVisualStyles()
        & $window.Tag.RefreshView
        [void]$window.ShowDialog()
    }
} finally {
    $window.Dispose()
}
