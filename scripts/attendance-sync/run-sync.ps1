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

function Write-RunnerLog([string]$Message) {
    if (-not (Test-Path -LiteralPath $CredentialDirectory)) {
        New-Item -ItemType Directory -Path $CredentialDirectory -Force | Out-Null
    }
    Add-Content -LiteralPath $RunnerLog -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message)
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

    $env:SQL_USER = 'attendance_sync'
    $env:SQL_PASSWORD = Read-EncryptedCredential (Join-Path $CredentialDirectory 'sql.cred')
    if (-not $DryRun) {
        $env:ATTENDANCE_API_KEY = Read-EncryptedCredential (Join-Path $CredentialDirectory 'api.cred')
    }

    Write-RunnerLog 'Starting scheduled attendance sync.'
    $syncArguments = @{
        SqlServer = '192.168.1.202,1433'
        Database = 'etimetracklite1'
        LookbackHours = $LookbackHours
        BackfillDays = $BackfillDays
        CheckpointFile = (Join-Path $CredentialDirectory 'last-successful-punch.txt')
        CheckpointOverlapMinutes = 10
        LogFile = (Join-Path $CredentialDirectory 'sync.log')
    }
    if ($DryRun) { $syncArguments.DryRun = $true }

    & $syncScript @syncArguments
    if (-not $?) {
        throw 'Attendance sync script returned an error.'
    }
    Write-RunnerLog 'Attendance sync run completed.'
} catch {
    Write-RunnerLog ("ERROR: " + $_.Exception.Message)
    exit 1
} finally {
    Remove-Item Env:SQL_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:ATTENDANCE_API_KEY -ErrorAction SilentlyContinue
}
