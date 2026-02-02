# YouTubeコメントwithAI

YouTube動画のコメントをAI（Gemini 3.0 Flash）で解析し、真の価値と本音を可視化するChrome拡張機能。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)

## 🆕 新機能: Google認証とクレジットシステム

APIキーを直接取得する必要がなくなりました！Googleアカウントでサインインして、クレジットを消費する形でサービスを利用できます。

- ✅ Googleアカウントで簡単サインイン
- ✅ クレジットベースの利用（解析1回10クレジット）
- ✅ クレジット購入とサブスクリプション対応
- ✅ サーバー側でAPIキーを管理（セキュア）

## 機能

- **Deep Fetch**: 最大10,000件のコメントを取得
- **AI解析**: Gemini 3.0 Flashによる高度な分析
- **Hidden Gems**: いいね数が少ないが価値のあるコメントを発掘
- **感情分析**: ポジティブ/ネガティブ/ニュートラルの比率を可視化
- **Side Panel**: 動画視聴中に結果を閲覧可能

## セットアップ

### 開発者向け: サーバー側のセットアップ

YouTubeコメントwithAIは、バックエンドサーバーとChrome拡張機能で構成されています。

#### 1. バックエンドサーバーのセットアップ

```bash
cd server
npm install
cp .env.example .env
```

`.env`ファイルを編集して、APIキーとOAuth認証情報を設定：

```env
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
```

詳細な設定方法は以下のドキュメントを参照：
- [APIキー設定ガイド](./docs/API_KEY_SETUP.md)
- [Google OAuth設定ガイド](./docs/GOOGLE_OAUTH_SETUP.md)

サーバーを起動：

```bash
npm run dev
```

#### 2. 拡張機能のセットアップ

プロジェクトルートで：

```bash
npm install
```

`.env`ファイルを作成（または既存のファイルを編集）：

```env
VITE_API_BASE_URL=http://localhost:3000
```

ビルド：

```bash
npm run build
```

#### 3. Chrome拡張機能として読み込む

1. Chromeで `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist` フォルダを選択

### ユーザー向け: 使用方法

1. YouTube動画ページを開く
2. 拡張機能のアイコンをクリック
3. **「Googleアカウントでサインイン」** をクリック
4. Googleアカウントを選択してサインイン
5. 「解析を開始する」ボタンをクリック
6. Side Panelで結果を確認

## API Keyの取得方法（開発者向け）

### YouTube Data API Key

1. **[Google Cloud Console](https://console.cloud.google.com/)** にアクセス
2. **プロジェクトを作成または選択**
   - 初めての場合は「プロジェクトを作成」をクリック
   - 既存のプロジェクトがある場合は選択
3. **YouTube Data API v3を有効化**
   - 「APIとサービス」→「ライブラリ」に移動
   - 「YouTube Data API v3」を検索
   - 「有効にする」をクリック
4. **APIキーを作成**
   - 「認証情報」→「認証情報を作成」→「APIキー」を選択
   - 作成されたAPIキーをコピー
   - ⚠️ **重要**: APIキーは秘密情報です。他人に共有しないでください

### Google Gemini API Key

1. **[Google AI Studio](https://aistudio.google.com/app/apikey)** にアクセス
2. Googleアカウントでログイン
3. **「Create API Key」をクリック**
   - プロジェクトを選択または新規作成
   - APIキーが生成されます
4. **APIキーをコピー**
   - ⚠️ **重要**: APIキーは秘密情報です。他人に共有しないでください

### サーバーへの設定

取得したAPIキーは、サーバーの`.env`ファイルに設定します。詳細は[APIキー設定ガイド](./docs/API_KEY_SETUP.md)を参照してください。

**注意**: APIキーはサーバー側で管理されます。ユーザーはAPIキーを直接設定する必要はありません。

## 詳細ドキュメント

- [APIキー設定ガイド](./docs/API_KEY_SETUP.md) - YouTube APIとGemini APIキーの取得方法
- [Google OAuth設定ガイド](./docs/GOOGLE_OAUTH_SETUP.md) - Google認証の設定方法
- [実装ガイド](./docs/IMPLEMENTATION_GUIDE.md) - アーキテクチャと実装の詳細
- [セットアップガイド](./docs/SETUP.md) - 開発環境のセットアップ

## 開発

```bash
# 開発モード
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

## 技術スタック

- React 18+ (TypeScript)
- Vite
- Tailwind CSS
- Zustand (State Management)
- Google Generative AI SDK
- Chrome Extension Manifest V3

## ライセンス

MIT
