# ウラヨミ！ Powered by Google Gemini

<p align="center">
  <img src="src/icons/icon128.png" alt="ウラヨミ！" width="128" height="128">
</p>

<p align="center">
  <strong>YouTube動画のコメントをGemini AIで解析し、真の価値と本音を可視化するChrome拡張機能</strong>
</p>

<p align="center">
  <a href="README_EN.md">English</a> ・ 日本語
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn"><img src="https://img.shields.io/badge/Chrome_Web_Store-v1.0.2-brightgreen.svg?logo=googlechrome&logoColor=white" alt="Chrome Web Store"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/Vite-6-purple.svg" alt="Vite">
  <img src="https://img.shields.io/badge/Manifest-V3-green.svg" alt="Manifest V3">
</p>

---

## 概要

「ウラヨミ！」は、YouTube動画のコメント欄をGoogle Gemini AIで自動解析し、コメントの感情分析・要約・深掘りを行うChrome拡張機能です。通常動画だけでなく、ショート動画にも対応しています。

数千件のコメントを瞬時に分析し、視聴者の本音やトレンドを可視化します。APIキーの直接設定は不要で、Googleアカウントでサインインしてクレジットを消費する形で利用できます。

## 主な機能

### AI解析

- **全体要約** — コメント全体の傾向をAIが自然言語で要約
- **感情分析** — ポジティブ・ニュートラル・ネガティブの割合を円グラフで表示
- **主なトピック抽出** — コメント内で頻出する話題を自動抽出
- **深掘り分析（Deep Dive）** — Geminiがポジティブ・ニュートラル・ネガティブそれぞれの代表的コメントを選定し、理由とともに提示
- **Hidden Gems** — いいね数が少ないが価値のあるコメントを発掘
- **キャラクターモード** — ユウちゃん（実力派名探偵）の口調で要約を書き換え、ジェミニーちゃん（AI妖精）が深掘り解説（ネガティブ分析時は毒舌モード）

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
- **コンテンツスクリプト** — YouTube動画ページのコメントヘッダーにユウちゃんアイコン付きの解析ボタンを自動挿入（3種類の表情＋セリフがランダム切り替え）
- **新しいウィンドウで開く** — 解析結果画面から独立ウィンドウへ状態を引き継いで表示
- **設定画面** — サイドパネル内にアコーディオン式の設定UI

### カスタマイズ

- **多言語対応** — 日本語 / English 切り替え（UI全体 + Gemini解析結果も対応）
- **テーマ** — ライト / ダークブルー / ブラックの3種類の背景モード
- **フォントサイズ** — 13px〜18pxの5段階で調整可能
- **解析履歴** — 過去の解析結果を最大30件保存・閲覧・再表示
- **設定のインポート/エクスポート** — JSON形式でバックアップ・復元
- **SNSシェア** — X / LINE / Facebook / Reddit + Chrome Web StoreリンクのURLコピーでの拡散機能（サイドパネル・ポップアップ両方に配置）

### 認証・クレジットシステム

- **Googleアカウント認証** — Chrome Identity APIを利用した安全なOAuth認証
- **クレジットベースの利用** — 解析1回につき2クレジット消費
- **サーバー側でAPIキー管理** — ユーザーがAPIキーを直接設定する必要なし
- **クレジット購入・サブスクリプション** — 設定画面から購入可能
- **クレジットバッチシステム** — サブスクリプションクレジットは90日有効期限（FIFO消費）、都度購入・初回無料は期限なし
- **期限切れ警告** — クレジット有効期限が30日/7日以内の場合に設定画面で警告表示

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
                    │ HTTPS (api.keigoly.jp)
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
Ura-Yomi/
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
│   │   ├── designStore.ts        # デザイン設定（テーマ・フォント）
│   │   └── characterStore.ts     # キャラクターモード（変換キャッシュ含む）
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
│   │   ├── icon16/48/128.png     # 拡張機能アイコン
│   │   ├── logo-urayomi.png      # ウラヨミ！ロゴ
│   │   ├── mascot.png            # マスコット2人組
│   │   ├── mascot-girl.png       # ユウちゃんアイコン
│   │   ├── mascot-gemini.png     # ジェミニーちゃんアイコン
│   │   ├── yuchan-btn-1〜3.png   # 解析ボタン用ユウちゃん表情バリエーション
│   │   ├── tsubechan-*.png       # キャラクターモード用吹き出し画像
│   │   ├── bubble-*.png          # 深掘りタブ用吹き出し画像
│   │   └── gemini-icon.png       # Geminiブランドアイコン
│   ├── background.js             # Service Worker
│   ├── manifest.json             # Chrome拡張マニフェスト（V3）
│   ├── popup.html                # ポップアップエントリーHTML
│   ├── sidepanel.html            # サイドパネルエントリーHTML
│   └── styles.css                # Tailwind + グローバルスタイル
├── server/                       # バックエンドAPIサーバー
│   ├── index.js                  # Expressメインサーバー
│   ├── services/                 # サーバーサービス層
│   │   ├── geminiService.js      # Gemini AI解析（自動モデル選択・キャラ変換）
│   │   ├── youtubeService.js     # YouTube API連携（コメント取得）
│   │   ├── extFetcherService.js  # 外部コメント取得（代替手段）
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
git clone https://github.com/keigoly/Ura-Yomi.git
cd Ura-Yomi
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

- **保存** — メニューから「解析結果を保存」で履歴に保存（最大30件）
- **コピー** — 「要約をコピー」でクリップボードにコピー
- **エクスポート** — 「JSONでエクスポート」で全データをダウンロード
- **履歴** — 設定画面の「履歴」から過去の解析結果を再表示

## クレジットシステム

| 項目 | 値 |
|------|-----|
| 解析1回あたりのコスト | 3クレジット |
| 初期クレジット（開発環境） | 999クレジット |
| 初期クレジット（本番環境） | 15クレジット |
| クレジット上限 | 3,000クレジット |
| 都度購入クレジット有効期限 | なし |
| サブスクリプションクレジット有効期限 | 90日（FIFO消費） |

### 購入プラン

| プラン | クレジット数 | 価格 |
|--------|-------------|------|
| お試しパック | 30 | ¥300 |
| スタンダード | 60 | ¥500 |
| プレミアム | 150 | ¥1,000 |
| 月額ライト | 90/月 | ¥800/月 |
| 月額スタンダード | 300/月 | ¥1,980/月 |

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
| POST | `/api/billing/purchase` | クレジット購入（レガシー） | Bearer Token |
| POST | `/api/billing/create-checkout-session` | Stripe決済セッション作成 | Bearer Token |
| POST | `/api/billing/webhook` | Stripe Webhook受信 | Stripe署名 |
| POST | `/api/character/rewrite` | キャラクターモード書き換え | Bearer Token |
| GET | `/health` | ヘルスチェック | 不要 |

## 本番デプロイ

### インフラ構成

```
ユーザー (Chrome拡張)
    │
    │ HTTPS
    ▼
┌─────────────────────────────┐
│  Cloudflare DNS             │
│  api.keigoly.jp → A Record  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  AWS Lightsail (ap-northeast-1)         │
│  Ubuntu / 512MB RAM / 2 vCPU            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Nginx (リバースプロキシ)          │  │
│  │  Let's Encrypt SSL証明書          │  │
│  │  :443 → localhost:3000            │  │
│  └──────────────┬────────────────────┘  │
│                 │                       │
│  ┌──────────────┴────────────────────┐  │
│  │  Node.js / Express (PM2管理)      │  │
│  │  PORT=3000                        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### サーバー構成

| コンポーネント | 詳細 |
|--------------|------|
| クラウド | AWS Lightsail (東京リージョン) |
| OS | Ubuntu |
| Webサーバー | Nginx (リバースプロキシ + SSL終端) |
| SSL証明書 | Let's Encrypt (自動更新) |
| プロセス管理 | PM2 |
| ドメイン | api.keigoly.jp |
| DNS | Cloudflare (DNS only) |

### デプロイ手順

#### 1. サーバー初期設定

```bash
# Nginx & Certbot インストール
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx -y

# Nginx設定
sudo nano /etc/nginx/sites-available/urayomi
```

```nginx
server {
    listen 80;
    server_name api.keigoly.jp;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 有効化 & SSL証明書取得
sudo ln -s /etc/nginx/sites-available/urayomi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d api.keigoly.jp
```

#### 2. アプリケーション起動

```bash
cd ~/Ura-Yomi-server
npm install
pm2 start index.js --name urayomi-server
pm2 save
pm2 startup
```

#### 3. 環境変数（本番）

`server/.env` に以下を設定：

```env
PORT=3000
NODE_ENV=production
GOOGLE_CLIENT_ID=your_google_client_id
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
DEVELOPER_COMMISSION_RATE=0.30
ADMIN_SECRET=your_admin_secret
JWT_SECRET=your_jwt_secret

# Stripe決済
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_30=price_xxxxx
STRIPE_PRICE_60=price_xxxxx
STRIPE_PRICE_150=price_xxxxx
STRIPE_PRICE_LITE=price_xxxxx
STRIPE_PRICE_STANDARD=price_xxxxx
```

### Stripe決済連携

本番環境ではStripeを使用したクレジット購入・サブスクリプションに対応しています。

#### 決済フロー

```
1. ユーザーが設定画面から購入プランを選択
2. フロントエンド → POST /api/billing/create-checkout-session
3. サーバー: Stripe Checkout Sessionを作成
4. ユーザー: Stripeホスト決済ページへリダイレクト
5. 決済完了 → Stripe Webhook → POST /api/billing/webhook
6. サーバー: 署名検証 → クレジット付与 → 売上記録
7. フロントエンド: ポーリングでクレジット更新を検知
```

#### Stripe Webhook設定

1. [Stripeダッシュボード](https://dashboard.stripe.com/) → 開発者 → Webhook
2. エンドポイントURL: `https://api.keigoly.jp/api/billing/webhook`
3. リッスンするイベント: `checkout.session.completed`
4. 署名シークレットをサーバーの `STRIPE_WEBHOOK_SECRET` に設定

#### ファイアウォール設定（AWS Lightsail）

| アプリケーション | プロトコル | ポート |
|---------------|----------|-------|
| SSH | TCP | 22 |
| HTTP | TCP | 80 |
| HTTPS | TCP | 443 |
| カスタム | TCP | 3000 |

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

## 更新履歴

### v1.0.2（2026-02-19）

- 「新しいウィンドウで開く」機能の安定性を大幅に改善
- 新しいウィンドウを開いた際にサイドパネルを自動的に閉じるように改善
- キャラクターモードのUI改善（トグル固定・スクロールバー位置修正）
- 日本語要約に稀に混入する英語テキストを自動除去
- コメント数の表示を正確に修正（返信込みの合計数）
- その他、キャラクター名の表記修正・保存機能の安定性向上など

### v1.0.1（2026-02-18）

- fix: 再解析時にキャッシュをバイパスするnoCacheパラメータ追加
- fix: 初回クレジット表示を修正（20→15）
- fix: 「夕ちゃん」→「ユウちゃん」カタカナ表記修正
- feat: フッターにSNSシェアボタン追加（X / LINE / Facebook / Reddit）
- feat: Chrome Web StoreリンクをURL共有に追加
- chore: ストア説明文追加、バージョン1.0.1更新

### v1.0.0（2026-02-13）

- 初回リリース
- AI解析（要約・感情分析・トピック抽出・深掘り・Hidden Gems）
- キャラクターモード（ユウちゃん＆ジェミニーちゃん）
- コメントビューア（スレッド表示・検索・ソート）
- 多言語対応（日本語 / English）
- テーマ切り替え（ライト / ダークブルー / ブラック）
- クレジットシステム＆Stripe決済連携

## ライセンス

MIT License

## 作者

**keigoly**

- Web: [keigoly.jp](https://keigoly.jp/)
- GitHub: [keigoly](https://github.com/keigoly)

## リンク

- [Chrome Web Store](https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn)
- [README（English）](README_EN.md)
- [プライバシーポリシー（日本語）](PRIVACY.md)
- [Privacy Policy（English）](PRIVACY_EN.md)
- [不具合の報告](https://docs.google.com/forms/d/e/1FAIpQLSeUlF5s7vgcG0RrISNrAwLKhMQTvJpndH8e31Z_WHF081McEA/viewform)
- [ソースコード](https://github.com/keigoly/Ura-Yomi)
