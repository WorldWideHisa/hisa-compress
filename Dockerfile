FROM denoland/deno:latest

# FFmpegとその依存関係をインストール
RUN echo "deb http://ftp.jp.debian.org/debian bookworm-backports main contrib non-free non-free-firmware" > /etc/apt/sources.list.d/backports.list
RUN apt-get update && apt-get install -y \
    libheif1 \
    imagemagick \
    libheif-examples \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# キャッシュ効率化のためにdeno.jsonとimport_mapを先にコピー
COPY deno.json* .
COPY import_map.json* .
COPY deps.ts .

# キャッシュをクリア
RUN rm -rf /deno-dir/npm

# 依存関係をキャッシュ
RUN deno cache --reload --import-map=import_map.json deps.ts

# ソースコードをコピー
COPY src/ ./src/
COPY public/ ./public/

# 必要なディレクトリを作成
RUN mkdir -p uploads processed

# 必要なポートを公開
EXPOSE 8000

# アプリケーションを実行
CMD ["deno", "run", "--reload", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "src/main.ts"]
