# APIキー設定ガイド

このドキュメントでは、YouTubeコメントwithAIのバックエンドサーバーで使用するAPIキーの取得方法と設定方法を説明します。

## 概要

YouTubeコメントwithAIでは、**APIキーはサーバー側で管理**されます。ユーザーはAPIキーを直接設定する必要はなく、Googleアカウントでサインインしてクレジットを消費する形でサービスを利用します。

開発者（サーバー管理者）は、以下の2つのAPIキーを取得してサーバーの`.env`ファイルに設定する必要があります：

1. **YouTube Data API v3 キー** - YouTube動画のコメントを取得するために使用
2. **Google Gemini API キー** - AI解析（コメント分析、要約生成）に使用

---

## 1. YouTube Data API v3 キーの取得方法

### ステップ1: Google Cloud Consoleにアクセス

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. Googleアカウントでログイン

### ステップ2: プロジェクトを作成または選択

1. 画面上部のプロジェクト選択ドロップダウンをクリック
2. **「新しいプロジェクト」**をクリック
3. プロジェクト名を入力（例: `tubeinsight-ai`）
4. **「作成」**をクリック
5. プロジェクトが作成されたら、プロジェクトを選択

### ステップ3: YouTube Data API v3を有効化

1. 左側のメニューから **「APIとサービス」** → **「ライブラリ」** を選択
2. 検索バーに **「YouTube Data API v3」** と入力
3. **「YouTube Data API v3」** をクリック
4. **「有効にする」** ボタンをクリック
5. 有効化が完了するまで数秒待機

### ステップ4: APIキーを作成

1. 左側のメニューから **「APIとサービス」** → **「認証情報」** を選択
2. 画面上部の **「認証情報を作成」** をクリック
3. **「APIキー」** を選択
4. APIキーが生成されます
5. **「制限を設定」** をクリック（推奨）

### ステップ5: APIキーの制限を設定（推奨）

セキュリティのため、APIキーに制限を設定することを強く推奨します。

#### アプリケーションの制限

1. **「APIキーの制限」** セクションで **「HTTPリファラー（ウェブサイト）」** を選択
2. **「ウェブサイトの制限」** に以下を追加：
   - `http://localhost:3000/*`（開発環境）
   - `https://your-domain.com/*`（本番環境のドメイン）

または、**「IPアドレス（ウェブサーバー、cronジョブなど）」** を選択して、サーバーのIPアドレスを指定することもできます。

#### APIの制限

1. **「APIの制限」** セクションで **「特定のAPIに制限」** を選択
2. **「APIを選択」** から **「YouTube Data API v3」** のみを選択
3. **「保存」** をクリック

### ステップ6: APIキーをコピー

1. 作成されたAPIキーをクリックして詳細を表示
2. **「キー」** の値をコピー
3. ⚠️ **重要**: APIキーは秘密情報です。他人に共有しないでください

---

## 2. Google Gemini API キーの取得方法

### ステップ1: Google AI Studioにアクセス

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン

### ステップ2: APIキーを作成

1. **「Create API Key」** ボタンをクリック
2. プロジェクトを選択または新規作成
   - 既存のプロジェクトがある場合は選択
   - 新規作成する場合は、プロジェクト名を入力して「作成」をクリック
3. APIキーが生成されます

### ステップ3: APIキーをコピー

1. 生成されたAPIキーをコピー
2. ⚠️ **重要**: APIキーは秘密情報です。他人に共有しないでください

### ステップ4: Generative Language APIを有効化（重要）

Google Cloud ConsoleでAPIキーの制限を設定するには、まずGenerative Language APIを有効化する必要があります。

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. **同じプロジェクト**を選択（Gemini APIキーを作成したプロジェクト）
3. 左側のメニューから **「APIとサービス」** → **「ライブラリ」** を選択
4. 検索バーに **「Generative Language API」** と入力
5. **「Generative Language API」** をクリック
6. **「有効にする」** ボタンをクリック
7. 有効化が完了するまで数秒待機

⚠️ **重要**: この手順をスキップすると、APIキーの制限設定で「Generative Language API」が表示されません。

### ステップ5: APIキーの制限を設定（推奨）

1. **「APIとサービス」** → **「認証情報」** を選択
2. 作成したGemini APIキーをクリック
3. **「APIキーの制限」** セクションで制限を設定
   - **「APIの制限」** セクションで **「キーを制限」** を選択
   - **「APIを選択」** から **「Generative Language API」** を検索して選択
   - もし「Generative Language API」が表示されない場合は、上記のステップ4でAPIが有効化されているか確認してください
4. **「保存」** をクリック

---

## 3. サーバーへの設定方法

### ステップ1: `.env`ファイルを作成

サーバーディレクトリ（`server/`）に移動し、`.env.example`をコピーして`.env`ファイルを作成：

```bash
cd server
cp .env.example .env
```

### ステップ2: `.env`ファイルを編集

`.env`ファイルを開き、取得したAPIキーを設定：

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Google OAuth（後で設定）
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# API Keys（ここに取得したAPIキーを設定）
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# JWT Secret（ランダムな文字列を生成）
JWT_SECRET=your_random_secret_string_here

# Database（本番環境で使用）
DATABASE_URL=postgresql://user:password@localhost:5432/tubeinsight
```

### ステップ3: JWT Secretを生成（オプション）

セキュリティのため、JWT Secretにはランダムな文字列を使用することを推奨します：

```bash
# Node.jsを使用してランダムな文字列を生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

生成された文字列を`JWT_SECRET`に設定してください。

### ステップ4: サーバーを起動

```bash
npm run dev
```

サーバーが正常に起動すれば、設定は完了です。

---

## 4. APIキーのテスト方法

### YouTube Data API v3 のテスト

ブラウザで以下のURLにアクセスして、APIキーが正しく動作するか確認できます：

```
https://www.googleapis.com/youtube/v3/videos?part=snippet&id=VIDEO_ID&key=YOUR_API_KEY
```

`VIDEO_ID`は任意のYouTube動画ID（例: `dQw4w9WgXcQ`）に置き換え、`YOUR_API_KEY`は取得したAPIキーに置き換えてください。

正常に動作していれば、JSON形式で動画情報が返されます。

### Google Gemini API のテスト

サーバーが起動している状態で、以下のコマンドでテストできます：

```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

`YOUR_API_KEY`は取得したGemini APIキーに置き換えてください。

---

## 5. トラブルシューティング

### APIキーが無効と表示される

- APIキーが正しくコピーされているか確認
- APIキーの制限設定を確認（IPアドレスやリファラーの制限が厳しすぎないか）
- 該当するAPIが有効化されているか確認

### クォータ制限エラーが発生する

- Google Cloud Consoleで **「APIとサービス」** → **「ダッシュボード」** を確認
- 使用量とクォータを確認
- 必要に応じてクォータの増加をリクエスト

### サーバーが起動しない

- `.env`ファイルが正しい場所（`server/`ディレクトリ）にあるか確認
- 環境変数が正しく設定されているか確認
- サーバーのログを確認

---

## 6. セキュリティのベストプラクティス

1. **APIキーは絶対に公開しない**
   - GitHubなどの公開リポジトリにコミットしない
   - `.env`ファイルは`.gitignore`に追加されていることを確認

2. **APIキーに制限を設定する**
   - IPアドレスやリファラーの制限を設定
   - 必要なAPIのみに制限

3. **定期的にAPIキーをローテーションする**
   - 定期的に新しいAPIキーを生成し、古いキーを無効化

4. **使用量を監視する**
   - Google Cloud Consoleで使用量を定期的に確認
   - 異常な使用量がないかチェック

---

## 7. 次のステップ

APIキーの設定が完了したら、次はGoogle OAuth認証の設定を行います：

1. [Google OAuth設定ガイド](./GOOGLE_OAUTH_SETUP.md) を参照
2. OAuthクライアントIDとシークレットを取得
3. `.env`ファイルに設定

これで、ユーザーはGoogleアカウントでサインインしてサービスを利用できるようになります。
