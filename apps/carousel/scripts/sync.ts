// Claude 가 덱을 읽고 고치는 통로. Supabase CLI(로그인 필요)로 DB·Storage 와 decks/ 로컬 사본을 맞춘다.
//   pnpm pull            내 덱(CAROUSEL_OWNER_ID)을 decks/<폴더>/deck.json + assets/ 로 받는다(워터마크는 계정 설정에서 채워 넣음, push 는 무시)
//   pnpm push <폴더>     고친 사본을 올린다. 마지막 pull 뒤 앱에서 바뀌었으면 거절(--force 로 덮어쓰기)
//                        deck.json 에 id 가 없으면 새 덱으로 만든다
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { normalizeDeck } from "../src/model.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
// 개인 값은 레포에 두지 않는다(.env.local, .env.example 참고).
if (fs.existsSync(path.join(ROOT, ".env.local")))
  process.loadEnvFile(path.join(ROOT, ".env.local"));
const REF = process.env.SUPABASE_PROJECT_REF ?? "";
// CLI 는 관리자 권한(RLS 우회)으로 돌므로 내 덱만 다루도록 직접 거른다.
const OWNER = process.env.CAROUSEL_OWNER_ID ?? "";
if (!REF || !OWNER) {
  console.error(
    ".env.local 에 SUPABASE_PROJECT_REF 와 CAROUSEL_OWNER_ID 를 넣어 주세요",
  );
  process.exit(1);
}
const DECKS = path.join(ROOT, "decks");

function cli(args: string[]) {
  return execFileSync("supabase", [...args, "--linked", "--project-ref", REF], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// biome-ignore lint/suspicious/noExplicitAny: 행의 모양은 SQL 마다 다르다
function query(sql: string): any[] {
  const out = cli(["db", "query", sql]);
  return JSON.parse(out.slice(out.indexOf("{"))).rows;
}

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
// 덱 JSON 은 달러 인용으로 넣는다(작은따옴표 이스케이프 걱정 없이).
const json = (v: unknown) => {
  const s = JSON.stringify(v);
  if (s.includes("$cj$"))
    throw new Error("덱 내용에 $cj$ 가 들어 있어 넣을 수 없어요");
  return `$cj$${s}$cj$::jsonb`;
};

type Local = { id?: string; updated_at?: string; [k: string]: unknown };

function folders() {
  if (!fs.existsSync(DECKS)) return [];
  return fs
    .readdirSync(DECKS, { withFileTypes: true })
    .filter(
      (e) =>
        e.isDirectory() && fs.existsSync(path.join(DECKS, e.name, "deck.json")),
    )
    .map((e) => e.name);
}

const readLocal = (folder: string): Local =>
  JSON.parse(fs.readFileSync(path.join(DECKS, folder, "deck.json"), "utf8"));
const writeLocal = (folder: string, data: Local) =>
  fs.writeFileSync(
    path.join(DECKS, folder, "deck.json"),
    `${JSON.stringify(data, null, 2)}\n`,
  );

// 덱이 쓰는 이미지: 이미지 레이어의 src + 코드 레이어 props 안의 "assets/…" 문자열(깊이 상관없이).
const propAssets = (v: unknown): string[] =>
  typeof v === "string"
    ? v.startsWith("assets/")
      ? [v]
      : []
    : v && typeof v === "object"
      ? Object.values(v).flatMap(propAssets)
      : [];
const imageSrcs = (deck: ReturnType<typeof normalizeDeck>) => [
  ...new Set(
    deck.slides.flatMap((s) =>
      s.layers.flatMap((l) =>
        l.type === "image"
          ? [l.src]
          : l.type === "code"
            ? propAssets(l.props)
            : [],
      ),
    ),
  ),
];

function pull() {
  const rows = query(
    `select d.id, d.title, d.caption, d.slides, d.updated_at, coalesce(p.watermark, '') as watermark from carousel.decks d left join carousel.profiles p on p.user_id = d.owner_id where d.owner_id = ${lit(OWNER)} order by d.updated_at desc`,
  );
  const byId = new Map(folders().map((f) => [readLocal(f).id, f]));
  for (const r of rows) {
    let folder = byId.get(r.id);
    if (!folder) {
      const base =
        (r.title as string).replace(/[/\\:*?"<>|]/g, "-").trim() || "untitled";
      folder = base;
      for (let n = 2; fs.existsSync(path.join(DECKS, folder)); n++)
        folder = `${base}-${n}`;
    }
    const deck = normalizeDeck(r);
    fs.mkdirSync(path.join(DECKS, folder, "assets"), { recursive: true });
    writeLocal(folder, { id: r.id, updated_at: r.updated_at, ...deck });
    for (const src of imageSrcs(deck)) {
      const local = path.join(DECKS, folder, src);
      if (!fs.existsSync(local))
        cli([
          "storage",
          "cp",
          `ss:///carousel/${r.id}/${src}`,
          local,
          "--experimental",
        ]);
    }
    console.log(`${folder}  ←  ${r.title} (${deck.slides.length}장)`);
  }
}

function push(folder: string, force: boolean) {
  const dir = path.join(DECKS, folder);
  const local = readLocal(folder);
  const deck = normalizeDeck(local);

  // Storage 키는 ASCII 만 되므로 한글 등 이름의 이미지는 바꿔서 올린다.
  for (const s of deck.slides)
    for (const l of s.layers) {
      if (l.type !== "image" || /^[\x20-\x7e]+$/.test(l.src)) continue;
      const ext = path.extname(l.src);
      const next = `assets/${
        path
          .basename(l.src, ext)
          .replace(/[^A-Za-z0-9_-]+/g, "-")
          .replace(/^-+|-+$/g, "") || "image"
      }-${Date.now().toString(36)}${ext}`;
      fs.renameSync(path.join(dir, l.src), path.join(dir, next));
      for (const s2 of deck.slides)
        for (const l2 of s2.layers)
          if (l2.type === "image" && l2.src === l.src && l2 !== l)
            l2.src = next;
      l.src = next;
    }

  let id = local.id;
  if (!id) {
    [{ id }] = query(
      `insert into carousel.decks (title, owner_id) values (${lit(deck.title)}, ${lit(OWNER)}) returning id`,
    );
    console.log(`새 덱을 만들었어요: ${id}`);
  } else if (!force) {
    const [remote] = query(
      `select updated_at from carousel.decks where id = ${lit(id)} and owner_id = ${lit(OWNER)}`,
    );
    if (!remote) throw new Error(`DB 에 ${id} 덱이 없어요`);
    if (remote.updated_at !== local.updated_at)
      throw new Error(
        `마지막 pull 뒤 앱에서 바뀌었어요(${local.updated_at} → ${remote.updated_at}). pnpm pull 하거나 --force`,
      );
  }

  const remoteFiles = new Set(
    (
      JSON.parse(
        cli([
          "storage",
          "ls",
          `ss:///carousel/${id}/assets/`,
          "--experimental",
        ]),
      ).paths as string[]
    ).map((p) => p.replace(/\/$/, "")),
  );
  for (const src of imageSrcs(deck)) {
    if (remoteFiles.has(path.basename(src))) continue;
    cli([
      "storage",
      "cp",
      path.join(dir, src),
      `ss:///carousel/${id}/${src}`,
      "--experimental",
    ]);
    console.log(`  이미지 올림 ${src}`);
  }

  const [row] = query(
    `update carousel.decks set title = ${lit(deck.title)}, caption = ${lit(deck.caption)}, slides = ${json(deck.slides)} where id = ${lit(id as string)} and owner_id = ${lit(OWNER)} returning updated_at`,
  );
  writeLocal(folder, { id, updated_at: row.updated_at, ...deck });
  console.log(`${folder}  →  올렸어요 (${deck.slides.length}장)`);
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === "pull") pull();
  else if (cmd === "push" && rest[0]) push(rest[0], rest.includes("--force"));
  else {
    console.error("사용법: pnpm pull | pnpm push <decks 안의 폴더> [--force]");
    process.exit(1);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
