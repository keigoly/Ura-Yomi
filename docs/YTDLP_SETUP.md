# yt-dlp統合ガイド

## 概要

`yt-dlp`を使用することで、YouTube Data APIよりも多くのコメントを取得できる可能性があります。この機能を有効化することで、コメント取得の精度と量を向上させることができます。

## セットアップ

### 1. yt-dlpのインストール

#### Windowsの場合
1. [yt-dlpのリリースページ](https://github.com/yt-dlp/yt-dlp/releases)から最新版をダウンロード
2. `yt-dlp.exe`を任意のフォルダに配置（例: `C:\Users\skeig\OneDrive\デスクトップ\yt-dlp_win\yt-dlp.exe`）
3. 環境変数`PATH`に追加するか、`server/.env`で`YTDLP_PATH`にフルパスを指定

#### macOS/Linuxの場合
```bash
# Homebrew (macOS)
brew install yt-dlp

# pip
pip install yt-dlp

# または直接ダウンロード
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### 2. 環境変数の設定

`server/.env`ファイルに以下の設定を追加：

```env
# yt-dlpを使用する場合
USE_YTDLP=true

# YouTube APIが失敗した時のみyt-dlpを使用する場合
YTDLP_FALLBACK=true

# yt-dlpのパス（必要に応じて）
YTDLP_PATH=C:\Users\skeig\OneDrive\デスクトップ\yt-dlp_win\yt-dlp.exe
```

### 3. 動作モード

#### モード1: ハイブリッド方式（推奨）
```env
USE_YTDLP=true
YTDLP_FALLBACK=false
```

- YouTube Data APIとyt-dlpの両方を使用
- 重複を自動的に除外
- より多くのコメントを取得可能

#### モード2: フォールバック方式
```env
USE_YTDLP=false
YTDLP_FALLBACK=true
```

- 通常はYouTube Data APIを使用
- YouTube APIが失敗した場合のみyt-dlpを使用

#### モード3: YouTube APIのみ（デフォルト）
```env
USE_YTDLP=false
YTDLP_FALLBACK=false
```

- 従来通りYouTube Data APIのみを使用

## 使用方法

1. サーバーを再起動：
   ```bash
   cd server
   npm run dev
   ```

2. 拡張機能から解析を実行
   - yt-dlpが有効な場合、自動的にハイブリッド方式でコメントを取得します

## 注意事項

1. **yt-dlpのパス**: Windowsの場合、パスにスペースが含まれる場合は引用符で囲む必要があります
2. **パフォーマンス**: yt-dlpはYouTube APIよりも時間がかかる場合があります
3. **レート制限**: yt-dlpはYouTubeのレート制限の影響を受ける可能性があります
4. **一時ファイル**: yt-dlpは一時的にJSONファイルを作成しますが、処理後に自動的に削除されます

## トラブルシューティング

### yt-dlpが見つからない
- `YTDLP_PATH`にフルパスを指定してください
- Windowsの場合、`.exe`拡張子を含めてください

### コメントが取得できない
- yt-dlpが最新版か確認してください
- サーバーのログを確認してエラーメッセージを確認してください

### パフォーマンスの問題
- `USE_YTDLP=false`に設定してYouTube APIのみを使用してください
- または`YTDLP_FALLBACK=true`でフォールバック方式に切り替えてください

<!-- Updated -->
