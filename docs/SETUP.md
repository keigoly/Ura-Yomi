# セットアップガイド

## 1. 依存関係のインストール

```bash
npm install
```

## 2. アイコンファイルの準備

`src/icons/` フォルダに以下のアイコンファイルを配置してください：
- `icon16.png` (16x16ピクセル)
- `icon48.png` (48x48ピクセル)
- `icon128.png` (128x128ピクセル)

アイコンファイルがない場合、拡張機能は動作しますが、アイコンが表示されません。

## 3. ビルド

```bash
npm run build
```

## 4. Chrome拡張機能として読み込む

1. Chromeブラウザで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist` フォルダを選択

## 5. API Keyの設定

### YouTube Data API Key

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「ライブラリ」に移動
4. "YouTube Data API v3" を検索して有効化
5. 「認証情報」→「認証情報を作成」→「APIキー」を選択
6. 作成されたAPIキーをコピー

### Google Gemini API Key

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 「Create API Key」をクリック
3. APIキーをコピー

### 拡張機能での設定

1. 拡張機能のアイコンをクリック
2. 設定アイコン（歯車）をクリック
3. 各API Keyを入力
4. 「テスト」ボタンで接続確認
5. 「設定を保存」をクリック

## 6. 使用方法

1. YouTube動画ページを開く
2. 拡張機能のアイコンをクリック
3. 「解析を開始する」ボタンをクリック
4. Side Panelで結果を確認

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

- API Keyが正しく入力されているか確認
- API Keyに必要な権限が有効になっているか確認
- 「テスト」ボタンで接続を確認

### コメントが取得できない場合

- YouTube Data API v3が有効になっているか確認
- API Keyのクォータが残っているか確認
- 動画のコメントが有効になっているか確認
