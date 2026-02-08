# GitHubリポジトリ作成手順

## ✅ 準備完了

初回コミットが完了しました！以下の手順でGitHubリポジトリを作成してください。

## 方法1: GitHub Web UIで作成（推奨）

### ステップ1: GitHubでリポジトリを作成

1. [GitHub](https://github.com) にアクセスしてログイン
2. 右上の「+」アイコンをクリック → 「New repository」を選択
3. 以下の情報を入力：

   **Repository name**: `tubeinsight-ai`
   
   **Description**: `YouTube動画のコメントをAIで解析し、真の価値と本音を可視化するChrome拡張機能`
   
   **Visibility**: 
   - 🔒 **Private**（推奨）- APIキーなどの機密情報が含まれるため
   - 🌐 Public - オープンソースとして公開する場合
   
   **Initialize this repository with**: 
   - ❌ README（チェックを外す - 既にREADME.mdがあります）
   - ❌ .gitignore（チェックを外す - 既に.gitignoreがあります）
   - ❌ license（チェックを外す）

4. 「Create repository」をクリック

### ステップ2: リモートリポジトリを追加してプッシュ

GitHubでリポジトリを作成したら、表示されるページに以下のコマンドが表示されます。
**YOUR_USERNAME**をあなたのGitHubユーザー名に置き換えて実行してください：

```powershell
# リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/tubeinsight-ai.git

# ブランチ名をmainに設定（既にmainの場合は不要）
git branch -M main

# コードをプッシュ
git push -u origin main
```

## 方法2: GitHub CLIを使用（オプション）

GitHub CLIをインストールしたい場合：

### GitHub CLIのインストール

```powershell
# Chocolateyを使用（管理者権限が必要）
choco install gh

# または、wingetを使用
winget install GitHub.cli
```

### GitHub CLIでログイン

```powershell
gh auth login
```

### リポジトリを作成してプッシュ

```powershell
# プライベートリポジトリを作成
gh repo create tubeinsight-ai --private --source=. --remote=origin --push

# または、パブリックリポジトリの場合
gh repo create tubeinsight-ai --public --source=. --remote=origin --push
```

## リポジトリ設定の推奨事項

### 1. リポジトリの説明を更新

リポジトリのページで「Settings」→「General」→「Description」に以下を設定：

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
- `nodejs`
- `express`

### 3. READMEの確認

`README.md`が適切に表示されることを確認してください。

### 4. セキュリティ設定

**重要**: 以下のファイルが`.gitignore`に含まれていることを確認：

- `.env`
- `server/.env`
- `node_modules/`
- `dist/`

これらのファイルには機密情報が含まれる可能性があるため、**絶対にコミットしないでください**。

## 次のステップ

リポジトリ作成後：

1. ✅ コードをプッシュ
2. ⬜ GitHub ActionsでCI/CDを設定（オプション）
3. ⬜ Issuesテンプレートを作成（オプション）
4. ⬜ Pull Requestテンプレートを作成（オプション）
5. ⬜ セキュリティポリシーを追加（オプション）

## トラブルシューティング

### 認証エラーが発生する場合

```powershell
# GitHub CLIで再認証
gh auth login

# または、HTTPSの代わりにSSHを使用
git remote set-url origin git@github.com:YOUR_USERNAME/tubeinsight-ai.git
```

### リモートリポジトリが既に存在する場合

```powershell
# 既存のリモートを確認
git remote -v

# 既存のリモートを削除
git remote remove origin

# 新しいリモートを追加
git remote add origin https://github.com/YOUR_USERNAME/tubeinsight-ai.git
```

### 大きなファイルが含まれている場合

アイコンファイル（.png）が含まれていますが、通常のサイズなので問題ありません。
もし問題が発生する場合は、Git LFSを使用できます：

```powershell
git lfs install
git lfs track "*.png"
git add .gitattributes
git commit -m "Add Git LFS tracking for images"
```

## 完了確認

リポジトリが正常に作成されたら、以下を確認：

- ✅ https://github.com/YOUR_USERNAME/tubeinsight-ai にアクセスできる
- ✅ すべてのファイルが表示されている
- ✅ README.mdが正しく表示されている
- ✅ .envファイルが含まれていない（セキュリティ）

<!-- Updated -->
