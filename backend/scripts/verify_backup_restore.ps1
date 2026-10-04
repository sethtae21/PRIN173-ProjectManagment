$ErrorActionPreference = 'Stop'

$backendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backupScript = Join-Path $PSScriptRoot 'backup_atlas.ps1'
$python = Join-Path $backendRoot '.venv\Scripts\python.exe'
$toolsRoot = Join-Path $env:LOCALAPPDATA 'Programs\MongoDB Database Tools'
$restoreTool = Get-ChildItem $toolsRoot -Filter mongorestore.exe -Recurse -File -ErrorAction SilentlyContinue |
    Select-Object -First 1
if (-not $restoreTool) {
    $restoreTool = Get-Command mongorestore -ErrorAction SilentlyContinue
}
if (-not $restoreTool) {
    throw 'mongorestore was not found in PATH or the standard per-user tools directory.'
}
$restoreToolPath = if ($restoreTool.PSObject.Properties.Name -contains 'FullName') {
    $restoreTool.FullName
} else {
    $restoreTool.Source
}

$oldUri = [Environment]::GetEnvironmentVariable('MONGODB_URI', 'Process')
$oldDebug = [Environment]::GetEnvironmentVariable('DEBUG', 'Process')
$oldSecret = [Environment]::GetEnvironmentVariable('DJANGO_SECRET_KEY', 'Process')
$restoreDatabase = 'ffrv_' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$temporaryDirectory = Join-Path $env:TEMP ('FitFusionRestoreCheck-' + [guid]::NewGuid().ToString('N'))
$restoreStarted = $false

try {
    if ([string]::IsNullOrWhiteSpace($env:MONGODB_URI)) {
        $envPath = Join-Path $backendRoot '.env'
        if (Test-Path -LiteralPath $envPath) {
            $uriLine = Get-Content -LiteralPath $envPath | Where-Object {
                $_ -match '^\s*MONGODB_URI\s*='
            } | Select-Object -First 1
            if ($uriLine) {
                $env:MONGODB_URI = ($uriLine -split '=', 2)[1].Trim().Trim('"').Trim("'")
            }
        }
    }
    if ([string]::IsNullOrWhiteSpace($env:MONGODB_URI)) {
        throw 'Set MONGODB_URI in the current session or backend/.env.'
    }
    if ([string]::IsNullOrWhiteSpace($env:DJANGO_SECRET_KEY)) {
        $env:DJANGO_SECRET_KEY = 'temporary-backup-verification-key'
    }
    $env:DEBUG = 'True'

    New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null
    & $backupScript -BackupDirectory $temporaryDirectory -Database 'fitfusion'
    if ($LASTEXITCODE -ne 0) {
        throw 'mongodump failed.'
    }

    $archive = Get-ChildItem $temporaryDirectory -Filter 'fitfusion-*.archive.gz' |
        Select-Object -First 1
    if (-not $archive -or $archive.Length -le 0) {
        throw 'The backup archive is missing or empty.'
    }

    $restoreUri = $env:MONGODB_URI -replace '^(mongodb(?:\+srv)?://[^/?]+)(?:/[^?]*)?(\?.*)?$', '$1/$2'
    $restoreStarted = $true
    & $restoreToolPath --uri $restoreUri --nsInclude 'fitfusion.django_migrations' `
        --nsFrom 'fitfusion.django_migrations' --nsTo "$restoreDatabase.django_migrations" `
        --archive $archive.FullName --gzip
    if ($LASTEXITCODE -ne 0) {
        throw 'mongorestore failed.'
    }

    $verifyCode = @"
import os
from pymongo import MongoClient
from django.conf import settings
client = MongoClient(settings.MONGODB_URI)
database = client[os.environ['FITFUSION_RESTORE_DATABASE']]
count = database['django_migrations'].count_documents({})
if count < 1:
    raise SystemExit('Restored migration collection is empty.')
print({'restored_collection': 'django_migrations', 'restored_documents': count})
client.drop_database(database.name)
client.close()
"@
    $env:FITFUSION_RESTORE_DATABASE = $restoreDatabase
    Push-Location $backendRoot
    & $python manage.py shell -c $verifyCode
    $verifyExitCode = $LASTEXITCODE
    Pop-Location
    if ($verifyExitCode -ne 0) {
        throw 'Restore verification failed.'
    }

    Write-Output 'Atlas backup and restore verification passed.'
} finally {
    if ($restoreStarted) {
        $cleanupCode = @"
import os
from pymongo import MongoClient
from django.conf import settings
client = MongoClient(settings.MONGODB_URI)
client.drop_database(os.environ['FITFUSION_RESTORE_DATABASE'])
client.close()
"@
        $env:FITFUSION_RESTORE_DATABASE = $restoreDatabase
        Push-Location $backendRoot
        & $python manage.py shell -c $cleanupCode 2>$null
        Pop-Location
    }
    [Environment]::SetEnvironmentVariable('MONGODB_URI', $oldUri, 'Process')
    [Environment]::SetEnvironmentVariable('DEBUG', $oldDebug, 'Process')
    [Environment]::SetEnvironmentVariable('DJANGO_SECRET_KEY', $oldSecret, 'Process')
    Remove-Item Env:\FITFUSION_RESTORE_DATABASE -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force -ErrorAction SilentlyContinue
}