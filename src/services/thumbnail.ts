import { ImageScript, basename, extname, ensureDir } from "../../deps.ts";

// Denoの型定義
declare const Deno: any;

interface ProcessResult {
  filename: string;
  compressionRatio: number;
}

/**
 * 画像から240x240pxのサムネイルを作成する
 * @param inputPath 入力画像のパス
 * @param filename 元のファイル名
 * @returns 処理結果
 */
export async function createThumbnail(inputPath: string, filename: string): Promise<ProcessResult> {
  try {
    // 入力ファイルの情報を取得
    const fileInfo = await Deno.stat(inputPath);
    const originalSize = fileInfo.size;

    // 出力ファイル名の生成
    const baseName = basename(filename, extname(filename));
    const outputFilename = `${baseName}-thumbnail.jpg`;
    const outputPath = `./processed/${outputFilename}`;

    // 画像処理
    const imageData = await Deno.readFile(inputPath);
    let image;

    // 画像形式に応じて適切に読み込む
    const fileExt = extname(inputPath).toLowerCase();

    // サポートされている画像形式をチェック
    if ([".png", ".jpg", ".jpeg", ".webp"].includes(fileExt)) {
      image = await ImageScript.Image.decode(imageData);
    } else {
      throw new Error(`Unsupported image format: ${fileExt}`);
    }

    // OGP用の横長サムネイル（1200x630px）を作成
    const thumbnailWidth = 1200;
    const thumbnailHeight = 630;
    const targetRatio = thumbnailWidth / thumbnailHeight; // 約1.905

    // 中央座標を計算
    const centerX = Math.floor(image.width / 2);
    const centerY = Math.floor(image.height / 2);

    // 画像のアスペクト比を計算
    const imageRatio = image.width / image.height;

    let cropWidth: number;
    let cropHeight: number;

    // アスペクト比に基づいてクロップサイズを決定
    if (imageRatio > targetRatio) {
      // 画像が横長すぎる場合：高さを基準にする
      cropHeight = image.height;
      cropWidth = Math.floor(cropHeight * targetRatio);
    } else {
      // 画像が縦長または同じ比率の場合：幅を基準にする
      cropWidth = image.width;
      cropHeight = Math.floor(cropWidth / targetRatio);
    }

    // 切り取り開始位置を計算（中央から切り出し）
    const startX = Math.max(0, centerX - Math.floor(cropWidth / 2));
    const startY = Math.max(0, centerY - Math.floor(cropHeight / 2));

    // 1200x630の比率で切り取り
    const thumbnail = image.crop(startX, startY, cropWidth, cropHeight);

    // 1200x630にリサイズ
    thumbnail.resize(thumbnailWidth, thumbnailHeight);

    // JPEGファイルとして保存（品質90%）
    const jpegData = await thumbnail.encodeJPEG(90);
    await Deno.writeFile(outputPath, jpegData);

    // 圧縮後のファイルサイズを取得
    const processedInfo = await Deno.stat(outputPath);
    const processedSize = processedInfo.size;

    // 圧縮率を計算
    const compressionRatio = (1 - (processedSize / originalSize)) * 100;

    return {
      filename: outputFilename,
      compressionRatio: parseFloat(compressionRatio.toFixed(2))
    };
  } catch (error) {
    console.error("Thumbnail creation error:", error);
    throw new Error(`Failed to create thumbnail: ${error.message}`);
  }
}
