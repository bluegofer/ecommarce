# BlueGofer Step 15 — DECISIONS.md Entry (CloudFront Deferral)
$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$decisionsFile = 'C:\ecommerce\ecommarce\docs\DECISIONS.md'

if (-not (Test-Path -LiteralPath $decisionsFile)) { throw "DECISIONS.md not found" }

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item -LiteralPath $decisionsFile -Destination "$decisionsFile.bak-$timestamp" -Force
Write-Host "[0/2] Backup: $decisionsFile.bak-$timestamp" -ForegroundColor Green

$entry = @"


---

## Step 15 — CloudFront Deferred (TEMPORARY, 2026-09-16)

**Status:** TEMPORARY — deferred pending AWS CloudFront account verification

### Context

During Step 15.2.7 (terraform apply), CloudFront distribution creation failed with:

    AccessDenied: Your account must be verified before you can add new CloudFront resources.

Root cause: New AWS account (activated 2026-09-16 on Paid plan) requires manual CloudFront verification — a standard AWS anti-fraud process for new accounts.

### Decision

CloudFront and WAF modules are TEMPORARILY DISABLED via Terraform count toggle. Code and module definitions are INTACT — only the count flag is set to 0.

### Why deferred (not removed)

1. Business is Bangladesh-only e-commerce (no international customer base)
2. Latency difference between CloudFront (30-50ms) and EC2-direct (50-70ms) is negligible for BD customers (20-40ms)
3. CloudFront cost in TDD Appendix B is $0-1/month — savings negligible
4. Nginx reverse proxy on EC2 will serve S3 media directly

### Files changed

- infra/terraform/modules/cloudfront/main.tf — added count = var.enable_cloudfront ? 1 : 0
- infra/terraform/modules/waf/main.tf — added count = var.enable_waf ? 1 : 0
- infra/terraform/environments/staging/main.tf — added variables + pass-through
- infra/terraform/environments/staging/terraform.tfvars — enable_cloudfront = false, enable_waf = false

### AWS Support case

- Case ID: 178954985700704
- Submitted: 2026-09-16 17:09:57 GMT+4
- Severity: General question (24h response expected)
- Status: Unassigned (as of 2026-09-16)

### Re-enable procedure

Option A — CloudFront verified by AWS (2 min):
- Set enable_cloudfront = true, enable_waf = true in terraform.tfvars
- Run: terraform init -upgrade; terraform plan -out=tfplan; terraform apply tfplan

Option B — Cloudflare instead (2-3 hours):
- Sign up Cloudflare free account
- Add nolimitshopping.com to Cloudflare
- Change GoDaddy nameservers to Cloudflare NS
- Configure Cloudflare → S3 origin
- Cloudflare WAF (free tier) replaces AWS WAF
- Keep both Terraform modules disabled permanently

### Cost impact

- With CloudFront + WAF: ~$52-56/month
- Without CloudFront + WAF: ~$47-48/month
- Savings (deferred state): ~$5-8/month

Cost stays within TDD Appendix B locked tier ($47-50).

### Enforcement

- enable_cloudfront and enable_waf flags in terraform.tfvars control module creation
- Both default to false for staging until AWS verification
- Production will decide at Step 16 launch

### Owner and re-evaluate

- Decision owner: Client (Musavi Fardin)
- Technical owner: Development team
- Re-evaluate: After AWS Support case 178954985700704 resolution OR 2026-09-30 (whichever first)
"@ -replace "`r`n", "`n"

Add-Content -LiteralPath $decisionsFile -Value $entry -NoNewline -Encoding UTF8
Write-Host "[1/2] DECISIONS.md updated" -ForegroundColor Green

Write-Host "`n[2/2] Verification (last 20 lines):" -ForegroundColor Cyan
Get-Content -LiteralPath $decisionsFile -Tail 20

Write-Host "`nDone. DECISIONS.md entry added." -ForegroundColor Green
