# FitFusion AI Backend

## Local HTTPS Staging

Build the frontend from the `frontend` directory with `npm run build`. Install
mkcert and run it once for the current user to trust its local CA. Generate the
localhost certificate outside the repository:

```powershell
$certDir = Join-Path $env:LOCALAPPDATA 'FitFusionAI\certs'
New-Item -ItemType Directory -Path $certDir -Force | Out-Null
mkcert -cert-file (Join-Path $certDir 'localhost.pem') `
	-key-file (Join-Path $certDir 'localhost-key.pem') localhost 127.0.0.1 ::1
```

In a backend terminal, set `DEBUG=False`, `TRUST_PROXY_SSL_HEADER=True`, and
`DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1`. Generate a fresh process-only
`DJANGO_SECRET_KEY`; keep the `.env` file private. Start Waitress:

```powershell
Set-Location backend
$bytes = New-Object byte[] 48
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$rng.GetBytes($bytes)
$env:DJANGO_SECRET_KEY = [Convert]::ToBase64String($bytes)
$env:DEBUG = 'False'
$env:TRUST_PROXY_SSL_HEADER = 'True'
$env:DJANGO_ALLOWED_HOSTS = 'localhost,127.0.0.1'
.\.venv\Scripts\waitress-serve.exe --listen=127.0.0.1:8000 fitfusion.wsgi:application
```

In another backend terminal, point the HTTPS proxy at the mkcert files and run:

```powershell
$env:FITFUSION_TLS_CERT = Join-Path $env:LOCALAPPDATA 'FitFusionAI\certs\localhost.pem'
$env:FITFUSION_TLS_KEY = Join-Path $env:LOCALAPPDATA 'FitFusionAI\certs\localhost-key.pem'
$env:FITFUSION_BACKEND_URL = 'http://127.0.0.1:8000'
node .\scripts\local_staging_server.mjs
```

The local staging URL is `https://localhost:8443/`; `/health/` and `/api/docs/`
are proxied to Django. Keep the private key and `.env` out of source control.

## Atlas Backup

Install MongoDB Database Tools and set `MONGODB_URI` in the current PowerShell
session. The script searches `PATH` and the standard per-user installation
directory. Do not paste credentials into the script or commit a real URI.

```powershell
$env:MONGODB_URI = 'mongodb+srv://<user>:<password>@<cluster>/'
.\scripts\backup_atlas.ps1
```

The script writes a timestamped compressed archive under `backend/backups/`.
Run it weekly and before major milestones. Verify recovery against a separate
test database with:

```powershell
mongorestore --uri $env:MONGODB_URI --nsFrom='fitfusion.*' --nsTo='fitfusion_restore_test.*' --archive='<archive-path>' --gzip
```
