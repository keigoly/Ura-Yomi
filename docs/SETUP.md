# セットアップガイド

このガイドでは、YouTubeコメントwithAIの開発環境をセットアップする方法を説明します。

## クイックスタート

最短でセットアップしたい場合は、[クイックスタートガイド](./QUICK_START.md)を参照してください。

## 1. 依存関係のインストール

### プロジェクトルート

```bash
npm install
```

### サーバー側

```bash
cd server
npm install
```

## 2. サーバーの設定

### 環境変数の設定

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

### APIキーの取得

詳細な手順は[APIキー設定ガイド](./API_KEY_SETUP.md)を参照してください。

### Google OAuth設定

詳細な手順は[Google OAuth設定ガイド](./GOOGLE_OAUTH_SETUP.md)を参照してください。

## 3. サーバーの起動

```bash
cd server
npm run dev
```

サーバーが `http://localhost:3000` で起動します。

## 4. 拡張機能の設定

### 環境変数の設定

プロジェクトルートで：

```bash
echo "VITE_API_BASE_URL=http://localhost:3000" > .env
```

本番環境の場合は：

```bash
echo "VITE_API_BASE_URL=https://your-api-server.com" > .env
```

### ビルド

```bash
npm run build
```

## 5. Chrome拡張機能として読み込む

1. Chromeブラウザで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist` フォルダを選択

## 6. 動作確認

1. YouTube動画ページを開く
2. 拡張機能のアイコンをクリック
3. **「Googleアカウントでサインイン」** をクリック
4. Googleアカウントを選択してサインイン
5. 「解析を開始する」ボタンをクリック
6. Side Panelで結果を確認

## 7. 開発モード

開発中は、以下のコマンドでホットリロードが有効になります：

```bash
# 拡張機能の開発モード
npm run dev

# サーバーの開発モード（別ターミナル）
cd server
npm run dev
```

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# node_modulesを削除して再インストール
rm -rf node_modules
npm install
```

### 拡張機能が読み込めない場合

- `dist` フォルダが存在するか確認
- `dist/manifest.json` が存在するか確認
- Chromeのコンソールでエラーメッセージを確認

### API Keyエラーが発生する場合

- サーバーの`.env`ファイルにAPIキーが正しく設定されているか確認
- [APIキー設定ガイド](./API_KEY_SETUP.md)の手順を確認
- サーバーのログでエラーメッセージを確認

### 認証エラーが発生する場合

- サーバーの`.env`ファイルにOAuth認証情報が正しく設定されているか確認
- [Google OAuth設定ガイド](./GOOGLE_OAUTH_SETUP.md)の手順を確認
- Chrome拡張機能のIDが正しく設定されているか確認

### コメントが取得できない場合

- YouTube Data API v3が有効になっているか確認
- API Keyのクォータが残っているか確認
- 動画のコメントが有効になっているか確認
