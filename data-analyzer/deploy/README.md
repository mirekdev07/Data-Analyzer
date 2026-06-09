# Deploy notes

## First-time deploy (do this once)

### 1. Probe server — read-only, no changes

From PowerShell on your local machine:

```powershell
ssh root@64.226.68.115 'pm2 list'
ssh root@64.226.68.115 'ss -tlnp | grep -E ":(80|443|8000|8100|8101|8200)"'
ssh root@64.226.68.115 'ls /var/www/'
ssh root@64.226.68.115 'cat /etc/nginx/sites-available/mirekdev.pl' > nginx-vhost.before.conf
```

Verify:
- Port `8101` is free.
- No directory `/var/www/analyzer` already exists (or it's safe to overwrite).
- The vhost file `mirekdev.pl` exists and you have a backup in `nginx-vhost.before.conf`.

### 2. First code deploy

```powershell
cd data-analyzer
.\deploy\deploy.ps1
```

This builds the frontend, ships `backend/` + `frontend/dist/` + `deploy/` to `/var/www/analyzer/`, creates the Python venv on the server, and starts the PM2 process `analyzer-api` on port 8101.

After it finishes, verify on the server:

```powershell
ssh root@64.226.68.115 'pm2 list'                    # analyzer-api: online
ssh root@64.226.68.115 'curl -s http://127.0.0.1:8101/api/health'  # {"ok":true}
```

### 3. Nginx edit — ONCE, manual, careful

The existing vhost `mirekdev.pl` already serves your other projects. You're adding 3 `location` blocks to it without changing anything else.

```powershell
ssh root@64.226.68.115 'cp /etc/nginx/sites-available/mirekdev.pl /etc/nginx/sites-available/mirekdev.pl.bak.20260529'
ssh root@64.226.68.115 'nano /etc/nginx/sites-available/mirekdev.pl'
```

Paste the contents of `nginx-snippet.conf` **immediately before** the existing `location /` block.

Test the config (this will NOT reload if invalid):

```powershell
ssh root@64.226.68.115 'nginx -t'
```

Expect: `syntax is ok` / `test is successful`. If anything fails, restore the backup:

```powershell
ssh root@64.226.68.115 'cp /etc/nginx/sites-available/mirekdev.pl.bak.20260529 /etc/nginx/sites-available/mirekdev.pl'
```

If the test passes, reload:

```powershell
ssh root@64.226.68.115 'nginx -s reload'
```

### 4. Production smoke test

```powershell
curl -sI https://mirekdev.pl/analyzer/        # expect HTTP/2 200
curl -s  https://mirekdev.pl/analyzer/api/health   # expect {"ok":true}
```

Open https://mirekdev.pl/analyzer/ in a browser. Upload a small CSV. Verify column cards and preview table render.

Also confirm your other projects still work — open the home page and click around known paths.

## Update deploy (every time you change code)

```powershell
cd data-analyzer
.\deploy\deploy.ps1
```

Nginx config does **not** need to be touched again.

## Rollback

```powershell
ssh root@64.226.68.115 'pm2 stop analyzer-api'
ssh root@64.226.68.115 'cp /etc/nginx/sites-available/mirekdev.pl.bak.20260529 /etc/nginx/sites-available/mirekdev.pl && nginx -t && nginx -s reload'
```
