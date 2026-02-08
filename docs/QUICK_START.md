# クイックスタートガイド

このガイドでは、YouTubeコメントwithAIを最短でセットアップする方法を説明します。

## 前提条件

- Node.js 18以上がインストールされていること
- Googleアカウントを持っていること
- Chromeブラウザがインストールされていること

## セットアップ手順（5分）

### 1. リポジトリのクローンと依存関係のインストール

```bash
git clone <repository-url>
cd youtube-comment-analyzer
npm install
cd server
npm install
```

### 2. サーバーの設定

```bash
cd server
cp .env.example .env
```

`.env`ファイルを編集して、以下の情報を設定：

```env
PORT=3000
YOUTUBE_API_KEY=your_youtube_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
JWT_SECRET=your_random_secret_here
```

**APIキーの取得方法**:
- [APIキー設定ガイド](./API_KEY_SETUP.md) を参照

**Google OAuth設定**:
- [Google OAuth設定ガイド](./GOOGLE_OAUTH_SETUP.md) を参照

### 3. サーバーを起動

```bash
cd server
npm run dev
```

サーバーが `http://localhost:3000` で起動します。

### 4. 拡張機能の設定

プロジェクトルートで：

```bash
# .envファイルを作成
echo "VITE_API_BASE_URL=http://localhost:3000" > .env

# ビルド
npm run build
```

### 5. Chrome拡張機能として読み込む

1. Chromeで `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist` フォルダを選択

### 6. 動作確認

1. YouTube動画ページを開く
2. 拡張機能のアイコンをクリック
3. 「Googleアカウントでサインイン」をクリック
4. Googleアカウントを選択
5. 「解析を開始する」ボタンをクリック

## トラブルシューティング

### サーバーが起動しない

- `.env`ファイルが正しく設定されているか確認
- ポート3000が使用されていないか確認
- `server/node_modules`がインストールされているか確認

### 認証エラーが発生する

- `GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`が正しく設定されているか確認
- [Google OAuth設定ガイド](./GOOGLE_OAUTH_SETUP.md) の手順を確認

### APIキーエラーが発生する

- `YOUTUBE_API_KEY`と`GEMINI_API_KEY`が正しく設定されているか確認
- [APIキー設定ガイド](./API_KEY_SETUP.md) の手順を確認

### 拡張機能が読み込めない

- `npm run build`が正常に完了したか確認
- `dist`フォルダが存在するか確認
- ブラウザのコンソールでエラーメッセージを確認

## 次のステップ

- [APIキー設定ガイド](./API_KEY_SETUP.md) - 詳細なAPIキー取得方法
- [Google OAuth設定ガイド](./GOOGLE_OAUTH_SETUP.md) - 詳細なOAuth設定方法
- [実装ガイド](./IMPLEMENTATION_GUIDE.md) - アーキテクチャの詳細

<!-- Updated -->
