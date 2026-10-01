[CmdletBinding()]
param(
	[string]$BackupDirectory = (Join-Path $PSScriptRoot '..\backups'),
	[string]$Database = 'fitfusion'
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($env:MONGODB_URI)) {
	$dotenvPath = Join-Path $PSScriptRoot '..\.env'
	if (Test-Path -LiteralPath $dotenvPath) {
		$uriSetting = Get-Content -LiteralPath $dotenvPath | Where-Object {
			$_ -match '^\s*MONGODB_URI\s*='
		} | Select-Object -First 1
		if ($uriSetting) {
			$env:MONGODB_URI = ($uriSetting -split '=', 2)[1].Trim().Trim('"').Trim("'")
		}
	}
}
if ([string]::IsNullOrWhiteSpace($env:MONGODB_URI)) {
	throw 'Set MONGODB_URI in the current PowerShell session or in backend/.env.'
}

$mongoDump = Get-Command mongodump -ErrorAction SilentlyContinue
if ($mongoDump) {
	$mongoDumpPath = $mongoDump.Source
} else {
	$toolsRoot = Join-Path $env:LOCALAPPDATA 'Programs\MongoDB Database Tools'
	$userInstall = Get-ChildItem $toolsRoot -Filter mongodump.exe -Recurse -File -ErrorAction SilentlyContinue |
		Select-Object -First 1
	$mongoDumpPath = if ($userInstall) { $userInstall.FullName } else { $null }
}
if (-not $mongoDumpPath) {
	throw 'mongodump was not found. Install MongoDB Database Tools and add mongodump to PATH.'
}

$resolvedDirectory = [System.IO.Path]::GetFullPath($BackupDirectory)
New-Item -ItemType Directory -Path $resolvedDirectory -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$archivePath = Join-Path $resolvedDirectory "$Database-$timestamp.archive.gz"
$dumpUri = $env:MONGODB_URI -replace '^(mongodb(?:\+srv)?://[^/?]+)(?:/[^?]*)?(\?.*)?$', '$1/$2'

& $mongoDumpPath --uri $dumpUri --db $Database --archive=$archivePath --gzip
if ($LASTEXITCODE -ne 0) {
	Remove-Item -LiteralPath $archivePath -ErrorAction SilentlyContinue
	throw "mongodump failed with exit code $LASTEXITCODE."
}

$archive = Get-Item -LiteralPath $archivePath
if ($archive.Length -le 0) {
	Remove-Item -LiteralPath $archivePath -ErrorAction SilentlyContinue
	throw 'mongodump produced an empty archive.'
}

Write-Output "Atlas backup created: $($archive.FullName) ($($archive.Length) bytes)"
