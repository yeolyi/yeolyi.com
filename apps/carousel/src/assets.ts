// 이미지 URL. 앱에서는 비공개 버킷의 서명 URL(하루짜리)을 모아서 받아 오고,
// 로컬 렌더(Claude 의 pnpm export)에서는 dev 서버가 decks/ 폴더를 그대로 내준다.
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { assetPath, BUCKET, supabase } from "./supabase";

export const LocalAssets = createContext(false);

const TTL = 60 * 60 * 24;
const cache = new Map<string, { url: string; exp: number }>();
const pending = new Set<string>();
const subs = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function fresh(path: string) {
	const c = cache.get(path);
	return c && c.exp > Date.now() + 60_000 ? c.url : undefined;
}

function request(path: string) {
	if (fresh(path) || pending.has(path)) return;
	pending.add(path);
	clearTimeout(timer);
	timer = setTimeout(flush, 10);
}

async function flush() {
	const paths = [...pending];
	if (!paths.length) return;
	const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, TTL);
	for (const p of paths) pending.delete(p);
	if (error) return console.error(error);
	for (const d of data ?? []) {
		if (d.path && d.signedUrl) cache.set(d.path, { url: d.signedUrl, exp: Date.now() + TTL * 1000 });
	}
	for (const s of subs) s();
}

const subscribe = (fn: () => void) => {
	subs.add(fn);
	return () => subs.delete(fn);
};

export function useAssetUrl(deckId: string, src: string): string | undefined {
	const local = useContext(LocalAssets);
	const path = assetPath(deckId, src);
	const url = useSyncExternalStore(subscribe, () => (local ? undefined : fresh(path)));
	useEffect(() => {
		if (!local) request(path);
	}, [local, path, url]);
	if (local) return `/files/${encodeURIComponent(deckId)}/${src.split("/").map(encodeURIComponent).join("/")}`;
	return url;
}

// 코드 레이어용: 덱 이미지 주소를 바로 받는다(서명 URL 은 위 캐시를 같이 쓴다).
export async function assetUrl(deckId: string, src: string, local: boolean): Promise<string> {
	if (local) return `/files/${encodeURIComponent(deckId)}/${src.split("/").map(encodeURIComponent).join("/")}`;
	const path = assetPath(deckId, src);
	const hit = fresh(path);
	if (hit) return hit;
	const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL);
	if (error || !data) throw new Error(error?.message ?? `이미지를 찾지 못했습니다: ${src}`);
	cache.set(path, { url: data.signedUrl, exp: Date.now() + TTL * 1000 });
	return data.signedUrl;
}
