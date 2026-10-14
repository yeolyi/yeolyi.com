// 덱 저장소: Supabase carousel.decks + Storage 버킷 carousel.
import { type Deck, normalizeDeck } from "./model";
import { assetPath, BUCKET, supabase } from "./supabase";

export type DeckEntry = { slug: string; mtime: number; deck: Deck };

type Row = { id: string; title: string; caption: string; slides: unknown; updated_at: string };

// 워터마크는 계정 설정이라 덱을 읽을 때 끼워 넣고, 저장할 때는 뺀다.
// 캐시는 사용자별로 둔다. SIGNED_IN 은 세션 복구·토큰 갱신·다른 탭 알림에도 오므로 그때 비우면
// 덱을 받는 도중에 캐시가 비어 워터마크 없이 열리는 경우가 생겼다. 값은 공유 변수를 다시 읽지 말고 넘겨 쓴다.
let cache: { user: string; watermark: string } | null = null;
const fromRow = (r: Row, watermark: string): Deck => normalizeDeck({ ...r, watermark });
const toRow = (d: Deck) => ({ title: d.title, caption: d.caption, slides: d.slides });

async function loadWatermark() {
	const { data } = await supabase.auth.getSession();
	const user = data.session?.user.id ?? "";
	if (cache?.user === user) return cache.watermark;
	const res = check(await supabase.from("profiles").select("watermark").maybeSingle()) as { watermark: string } | null;
	cache = { user, watermark: res?.watermark ?? "" };
	return cache.watermark;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
	if (res.error) throw new Error(res.error.message);
	return res.data;
}

async function listAssets(id: string) {
	const files = check(await supabase.storage.from(BUCKET).list(`${id}/assets`, { limit: 1000 }));
	return (files ?? []).map((f) => `${id}/assets/${f.name}`);
}

async function sha1(buf: ArrayBuffer) {
	const h = await crypto.subtle.digest("SHA-1", buf);
	return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const api = {
	watermark: loadWatermark,
	setWatermark: async (text: string) => {
		const { data } = await supabase.auth.getUser();
		if (!data.user) throw new Error("로그인이 필요합니다");
		check(await supabase.from("profiles").upsert({ user_id: data.user.id, watermark: text }));
		cache = { user: data.user.id, watermark: text };
	},
	list: async (): Promise<DeckEntry[]> => {
		const watermark = await loadWatermark();
		const rows = check(await supabase.from("decks").select("*").order("updated_at", { ascending: false })) as Row[];
		return rows.map((r) => ({ slug: r.id, mtime: Date.parse(r.updated_at), deck: fromRow(r, watermark) }));
	},
	create: async (title: string) => {
		const row = check(await supabase.from("decks").insert(toRow(normalizeDeck({ title }))).select("id").single()) as { id: string };
		return { slug: row.id };
	},
	get: async (id: string) => {
		const watermark = await loadWatermark();
		return fromRow(check(await supabase.from("decks").select("*").eq("id", id).single()) as Row, watermark);
	},
	// 저장한 뒤 서버에 남은 모양(정규화된 덱)과 수정 시각을 돌려준다.
	put: async (id: string, deck: Deck) => {
		const row = check(await supabase.from("decks").update(toRow(deck)).eq("id", id).select("*").single()) as Row;
		return { deck: fromRow(row, deck.watermark), updatedAt: row.updated_at };
	},
	remove: async (id: string) => {
		const paths = await listAssets(id);
		if (paths.length) check(await supabase.storage.from(BUCKET).remove(paths));
		check(await supabase.from("decks").delete().eq("id", id));
	},
	// 다른 덱의 이미지를 이 덱으로 복사(레이어 붙여넣기). 이미 있으면 그대로 둔다.
	copyAsset: async (fromDeck: string, toDeck: string, src: string) => {
		const { error } = await supabase.storage.from(BUCKET).copy(assetPath(fromDeck, src), assetPath(toDeck, src));
		if (error && !/exists/i.test(error.message)) throw new Error(error.message);
	},
	// 같은 내용은 같은 이름이 되도록 이름 뒤에 내용 해시를 붙인다.
	upload: async (id: string, file: File) => {
		const buf = await file.arrayBuffer();
		const bitmap = await createImageBitmap(new Blob([buf], { type: file.type }));
		const { width: nw, height: nh } = bitmap;
		bitmap.close();
		const dot = file.name.lastIndexOf(".");
		const ext = (dot > 0 ? file.name.slice(dot) : `.${file.type.split("/")[1] || "png"}`).toLowerCase();
		const base =
			(dot > 0 ? file.name.slice(0, dot) : file.name || "image")
				// Storage 키는 ASCII 만 받는다(한글 파일 이름은 "Invalid key").
				.replace(/[^A-Za-z0-9_-]+/g, "-")
				.replace(/^-+|-+$/g, "")
				.slice(0, 40) || "image";
		const src = `assets/${base}-${(await sha1(buf)).slice(0, 6)}${ext}`;
		check(await supabase.storage.from(BUCKET).upload(assetPath(id, src), buf, { contentType: file.type, upsert: true }));
		return { src, nw, nh };
	},
};
