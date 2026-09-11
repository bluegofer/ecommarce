$root = 'C:\ecommerce\ecommarce'
$extensions = @('.json', '.ts', '.tsx', '.js', '.cjs', '.mjs', '.md', '.yaml', '.yml', '.css', '.html')
$count = 0

Get-ChildItem -Path $root -Recurse -File | Where-Object {
    $extensions -contains $_.Extension -and
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\.next\\' -and
    $_.FullName -notmatch '\\dist\\' -and
    $_.FullName -notmatch '\\.turbo\\' -and
    $_.FullName -notmatch '\\.git\\'
} | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $newBytes = $bytes[3..($bytes.Length - 1)]
        [System.IO.File]::WriteAllBytes($_.FullName, $newBytes)
        Write-Host "  [FIXED] $($_.FullName)" -ForegroundColor Green
        $count++
    }
}

Write-Host ""
Write-Host "Total files fixed: $count" -ForegroundColor Cyans

