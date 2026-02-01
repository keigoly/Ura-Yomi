# GitHubリポジトリ作成用スクリプト (PowerShell)

Write-Host "🚀 TubeInsight AI - GitHubリポジトリ作成スクリプト" -ForegroundColor Cyan
Write-Host ""

# Gitの状態を確認
if (-not (Test-Path ".git")) {
    Write-Host "❌ Gitリポジトリが初期化されていません" -ForegroundColor Red
    Write-Host "git init を実行してください"
    exit 1
}

# ファイルをステージング
Write-Host "📦 ファイルをステージング中..." -ForegroundColor Yellow
git add .

# 初回コミット
Write-Host "💾 初回コミットを作成中..." -ForegroundColor Yellow
git commit -m "Initial commit: TubeInsight AI - YouTube Comment Analyzer

- Chrome拡張機能の実装
- Google認証とクレジットシステム
- バックエンドAPIサーバー
- コスト管理システム
- 使用量制限機能"

Write-Host ""
Write-Host "✅ コミットが完了しました！" -ForegroundColor Green
Write-Host ""
Write-Host "次のステップ:" -ForegroundColor Cyan
Write-Host "1. GitHubでリポジトリを作成: https://github.com/new"
Write-Host "2. リモートリポジトリを追加:"
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/tubeinsight-ai.git"
Write-Host "3. プッシュ:"
Write-Host "   git push -u origin main"
Write-Host ""
Write-Host "または、GitHub CLIを使用する場合:" -ForegroundColor Yellow
Write-Host "   gh repo create tubeinsight-ai --private --source=. --remote=origin --push"
