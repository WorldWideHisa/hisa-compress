# Hisa Compress - 画像圧縮ツール

すべてコーディングエージェントによる自動生成で作ってみる実験。
Hono + TypeScript + Deno で実装された画像圧縮ツールです。このツールを使用すると、PNG、JPEG、WebP形式の画像をAVIF形式に変換・圧縮し、ダウンロードすることができます。

## 機能

- ドラッグ＆ドロップによる画像アップロード
- PNG、JPEG、WebP形式の画像をサポート
- AVIF形式への変換と圧縮
- 圧縮済み画像のダウンロード

## 必要条件

- Docker
- Docker Compose (オプション)

## 使用方法

### Dockerを使用した起動方法

#### 1. イメージのビルド

```bash
docker build -t hisa-compress .
```

#### 2. コンテナの起動

```bash
docker run -p 8000:8000 -v $(pwd)/uploads:/app/uploads -v $(pwd)/processed:/app/processed hisa-compress
```

これにより、http://localhost:8000 でアプリケーションにアクセスできます。

### Docker操作コマンド一覧

#### コンテナの停止

実行中のコンテナを停止するには、まずコンテナIDを確認します：

```bash
docker ps
```

次に、コンテナを停止します：

```bash
docker stop <コンテナID>
```

#### コンテナの再起動

停止したコンテナを再起動するには：

```bash
docker start <コンテナID>
```

#### コンテナの削除

不要になったコンテナを削除するには：

```bash
docker rm <コンテナID>
```

#### イメージの削除

不要になったイメージを削除するには：

```bash
docker rmi hisa-compress
```

#### ログの確認

コンテナのログを確認するには：

```bash
docker logs <コンテナID>
```

リアルタイムでログを追跡するには：

```bash
docker logs -f <コンテナID>
```

## 開発環境

### プロジェクト構造

```
/
├── Dockerfile           # Docker設定ファイル
├── deno.json            # Denoプロジェクト設定
├── import_map.json      # 依存関係マッピング
├── deps.ts              # 依存関係をまとめたファイル
├── src/                 # ソースコード
│   ├── main.ts          # エントリーポイント
│   ├── routes/          # APIルート
│   ├── services/        # ビジネスロジック
│   │   └── image.ts     # 画像処理サービス
│   └── utils/           # ユーティリティ関数
├── public/              # 静的ファイル
│   ├── index.html       # フロントエンドのHTML
│   ├── styles.css       # スタイルシート
│   └── scripts.ts       # フロントエンドのスクリプト
├── uploads/             # アップロードされた画像の一時保存場所
└── processed/           # 処理済み画像の保存場所
```

## 画像処理について

このツールでは、以下の画像処理を行います：

- AVIF形式への変換
- 適切な圧縮率での圧縮
- 元の画像のアスペクト比を維持
- Web表示に最適化された解像度調整

## 注意事項

- アップロードされた画像は一時的に `uploads` ディレクトリに保存されます
- 処理済みの画像は `processed` ディレクトリに保存されます
- 大きなファイルのアップロードには時間がかかる場合があります
