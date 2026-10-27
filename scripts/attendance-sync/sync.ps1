# Read eTimeTrackLite device logs from the HR PC and send them to the dashboard.
# Dry run: powershell -NoProfile -ExecutionPolicy Bypass -File .\sync.ps1 -DryRun

param(
    [switch]$DryRun,
    [string]$Endpoint = "https://cecubeerp.duckdns.org/api/attendance/ingest",
    [string]$SqlServer = ".\SQLEXPRESS",
    [string]$Database = "etimetracklite1",
    [int]$LookbackHours = 48,
    [int]$BackfillDays = 0,
    [string]$CheckpointFile = "C:\ett-sync\last-successful-punch.txt",
    [int]$CheckpointOverlapMinutes = 60,
    [string]$LocationName = "",
    [int]$BatchSize = 500,
    [string]$LogFile = "C:\ett-sync\sync.log",
    [int]$TimeoutSec = 60,
    [int]$MaxApiRetries = 4,
    [int[]]$RetryDelaySeconds = @(2, 5, 10, 20),
    [string]$RunId = ([guid]::NewGuid().ToString("n"))
)

$ErrorActionPreference = "Stop"
$ApiKey = $env:ATTENDANCE_API_KEY
$script:RunContext = [ordered]@{
    runId = $RunId
    dryRun = [bool]$DryRun
}

function Ensure-ParentDirectory([string]$Path) {
    $directory = Split-Path -Parent $Path
    if ($directory -and -not (Test-Path -LiteralPath $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
}

function Write-Log([string]$Message, [hashtable]$Fields = @{}) {
    Ensure-ParentDirectory $LogFile
    $allFields = [ordered]@{}
    foreach ($key in $script:RunContext.Keys) { $allFields[$key] = $script:RunContext[$key] }
    foreach ($key in $Fields.Keys) { $allFields[$key] = $Fields[$key] }

    $fieldText = ($allFields.GetEnumerator() | ForEach-Object {
        "{0}={1}" -f $_.Key, ([string]$_.Value -replace '\s+', '_')
    }) -join " "
    $line = "{0}  {1}  {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message, $fieldText
    Add-Content -LiteralPath $LogFile -Value $line
    Write-Host $line
}

function Val($Value) {
    if ($null -eq $Value -or $Value -is [DBNull]) { return $null }
    return [string]$Value
}

function Normalize-Direction($Value) {
    $raw = Val $Value
    if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
    $direction = $raw.Trim().ToUpperInvariant()
    if ($direction -in @('IN', 'I', '0')) { return 'IN' }
    if ($direction -in @('OUT', 'O', '1')) { return 'OUT' }
    if ($direction.Contains('IN')) { return 'IN' }
    if ($direction.Contains('OUT')) { return 'OUT' }
    return $null
}

function Get-CheckpointTime([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    $checkpointText = (Get-Content -LiteralPath $Path -Raw).Trim()
    if (-not $checkpointText) { return $null }
    return [DateTimeOffset]::Parse($checkpointText, [Globalization.CultureInfo]::InvariantCulture)
}

function Save-Checkpoint([string]$Path, [DateTimeOffset]$Value) {
    Ensure-ParentDirectory $Path
    $tempPath = "$Path.tmp"
    Set-Content -LiteralPath $tempPath -Value $Value.ToUniversalTime().ToString("O") -Encoding ASCII
    Move-Item -LiteralPath $tempPath -Destination $Path -Force
}

function Test-TransientHttpStatus([int]$StatusCode) {
    return $StatusCode -eq 408 -or $StatusCode -eq 429 -or $StatusCode -ge 500
}

function Invoke-ApiBatch {
    param(
        [byte[]]$Body,
        [int]$BatchNumber,
        [int]$PunchCount
    )

    $attempt = 0
    do {
        $attempt++
        try {
            $response = Invoke-RestMethod -Uri $Endpoint -Method Post `
                -Headers @{ "x-api-key" = $ApiKey } `
                -ContentType "application/json; charset=utf-8" `
                -Body $Body -TimeoutSec $TimeoutSec

            Write-Log "API batch sent" @{
                batch = $BatchNumber
                attempt = $attempt
                punches = $PunchCount
            }
            return $response
        } catch {
            $statusCode = 0
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }
            $isTransient = ($statusCode -eq 0) -or (Test-TransientHttpStatus $statusCode)
            $delay = if ($attempt -le $RetryDelaySeconds.Count) { $RetryDelaySeconds[$attempt - 1] } else { $RetryDelaySeconds[-1] }
            Write-Log "API batch failed" @{
                batch = $BatchNumber
                attempt = $attempt
                punches = $PunchCount
                status = $statusCode
                transient = $isTransient
                error = $_.Exception.Message
            }

            if (-not $isTransient -or $attempt -ge $MaxApiRetries) {
                throw
            }

            Start-Sleep -Seconds $delay
        }
    } while ($true)
}

try {
    if (-not $DryRun -and [string]::IsNullOrWhiteSpace($ApiKey)) { throw "Set the ATTENDANCE_API_KEY environment variable before running the sync." }
    if ([string]::IsNullOrWhiteSpace($env:SQL_USER) -or [string]::IsNullOrWhiteSpace($env:SQL_PASSWORD)) { throw "Set SQL_USER and SQL_PASSWORD environment variables before running the sync." }
    if ($BatchSize -lt 1 -or $BatchSize -gt 2000) { throw "BatchSize must be between 1 and 2000." }
    if ($BackfillDays -lt 0 -or $BackfillDays -gt 730) { throw "BackfillDays must be between 0 and 730." }
    if ($CheckpointOverlapMinutes -lt 0 -or $CheckpointOverlapMinutes -gt 1440) { throw "CheckpointOverlapMinutes must be between 0 and 1440." }
    if ($MaxApiRetries -lt 1 -or $MaxApiRetries -gt 10) { throw "MaxApiRetries must be between 1 and 10." }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    $runStartedAt = Get-Date
    $checkpointBefore = Get-CheckpointTime $CheckpointFile
    $now = Get-Date
    $since = $now.AddHours(-$LookbackHours)
    if ($BackfillDays -gt 0) {
        $since = $now.Date.AddDays(-$BackfillDays)
    } else {
        if ($checkpointBefore) {
            $since = $checkpointBefore.ToLocalTime().DateTime.AddMinutes(-[Math]::Max(0, $CheckpointOverlapMinutes))
        }
        $dailyReplaySince = $now.Date.AddDays(-1)
        if ($since -gt $dailyReplaySince) { $since = $dailyReplaySince }
    }
    $script:RunContext["since"] = $since.ToString("yyyy-MM-dd_HH:mm:ss")

    $tables = New-Object System.Collections.ArrayList
    $monthCursor = Get-Date -Year $since.Year -Month $since.Month -Day 1 -Hour 0 -Minute 0 -Second 0
    $lastMonth = Get-Date -Year $now.Year -Month $now.Month -Day 1 -Hour 0 -Minute 0 -Second 0
    while ($monthCursor -le $lastMonth) {
        [void]$tables.Add(("DeviceLogs_{0}_{1}" -f $monthCursor.Month, $monthCursor.Year))
        $monthCursor = $monthCursor.AddMonths(1)
    }

    $securePassword = ConvertTo-SecureString $env:SQL_PASSWORD -AsPlainText -Force
    $securePassword.MakeReadOnly()
    $sqlCredential = New-Object System.Data.SqlClient.SqlCredential($env:SQL_USER, $securePassword)
    $connection = New-Object System.Data.SqlClient.SqlConnection("Server=$SqlServer;Database=$Database;TrustServerCertificate=True;Connect Timeout=15", $sqlCredential)
    $connection.Open()
    Write-Log "SQL connection opened" @{ server = $SqlServer; database = $Database; tables = $tables.Count }

    $punches = New-Object System.Collections.ArrayList
    $invalidRows = 0
    foreach ($table in $tables) {
        $check = $connection.CreateCommand()
        $check.CommandText = "SELECT COUNT(*) FROM sys.tables WHERE name = @name"
        [void]$check.Parameters.AddWithValue("@name", $table)

        try {
            if ([int]$check.ExecuteScalar() -eq 0) {
                Write-Log "Partition skipped" @{ table = $table; reason = "missing" }
                continue
            }

            $command = $connection.CreateCommand()
            $command.CommandText = @"
SELECT l.DeviceLogId, l.DeviceId, l.UserId, l.LogDate, l.AttDirection,
       e.EmployeeName, e.EmployeeCode, e.Designation, e.Location
FROM [$table] AS l
OUTER APPLY (
    SELECT TOP 1 EmployeeName, EmployeeCode, Designation, Location
    FROM Employees
    WHERE CAST(EmployeeCodeInDevice AS nvarchar(50)) = CAST(l.UserId AS nvarchar(50))
      AND RecordStatus = 1
    ORDER BY EmployeeId DESC
) AS e
WHERE l.LogDate >= @since
ORDER BY l.LogDate
"@
            [void]$command.Parameters.AddWithValue("@since", $since)
            $reader = $command.ExecuteReader()
            try {
                while ($reader.Read()) {
                    $deviceLogId = $reader["DeviceLogId"]
                    $deviceId = Val $reader["DeviceId"]
                    $logDate = $reader["LogDate"]
                    if ($null -eq $deviceLogId -or [string]::IsNullOrWhiteSpace($deviceId) -or $null -eq $logDate -or $logDate -is [DBNull]) {
                        $invalidRows++
                        continue
                    }

                    $punchTime = ([datetime]$logDate).ToString("yyyy-MM-dd'T'HH:mm:ss") + "+05:30"
                    $userId = Val $reader["UserId"]
                    $employeeCode = Val $reader["EmployeeCode"]
                    $employeeLocation = Val $reader["Location"]
                    if ($employeeLocation -match '^H\.O\.?$') { $employeeLocation = "Head Office" }
                    if ([string]::IsNullOrWhiteSpace($employeeLocation) -and -not [string]::IsNullOrWhiteSpace($LocationName)) {
                        $employeeLocation = $LocationName
                    }
                    switch ($userId) {
                        '54'      { $employeeCode = 'CEIPL054'; break }
                        '131'     { $employeeCode = 'CEIPL131'; break }
                        '9900020' { $employeeCode = 'CGEPL020'; break }
                    }

                    [void]$punches.Add([pscustomobject]@{
                        deviceLogId  = [int]$deviceLogId
                        deviceId     = $deviceId
                        userId       = $userId
                        employeeCode = $employeeCode
                        employeeName = Val $reader["EmployeeName"]
                        designation  = Val $reader["Designation"]
                        direction    = Normalize-Direction $reader["AttDirection"]
                        punchTime    = $punchTime
                        location     = $employeeLocation
                    })
                }
            } finally {
                if ($reader) { $reader.Close() }
                if ($command) { $command.Dispose() }
            }
        } finally {
            if ($check) { $check.Dispose() }
        }
    }

    Write-Log "Punch scan completed" @{
        punches = $punches.Count
        invalidRows = $invalidRows
        checkpointBefore = $(if ($checkpointBefore) { $checkpointBefore.ToString("O") } else { "none" })
    }

    if ($DryRun) {
        @($punches | Select-Object -First 3) | ConvertTo-Json -Depth 4
        Write-Log "Dry run completed" @{ sampleCount = [Math]::Min(3, $punches.Count) }
        return
    }

    if ($punches.Count -eq 0) {
        Write-Log "No punches found"
        return
    }

    $batchNumber = 0
    for ($start = 0; $start -lt $punches.Count; $start += $BatchSize) {
        $batchNumber++
        $end = [Math]::Min($start + $BatchSize, $punches.Count) - 1
        $chunk = @($punches[$start..$end])
        $json = @{ source = "etimetracklite"; punches = $chunk } | ConvertTo-Json -Depth 5 -Compress
        $response = Invoke-ApiBatch -Body ([Text.Encoding]::UTF8.GetBytes($json)) -BatchNumber $batchNumber -PunchCount $chunk.Count
        Write-Log "API batch accepted" @{
            batch = $batchNumber
            punches = $chunk.Count
            inserted = $response.inserted
            duplicatesOrSkipped = $response.duplicatesOrSkipped
            attendanceUpdated = $response.attendanceUpdated
            unmatchedEmployeeCodes = $(if ($response.unmatchedEmployeeCodes) { ($response.unmatchedEmployeeCodes -join ',') } else { "" })
        }
    }

    $latestPunchTime = $punches | ForEach-Object { [DateTimeOffset]::Parse($_.punchTime) } | Sort-Object -Descending | Select-Object -First 1
    if ($latestPunchTime) {
        Save-Checkpoint -Path $CheckpointFile -Value $latestPunchTime
        Write-Log "Checkpoint advanced" @{ checkpointAfter = $latestPunchTime.ToString("O") }
    }

    $durationMs = [int]((Get-Date) - $runStartedAt).TotalMilliseconds
    Write-Log "Sync completed" @{ punches = $punches.Count; batches = $batchNumber; durationMs = $durationMs }
} catch {
    Write-Log "ERROR" @{ error = $_.Exception.Message }
    exit 1
} finally {
    if ($connection -and $connection.State -ne [System.Data.ConnectionState]::Closed) { $connection.Close() }
}

