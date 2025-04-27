import { Hono, serveStatic, cors, ensureDir } from "../deps.ts";
import { imageRouter } from "./routes/image.ts";

// 必要なディレクトリを作成
await ensureDir("./uploads");
await ensureDir("./processed");

// アプリケーションの初期化
const app = new Hono();

// CORSの設定
app.use("*", cors());

// 静的ファイルの提供
app.use("/", serveStatic({ root: "./public" }));
app.use("/styles.css", serveStatic({ path: "./public/styles.css" }));
app.use("/scripts.js", serveStatic({ path: "./public/scripts.js" }));
app.use("/upload-icon.svg", serveStatic({ path: "./public/upload-icon.svg" }));
app.use("/uploads/*", serveStatic({ root: "./" }));
app.use("/processed/*", serveStatic({ root: "./" }));

// APIルートの設定
app.route("/api", imageRouter);

// 404ハンドラー
app.notFound((c) => {
  return c.json({ message: "Not Found" }, 404);
});

// エラーハンドラー
app.onError((err, c) => {
  console.error(`[ERROR] ${err}`);
  return c.json({ message: "Internal Server Error", error: err.message }, 500);
});

// サーバーの起動
const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`Server is running on http://localhost:${port}`);

Deno.serve({ port }, app.fetch);
