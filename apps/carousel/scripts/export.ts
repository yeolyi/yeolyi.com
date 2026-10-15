// pnpm export <decks 안의 폴더> : 로컬 사본을 JPEG 으로 찍는다(먼저 pnpm pull).
import { createServer } from "vite";
import { exportLocal } from "../server/export.ts";

const folders = process.argv.slice(2);
if (!folders.length) {
  console.error("사용법: pnpm export <decks 안의 폴더> [...]");
  process.exit(1);
}

const server = await createServer({ server: { port: 0 }, logLevel: "error" });
await server.listen();
const addr = server.httpServer?.address();
const base = `http://localhost:${typeof addr === "object" && addr ? addr.port : 0}`;
try {
  for (const f of folders) {
    const { dir, files, warnings } = await exportLocal(base, f);
    console.log(
      `${f}: ${files.length}장 → ${dir} (layout.json 에 레이어 상자)`,
    );
    for (const w of warnings) console.log(`  경고: ${w}`);
  }
} finally {
  await server.close();
}
