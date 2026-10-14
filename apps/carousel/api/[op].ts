// 스킬 스크립트(carousel.mjs)용 서버 함수. AI 토큰(Authorization: Bearer cst_…)으로 부른다.
//
//   GET    /api/assets?deck=<id>                    올라간 이미지와 덱에서 쓰는지(used), 덱이 가리키는데 없는 파일(missing)
//   POST   /api/assets?deck=<id>  { sha256, ext }   올릴 자리와 서명된 업로드 URL. 파일은 스크립트가 그 URL 로 Storage 에 바로 보낸다
//                                                    (Vercel 요청 본문 4.5MB 제한을 피하려고). 이름이 내용 해시라 같은 파일은 한 번만 올라간다.
//   DELETE /api/assets?deck=<id>  { srcs?: [...] }  덱에서 안 쓰는 파일만 지운다. srcs 를 안 주면 안 쓰는 것 전부.
//   GET    /api/render?deck=<id>&slides=1,3&scale=0.5   장마다 JPEG(base64)과 레이어 상자, 배치 경고
//
// 덱 소유 확인은 앱·스크립트와 같은 RPC(api_get, anon 키 + 토큰)로 하고, 비공개 버킷을 만지는 일만 service role 로 한다.
// Vercel 이 상대 import 의 .ts 확장자를 그대로 두면 런타임에 못 찾으므로 한 파일에 둔다.
import { createClient } from "@supabase/supabase-js";

const BUCKET = "carousel";
const W = 1080;
const H = 1350;
const IMAGE_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
// 워터마크·장 번호가 들어가는 띠. 다른 레이어가 여기에 걸치면 경고한다.
const WATERMARK_BAND = { top: 1290, bottom: 1340 };
// 응답 본문 한도(4.5MB) 안에 들도록 JPEG 합계를 제한한다.
const MAX_RESPONSE = 4_000_000;

class HttpError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

const env = (name: string) => {
	const v = process.env[name];
	if (!v) throw new HttpError(500, `서버 설정에 ${name} 이 없어요`);
	return v;
};

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

type DeckRow = { id: string; title: string; caption: string; slides: any[]; updated_at: string; watermark: string };

// 토큰으로 덱을 받는다. 남의 덱이거나 토큰이 틀리면 RPC 가 막는다.
async function ownedDeck(req: Request): Promise<DeckRow> {
	const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	if (!token) throw new HttpError(401, "토큰이 없어요(Authorization: Bearer …)");
	const deckId = new URL(req.url).searchParams.get("deck");
	if (!deckId || !/^[0-9a-f-]{36}$/i.test(deckId)) throw new HttpError(400, "deck 에 덱 id 를 주세요");
	const res = await fetch(`${env("PUBLIC_SUPABASE_URL")}/rest/v1/rpc/api_get`, {
		method: "POST",
		headers: { apikey: env("PUBLIC_SUPABASE_ANON_KEY"), "Content-Type": "application/json", "Content-Profile": "carousel" },
		body: JSON.stringify({ p_token: token, p_id: deckId }),
	});
	const body = await res.json();
	if (!res.ok) throw new HttpError(res.status, body.message ?? "덱을 받지 못했어요");
	return body;
}

const storage = () =>
	createClient(env("PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } }).storage.from(BUCKET);

// 덱이 쓰는 이미지: 이미지 레이어의 src + 코드 레이어 props 안의 "assets/…" 문자열(깊이 상관없이).
const propAssets = (v: unknown): string[] =>
	typeof v === "string" ? (v.startsWith("assets/") ? [v] : []) : v && typeof v === "object" ? Object.values(v).flatMap(propAssets) : [];
const usedAssets = (deck: DeckRow) =>
	new Set<string>(
		(deck.slides ?? []).flatMap((s: any) =>
			(s.layers ?? []).flatMap((l: any) => (l.type === "image" && typeof l.src === "string" ? [l.src] : l.type === "code" ? propAssets(l.props) : [])),
		),
	);

async function listAssets(deckId: string) {
	const out: { src: string; size: number; updated_at: string }[] = [];
	for (let offset = 0; ; offset += 1000) {
		const { data, error } = await storage().list(`${deckId}/assets`, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
		if (error) throw new HttpError(500, error.message);
		for (const f of data) if (f.id) out.push({ src: `assets/${f.name}`, size: f.metadata?.size ?? 0, updated_at: f.updated_at ?? "" });
		if (data.length < 1000) return out;
	}
}

// ── /api/assets ──────────────────────────────────────────────

async function assetsGet(req: Request) {
	const deck = await ownedDeck(req);
	const used = usedAssets(deck);
	const files = await listAssets(deck.id);
	const have = new Set(files.map((f) => f.src));
	return json({ assets: files.map((f) => ({ ...f, used: used.has(f.src) })), missing: [...used].filter((s) => !have.has(s)) });
}

async function assetsPost(req: Request) {
	const deck = await ownedDeck(req);
	const { sha256, ext } = (await req.json().catch(() => ({}))) as { sha256?: string; ext?: string };
	const e = ext?.toLowerCase().replace(/^\./, "");
	if (!sha256 || !/^[0-9a-f]{64}$/.test(sha256)) throw new HttpError(400, "sha256 이 필요해요(소문자 hex 64자)");
	if (!e || !IMAGE_TYPES[e]) throw new HttpError(400, `이미지 형식만 올릴 수 있어요: ${Object.keys(IMAGE_TYPES).join(", ")}`);
	const name = `${sha256.slice(0, 16)}.${e === "jpeg" ? "jpg" : e}`;
	const src = `assets/${name}`;
	const { data: found } = await storage().list(`${deck.id}/assets`, { search: name });
	if (found?.some((f) => f.name === name)) return json({ src, exists: true });
	const { data, error } = await storage().createSignedUploadUrl(`${deck.id}/${src}`);
	if (error || !data) throw new HttpError(500, error?.message ?? "업로드 URL 을 만들지 못했어요");
	return json({ src, exists: false, uploadUrl: data.signedUrl, contentType: IMAGE_TYPES[e] });
}

async function assetsDelete(req: Request) {
	const deck = await ownedDeck(req);
	const { srcs } = (await req.json().catch(() => ({}))) as { srcs?: string[] };
	const used = usedAssets(deck);
	const files = new Set((await listAssets(deck.id)).map((f) => f.src));
	const targets = (srcs ?? [...files]).filter((s) => files.has(s));
	const remove = targets.filter((s) => !used.has(s));
	if (remove.length) {
		const { error } = await storage().remove(remove.map((s) => `${deck.id}/${s}`));
		if (error) throw new HttpError(500, error.message);
	}
	return json({ removed: remove, kept: targets.filter((s) => used.has(s)) });
}

// ── /api/render ──────────────────────────────────────────────

type Box = { id: string; type: "text" | "image" | "code" | "watermark"; x: number; y: number; w: number; h: number };

// 앱의 /render 화면을 연다. 배포에서는 같은 배포의 주소, 로컬에서는 vite dev 서버.
function appOrigin() {
	if (process.env.CAROUSEL_ORIGIN) return process.env.CAROUSEL_ORIGIN;
	if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	return "http://localhost:4324";
}

async function launchBrowser() {
	if (process.env.VERCEL) {
		const chromium = (await import("@sparticuz/chromium")).default;
		const { chromium: pw } = await import("playwright-core");
		return pw.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
	}
	// 로컬(pnpm dev 로 띄운 함수 테스트)에서는 devDependency 의 playwright 를 쓴다. 프록시 환경 변수가 있으면 따른다.
	const { chromium } = await import("playwright");
	const server = process.env.HTTPS_PROXY ?? process.env.https_proxy;
	return chromium.launch(server ? { proxy: { server, bypass: process.env.NO_PROXY ?? process.env.no_proxy ?? "" } } : {});
}

// 레이어 상자로 사람이 놓치기 쉬운 배치를 짚는다. 캔버스 밖으로 나가는 건 일부러 그러기도 해서 넘어간다.
function warnings(layout: Box[][]) {
	const out: string[] = [];
	layout.forEach((boxes, i) => {
		const n = i + 1;
		const layers = boxes.filter((b) => b.type !== "watermark");
		for (const b of layers) {
			const inBand = b.y < WATERMARK_BAND.bottom && b.y + b.h > WATERMARK_BAND.top && b.x < W / 2 + 200 && b.x + b.w > W / 2 - 200;
			if (inBand && b.y + b.h < H) out.push(`${n}장 ${b.type} ${b.id}: 워터마크 자리(y ${WATERMARK_BAND.top}~${WATERMARK_BAND.bottom})에 걸쳐요`);
			if (b.type === "text" && b.x + b.w > W - 80 + 1) out.push(`${n}장 text ${b.id}: 오른쪽 여백(x ${W - 80})을 넘어요(오른쪽 끝 ${Math.round(b.x + b.w)})`);
		}
		const texts = layers.filter((b) => b.type === "text");
		const others = layers.filter((b) => b.type !== "text");
		for (const t of texts)
			for (const o of others) {
				const ix = Math.min(t.x + t.w, o.x + o.w) - Math.max(t.x, o.x);
				const iy = Math.min(t.y + t.h, o.y + o.h) - Math.max(t.y, o.y);
				if (ix > 4 && iy > 4) out.push(`${n}장 text ${t.id} 와 ${o.type} ${o.id}: ${Math.round(ix)}×${Math.round(iy)}px 겹쳐요`);
			}
	});
	return out;
}

async function render(req: Request) {
	const deck = await ownedDeck(req);
	const q = new URL(req.url).searchParams;
	const scale = Math.min(1, Math.max(0.25, Number(q.get("scale") ?? 0.5)));
	const quality = Math.min(95, Math.max(40, Number(q.get("quality") ?? 80)));
	const count = deck.slides.length;
	const wanted = q.get("slides")
		? [...new Set(q.get("slides")!.split(",").map((v) => Number(v.trim())))].filter((v) => v >= 1 && v <= count)
		: Array.from({ length: count }, (_, i) => i + 1);

	const srcs = [...usedAssets(deck)];
	const urls: Record<string, string> = {};
	if (srcs.length) {
		const { data, error } = await storage().createSignedUrls(
			srcs.map((s) => `${deck.id}/${s}`),
			600,
		);
		if (error) throw new HttpError(500, error.message);
		for (const d of data ?? []) if (d.path && d.signedUrl) urls[d.path.slice(deck.id.length + 1)] = d.signedUrl;
	}
	const missing = srcs.filter((s) => !urls[s]);

	const browser = await launchBrowser();
	try {
		const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
		await page.addInitScript((data: unknown) => {
			(window as any).__RENDER__ = data;
		}, { id: deck.id, deck: { ...deck, version: 1 }, urls });
		await page.goto(`${appOrigin()}/render`, { waitUntil: "load" });
		await page.waitForFunction(() => (window as any).__ready === true, null, { timeout: 30_000 });
		const layout = (await page.evaluate(() => (window as any).__layout())) as Box[][];
		const slides: { index: number; jpeg: string }[] = [];
		let total = 0;
		for (const n of wanted) {
			const buf = await page.locator(`[data-slide-index="${n - 1}"]`).screenshot({ type: "jpeg", quality });
			total += buf.length * 1.34;
			if (total > MAX_RESPONSE) throw new HttpError(413, `응답이 너무 커요. slides 를 나누거나 scale 을 낮춰 주세요(${slides.length}장까지 들어감)`);
			slides.push({ index: n, jpeg: buf.toString("base64") });
		}
		return json({
			id: deck.id,
			title: deck.title,
			updated_at: deck.updated_at,
			size: { width: Math.round(W * scale), height: Math.round(H * scale), scale },
			slides,
			layout: layout.map((boxes, i) => ({ index: i + 1, boxes })),
			warnings: [...missing.map((s) => `이미지 파일이 없어요: ${s}`), ...warnings(layout)],
		});
	} finally {
		await browser.close();
	}
}

// ── 라우팅 ────────────────────────────────────────────────────

const routes: Record<string, Partial<Record<string, (req: Request) => Promise<Response>>>> = {
	assets: { GET: assetsGet, POST: assetsPost, DELETE: assetsDelete },
	render: { GET: render },
};

async function dispatch(req: Request) {
	const op = new URL(req.url).pathname.replace(/^\/api\//, "").replace(/\/$/, "");
	const fn = routes[op]?.[req.method];
	if (!fn) throw new HttpError(404, `없는 API 예요: ${req.method} /api/${op}`);
	return fn(req);
}

async function handler(req: Request) {
	try {
		return await dispatch(req);
	} catch (e) {
		if (e instanceof HttpError) return json({ message: e.message }, e.status);
		console.error(e);
		return json({ message: e instanceof Error ? e.message : String(e) }, 500);
	}
}

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
