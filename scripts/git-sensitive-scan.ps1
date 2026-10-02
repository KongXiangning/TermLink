param(
    [switch]$Staged = $true,
    [string[]]$Files
)

$ErrorActionPreference = 'Stop'

function Get-TargetFiles {
    if ($Files -and $Files.Count -gt 0) {
        return $Files
    }

    if ($Staged) {
        $staged = & git diff --cached --name-only --diff-filter=ACMR
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to read staged files."
        }
        return @($staged | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }

    return @()
}

function Get-FileContent {
    param(
        [string]$Path,
        [switch]$UseStaged
    )

    if ($UseStaged) {
        $content = & git show ":$Path" 2>$null
        if ($LASTEXITCODE -ne 0) {
            return $null
        }
        return ($content -join "`n")
    }

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }
    return Get-Content -LiteralPath $Path -Raw -Encoding UTF8
}

function Test-BinaryText {
    param([string]$Text)
    if ($null -eq $Text) { return $true }
    return $Text.Contains([char]0)
}

function Normalize-Path {
    param([string]$Path)
    return ($Path -replace '\\', '/')
}

function Get-UiXmlCredentialScanText {
    param([string]$Text)

    if ($Text -notmatch '^[\s\uFEFF]*<') { return $Text }

    $settings = [System.Xml.XmlReaderSettings]::new()
    $settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
    $settings.XmlResolver = $null
    $inputReader = [System.IO.StringReader]::new($Text)
    $reader = $null
    $booleanAttribute = [regex]::new('\Gpassword\s*=\s*(?:"(?:true|false)"|''(?:true|false)'')')
    $attributeOffsets = [System.Collections.Generic.List[int]]::new()
    $lineStarts = [System.Collections.Generic.List[int]]::new()
    $lineStarts.Add(0)
    foreach ($newline in [regex]::Matches($Text, '\r\n|\n|\r')) {
        $lineStarts.Add($newline.Index + $newline.Length)
    }

    try {
        $reader = [System.Xml.XmlReader]::Create($inputReader, $settings)
        $lineInfo = [System.Xml.IXmlLineInfo]$reader
        while ($reader.Read()) {
            if ($reader.NodeType -ne [System.Xml.XmlNodeType]::Element) { continue }

            # Android UI dumps have an unqualified hierarchy root and node elements.
            # A non-UI document or any parse error gets no exemption at all.
            if ($reader.NamespaceURI -ne '' -or
                ($reader.Depth -eq 0 -and $reader.Name -cne 'hierarchy') -or
                ($reader.Depth -gt 0 -and $reader.Name -cne 'node')) {
                return $Text
            }
            if ($reader.Depth -eq 0 -or -not $reader.MoveToAttribute('password')) { continue }
            if ($reader.Value -ceq 'true' -or $reader.Value -ceq 'false') {
                $offset = $lineStarts[$lineInfo.LineNumber - 1] + $lineInfo.LinePosition - 1
                # Match the original attribute at its parser-reported position, not
                # lookalikes in comments, text, CDATA or another attribute's value.
                $attribute = $booleanAttribute.Match($Text, $offset)
                if ($attribute.Success) { $attributeOffsets.Add($offset) }
            }
            [void]$reader.MoveToElement()
        }
    }
    catch {
        return $Text
    }
    finally {
        if ($null -ne $reader) { $reader.Dispose() }
        $inputReader.Dispose()
    }

    if ($attributeOffsets.Count -eq 0) { return $Text }
    $scanChars = $Text.ToCharArray()
    foreach ($offset in $attributeOffsets) {
        # Mask only this attribute name in memory, retaining all other content,
        # line positions and the original evidence bytes on disk/in the index.
        for ($j = 0; $j -lt 'password'.Length; $j++) { $scanChars[$offset + $j] = ' ' }
    }
    return (-join $scanChars)
}

$allowMarker = 'sensitive-scan:allow'
$targetFiles = Get-TargetFiles
$useStagedContent = $Staged -and -not ($Files -and $Files.Count -gt 0)

if ($targetFiles.Count -eq 0) {
    Write-Host "[sensitive-scan] No target files."
    exit 0
}

$rules = @(
    @{ Name = 'Private key block'; Regex = '-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----' },
    @{ Name = 'AWS access key'; Regex = '\bAKIA[0-9A-Z]{16}\b' },
    @{ Name = 'Bearer token literal'; Regex = '(?i)\bAuthorization\b\s*:\s*Bearer\s+[A-Za-z0-9\-._~+/]+=*' },
    @{ Name = 'Credential assignment'; Regex = '(?i)\b(password|passwd|pwd|secret|api[_-]?key|token|client[_-]?secret|access[_-]?key)\b\s*[:=]\s*["''][^"'']{4,}["'']' },
    @{ Name = 'Credential in URL'; Regex = '(?i)\bhttps?://[^/\s:@]+:[^/\s@]+@' }
)

$pathRules = @(
    @{
        Name = 'Local config contains non-example URL'
        PathRegex = '(?i)(^|/|\\)local-config\.ps1$'
        ContentRegex = '(?i)https?://(?!example\.com)(?!localhost)(?!127\.0\.0\.1)(?!0\.0\.0\.0)[^/\s]+'
    }
)

$findings = New-Object System.Collections.Generic.List[object]

foreach ($rawPath in $targetFiles) {
    $path = Normalize-Path -Path $rawPath
    $text = Get-FileContent -Path $rawPath -UseStaged:$useStagedContent

    if ([string]::IsNullOrWhiteSpace($text)) {
        continue
    }
    if (Test-BinaryText -Text $text) {
        continue
    }

    $lines = $text -split "`r?`n"
    $credentialLines = (Get-UiXmlCredentialScanText -Text $text) -split "`r?`n"

    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        if ($line -match [regex]::Escape($allowMarker)) {
            continue
        }

        foreach ($rule in $rules) {
            $scanLine = $line
            if ($rule.Name -eq 'Credential assignment') { $scanLine = $credentialLines[$i] }
            if ($scanLine -match $rule.Regex) {
                $findings.Add([PSCustomObject]@{
                        file = $path
                        line = $i + 1
                        rule = $rule.Name
                        text = $line.Trim()
                    })
            }
        }
    }

    foreach ($pathRule in $pathRules) {
        if ($path -match $pathRule.PathRegex -and $text -match $pathRule.ContentRegex) {
            $findings.Add([PSCustomObject]@{
                    file = $path
                    line = 1
                    rule = $pathRule.Name
                    text = 'Found a real endpoint in local config.'
                })
        }
    }
}

if ($findings.Count -gt 0) {
    Write-Host "[sensitive-scan] FAILED. Potential sensitive content detected:"
    $findings | ForEach-Object {
        Write-Host ("  - {0}:{1} [{2}] {3}" -f $_.file, $_.line, $_.rule, $_.text)
    }
    Write-Host ""
    Write-Host "If content is intentional and safe, add marker '$allowMarker' on the same line."
    exit 1
}

Write-Host "[sensitive-scan] PASS. No obvious sensitive content found."
exit 0
