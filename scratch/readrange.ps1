param([string]$Path, [int]$Start, [int]$End)
$lines = Get-Content -LiteralPath $Path
$lines[$Start..$End]
