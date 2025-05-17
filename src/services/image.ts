import { ImageScript, basename, extname, ensureDir, crypto, encodeHex } from "../../deps.ts";

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
    let outputFilename = `${baseName}.avif`;
    let outputPath = `./processed/${outputFilename}`;

    // 画像形式に応じて適切に処理
    const fileExt = extname(inputPath).toLowerCase();

    // HEICファイルの場合、ImageMagickを使用して直接JPEGに変換し、そのまま出力
    if (fileExt === ".heic" || fileExt === ".heif") {
      console.log("Converting HEIC/HEIF directly to JPEG...");

      // 出力ファイル名をJPEGに変更
      outputFilename = `${baseName}.jpg`;
      outputPath = `./processed/${outputFilename}`;

      try {
        // ファイルの存在を確認
        console.log(`Checking if input file exists: ${inputPath}`);
        try {
          const fileInfo = await Deno.stat(inputPath);
          console.log(`File exists, size: ${fileInfo.size} bytes`);
        } catch (e) {
          console.error(`Input file does not exist or cannot be accessed: ${e.message}`);
          throw new Error(`Input file does not exist or cannot be accessed: ${e.message}`);
        }

        // 出力ディレクトリの存在を確認
        const outputDir = "./processed";
        try {
          await ensureDir(outputDir);
          console.log(`Output directory exists: ${outputDir}`);
        } catch (e) {
          console.error(`Failed to ensure output directory: ${e.message}`);
          throw new Error(`Failed to ensure output directory: ${e.message}`);
        }

        // ImageMagickのconvertコマンドを使用
        console.log(`Using ImageMagick convert with input: ${inputPath}, output: ${outputPath}`);

        // シェルコマンドとして実行（フォーマットを明示的に指定、リサイズと品質設定を追加）
        const cmd = `magick "${inputPath}" -resize "1248x>" -format jpg -quality 90 "${outputPath}"`;
        console.log(`Executing command: ${cmd}`);

        const p = Deno.run({
          cmd: ["sh", "-c", cmd],
          stdout: "piped",
          stderr: "piped"
        });

        const status = await p.status();

        if (!status.success) {
          const errorBytes = await p.stderrOutput();
          let errorMessage = "Unknown error";
          try {
            errorMessage = new TextDecoder().decode(errorBytes);
          } catch (e) {
            console.error("Failed to decode error message:", e);
          }
          console.error(`ImageMagick convert failed: ${errorMessage}`);

          // 代替コマンドを試す
          console.log("Trying alternative command...");
          const altCmd = `convert "${inputPath}" -auto-orient -resize "1248x>" -quality 90 "${outputPath}"`;
          console.log(`Executing alternative command: ${altCmd}`);

          const altP = Deno.run({
            cmd: ["sh", "-c", altCmd],
            stdout: "piped",
            stderr: "piped"
          });

          const altStatus = await altP.status();

          if (!altStatus.success) {
            const altErrorBytes = await altP.stderrOutput();
            let altErrorMessage = "Unknown error";
            try {
              altErrorMessage = new TextDecoder().decode(altErrorBytes);
            } catch (e) {
              console.error("Failed to decode error message:", e);
            }
            console.error(`Alternative command failed: ${altErrorMessage}`);
            altP.close();
            p.close();
            throw new Error("Failed to convert HEIC file with ImageMagick");
          }

          altP.close();
          console.log("Alternative command succeeded");
        } else {
          p.close();
          console.log("ImageMagick convert succeeded");
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
        console.error("Error converting HEIC file:", error);
        throw new Error(`Failed to convert HEIC file: ${error.message}`);
      }
    }

    // 通常の画像処理（HEIC以外）
    try {
      // FFmpegを使用してAVIF形式に変換
      console.log("Converting to AVIF using FFmpeg...");

      // 一時的なJPEGファイルを作成（リサイズと品質調整のため）
      const tempJpegPath = `./processed/${baseName}-temp.jpg`;

      // ImageScriptを使用して画像を読み込み、必要に応じてリサイズ
      const imageData = await Deno.readFile(inputPath);
      let image;

      if ([".png", ".jpg", ".jpeg", ".webp"].includes(fileExt)) {
        image = await ImageScript.Image.decode(imageData);
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

      // 元のファイルサイズの約30%を目標とするビットレートを計算
      // 8で割るのは、ビットレートがビット/秒で、ファイルサイズがバイト単位のため
      const targetBitrate = Math.round((originalSize * 0.3 * 8) / 10) + "k";

      // FFmpegを使用してJPEGからAVIFに変換
      const ffmpegCmd = `ffmpeg -i "${tempJpegPath}" -c:v libaom-av1 -crf 4 -b:v ${targetBitrate} -cpu-used 1 -row-mt 1 -tile-columns 2 -tile-rows 2 -f avif -y "${outputPath}"`;
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
      console.error("FFmpeg processing error:", error);

      // FFmpegが失敗した場合、ImageScriptをフォールバックとして使用
      console.log("Falling back to ImageScript JPEG encoding...");

      // ImageScriptを使用して画像処理
      const imageData = await Deno.readFile(inputPath);
      let image;

      // HEICファイルはフォールバック処理では扱わない
      if (fileExt === ".heic" || fileExt === ".heif") {
        throw new Error("HEIC/HEIF format is not supported in fallback mode");
      }

      if ([".png", ".jpg", ".jpeg", ".webp"].includes(fileExt)) {
        image = await ImageScript.Image.decode(imageData);
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
