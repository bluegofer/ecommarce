# fix-bom.ps1 - Remove UTF-8 BOM from all text files
$root = 'C:\ecommerce\ecommarce'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$extensions = @('*.json', '*.ts', '*.tsx', '*.js', '*.cjs', '*.mjs', '*.md', '*.yaml', '*.yml', '*.css', '*.html')

$count = 0
Get-ChildItem -Path $root -Recurse -Include $extensions -File | Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\.next\\' -and
    $_.FullName -notmatch '\\dist\\' -and
    $_.FullName -notmatch '\\.turbo\\'
} | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    # Remove BOM if present
    if ($content.Length -gt 0 -and $content[0] -eq [char]0xFEFF) {
        $content = $content.Substring(1)
        [System.IO.File]::WriteAllText($_.FullName, $content, $utf8NoBom)
        Write-Host "  [FIXED] $($_.FullName)" -ForegroundColor Green
        $count++
    } else {
        Write-Host "  [ok]    $($_.FullName)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Total files fixed: $count" -ForegroundColor Cyan