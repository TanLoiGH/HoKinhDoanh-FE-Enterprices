param(
    [int]$Port = 3000,
    [switch]$StopExisting
)

$ErrorActionPreference = "Stop"

function Get-NgrokCommand {
    $command = Get-Command ngrok -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "Không tìm thấy ngrok trong PATH. Hãy cài ngrok hoặc thêm ngrok.exe vào PATH."
    }

    return $command.Source
}

function Stop-ExistingNgrok {
    Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
}

function Get-ActiveNgrokTunnel {
    param([int]$Port)

    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
        return $response.tunnels |
            Where-Object {
                $_.public_url -like "https://*" -and
                $_.config.addr -like "*:$Port"
            } |
            Select-Object -First 1
    }
    catch {
        return $null
    }
}

function Wait-LocalFrontend {
    param([int]$Port)

    $url = "http://localhost:$Port"
    for ($attempt = 1; $attempt -le 30; $attempt++) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
            return
        }
        catch {
            Start-Sleep -Seconds 2
        }
    }

    throw "Frontend chưa phản hồi tại $url. Hãy kiểm tra container hkd-frontend trước khi mở ngrok."
}

function Wait-NgrokTunnel {
    param([int]$Port)

    for ($attempt = 1; $attempt -le 30; $attempt++) {
        $httpsTunnel = Get-ActiveNgrokTunnel -Port $Port
        if ($httpsTunnel) {
            return $httpsTunnel.public_url
        }

        Start-Sleep -Seconds 1
    }

    throw "Ngrok đã khởi chạy nhưng chưa lấy được public URL từ http://127.0.0.1:4040."
}

if ($StopExisting) {
    Stop-ExistingNgrok
}

$ngrok = Get-NgrokCommand
Wait-LocalFrontend -Port $Port

$existingTunnel = Get-ActiveNgrokTunnel -Port $Port
if ($existingTunnel) {
    Write-Host "Ngrok POS is already running."
    Write-Host "URL: $($existingTunnel.public_url)"
    Write-Host "Local: http://localhost:$Port"
    return
}

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$outLog = Join-Path $logDir "ngrok-pos.out.log"
$errLog = Join-Path $logDir "ngrok-pos.err.log"

$process = Start-Process `
    -FilePath $ngrok `
    -ArgumentList @("http", "http://localhost:$Port", "--log=stdout") `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -WindowStyle Hidden `
    -PassThru

$publicUrl = Wait-NgrokTunnel -Port $Port

Write-Host "Ngrok POS is running."
Write-Host "PID: $($process.Id)"
Write-Host "URL: $publicUrl"
Write-Host "Local: http://localhost:$Port"
