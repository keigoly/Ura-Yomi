# 自動ビルドスクリプト
# ワークスペースを開いたときに自動実行される

Write-Host "[BUILD] 自動ビルドを開始します..." -ForegroundColor Cyan

# プロジェクトルートに移動
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# ビルドを実行
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] ビルドが完了しました！" -ForegroundColor Green
} else {
    Write-Host "[FAIL] ビルドに失敗しました" -ForegroundColor Red
    exit $LASTEXITCODE
}
