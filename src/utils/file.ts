import { crypto, encodeHex, extname, basename } from "../../deps.ts";

/**
 * ユニークなファイル名を生成する
 * @param originalFilename 元のファイル名
 * @returns ユニークなファイル名
 */
export async function generateUniqueFilename(originalFilename: string): Promise<string> {
  // 元のファイル名から拡張子を取得
  const ext = extname(originalFilename);
  const baseName = basename(originalFilename, ext);
  
  // タイムスタンプを含む
  const timestamp = Date.now();
  
  // ランダムな文字列を生成
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  const randomString = encodeHex(randomBytes);
  
  // ファイル名を組み立て
  return `${baseName}-${timestamp}-${randomString}${ext}`;
}

/**
 * ファイルサイズを人間が読みやすい形式に変換する
 * @param bytes ファイルサイズ（バイト）
 * @returns 読みやすい形式のファイルサイズ
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}
