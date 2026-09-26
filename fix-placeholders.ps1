$root = 'C:\ecommerce\ecommarce'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$count = 0

Get-ChildItem -Path "$root\apps\storefront\src","$root\apps\admin\src" -Recurse -File -Filter *.tsx | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $trimmed = $content.Trim()
    if ($trimmed -match '^// placeholder') {
        $newContent = "export default function Page() {`n  return null;`n}`n"
        [System.IO.File]::WriteAllText($_.FullName, $newContent, $utf8NoBom)
        Write-Host "  [FIXED] $($_.FullName)" -ForegroundColor Green
        $count++
    }
}

Write-Host ""
Write-Host "Total fixed: $count" -ForegroundColor Cyan