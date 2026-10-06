$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'NEXUS 3D LAB - LOCAL SERVER'

$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$port = 8080
$listener = $null

# Find an available localhost port, starting with 8080.
foreach ($candidate in 8080..8090) {
    try {
        $test = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $candidate)
        $test.Start()
        $listener = $test
        $port = $candidate
        break
    }
    catch {
        if ($test) { try { $test.Stop() } catch {} }
    }
}

if (-not $listener) {
    throw 'Could not open a local port between 8080 and 8090.'
}

$url = "http://127.0.0.1:$port/"

Write-Host ''
Write-Host '========================================================' -ForegroundColor DarkGray
Write-Host '  NEXUS 3D LAB IS RUNNING' -ForegroundColor Green
Write-Host '========================================================' -ForegroundColor DarkGray
Write-Host ''
Write-Host "  URL: $url" -ForegroundColor Cyan
Write-Host '  Keep this window open while viewing the site.' -ForegroundColor Yellow
Write-Host '  Press Ctrl+C here when you want to stop the server.' -ForegroundColor DarkGray
Write-Host ''

# The TCP listener is already active before the browser opens, avoiding a race condition.
Start-Process $url

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
}

function Send-Response {
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$Status,
        [string]$StatusText,
        [string]$ContentType,
        [byte[]]$Body,
        [bool]$HeadOnly = $false
    )

    $header = "HTTP/1.1 $Status $StatusText`r`n" +
              "Content-Type: $ContentType`r`n" +
              "Content-Length: $($Body.Length)`r`n" +
              "Cache-Control: no-store`r`n" +
              "Access-Control-Allow-Origin: *`r`n" +
              "Connection: close`r`n`r`n"

    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    if (-not $HeadOnly -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
            $requestLine = $reader.ReadLine()

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                $client.Close()
                continue
            }

            # Consume the rest of the request headers.
            while ($true) {
                $line = $reader.ReadLine()
                if ($null -eq $line -or $line.Length -eq 0) { break }
            }

            $parts = $requestLine.Split(' ')
            if ($parts.Length -lt 2) {
                $body = [System.Text.Encoding]::UTF8.GetBytes('Bad Request')
                Send-Response $stream 400 'Bad Request' 'text/plain; charset=utf-8' $body
                continue
            }

            $method = $parts[0].ToUpperInvariant()
            $headOnly = $method -eq 'HEAD'
            if ($method -ne 'GET' -and -not $headOnly) {
                $body = [System.Text.Encoding]::UTF8.GetBytes('Method Not Allowed')
                Send-Response $stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' $body
                continue
            }

            $requestPath = $parts[1].Split('?')[0]
            $requestPath = [System.Uri]::UnescapeDataString($requestPath)
            if ($requestPath -eq '/' -or [string]::IsNullOrWhiteSpace($requestPath)) {
                $requestPath = '/index.html'
            }

            $relative = $requestPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $candidatePath = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
            $rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

            if (-not $candidatePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
                Send-Response $stream 403 'Forbidden' 'text/plain; charset=utf-8' $body $headOnly
                continue
            }

            if (-not [System.IO.File]::Exists($candidatePath)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
                Send-Response $stream 404 'Not Found' 'text/plain; charset=utf-8' $body $headOnly
                continue
            }

            $body = [System.IO.File]::ReadAllBytes($candidatePath)
            $extension = [System.IO.Path]::GetExtension($candidatePath).ToLowerInvariant()
            $contentType = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { 'application/octet-stream' }
            Send-Response $stream 200 'OK' $contentType $body $headOnly
        }
        catch {
            try {
                if ($stream) {
                    $body = [System.Text.Encoding]::UTF8.GetBytes('Internal Server Error')
                    Send-Response $stream 500 'Internal Server Error' 'text/plain; charset=utf-8' $body
                }
            } catch {}
        }
        finally {
            if ($reader) { $reader.Dispose() }
            if ($stream) { $stream.Dispose() }
            if ($client) { $client.Close() }
            $reader = $null
            $stream = $null
            $client = $null
        }
    }
}
finally {
    if ($listener) { $listener.Stop() }
}
