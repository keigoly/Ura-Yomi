# 自動ビルドスクリプト
# ワークスペースを開いたときに自動実行される

Write-Host "🔨 自動ビルドを開始します..." -ForegroundColor Cyan

# プロジェクトルートに移動
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

# ビルドを実行
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ビルドが完了しました！" -ForegroundColor Green
} else {
    Write-Host "❌ ビルドに失敗しました" -ForegroundColor Red
    exit $LASTEXITCODE
}
