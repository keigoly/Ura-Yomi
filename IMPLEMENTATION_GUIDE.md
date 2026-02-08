# 実装ガイド: Google認証とクレジットシステム

## 概要

この実装により、ユーザーはAPIキーを直接取得する必要がなくなり、Googleアカウントでサインインしてクレジットを消費する形でサービスを利用できるようになります。

## アーキテクチャ

### 1. バックエンドサーバー (`server/`)

- **認証**: Google OAuth認証
- **APIキー管理**: サーバー側でYouTube APIとGemini APIのキーを管理
- **クレジット管理**: ユーザーのクレジット残高を管理
- **課金処理**: クレジット購入とサブスクリプション
- **使用量追跡**: 収益分配のための使用量記録

### 2. フロントエンド（拡張機能）

- **認証UI**: Googleアカウントでのサインイン
- **クレジット表示**: 残高の表示
- **課金UI**: クレジット購入画面
- **サーバーAPI連携**: バックエンドAPIとの通信

## セットアップ手順

### 1. バックエンドサーバーのセットアップ

```bash
cd server
npm install
cp .env.example .env
```

`.env`ファイルを編集：
```env
PORT=3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
```

サーバーを起動：
```bash
npm run dev
```

### 2. 拡張機能の設定

`.env`ファイルを作成（プロジェクトルート）：
```env
VITE_API_BASE_URL=http://localhost:3000
```

または、本番環境のURL：
```env
VITE_API_BASE_URL=https://your-api-server.com
```

### 3. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. OAuth同意画面を設定
3. OAuth 2.0クライアントIDを作成
4. 認証済みのリダイレクトURIに `chrome-extension://YOUR_EXTENSION_ID` を追加
5. Client IDとClient Secretを`.env`に設定

## 機能説明

### 認証フロー

1. ユーザーが拡張機能を開く
2. 「Googleアカウントでサインイン」をクリック
3. Chrome Identity APIでGoogle認証
4. サーバーにIDトークンを送信
5. サーバーがセッショントークンを発行
6. セッショントークンをローカルストレージに保存

### 解析フロー

1. ユーザーが「解析を開始する」をクリック
2. クレジット残高をチェック（10クレジット必要）
3. サーバーに解析リクエストを送信
4. サーバーがYouTube APIとGemini APIを呼び出し
5. クレジットを消費（10クレジット）
6. 解析結果を返す

### 課金フロー

1. ユーザーが設定画面で「クレジットを購入」をクリック
2. プランを選択（100クレジット、500クレジット、月額サブスク）
3. 決済処理（Stripe、PayPal等を統合）
4. クレジットが追加される

## 収益分配

サーバー側で使用量を記録し、以下の情報を管理：

- ユーザーID
- 動画ID
- 消費クレジット数
- タイムスタンプ
- コメント数

収益分配の計算：
- 総収益 = クレジット購入額の合計
- 使用コスト = API呼び出しコスト（YouTube API + Gemini API）
- 純利益 = 総収益 - 使用コスト
- 分配額 = 純利益 × 分配率（例: 20%）

## 次のステップ

### 本番環境への移行

1. **データベース**: PostgreSQLやMongoDBに移行
2. **認証**: 実際のGoogle OAuth検証を実装
3. **決済**: StripeやPayPalを統合
4. **セキュリティ**: HTTPS、CORS設定、レート制限
5. **監視**: ログ、エラートラッキング、パフォーマンス監視

### 改善点

- [ ] 実際のGoogle OAuth検証
- [ ] データベース統合
- [ ] 決済システム統合（Stripe/PayPal）
- [ ] メール通知
- [ ] ダッシュボード（管理者用）
- [ ] 収益分配の自動計算と支払い

## 注意事項

- 現在の実装は開発用の簡易版です
- 本番環境では必ず適切なセキュリティ対策を実装してください
- APIキーは絶対にクライアント側に露出しないでください
- 決済処理は必ずサーバー側で行ってください

