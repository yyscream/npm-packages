$ErrorActionPreference = "Stop"

$PackageName = "@firstpick/pi-package-webui"
$DefaultHost = "127.0.0.1"
$DefaultPort = "31415"
$script:ServerProcess = $null

function Write-Stderr {
    param([string]$Message)
    [Console]::Error.WriteLine($Message)
}

function Get-LaunchCwd {
    $cwd = $env:PI_WEBUI_CWD

    if ([string]::IsNullOrWhiteSpace($cwd) -or -not (Test-Path -LiteralPath $cwd -PathType Container)) {
        try {
            $cwd = (Get-Location).ProviderPath
        } catch {
            $cwd = $HOME
        }
    }

    if ([string]::IsNullOrWhiteSpace($cwd) -or -not (Test-Path -LiteralPath $cwd -PathType Container)) {
        $cwd = $HOME
    }

    if ([string]::IsNullOrWhiteSpace($cwd) -or -not (Test-Path -LiteralPath $cwd -PathType Container)) {
        throw "Could not determine a valid working directory."
    }

    return $cwd
}

function Ensure-PiWebui {
    $command = Get-Command "pi-webui" -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    Write-Host "pi-webui is not installed or not available on PATH."

    $npm = Get-Command "npm" -ErrorAction SilentlyContinue
    if (-not $npm) {
        Write-Stderr "npm is required to install it globally. Install Node.js/npm, then run:`n  npm install -g $PackageName"
        exit 1
    }

    if (-not [Environment]::UserInteractive) {
        Write-Stderr "Non-interactive shell; refusing to install without confirmation. Run manually:`n  npm install -g $PackageName"
        exit 1
    }

    $answer = Read-Host "Install $PackageName globally now? [y/N]"
    if ($answer -match '^(?i:y|yes)$') {
        & $npm.Source install -g $PackageName
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    } else {
        Write-Stderr "Aborted. Install later with:`n  npm install -g $PackageName"
        exit 1
    }

    $command = Get-Command "pi-webui" -ErrorAction SilentlyContinue
    if (-not $command) {
        Write-Stderr "Installed, but pi-webui is still not on PATH. Check your npm global bin directory."
        exit 1
    }

    return $command.Source
}

function Get-BrowserHostForUrl {
    param([string]$HostName)

    if ([string]::IsNullOrWhiteSpace($HostName) -or $HostName -eq "0.0.0.0") {
        return "127.0.0.1"
    }
    if ($HostName -eq "::") {
        return "[::1]"
    }
    if ($HostName.StartsWith("[")) {
        return $HostName
    }
    if ($HostName.Contains(":")) {
        return "[$HostName]"
    }
    return $HostName
}

function Get-ConnectHostForPort {
    param([string]$HostName)

    if ([string]::IsNullOrWhiteSpace($HostName) -or $HostName -eq "0.0.0.0") {
        return "127.0.0.1"
    }
    if ($HostName -eq "::") {
        return "::1"
    }
    if ($HostName.StartsWith("[") -and $HostName.EndsWith("]")) {
        return $HostName.Substring(1, $HostName.Length - 2)
    }
    return $HostName
}

function Open-WebUrl {
    param([string]$Url)

    try {
        Start-Process $Url | Out-Null
    } catch {
        Write-Warning "Could not open the default browser. Open manually: $Url"
    }
}

function Test-HttpOk {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -Method Get
        return ([int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 400)
    } catch {
        return $false
    }
}

function Test-WebuiRunning {
    param([string]$Url)

    $baseUrl = $Url.TrimEnd("/")
    return (Test-HttpOk "${baseUrl}/api/webui-status") -or (Test-HttpOk "${baseUrl}/api/webui-status?detailed=1")
}

function Normalize-CwdComparable {
    param([string]$Path)

    $text = ([string]$Path) -replace '\\', '/'
    if ($text -match '^/[A-Za-z]/') {
        $text = "$($text[1]):$($text.Substring(2))"
    }

    if ($env:OS -eq "Windows_NT") {
        return $text.ToLowerInvariant()
    }
    return $text
}

function Get-WebuiUrlForCwd {
    param(
        [string]$Url,
        [string]$Cwd
    )

    $baseUrl = $Url.TrimEnd("/")
    $targetCwd = Normalize-CwdComparable $Cwd

    try {
        $tabsResponse = Invoke-RestMethod -Uri "${baseUrl}/api/tabs" -UseBasicParsing -TimeoutSec 5 -Method Get
        $tab = @($tabsResponse.data.tabs) | Where-Object { (Normalize-CwdComparable $_.cwd) -eq $targetCwd } | Select-Object -First 1
        if ($tab -and $tab.id) {
            return "$baseUrl/?tab=$([System.Uri]::EscapeDataString([string]$tab.id))"
        }
    } catch {
        # Fall back to creating a tab below, then to the root URL.
    }

    try {
        $body = @{ cwd = $Cwd } | ConvertTo-Json -Compress
        $created = Invoke-RestMethod -Uri "${baseUrl}/api/tabs" -UseBasicParsing -TimeoutSec 10 -Method Post -ContentType "application/json" -Body $body
        $id = $created.data.tab.id
        if ($id) {
            return "$baseUrl/?tab=$([System.Uri]::EscapeDataString([string]$id))"
        }
    } catch {
        # Fall back to the root URL.
    }

    return "$baseUrl/"
}

function Test-PortInUse {
    param(
        [string]$HostName,
        [string]$Port
    )

    $portNumber = 0
    if (-not [int]::TryParse($Port, [ref]$portNumber)) {
        return $false
    }

    $connectHost = Get-ConnectHostForPort $HostName
    $client = $null
    $async = $null

    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $async = $client.BeginConnect($connectHost, $portNumber, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(500, $false)) {
            return $false
        }
        $client.EndConnect($async)
        return $client.Connected
    } catch {
        return $false
    } finally {
        if ($async -and $async.AsyncWaitHandle) {
            $async.AsyncWaitHandle.Close()
        }
        if ($client) {
            $client.Close()
        }
    }
}

function Wait-UntilReady {
    param(
        [string]$Url,
        [System.Diagnostics.Process]$Process
    )

    for ($i = 0; $i -lt 50; $i++) {
        $Process.Refresh()
        if ($Process.HasExited) {
            return 2
        }

        if (Test-HttpOk $Url) {
            return 0
        }

        Start-Sleep -Milliseconds 200
    }

    return 1
}

function Stop-ServerProcess {
    if ($script:ServerProcess) {
        $script:ServerProcess.Refresh()
        if (-not $script:ServerProcess.HasExited) {
            try {
                Stop-Process -Id $script:ServerProcess.Id -Force -ErrorAction SilentlyContinue
            } catch {
                # Best-effort cleanup only.
            }
        }
    }
}

$cwd = Get-LaunchCwd
$hostName = if ([string]::IsNullOrWhiteSpace($env:PI_WEBUI_HOST)) { $DefaultHost } else { $env:PI_WEBUI_HOST }
$port = if ([string]::IsNullOrWhiteSpace($env:PI_WEBUI_PORT)) { $DefaultPort } else { $env:PI_WEBUI_PORT }
$passThroughArgs = @($args)

for ($i = 0; $i -lt $passThroughArgs.Count; $i++) {
    if ($passThroughArgs[$i] -eq "--") {
        break
    }

    switch ($passThroughArgs[$i]) {
        "--cwd" {
            if ($i + 1 -lt $passThroughArgs.Count) { $cwd = $passThroughArgs[$i + 1] }
        }
        "--host" {
            if ($i + 1 -lt $passThroughArgs.Count) { $hostName = $passThroughArgs[$i + 1] }
        }
        "--port" {
            if ($i + 1 -lt $passThroughArgs.Count) { $port = $passThroughArgs[$i + 1] }
        }
    }
}

$browserHost = Get-BrowserHostForUrl $hostName
$connectHost = Get-ConnectHostForPort $hostName
$url = "http://${browserHost}:${port}/"

if (Test-WebuiRunning $url) {
    $targetUrl = Get-WebuiUrlForCwd $url $cwd
    Write-Host "Pi Web UI already appears to be running at: $url"
    Write-Host "Opening: $targetUrl"
    Open-WebUrl $targetUrl
    exit 0
}

if (Test-PortInUse $hostName $port) {
    Write-Stderr "Port $port is already in use on $connectHost; not starting Pi Web UI."
    if (Test-HttpOk $url) {
        Write-Stderr "An HTTP server responded at $url, but it did not expose Pi Web UI status."
    } else {
        Write-Stderr "No Pi Web UI status endpoint responded at $url."
    }
    exit 1
}

$piWebuiCommand = Ensure-PiWebui
$webuiArgs = @("--cwd", $cwd, "--host", $hostName, "--port", [string]$port) + $passThroughArgs

Write-Host "Starting Pi Web UI in: $cwd"
Write-Host "Web UI URL: $url"

try {
    $script:ServerProcess = Start-Process -FilePath $piWebuiCommand -ArgumentList $webuiArgs -NoNewWindow -PassThru
    $readyStatus = Wait-UntilReady $url $script:ServerProcess

    if ($readyStatus -eq 0) {
        Open-WebUrl $url
    } elseif ($readyStatus -eq 2) {
        Write-Stderr "Pi Web UI exited before it became ready."
        $script:ServerProcess.Refresh()
        exit $script:ServerProcess.ExitCode
    } else {
        Write-Warning "Server did not respond yet; opening the URL anyway."
        Open-WebUrl $url
    }

    Wait-Process -Id $script:ServerProcess.Id
    $script:ServerProcess.Refresh()
    exit $script:ServerProcess.ExitCode
} finally {
    Stop-ServerProcess
}
