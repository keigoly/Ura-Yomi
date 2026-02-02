# GitHubリポジトリ作成手順

## 方法1: GitHub CLIを使用（推奨）

### 1. GitHub CLIのインストール（未インストールの場合）

```bash
# Windows (Chocolatey)
choco install gh

# macOS
brew install gh

# Linux
# https://cli.github.com/manual/installation を参照
```

### 2. GitHub CLIでログイン

```bash
gh auth login
```

### 3. リポジトリを作成

```bash
# リポジトリを作成（プライベート）
gh repo create tubeinsight-ai --private --source=. --remote=origin --push

# または、パブリックリポジトリの場合
gh repo create tubeinsight-ai --public --source=. --remote=origin --push
```

## 方法2: GitHub Web UIを使用

### 1. GitHubでリポジトリを作成

1. [GitHub](https://github.com) にアクセス
2. 右上の「+」→「New repository」をクリック
3. 以下の情報を入力：
   - **Repository name**: `tubeinsight-ai`
   - **Description**: `YouTube動画のコメントをAIで解析し、真の価値と本音を可視化するChrome拡張機能`
   - **Visibility**: Private（推奨）または Public
   - **Initialize this repository with**: チェックを外す（既存のファイルがあるため）

4. 「Create repository」をクリック

### 2. ローカルリポジトリを初期化

```bash
# Gitリポジトリを初期化
git init

# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: YouTubeコメントwithAI - YouTube Comment Analyzer"

# リモートリポジトリを追加（YOUR_USERNAMEをあなたのGitHubユーザー名に置き換え）
git remote add origin https://github.com/YOUR_USERNAME/tubeinsight-ai.git

# メインブランチを設定
git branch -M main

# プッシュ
git push -u origin main
```

## 方法3: 既存のリポジトリに接続

既にGitリポジトリが初期化されている場合：

```bash
# リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/tubeinsight-ai.git

# プッシュ
git push -u origin main
```

## リポジトリ設定の推奨事項

### 1. リポジトリの説明を更新

GitHubリポジトリのページで「Settings」→「General」→「Description」に以下を設定：

```
YouTube動画のコメントをAI（Gemini 3.0 Flash）で解析し、真の価値と本音を可視化するChrome拡張機能。Google認証とクレジットシステムを搭載。
```

### 2. トピックを追加

リポジトリのページで「Add topics」をクリックし、以下を追加：

- `chrome-extension`
- `youtube`
- `ai-analysis`
- `gemini-api`
- `comment-analyzer`
- `typescript`
- `react`
- `vite`

### 3. READMEの確認

`README.md`が適切に表示されることを確認してください。

### 4. ライセンスの追加（オプション）

必要に応じて、`LICENSE`ファイルを追加してください。

```bash
# MIT Licenseの場合
# GitHubのWeb UIから「Add file」→「Create new file」→「LICENSE」で追加
```

## セキュリティ設定

### 1. Secretsの設定

GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」で以下を設定（CI/CDを使用する場合）：

- `YOUTUBE_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 2. .gitignoreの確認

以下のファイルが`.gitignore`に含まれていることを確認：

- `.env`
- `server/.env`
- `node_modules/`
- `dist/`

## 次のステップ

1. ✅ リポジトリを作成
2. ✅ コードをプッシュ
3. ⬜ GitHub ActionsでCI/CDを設定（オプション）
4. ⬜ Issuesテンプレートを作成（オプション）
5. ⬜ Pull Requestテンプレートを作成（オプション）

## トラブルシューティング

### 認証エラーが発生する場合

```bash
# GitHub CLIで再認証
gh auth login

# または、HTTPSの代わりにSSHを使用
git remote set-url origin git@github.com:YOUR_USERNAME/tubeinsight-ai.git
```

### 大きなファイルが含まれている場合

```bash
# .gitignoreを確認
# 必要に応じて、Git LFSを使用
git lfs install
git lfs track "*.png"
git lfs track "*.jpg"
```
