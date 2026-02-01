# TubeInsight AI - YouTube Comment Analyzer

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

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ビルド

```bash
npm run build
```

### 3. Chrome拡張機能として読み込む

1. Chromeで `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist` フォルダを選択

### 4. API Keyの設定

1. 拡張機能のアイコンをクリック
2. 設定アイコンをクリック
3. YouTube Data API Key と Google Gemini API Key を入力
4. 各API Keyの「テスト」ボタンで接続確認
5. 「設定を保存」をクリック

## API Keyの取得方法

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

### 設定画面での入力

1. 拡張機能のアイコンをクリック
2. 右上の設定アイコン（⚙️）をクリック
3. 各APIキーを入力
4. 「テスト」ボタンで接続確認
5. 「設定を保存」をクリック

## 使用方法

1. YouTube動画ページを開く
2. 拡張機能のアイコンをクリック
3. 「解析を開始する」ボタンをクリック
4. Side Panelで結果を確認

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
