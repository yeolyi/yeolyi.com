// 이미지 URL. 앱에서는 비공개 버킷의 서명 URL(하루짜리)을 모아서 받아 오고,
// 렌더 화면(로컬 pnpm export)에서는 AssetResolver 가 주소를 정한다.
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { assetPath, BUCKET, supabase } from "./supabase";

// 있으면 Supabase 대신 이걸로 주소를 정한다(렌더 화면용).
export type Resolve = (deckId: string, src: string) => string;
export const AssetResolver = createContext<Resolve | null>(null);
export const localResolve: Resolve = (deckId, src) =>
	`/files/${encodeURIComponent(deckId)}/${src.split("/").map(encodeURIComponent).join("/")}`;

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
	const resolve = useContext(AssetResolver);
	const path = assetPath(deckId, src);
	const url = useSyncExternalStore(subscribe, () => (resolve ? undefined : fresh(path)));
	useEffect(() => {
		if (!resolve) request(path);
	}, [resolve, path, url]);
	return resolve ? resolve(deckId, src) : url;
}

// 코드 레이어용: 덱 이미지 주소를 바로 받는다(서명 URL 은 위 캐시를 같이 쓴다).
export async function assetUrl(deckId: string, src: string, resolve: Resolve | null): Promise<string> {
	if (resolve) return resolve(deckId, src);
	const path = assetPath(deckId, src);
	const hit = fresh(path);
	if (hit) return hit;
	const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL);
	if (error || !data) throw new Error(error?.message ?? `이미지를 찾지 못했습니다: ${src}`);
	cache.set(path, { url: data.signedUrl, exp: Date.now() + TTL * 1000 });
	return data.signedUrl;
}
