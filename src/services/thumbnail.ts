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
    const outputFilename = `${baseName}-thumbnail.avif`;
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

    // 短辺を基準に正方形に切り出し、240x240にリサイズ
    const thumbnailSize = 240;

    // 短辺を特定
    const shortSide = Math.min(image.width, image.height);

    // 中央座標を計算
    const centerX = Math.floor(image.width / 2);
    const centerY = Math.floor(image.height / 2);

    // 切り取り開始位置を計算（短辺を基準に正方形になるよう）
    const startX = Math.max(0, centerX - Math.floor(shortSide / 2));
    const startY = Math.max(0, centerY - Math.floor(shortSide / 2));

    // 切り取りサイズを計算（画像端の場合に調整）
    const cropSize = Math.min(shortSide, Math.min(image.width - startX, image.height - startY));

    // 正方形に切り取り
    const thumbnail = image.crop(startX, startY, cropSize, cropSize);

    // 240x240にリサイズ
    thumbnail.resize(thumbnailSize, thumbnailSize);

    // 一時的なJPEGファイルとして保存
    const tempJpegPath = `./processed/${baseName}-thumbnail-temp.jpg`;
    const jpegData = await thumbnail.encodeJPEG(100);
    await Deno.writeFile(tempJpegPath, jpegData);

    // FFmpegを使用してJPEGからAVIFに変換
    const ffmpegCmd = `ffmpeg -i "${tempJpegPath}" -c:v libaom-av1 -crf 4 -f avif -y "${outputPath}"`;
    const ffmpegP = Deno.run({
      cmd: ["sh", "-c", ffmpegCmd],
      stdout: "piped",
      stderr: "piped"
    });

    const ffmpegStatus = await ffmpegP.status();

    // 一時ファイルを削除
    try {
      await Deno.remove(tempJpegPath);
    } catch (e) {
      console.warn("Failed to remove temporary file:", e);
    }

    if (!ffmpegStatus.success) {
      const errorBytes = await ffmpegP.stderrOutput();
      let errorMessage = "Unknown error";
      try {
        errorMessage = new TextDecoder().decode(errorBytes);
      } catch (e) {
        console.error("Failed to decode error message:", e);
      }
      console.error(`FFmpeg conversion failed: ${errorMessage}`);
      ffmpegP.close();
      throw new Error("FFmpeg conversion failed");
    }

    ffmpegP.close();

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
