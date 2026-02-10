# 外部コメント取得ツール統合ガイド

## 概要

外部コメント取得ツールを使用することで、YouTube Data APIよりも多くのコメントを取得できる可能性があります。この機能を有効化することで、コメント取得の精度と量を向上させることができます。

## セットアップ

### 1. 外部ツールのインストール

外部コメント取得ツールを事前にインストールし、コマンドラインから実行可能な状態にしてください。

### 2. 環境変数の設定

`server/.env`ファイルに以下の設定を追加：

```env
# 外部ツールを使用する場合
USE_EXT_FETCHER=true

# YouTube APIが失敗した時のみ外部ツールを使用する場合
EXT_FETCHER_FALLBACK=true

# 外部ツールのパス（必要に応じてフルパスを指定）
EXT_FETCHER_PATH=/path/to/tool
```

### 3. 動作モード

#### モード1: ハイブリッド方式（推奨）
```env
USE_EXT_FETCHER=true
EXT_FETCHER_FALLBACK=false
```

- YouTube Data APIと外部ツールの両方を使用
- 重複を自動的に除外
- より多くのコメントを取得可能

#### モード2: フォールバック方式
```env
USE_EXT_FETCHER=false
EXT_FETCHER_FALLBACK=true
```

- 通常はYouTube Data APIを使用
- YouTube APIが失敗した場合のみ外部ツールを使用

#### モード3: YouTube APIのみ（デフォルト）
```env
USE_EXT_FETCHER=false
EXT_FETCHER_FALLBACK=false
```

- 従来通りYouTube Data APIのみを使用

## 使用方法

1. サーバーを再起動：
   ```bash
   cd server
   npm run dev
   ```

2. 拡張機能から解析を実行
   - 外部ツールが有効な場合、自動的にハイブリッド方式でコメントを取得します

## 注意事項

1. **ツールのパス**: Windowsの場合、パスにスペースが含まれる場合は引用符で囲む必要があります
2. **パフォーマンス**: 外部ツールはYouTube APIよりも時間がかかる場合があります
3. **レート制限**: 外部ツールはYouTubeのレート制限の影響を受ける可能性があります
4. **一時ファイル**: 外部ツールは一時的にJSONファイルを作成しますが、処理後に自動的に削除されます

## トラブルシューティング

### ツールが見つからない
- `EXT_FETCHER_PATH`にフルパスを指定してください
- Windowsの場合、`.exe`拡張子を含めてください

### コメントが取得できない
- 外部ツールが最新版か確認してください
- サーバーのログを確認してエラーメッセージを確認してください

### パフォーマンスの問題
- `USE_EXT_FETCHER=false`に設定してYouTube APIのみを使用してください
- または`EXT_FETCHER_FALLBACK=true`でフォールバック方式に切り替えてください
