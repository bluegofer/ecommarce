# BlueGofer Step 15.2.7 — CloudFront + WAF Disable
$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$cfMain      = 'C:\ecommerce\ecommarce\infra\terraform\modules\cloudfront\main.tf'
$wafMain     = 'C:\ecommerce\ecommarce\infra\terraform\modules\waf\main.tf'
$stagingMain = 'C:\ecommerce\ecommarce\infra\terraform\environments\staging\main.tf'
$stagingTfv  = 'C:\ecommerce\ecommarce\infra\terraform\environments\staging\terraform.tfvars'

# ---- 0) Backup ----
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = "C:\ecommerce\ecommarce\infra\terraform\environments\staging\.backup-disable-$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item -LiteralPath $cfMain      -Destination "$backupDir\cloudfront-main.tf.bak" -Force
Copy-Item -LiteralPath $wafMain     -Destination "$backupDir\waf-main.tf.bak" -Force
Copy-Item -LiteralPath $stagingMain -Destination "$backupDir\staging-main.tf.bak" -Force
Copy-Item -LiteralPath $stagingTfv  -Destination "$backupDir\terraform.tfvars.bak" -Force
Write-Host "[0/5] Backup: $backupDir" -ForegroundColor Green

# ---- 1) CloudFront: add count + variable ----
Write-Host "`n[1/5] Modifying cloudfront/main.tf..." -ForegroundColor Cyan
$cfLines = [System.Collections.ArrayList](Get-Content -LiteralPath $cfMain)

$hasCfVar = $false
foreach ($l in $cfLines) { if ($l -match 'variable\s+"enable_cloudfront"') { $hasCfVar = $true; break } }

if (-not $hasCfVar) {
  $cfLines.Insert(0, 'variable "enable_cloudfront" {')
  $cfLines.Insert(1, '  description = "Toggle CloudFront (false = skip until AWS verifies)"')
  $cfLines.Insert(2, '  type        = bool')
  $cfLines.Insert(3, '  default     = false')
  $cfLines.Insert(4, '}')
  $cfLines.Insert(5, '')
  Write-Host "  + Variable declaration added" -ForegroundColor Green
}

$cfCountAdded = $false
for ($i = 0; $i -lt $cfLines.Count; $i++) {
  if ($cfLines[$i] -match '^resource\s+"aws_cloudfront_distribution"\s+"media"\s*\{') {
    if ($cfLines[$i+1] -notmatch '^\s*count\s*=') {
      $cfLines.Insert($i + 1, '  count = var.enable_cloudfront ? 1 : 0')
    }
    $cfCountAdded = $true
    Write-Host "  + count added at line $($i+2)" -ForegroundColor Green
    break
  }
}
if (-not $cfCountAdded) { throw "aws_cloudfront_distribution.media not found" }

[System.IO.File]::WriteAllText($cfMain, (($cfLines -join "`n") + "`n"), $utf8NoBom)

# ---- 2) WAF: add count + variable ----
Write-Host "`n[2/5] Modifying waf/main.tf..." -ForegroundColor Cyan
$wafLines = [System.Collections.ArrayList](Get-Content -LiteralPath $wafMain)

$hasWafVar = $false
foreach ($l in $wafLines) { if ($l -match 'variable\s+"enable_waf"') { $hasWafVar = $true; break } }

if (-not $hasWafVar) {
  $insertIdx = 0
  for ($i = 0; $i -lt $wafLines.Count; $i++) {
    if ($wafLines[$i] -match '^terraform\s*\{') {
      for ($j = $i; $j -lt $wafLines.Count; $j++) {
        if ($wafLines[$j] -match '^\}') { $insertIdx = $j + 1; break }
      }
      break
    }
  }
  $wafVarBlock = @('', 'variable "enable_waf" {', '  description = "Toggle WAF (false = skip when CloudFront deferred)"', '  type        = bool', '  default     = false', '}')
  $wafLines.InsertRange($insertIdx, $wafVarBlock)
  Write-Host "  + Variable declaration added" -ForegroundColor Green
}

$wafCountAdded = $false
for ($i = 0; $i -lt $wafLines.Count; $i++) {
  if ($wafLines[$i] -match '^resource\s+"aws_wafv2_web_acl"\s+"cloudfront"\s*\{') {
    if ($wafLines[$i+1] -notmatch '^\s*count\s*=') {
      $wafLines.Insert($i + 1, '  count = var.enable_waf ? 1 : 0')
    }
    $wafCountAdded = $true
    Write-Host "  + count added at line $($i+2)" -ForegroundColor Green
    break
  }
}
if (-not $wafCountAdded) { throw "aws_wafv2_web_acl.cloudfront not found" }

[System.IO.File]::WriteAllText($wafMain, (($wafLines -join "`n") + "`n"), $utf8NoBom)

# ---- 3) staging/main.tf: variables + pass-through ----
Write-Host "`n[3/5] Modifying staging/main.tf..." -ForegroundColor Cyan
$stgLines = [System.Collections.ArrayList](Get-Content -LiteralPath $stagingMain)

$lastVarIdx = -1
for ($i = 0; $i -lt $stgLines.Count; $i++) {
  if ($stgLines[$i] -match '^variable\s+"ec2_instance_type"') { $lastVarIdx = $i }
}
if ($lastVarIdx -eq -1) { throw "ec2_instance_type variable not found" }

$closeBraceIdx = $lastVarIdx
for ($i = $lastVarIdx; $i -lt $stgLines.Count; $i++) {
  if ($stgLines[$i] -match '^\}') { $closeBraceIdx = $i; break }
}

$newVars = @('', 'variable "enable_cloudfront" {', '  description = "Toggle CloudFront"', '  type        = bool', '  default     = false', '}', '', 'variable "enable_waf" {', '  description = "Toggle WAF"', '  type        = bool', '  default     = false', '}')
$stgLines.InsertRange($closeBraceIdx + 1, $newVars)
Write-Host "  + Variables added" -ForegroundColor Green

# CloudFront pass-through
$cfModIdx = -1
for ($i = 0; $i -lt $stgLines.Count; $i++) {
  if ($stgLines[$i] -match '^module\s+"cloudfront"') { $cfModIdx = $i; break }
}
if ($cfModIdx -ge 0) {
  $hasPass = $false
  for ($i = $cfModIdx; $i -lt [Math]::Min($cfModIdx + 15, $stgLines.Count); $i++) {
    if ($stgLines[$i] -match 'enable_cloudfront') { $hasPass = $true; break }
    if ($stgLines[$i] -match '^\}') { break }
  }
  if (-not $hasPass) {
    $stgLines.Insert($cfModIdx + 1, '  enable_cloudfront = var.enable_cloudfront')
    Write-Host "  + CloudFront pass-through added" -ForegroundColor Green
  }
}

# WAF pass-through
$wafModIdx = -1
for ($i = 0; $i -lt $stgLines.Count; $i++) {
  if ($stgLines[$i] -match '^module\s+"waf"') { $wafModIdx = $i; break }
}
if ($wafModIdx -ge 0) {
  $hasWaf = $false
  for ($i = $wafModIdx; $i -lt [Math]::Min($wafModIdx + 15, $stgLines.Count); $i++) {
    if ($stgLines[$i] -match 'enable_waf\s*=') { $hasWaf = $true; break }
    if ($stgLines[$i] -match '^\}') { break }
  }
  if (-not $hasWaf) {
    $stgLines.Insert($wafModIdx + 1, '  enable_waf        = var.enable_waf')
    Write-Host "  + WAF pass-through added" -ForegroundColor Green
  }
}

[System.IO.File]::WriteAllText($stagingMain, (($stgLines -join "`n") + "`n"), $utf8NoBom)

# ---- 4) terraform.tfvars ----
Write-Host "`n[4/5] Modifying terraform.tfvars..." -ForegroundColor Cyan
$tfv = Get-Content -LiteralPath $stagingTfv -Raw
if ($tfv -match 'enable_cloudfront') {
  Write-Host "  Already present - skipping" -ForegroundColor Yellow
} else {
  $append = "`n`n# ---------------------------------------------------------------------------`n# CloudFront + WAF: TEMPORARILY DISABLED (2026-09-16)`n# AWS CloudFront verification pending (case 178954985700704)`n# See docs/DECISIONS.md for re-enable procedure`n# ---------------------------------------------------------------------------`nenable_cloudfront = false`nenable_waf        = false`n"
  [System.IO.File]::WriteAllText($stagingTfv, ($tfv.TrimEnd() + $append), $utf8NoBom)
  Write-Host "  + Flags added" -ForegroundColor Green
}

# ---- 5) Verify ----
Write-Host "`n[5/5] Verification..." -ForegroundColor Cyan
Write-Host "  cloudfront:" -ForegroundColor Yellow
Get-Content -LiteralPath $cfMain | Select-String -Pattern 'count\s*=\s*var\.enable_cloudfront'
Write-Host "  waf:" -ForegroundColor Yellow
Get-Content -LiteralPath $wafMain | Select-String -Pattern 'count\s*=\s*var\.enable_waf'
Write-Host "  staging main.tf:" -ForegroundColor Yellow
Get-Content -LiteralPath $stagingMain | Select-String -Pattern 'enable_cloudfront|enable_waf' | Select-Object -First 6
Write-Host "  tfvars:" -ForegroundColor Yellow
Get-Content -LiteralPath $stagingTfv | Select-String -Pattern 'enable_cloudfront|enable_waf'

Write-Host "`nDone. CloudFront + WAF disabled." -ForegroundColor Green
