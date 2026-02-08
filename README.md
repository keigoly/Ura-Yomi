# YouTubeコメント with Gemini

<p align="center">
  <img src="src/icons/icon128.png" alt="YouTubeコメント with Gemini" width="128" height="128">
</p>

<p align="center">
  <strong>YouTube動画のコメントをGemini AIで解析し、真の価値と本音を可視化するChrome拡張機能</strong>
</p>

<p align="center">
  <a href="README_EN.md">English</a> ・ 日本語
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/Vite-6-purple.svg" alt="Vite">
  <img src="https://img.shields.io/badge/Manifest-V3-green.svg" alt="Manifest V3">
</p>

---

## 概要

「YouTubeコメント with Gemini」は、YouTube動画のコメント欄をGoogle Gemini AIで自動解析し、コメントの感情分析・要約・深掘りを行うChrome拡張機能です。通常動画だけでなく、ショート動画にも対応しています。

数千件のコメントを瞬時に分析し、視聴者の本音やトレンドを可視化します。APIキーの直接設定は不要で、Googleアカウントでサインインしてクレジットを消費する形で利用できます。

## 主な機能

### AI解析

- **全体要約** — コメント全体の傾向をAIが自然言語で要約
- **感情分析** — ポジティブ・ニュートラル・ネガティブの割合を円グラフで表示
- **主なトピック抽出** — コメント内で頻出する話題を自動抽出
- **深掘り分析（Deep Dive）** — Geminiがポジティブ・ニュートラル・ネガティブそれぞれの代表的コメントを選定し、理由とともに提示
- **Hidden Gems** — いいね数が少ないが価値のあるコメントを発掘

### コメントビューア

- **YouTube風スレッド表示** — 親コメントと返信をスレッド形式で閲覧
- **ソート機能** — 人気順・いいね数・投稿日時でソート
- **検索機能** — コメント本文・投稿者名でリアルタイム検索
- **相対時間表示** — 「3日前」「2ヶ月前」など自然な時間表示
- **プロフィール画像** — コメント投稿者のアイコンを表示

### 解析対象

- **通常動画** — YouTube動画ページ（`/watch?v=...`）
- **ショート動画** — YouTubeショート（`/shorts/...`）
- **URL貼り付け** — サイドパネルまたはポップアップにURLを貼り付けて解析開始
- **最大10,000件** — 大量のコメントをまとめて取得・解析

### ユーザーインターフェース

- **サイドパネル** — ブラウザ右側に結果を表示（メインの操作画面）
- **ポップアップ** — 拡張機能アイコンクリックで認証・解析開始
- **コンテンツスクリプト** — YouTube動画ページのコメントヘッダーにレインボーグラデーションの解析ボタンを自動挿入
- **設定画面** — サイドパネル内にアコーディオン式の設定UI

### カスタマイズ

- **多言語対応** — 日本語 / English 切り替え（UI全体 + Gemini解析結果も対応）
- **テーマ** — ライト / ダークブルー / ブラックの3種類の背景モード
- **フォントサイズ** — 13px〜18pxの5段階で調整可能
- **解析履歴** — 過去の解析結果を最大20件保存・閲覧・再表示
- **設定のインポート/エクスポート** — JSON形式でバックアップ・復元

### 認証・クレジットシステム

- **Googleアカウント認証** — Chrome Identity APIを利用した安全なOAuth認証
- **クレジットベースの利用** — 解析1回につき2クレジット消費
- **サーバー側でAPIキー管理** — ユーザーがAPIキーを直接設定する必要なし
- **クレジット購入・サブスクリプション** — 設定画面から購入可能

## 技術スタック

### フロントエンド（Chrome拡張機能）

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 18.3 | UIコンポーネント |
| TypeScript | 5.6 | 型安全な開発 |
| Tailwind CSS | 3.4 | スタイリング |
| Zustand | 5.0 | 状態管理 |
| Vite | 6.0 | ビルドツール |
| Lucide React | 0.460 | アイコンライブラリ |
| @formkit/auto-animate | - | アニメーション |
| Chrome Extension | Manifest V3 | 拡張機能基盤 |

### バックエンド（APIサーバー）

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Node.js | 18+ | ランタイム |
| Express.js | 4.18 | HTTPサーバー |
| @google/generative-ai | 0.21 | Gemini AI解析 |
| YouTube Data API | v3 | コメント取得 |
| google-auth-library | 9.4 | OAuth認証 |
| jsonwebtoken | 9.0 | セッション管理 |
| bcrypt | 5.1 | パスワードハッシュ |
| cors | 2.8 | CORS対応 |
| dotenv | 16.3 | 環境変数管理 |

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│  Chrome拡張機能（フロントエンド）                      │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐     │
│  │  Popup    │  │ SidePanel │  │ ContentScript│     │
│  │ (認証)    │  │ (結果表示) │  │ (解析ボタン) │     │
│  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘     │
│        │              │               │             │
│        └──────────┬───┘───────────────┘             │
│                   │                                 │
│  ┌────────────────┴─────────────────┐               │
│  │      Background Service Worker   │               │
│  │   (メッセージ中継・SidePanel起動)  │               │
│  └────────────────┬─────────────────┘               │
└───────────────────┼─────────────────────────────────┘
                    │ HTTP (localhost:3000)
┌───────────────────┼─────────────────────────────────┐
│  Express APIサーバー（バックエンド）                    │
│                   │                                 │
│  ┌────────────────┴─────────────────┐               │
│  │          API Endpoints           │               │
│  │  /api/auth/google  /api/analyze  │               │
│  │  /api/auth/verify  /api/video    │               │
│  │  /api/user/credits /api/billing  │               │
│  └──┬──────────┬──────────┬─────────┘               │
│     │          │          │                         │
│  ┌──┴───┐  ┌──┴────┐  ┌──┴──────┐                  │
│  │Google│  │YouTube│  │ Gemini  │                   │
│  │OAuth │  │API v3 │  │  API    │                   │
│  └──────┘  └───────┘  └─────────┘                   │
└─────────────────────────────────────────────────────┘
```

### 解析フロー

```
1. ユーザーが解析を開始
2. フロントエンド → POST /api/analyze (videoId, language)
3. サーバー: 認証確認 → クレジット確認 → コスト上限確認
4. サーバー: YouTube API でコメント取得（最大2,000件）
5. サーバー: コメントをフラット化（親+返信）
6. サーバー: Gemini API で AI解析
7. サーバー: クレジット差引 → 使用量記録
8. レスポンス: 解析結果 + コメント一覧 → フロントエンド
9. サイドパネルに結果を3タブで表示
```

## ディレクトリ構成

```
YouTube Comment Analyzer/
├── src/                          # フロントエンドソース
│   ├── components/               # Reactコンポーネント
│   │   ├── Popup.tsx             # ポップアップUI
│   │   ├── SidePanel.tsx         # サイドパネルUI（メイン画面）
│   │   ├── ResultDashboard.tsx   # 解析結果ダッシュボード
│   │   ├── LoadingView.tsx       # 解析中の進捗表示
│   │   ├── SettingsView.tsx      # 設定画面（アコーディオン式）
│   │   ├── Auth.tsx              # Google認証UI
│   │   └── tabs/                 # 結果タブコンポーネント
│   │       ├── SummaryTab.tsx    # 要約・感情分析・トピック
│   │       ├── DeepDiveTab.tsx   # Gemini深掘り分析
│   │       └── CommentsTab.tsx   # コメント一覧（スレッド表示）
│   ├── store/                    # Zustand状態管理ストア
│   │   ├── analysisStore.ts      # 解析状態（進捗・結果・エラー）
│   │   └── designStore.ts        # デザイン設定（テーマ・フォント）
│   ├── services/                 # フロントエンドサービス
│   │   ├── apiServer.ts          # バックエンドAPI通信クライアント
│   │   └── historyStorage.ts     # 解析履歴のlocalStorage管理
│   ├── i18n/                     # 多言語対応（国際化）
│   │   ├── translations.ts       # 翻訳辞書（ja/en 200+キー）
│   │   └── useTranslation.ts     # useTranslation() フック
│   ├── utils/                    # ユーティリティ関数
│   │   └── youtube.ts            # YouTube URL解析・動画ID抽出
│   ├── constants/                # 定数定義（APIエンドポイント等）
│   ├── content/                  # コンテンツスクリプト
│   │   └── content.ts            # YouTube上の解析ボタン注入
│   ├── icons/                    # アイコンリソース
│   │   ├── icon16.png            # ファビコン（16x16）
│   │   ├── icon48.png            # アプリアイコン（48x48）
│   │   ├── icon128.png           # 高解像度アイコン（128x128）
│   │   ├── gemini-icon.png       # Geminiブランドアイコン
│   │   └── developer-logo.png    # 開発者ロゴ
│   ├── background.js             # Service Worker
│   ├── manifest.json             # Chrome拡張マニフェスト（V3）
│   ├── popup.html                # ポップアップエントリーHTML
│   ├── sidepanel.html            # サイドパネルエントリーHTML
│   └── styles.css                # Tailwind + グローバルスタイル
├── server/                       # バックエンドAPIサーバー
│   ├── index.js                  # Expressメインサーバー
│   ├── services/                 # サーバーサービス層
│   │   ├── geminiService.js      # Gemini AI解析（自動モデル選択）
│   │   ├── youtubeService.js     # YouTube API連携（コメント取得）
│   │   └── costManager.js        # API利用コスト管理
│   ├── .env.example              # 環境変数テンプレート
│   └── package.json              # バックエンド依存関係
├── dist/                         # ビルド出力（Chrome拡張として読込）
├── vite.config.ts                # Viteビルド設定
├── tailwind.config.js            # Tailwind CSS設定
├── tsconfig.json                 # TypeScript設定（strict）
├── package.json                  # フロントエンド依存関係
├── README.md                     # このファイル（日本語）
├── README_EN.md                  # README（英語）
├── PRIVACY.md                    # プライバシーポリシー（日本語）
└── PRIVACY_EN.md                 # プライバシーポリシー（英語）
```

## セットアップ

### 前提条件

- **Node.js** 18以上
- **npm** 9以上
- **Google Cloud Console** アカウント（API Key取得用）
- **Chrome** ブラウザ

### 1. リポジトリのクローン

```bash
git clone https://github.com/keigoly/youtube-comment-gemini.git
cd youtube-comment-gemini
```

### 2. フロントエンドのセットアップ

```bash
npm install
```

### 3. バックエンドのセットアップ

```bash
cd server
npm install
```

### 4. 環境変数の設定

`server/.env.example` を `server/.env` にコピーし、必要な値を設定してください。

```bash
cp server/.env.example server/.env
```

```env
# === 必須 ===
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret

# === オプション ===
NODE_ENV=development                 # development | production
USE_ALTERNATIVE_FETCH=false           # 代替手段によるコメント取得を有効化
ALTERNATIVE_FETCH_FALLBACK=false     # YouTube API失敗時に代替手段へフォールバック
MONTHLY_COST_LIMIT=1000              # 月間API利用コスト上限（円）
DEVELOPER_COMMISSION_RATE=0.30       # 開発者コミッション率
```

### 5. APIキーの取得

#### Google OAuth Client ID

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新規プロジェクトを作成
3. 「APIとサービス」→「認証情報」→「OAuth 2.0 クライアント ID」を作成
4. アプリケーションの種類：「Chrome アプリ」を選択
5. クライアントIDを `GOOGLE_CLIENT_ID` に設定

#### YouTube Data API Key

1. Google Cloud Consoleで「YouTube Data API v3」を有効化
2. 「認証情報」→「APIキーを作成」
3. `YOUTUBE_API_KEY` に設定

#### Gemini API Key

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. 「Create API Key」でキーを取得
3. `GEMINI_API_KEY` に設定

### 6. ビルドと起動

```bash
# フロントエンドのビルド
npm run build

# バックエンドの起動（別ターミナル）
cd server
npm run dev
```

### 7. Chrome拡張機能のインストール

1. Chromeで `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトの `dist` フォルダを選択

## 使い方

### 基本的な解析フロー

1. **Googleアカウントでログイン** — ポップアップまたはサイドパネルから認証
2. **YouTube動画ページを開く** — 通常動画またはショート動画
3. **解析を開始** — 以下のいずれかの方法で開始
   - コメントヘッダーのレインボーボタンをクリック
   - サイドパネルの解析ボタンをクリック
   - URLを貼り付けて解析ボタンをクリック
4. **結果を閲覧** — サイドパネルに3つのタブで結果が表示されます

### 結果タブ

| タブ | 内容 |
|------|------|
| **要約** | 全体の要約文、感情分析の円グラフ、主なトピック一覧 |
| **深掘り** | Geminiが選定した代表的コメント（ポジティブ・ニュートラル・ネガティブ）と選定理由 |
| **コメント一覧** | 全コメントをスレッド形式で表示、検索・ソート機能付き |

### 解析結果の操作

- **保存** — メニューから「解析結果を保存」で履歴に保存（最大20件）
- **コピー** — 「要約をコピー」でクリップボードにコピー
- **エクスポート** — 「JSONでエクスポート」で全データをダウンロード
- **履歴** — 設定画面の「履歴」から過去の解析結果を再表示

## クレジットシステム

| 項目 | 値 |
|------|-----|
| 解析1回あたりのコスト | 2クレジット |
| 初期クレジット（開発環境） | 999クレジット |
| 初期クレジット（本番環境） | 100クレジット |
| クレジット上限 | 9,999クレジット |
| クレジット有効期限 | なし |

### 購入プラン

| プラン | クレジット数 | 価格 |
|--------|-------------|------|
| 100クレジット | 100 | ¥500 |
| 500クレジット | 500 | ¥2,000（20%割引） |
| 月額サブスク | 毎月1,000 | ¥3,000/月 |

## AI解析モデル

Gemini APIのモデルは以下の優先順位で自動選択されます：

| 優先度 | モデル | 特徴 |
|--------|--------|------|
| 1（推奨） | gemini-2.5-flash-lite | 最もコスト効率が高い |
| 2 | gemini-2.5-flash | レート制限時のフォールバック |
| 3 | gemini-2.0-flash | 最終フォールバック |

レート制限（429）やサービス障害（503）時は自動的に次のモデルに切り替わります。

## APIエンドポイント

| メソッド | エンドポイント | 説明 | 認証 |
|----------|---------------|------|------|
| POST | `/api/auth/google` | Google OAuth認証 | 不要 |
| GET | `/api/auth/verify` | セッション検証 | Bearer Token |
| GET | `/api/user/credits` | クレジット残高取得 | Bearer Token |
| GET | `/api/video/info` | 動画情報（タイトル・コメント数） | 不要 |
| POST | `/api/analyze` | コメント解析（メイン機能） | Bearer Token |
| POST | `/api/billing/purchase` | クレジット購入 | Bearer Token |
| GET | `/health` | ヘルスチェック | 不要 |

## 開発

### 開発モード

```bash
# フロントエンド（ファイル監視ビルド）
npm run build:watch

# バックエンド（ホットリロード）
cd server
npm run dev
```

### ビルドコマンド

```bash
# TypeScript型チェック + プロダクションビルド
npm run build

# プレビュー
npm run preview
```

### 多言語対応の追加方法

新しいUI文言を追加する場合は、以下の手順に従ってください：

1. `src/i18n/translations.ts` に `ja` と `en` 両方のキーを追加
2. コンポーネント内で `const { t } = useTranslation()` を呼び出し
3. ハードコードされた文字列を `t('key.name')` に置換
4. サーバー側のメッセージは `language` パラメータで言語を受け取り条件分岐

## トラブルシューティング

### サーバーに接続できない

→ バックエンドサーバーが起動しているか確認してください：
```bash
cd server && npm run dev
```
→ `.env` の `VITE_API_BASE_URL` が `http://localhost:3000` に設定されているか確認

### クレジット不足

→ 設定画面の「クレジット管理」からクレジットを購入してください。

### Gemini APIエラー

→ `GEMINI_API_KEY` が正しく設定されているか確認
→ [Google AI Studio](https://aistudio.google.com/) でキーが有効か確認
→ レート制限の場合は自動的にフォールバックモデルに切り替わります

### コメントが取得できない

→ `YOUTUBE_API_KEY` が有効で、YouTube Data API v3が有効化されているか確認
→ コメントが無効にされている動画では取得できません
→ ライブ配信のチャットはコメントとして取得されません

### 拡張機能が動作しない

→ `dist` フォルダが最新のビルドであることを確認
→ `chrome://extensions` で拡張機能を再読み込み
→ コンソール（F12）でエラーメッセージを確認

## ライセンス

MIT License

## 作者

**keigoly**

- Web: [keigoly.jp](https://keigoly.jp/)
- GitHub: [keigoly](https://github.com/keigoly)

## リンク

- [README（English）](README_EN.md)
- [プライバシーポリシー（日本語）](PRIVACY.md)
- [Privacy Policy（English）](PRIVACY_EN.md)
- [不具合の報告](https://docs.google.com/forms/d/e/1FAIpQLSeUlF5s7vgcG0RrISNrAwLKhMQTvJpndH8e31Z_WHF081McEA/viewform)
- [ソースコード](https://github.com/keigoly/youtube-comment-gemini)
