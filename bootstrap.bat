@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Step 0 - Repository and Tooling Bootstrap
echo ============================================
echo.

REM ---------- Move to repo root ----------
cd /d "C:\ecommerce\ecommarce"
if errorlevel 1 (
  echo [ERROR] Could not cd to C:\ecommerce\ecommarce
  pause
  exit /b 1
)
echo [OK] Working in: %CD%
echo.

REM ============================================
REM 1. Create folder structure (workflow section 4)
REM ============================================
echo [1/4] Creating folder structure...

mkdir .github\workflows 2>nul
mkdir .husky 2>nul
mkdir apps\api\prisma 2>nul
mkdir apps\api\src\config 2>nul
mkdir apps\api\src\database 2>nul
mkdir apps\api\src\common\guards 2>nul
mkdir apps\api\src\common\interceptors 2>nul
mkdir apps\api\src\common\filters 2>nul
mkdir apps\api\src\common\utils 2>nul
mkdir apps\api\src\modules\auth\dto 2>nul
mkdir apps\api\src\modules\auth\strategies 2>nul
mkdir apps\api\src\modules\users 2>nul
mkdir apps\api\src\modules\catalog 2>nul
mkdir apps\api\src\modules\inventory 2>nul
mkdir apps\api\src\modules\promotions 2>nul
mkdir apps\api\src\modules\cms 2>nul
mkdir apps\api\src\modules\crm 2>nul
mkdir apps\api\src\modules\orders 2>nul
mkdir apps\api\src\modules\payments\adapters 2>nul
mkdir apps\api\src\modules\courier\adapters 2>nul
mkdir apps\api\src\modules\rma 2>nul
mkdir apps\api\src\modules\reviews 2>nul
mkdir apps\api\src\modules\notifications\channels 2>nul
mkdir apps\api\src\modules\analytics 2>nul
mkdir apps\api\src\modules\jobs 2>nul
mkdir apps\api\test 2>nul

mkdir apps\storefront\src\app\[locale]\c\[slug] 2>nul
mkdir apps\storefront\src\app\[locale]\p\[slug] 2>nul
mkdir apps\storefront\src\app\[locale]\cart 2>nul
mkdir apps\storefront\src\app\[locale]\checkout 2>nul
mkdir apps\storefront\src\app\[locale]\signin 2>nul
mkdir apps\storefront\src\app\[locale]\register 2>nul
mkdir apps\storefront\src\app\[locale]\account\orders\[id] 2>nul
mkdir apps\storefront\src\app\[locale]\account\wishlist 2>nul
mkdir apps\storefront\src\app\[locale]\deals 2>nul
mkdir apps\storefront\src\app\[locale]\pages\[slug] 2>nul
mkdir apps\storefront\src\app\[locale]\s 2>nul
mkdir apps\storefront\src\app\[locale]\order-confirmation 2>nul
mkdir apps\storefront\src\components\layout 2>nul
mkdir apps\storefront\src\components\ui 2>nul
mkdir apps\storefront\src\components\product 2>nul
mkdir apps\storefront\src\lib\i18n 2>nul
mkdir apps\storefront\src\styles 2>nul
mkdir apps\storefront\src\context 2>nul
mkdir apps\storefront\public 2>nul
mkdir apps\storefront\e2e 2>nul

mkdir "apps\admin\src\app\(dashboard)\catalog\products" 2>nul
mkdir "apps\admin\src\app\(dashboard)\catalog\categories" 2>nul
mkdir "apps\admin\src\app\(dashboard)\catalog\attributes" 2>nul
mkdir "apps\admin\src\app\(dashboard)\catalog\import" 2>nul
mkdir "apps\admin\src\app\(dashboard)\inventory" 2>nul
mkdir "apps\admin\src\app\(dashboard)\promotions\coupons" 2>nul
mkdir "apps\admin\src\app\(dashboard)\promotions\discounts" 2>nul
mkdir "apps\admin\src\app\(dashboard)\promotions\flash-sales" 2>nul
mkdir "apps\admin\src\app\(dashboard)\cms\pages" 2>nul
mkdir "apps\admin\src\app\(dashboard)\cms\home-sections" 2>nul
mkdir "apps\admin\src\app\(dashboard)\cms\menus" 2>nul
mkdir "apps\admin\src\app\(dashboard)\cms\media" 2>nul
mkdir "apps\admin\src\app\(dashboard)\cms\announcements" 2>nul
mkdir "apps\admin\src\app\(dashboard)\orders\[id]" 2>nul
mkdir "apps\admin\src\app\(dashboard)\courier\dispatch" 2>nul
mkdir "apps\admin\src\app\(dashboard)\courier\reconciliation" 2>nul
mkdir "apps\admin\src\app\(dashboard)\payments\transactions" 2>nul
mkdir "apps\admin\src\app\(dashboard)\payments\refunds" 2>nul
mkdir "apps\admin\src\app\(dashboard)\payments\settlements" 2>nul
mkdir "apps\admin\src\app\(dashboard)\rma\returns" 2>nul
mkdir "apps\admin\src\app\(dashboard)\rma\tickets" 2>nul
mkdir "apps\admin\src\app\(dashboard)\customers\[id]" 2>nul
mkdir "apps\admin\src\app\(dashboard)\reviews" 2>nul
mkdir "apps\admin\src\app\(dashboard)\notifications\templates" 2>nul
mkdir "apps\admin\src\app\(dashboard)\notifications\logs" 2>nul
mkdir "apps\admin\src\app\(dashboard)\reports" 2>nul
mkdir "apps\admin\src\app\(dashboard)\settings\roles" 2>nul
mkdir "apps\admin\src\app\(dashboard)\settings\users" 2>nul
mkdir "apps\admin\src\app\(dashboard)\settings\audit-log" 2>nul
mkdir "apps\admin\src\app\(dashboard)\settings\delivery" 2>nul
mkdir "apps\admin\src\app\(dashboard)\settings\checkout" 2>nul
mkdir apps\admin\src\components 2>nul
mkdir apps\admin\public 2>nul

mkdir packages\types\src 2>nul
mkdir packages\config 2>nul
mkdir packages\mock-reference 2>nul

mkdir infra 2>nul
mkdir docs\training 2>nul

echo [OK] Folder structure created.
echo.

REM ============================================
REM 2. Copy mock reference files from C:\temporary
REM    index (2).html renamed to index.html
REM ============================================
echo [2/4] Copying mock reference files...

if not exist "C:\temporary" (
  echo [WARN] C:\temporary does not exist - skip mock copy
  goto :skip_mock
)

copy /Y "C:\temporary\404.html"          "packages\mock-reference\404.html"          >nul
copy /Y "C:\temporary\account.html"      "packages\mock-reference\account.html"      >nul
copy /Y "C:\temporary\cart.html"         "packages\mock-reference\cart.html"         >nul
copy /Y "C:\temporary\confirmation.html" "packages\mock-reference\confirmation.html" >nul
copy /Y "C:\temporary\content.html"      "packages\mock-reference\content.html"      >nul
copy /Y "C:\temporary\deals.html"        "packages\mock-reference\deals.html"        >nul
copy /Y "C:\temporary\index (2).html"    "packages\mock-reference\index.html"        >nul
copy /Y "C:\temporary\orders.html"       "packages\mock-reference\orders.html"       >nul
copy /Y "C:\temporary\pdp.html"          "packages\mock-reference\pdp.html"          >nul
copy /Y "C:\temporary\plp.html"          "packages\mock-reference\plp.html"          >nul
copy /Y "C:\temporary\register.html"     "packages\mock-reference\register.html"     >nul
copy /Y "C:\temporary\signin.html"       "packages\mock-reference\signin.html"       >nul
copy /Y "C:\temporary\wishlist.html"     "packages\mock-reference\wishlist.html"     >nul
copy /Y "C:\temporary\style.css"         "packages\mock-reference\style.css"         >nul

echo [OK] Copied 14 HTML + style.css to packages\mock-reference\

:skip_mock
echo.

REM ============================================
REM 3. Create placeholder files
REM ============================================
echo [3/4] Creating placeholder files...

call :ph "apps\api\src\config\configuration.ts"
call :ph "apps\api\src\database\prisma.service.ts"
call :ph "apps\api\src\database\redis.service.ts"
call :ph "apps\api\src\common\guards\jwt-auth.guard.ts"
call :ph "apps\api\src\common\guards\roles.guard.ts"
call :ph "apps\api\src\common\guards\csrf.guard.ts"
call :ph "apps\api\src\common\interceptors\audit.interceptor.ts"
call :ph "apps\api\src\common\interceptors\idempotency.interceptor.ts"
call :ph "apps\api\src\common\filters\http-exception.filter.ts"
call :ph "apps\api\src\common\utils\money.ts"
call :ph "apps\api\src\common\utils\slugify.ts"
call :ph "apps\api\src\modules\auth\auth.controller.ts"
call :ph "apps\api\src\modules\auth\auth.service.ts"
call :ph "apps\api\src\modules\auth\totp.service.ts"
call :ph "apps\api\src\modules\users\users.service.ts"
call :ph "apps\api\src\modules\users\roles.ts"
call :ph "apps\api\src\modules\catalog\categories.controller.ts"
call :ph "apps\api\src\modules\catalog\products.controller.ts"
call :ph "apps\api\src\modules\catalog\variants.service.ts"
call :ph "apps\api\src\modules\catalog\attributes.service.ts"
call :ph "apps\api\src\modules\catalog\search.service.ts"
call :ph "apps\api\src\modules\catalog\suggestions.service.ts"
call :ph "apps\api\src\modules\catalog\import-export.service.ts"
call :ph "apps\api\src\modules\catalog\slug-redirects.service.ts"
call :ph "apps\api\src\modules\inventory\stock.service.ts"
call :ph "apps\api\prisma\seed.ts"
call :ph "apps\storefront\src\app\[locale]\page.tsx"
call :ph "apps\storefront\src\app\[locale]\cart\page.tsx"
call :ph "apps\storefront\src\app\[locale]\checkout\page.tsx"
call :ph "apps\storefront\src\app\[locale]\signin\page.tsx"
call :ph "apps\storefront\src\app\[locale]\register\page.tsx"
call :ph "apps\storefront\src\app\[locale]\account\page.tsx"
call :ph "apps\storefront\src\app\[locale]\deals\page.tsx"
call :ph "apps\storefront\src\app\not-found.tsx"
call :ph "apps\storefront\src\styles\tokens.css"
call :ph "apps\storefront\src\lib\i18n\bn.json"
call :ph "apps\storefront\src\lib\i18n\en.json"
call :ph "apps\storefront\src\components\layout\header.tsx"
call :ph "apps\storefront\src\components\layout\footer.tsx"
call :ph "apps\storefront\src\components\ui\toast.tsx"
call :ph "apps\storefront\src\components\product\product-card.tsx"
call :ph "apps\admin\src\app\(dashboard)\page.tsx"
call :ph "apps\admin\src\components\data-table.tsx"
call :ph "docs\data-model.md"
call :ph "docs\acceptance-checklist.md"
call :ph "docs\aws-runbook.md"
call :ph "docs\dr-runbook.md"

echo [OK] Placeholder files created.
echo.

REM ============================================
REM 4. Summary
REM ============================================
echo [4/4] Summary:
echo.
echo   Repo root: %CD%
echo.
echo   Next steps:
echo   1. Add real-content files (package.json, turbo.json, ci.yml, etc.)
echo   2. Run: pnpm install
echo   3. Run: pnpm build
echo   4. git add . and git commit
echo.
echo ============================================
echo   Step 0 bootstrap COMPLETE
echo ============================================
pause
exit /b 0

:ph
if not exist "%~1" (
  echo // placeholder - implemented in later step > "%~1"
)
exit /b 0