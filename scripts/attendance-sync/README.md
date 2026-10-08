# Attendance sync on the HR PC

`run-sync.ps1` is the Scheduled Task entry point. It reads the DPAPI-encrypted SQL and API credentials from `C:\ett-sync`, then runs `sync.ps1` against eTimeTrackLite and the dashboard.

## Install or update the scripts

Run these commands in PowerShell as the same Windows account that owns the Scheduled Task and credential files:

```powershell
New-Item -ItemType Directory -Force C:\attendance-sync, C:\ett-sync | Out-Null
Copy-Item "C:\Users\vensu\OneDrive\Desktop\cecubeenggdashboard\scripts\attendance-sync\sync.ps1" C:\attendance-sync\sync.ps1 -Force
Copy-Item "C:\Users\vensu\OneDrive\Desktop\cecubeenggdashboard\scripts\attendance-sync\run-sync.ps1" C:\attendance-sync\run-sync.ps1 -Force
```

Store credentials encrypted for that Windows user. Do not put either value directly in a script or scheduled-task argument:

```powershell
Read-Host "SQL password" -AsSecureString | ConvertFrom-SecureString | Set-Content C:\ett-sync\sql.cred
Read-Host "Current attendance API key" -AsSecureString | ConvertFrom-SecureString | Set-Content C:\ett-sync\api.cred
```

The API key must match `ATTENDANCE_API_KEY` on the dashboard server. After rotating that server key, replace `api.cred` with the new value.

## Run and schedule

Start with a read-only SQL check, then run a live sync:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\attendance-sync\run-sync.ps1 -DryRun
powershell -NoProfile -ExecutionPolicy Bypass -File C:\attendance-sync\run-sync.ps1
```

The existing `ETT Attendance Sync` task can keep calling `C:\attendance-sync\run-sync.ps1`. It should run every 10 minutes, use **Start the task as soon as possible after a scheduled start is missed**, and run under the same Windows account that created the encrypted `.cred` files. The PC must be powered on and connected to the HR network; if it sleeps while a run is due, Windows runs the missed task after wake.

The checkpoint is saved in `C:\ett-sync\last-successful-punch.txt` only after every API batch succeeds. When the dashboard is unavailable, later task runs retry from the last successful punch with a 10-minute overlap. The overlap safely resends a few records because the dashboard ignores duplicate device logs. `C:\ett-sync\sync.log` records SQL results and server responses; `C:\ett-sync\runner.log` records credential and wrapper errors.

To backfill the previous 60 days once, first copy the updated scripts to `C:\attendance-sync`, then run a dry run followed by the live replay:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\attendance-sync\run-sync.ps1 -DryRun -BackfillDays 60
powershell -NoProfile -ExecutionPolicy Bypass -File C:\attendance-sync\run-sync.ps1 -BackfillDays 60
```

`-BackfillDays 60` ignores the saved checkpoint for that run. Duplicate device logs are skipped by the dashboard, while existing unapproved attendance records are recalculated from the full device-log history. Approved attendance records remain unchanged.
