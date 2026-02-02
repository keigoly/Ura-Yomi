#!/bin/bash

# GitHubリポジトリ作成用スクリプト

echo "🚀 YouTubeコメントwithAI - GitHubリポジトリ作成スクリプト"
echo ""

# Gitの状態を確認
if [ ! -d ".git" ]; then
    echo "❌ Gitリポジトリが初期化されていません"
    echo "git init を実行してください"
    exit 1
fi

# ファイルをステージング
echo "📦 ファイルをステージング中..."
git add .

# 初回コミット
echo "💾 初回コミットを作成中..."
git commit -m "Initial commit: YouTubeコメントwithAI - YouTube Comment Analyzer

- Chrome拡張機能の実装
- Google認証とクレジットシステム
- バックエンドAPIサーバー
- コスト管理システム
- 使用量制限機能"

echo ""
echo "✅ コミットが完了しました！"
echo ""
echo "次のステップ:"
echo "1. GitHubでリポジトリを作成: https://github.com/new"
echo "2. リモートリポジトリを追加:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/tubeinsight-ai.git"
echo "3. プッシュ:"
echo "   git push -u origin main"
echo ""
echo "または、GitHub CLIを使用する場合:"
echo "   gh repo create tubeinsight-ai --private --source=. --remote=origin --push"
