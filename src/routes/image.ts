import { Hono } from "../../deps.ts";
import { processImage } from "../services/image.ts";
import { generateUniqueFilename } from "../utils/file.ts";
import { extname } from "../../deps.ts";

const imageRouter = new Hono();

// 画像アップロードエンドポイント
imageRouter.post("/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("image") as File;
    
    if (!file) {
      return c.json({ message: "No image file provided" }, 400);
    }
    
    // サポートされているファイル形式をチェック
    const ext = extname(file.name).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      return c.json({ message: "Unsupported file format. Please upload PNG, JPEG, or WebP images." }, 400);
    }
    
    // ファイル名の生成
    const uniqueFilename = await generateUniqueFilename(file.name);
    const uploadPath = `./uploads/${uniqueFilename}`;
    
    // ファイルの保存
    const arrayBuffer = await file.arrayBuffer();
    await Deno.writeFile(uploadPath, new Uint8Array(arrayBuffer));
    
    return c.json({ 
      message: "File uploaded successfully", 
      filename: uniqueFilename,
      originalName: file.name,
      path: `/uploads/${uniqueFilename}`
    });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ message: "Failed to upload file", error: error.message }, 500);
  }
});

// 画像処理エンドポイント
imageRouter.post("/process", async (c) => {
  try {
    const { filename } = await c.req.json();
    
    if (!filename) {
      return c.json({ message: "Filename is required" }, 400);
    }
    
    const uploadPath = `./uploads/${filename}`;
    
    // ファイルの存在確認
    try {
      await Deno.stat(uploadPath);
    } catch {
      return c.json({ message: "File not found" }, 404);
    }
    
    // 画像処理
    const result = await processImage(uploadPath, filename);
    
    return c.json({ 
      message: "Image processed successfully", 
      original: {
        filename,
        path: `/uploads/${filename}`
      },
      processed: {
        filename: result.filename,
        path: `/processed/${result.filename}`
      },
      compressionRatio: result.compressionRatio
    });
  } catch (error) {
    console.error("Processing error:", error);
    return c.json({ message: "Failed to process image", error: error.message }, 500);
  }
});

// 処理済み画像の一覧取得
imageRouter.get("/processed", async (c) => {
  try {
    const files = [];
    
    for await (const entry of Deno.readDir("./processed")) {
      if (entry.isFile) {
        files.push({
          name: entry.name,
          path: `/processed/${entry.name}`
        });
      }
    }
    
    return c.json({ files });
  } catch (error) {
    console.error("List error:", error);
    return c.json({ message: "Failed to list processed images", error: error.message }, 500);
  }
});

export { imageRouter };
