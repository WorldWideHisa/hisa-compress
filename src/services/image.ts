import { ImageScript, basename, extname } from "../../deps.ts";

interface ProcessResult {
  filename: string;
  compressionRatio: number;
}

/**
 * 画像をAVIF形式に変換し圧縮する
 * @param inputPath 入力画像のパス
 * @param filename 元のファイル名
 * @returns 処理結果
 */
export async function processImage(inputPath: string, filename: string): Promise<ProcessResult> {
  try {
    // 入力ファイルの情報を取得
    const fileInfo = await Deno.stat(inputPath);
    const originalSize = fileInfo.size;
    
    // 出力ファイル名の生成
    const baseName = basename(filename, extname(filename));
    const outputFilename = `${baseName}.avif`;
    const outputPath = `./processed/${outputFilename}`;
    
    // 画像処理の方法を決定
    try {
      // FFmpegを使用してAVIF形式に変換
      console.log("Converting to AVIF using FFmpeg...");
      
      // 一時的なJPEGファイルを作成（リサイズと品質調整のため）
      const tempJpegPath = `./processed/${baseName}-temp.jpg`;
      
      // ImageScriptを使用して画像を読み込み、必要に応じてリサイズ
      const imageData = await Deno.readFile(inputPath);
      let image;
      
      // 画像形式に応じて適切に読み込む
      const fileExt = extname(inputPath).toLowerCase();
      if ([".png", ".jpg", ".jpeg", ".webp"].includes(fileExt)) {
        image = await ImageScript.decode(imageData);
      } else {
        throw new Error(`Unsupported image format: ${fileExt}`);
      }
      
      // 4K解像度（3840x2160）を超える画像のみリサイズ
      const maxDimension = 3840;
      if (image.width > maxDimension || image.height > maxDimension) {
        if (image.width > image.height) {
          const newHeight = Math.round((image.height / image.width) * maxDimension);
          image = image.resize(maxDimension, newHeight);
        } else {
          const newWidth = Math.round((image.width / image.height) * maxDimension);
          image = image.resize(newWidth, maxDimension);
        }
      }
      
      // 一時的なJPEGファイルとして保存（最高品質100%）
      const jpegData = await image.encodeJPEG(100);
      await Deno.writeFile(tempJpegPath, jpegData);
      
      // 元のファイルサイズの約50%を目標とするビットレートを計算
      // 8で割るのは、ビットレートがビット/秒で、ファイルサイズがバイト単位のため
      const targetBitrate = Math.round((originalSize * 0.3 * 8) / 10) + "k";
      
      // FFmpegを使用してJPEGからAVIFに変換
      // -crf: 品質（0-63、低いほど高品質、8はバランスの取れた高品質設定）
      // -b:v: ビットレート（元のファイルサイズの約50%を目標）
      // -cpu-used: 速度（0-8、低いほど高品質だが遅い、2はバランスの取れた設定）
      const ffmpegCmd = new Deno.Command("ffmpeg", {
        args: [
          "-i", tempJpegPath,
          "-c:v", "libaom-av1",
          "-crf", "4", // バランスの取れた高品質設定（0→4）
          "-b:v", targetBitrate, // 目標ビットレート
          "-cpu-used", "1", // バランスの取れた設定（0→1）
          "-row-mt", "1",
          "-tile-columns", "2",
          "-tile-rows", "2",
          "-f", "avif",
          "-y", // 既存ファイルを上書き
          outputPath
        ],
        stdout: "piped",
        stderr: "piped",
      });
      
      const ffmpegProcess = ffmpegCmd.spawn();
      const ffmpegStatus = await ffmpegProcess.status;
      
      // 一時ファイルを削除
      try {
        await Deno.remove(tempJpegPath);
      } catch (e) {
        console.warn("Failed to remove temporary file:", e);
      }
      
      if (!ffmpegStatus.success) {
        const stderr = new TextDecoder().decode(await ffmpegProcess.stderrOutput());
        throw new Error(`FFmpeg failed: ${stderr}`);
      }
      
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
      console.error("FFmpeg processing error:", error);
      
      // FFmpegが失敗した場合、ImageScriptをフォールバックとして使用
      console.log("Falling back to ImageScript JPEG encoding...");
      
      // ImageScriptを使用して画像処理
      const imageData = await Deno.readFile(inputPath);
      let image;
      
      // 画像形式に応じて適切に読み込む
      const fileExt = extname(inputPath).toLowerCase();
      if ([".png", ".jpg", ".jpeg", ".webp"].includes(fileExt)) {
        image = await ImageScript.decode(imageData);
      } else {
        throw new Error(`Unsupported image format: ${fileExt}`);
      }
      
      // 4K解像度（3840x2160）を超える画像のみリサイズ
      const maxDimension = 3840;
      if (image.width > maxDimension || image.height > maxDimension) {
        if (image.width > image.height) {
          const newHeight = Math.round((image.height / image.width) * maxDimension);
          image = image.resize(maxDimension, newHeight);
        } else {
          const newWidth = Math.round((image.width / image.height) * maxDimension);
          image = image.resize(newWidth, maxDimension);
        }
      }
      
      // JPEGとして保存し、最高品質で圧縮
      const processedData = await image.encodeJPEG(100); // 品質100%でJPEGエンコード
      await Deno.writeFile(outputPath, processedData);
      
      // 圧縮後のファイルサイズを取得
      const processedInfo = await Deno.stat(outputPath);
      const processedSize = processedInfo.size;
      
      // 圧縮率を計算
      const compressionRatio = (1 - (processedSize / originalSize)) * 100;
      
      return {
        filename: outputFilename,
        compressionRatio: parseFloat(compressionRatio.toFixed(2))
      };
    }
  } catch (error) {
    console.error("Image processing error:", error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}
