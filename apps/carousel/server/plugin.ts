// dev 전용: decks/ 의 로컬 사본(deck.json·이미지)을 /files/<폴더>/... 로 내준다. 앱 데이터는 Supabase 에 있다.
import fs from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

const DECKS = path.resolve(import.meta.dirname, "..", "decks");
const TYPES: Record<string, string> = {
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function localFilesPlugin(): Plugin {
  return {
    name: "carousel-local-files",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://x");
        if (!url.pathname.startsWith("/files/")) return next();
        const file = path.join(
          DECKS,
          ...url.pathname
            .slice("/files/".length)
            .split("/")
            .map(decodeURIComponent),
        );
        if (!file.startsWith(DECKS + path.sep)) return next();
        try {
          const buf = await fs.readFile(file);
          res.setHeader(
            "Content-Type",
            TYPES[path.extname(file).toLowerCase()] ??
              "application/octet-stream",
          );
          res.setHeader("Cache-Control", "no-cache");
          res.end(buf);
        } catch {
          res.statusCode = 404;
          res.end();
        }
      });
    },
  };
}
