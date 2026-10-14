import { getCollection } from "astro:content";

// URL slug — id(폴더/ko)에서 상위 폴더명을 취한다. 폴더명이 곧 slug 라 프런트매터에
// 따로 적지 않는다.
export function postSlug(id: string) {
  return (id.split("/").at(-2) ?? "").replace(/^\d+-/, "");
}

// 날짜는 UTC 기준 YYYY-MM-DD 고정(파싱 타임존 밀림 방지). 글 메타·목록이 공유.
export function formatDate(d: Date) {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${d.getUTCFullYear() % 100}.${mm}`;
}

// 숨김 제외 일반 글, 최신순.
export async function getVisiblePosts() {
  return (await getCollection("post"))
    .filter((post) => !post.data.hidden)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
