# Scheduled Task entry point for the HR PC.
# The encrypted credential files must be created by, and the task must run as,
# the same Windows user account.
param(
    [switch]$DryRun,
    [int]$LookbackHours = 48,
    [int]$BackfillDays = 0
)

$ErrorActionPreference = 'Stop'
$SyncDirectory = 'C:\attendance-sync'
$CredentialDirectory = 'C:\ett-sync'
$RunnerLog = Join-Path $CredentialDirectory 'runner.log'
$RunId = [guid]::NewGuid().ToString('n')
$mutex = $null
$hasMutex = $false

function Write-RunnerLog([string]$Message, [hashtable]$Fields = @{}) {
    if (-not (Test-Path -LiteralPath $CredentialDirectory)) {
        New-Item -ItemType Directory -Path $CredentialDirectory -Force | Out-Null
    }

    $context = [ordered]@{ runId = $RunId; dryRun = [bool]$DryRun }
    foreach ($key in $Fields.Keys) { $context[$key] = $Fields[$key] }
    $fieldText = ($context.GetEnumerator() | ForEach-Object {
        "{0}={1}" -f $_.Key, ([string]$_.Value -replace '\s+', '_')
    }) -join ' '
    Add-Content -LiteralPath $RunnerLog -Value ("{0}  {1}  {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message, $fieldText)
}

function Read-EncryptedCredential([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Credential file not found: $Path"
    }
    $encrypted = (Get-Content -LiteralPath $Path -Raw).Trim()
    $secure = ConvertTo-SecureString -String $encrypted
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

try {
    $syncScript = Join-Path $SyncDirectory 'sync.ps1'
    if (-not (Test-Path -LiteralPath $syncScript)) {
        throw "Sync script not found: $syncScript"
    }

    $sqlCredFile = Join-Path $CredentialDirectory 'sql.cred'
    $apiCredFile = Join-Path $CredentialDirectory 'api.cred'
    if (-not (Test-Path -LiteralPath $sqlCredFile)) { throw "Credential file not found: $sqlCredFile" }
    if (-not $DryRun -and -not (Test-Path -LiteralPath $apiCredFile)) { throw "Credential file not found: $apiCredFile" }

    $mutexName = 'Global\CecubeAttendanceSync'
    $createdNew = $false
    $mutex = New-Object System.Threading.Mutex($true, $mutexName, [ref]$createdNew)
    if (-not $createdNew) {
        throw 'Another attendance sync instance is already running.'
    }
    $hasMutex = $true

    $env:SQL_USER = 'attendance_sync'
    $env:SQL_PASSWORD = Read-EncryptedCredential $sqlCredFile
    if (-not $DryRun) {
        $env:ATTENDANCE_API_KEY = Read-EncryptedCredential $apiCredFile
    }

    Write-RunnerLog 'Attendance sync starting'
    $syncArguments = @{
        SqlServer = '192.168.1.202,1433'
        Database = 'etimetracklite1'
        LookbackHours = $LookbackHours
        BackfillDays = $BackfillDays
        CheckpointFile = (Join-Path $CredentialDirectory 'last-successful-punch.txt')
        CheckpointOverlapMinutes = 60
        LogFile = (Join-Path $CredentialDirectory 'sync.log')
        RunId = $RunId
    }
    if ($DryRun) { $syncArguments.DryRun = $true }

    & $syncScript @syncArguments
    if (-not $?) {
        throw 'Attendance sync script returned an error.'
    }

    Write-RunnerLog 'Attendance sync completed'
} catch {
    Write-RunnerLog 'ERROR' @{ error = $_.Exception.Message }
    exit 1
} finally {
    Remove-Item Env:SQL_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:ATTENDANCE_API_KEY -ErrorAction SilentlyContinue
    if ($hasMutex -and $mutex) {
        $mutex.ReleaseMutex() | Out-Null
    }
    if ($mutex) {
        $mutex.Dispose()
    }
}
