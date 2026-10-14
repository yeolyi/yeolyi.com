import { getCollection } from "astro:content";

// URL slug — id(폴더/ko)에서 상위 폴더명을 취하고 정렬용 숫자 프리픽스(N-)를 뗀다.
export function postSlug(id: string) {
  return (id.split("/").at(-2) ?? "").replace(/^\d+-/, "");
}

// 커리큘럼 파트 — 글의 프런트매터 part 필드와 대응한다.
const PARTS = [
  { part: 1, title: "정보와 논리" },
  { part: 2, title: "논리 게이트" },
  { part: 3, title: "조합 회로" },
  { part: 4, title: "기억하는 회로" },
  { part: 5, title: "컴퓨터란 무엇인가" },
  { part: 6, title: "CPU" },
  { part: 7, title: "메모리" },
  { part: 8, title: "문제 해결" },
  { part: 9, title: "운영체제" },
  { part: 10, title: "네트워크" },
] as const;

// 글을 PARTS 순서로 묶는다(숨김 제외·order 순).
export async function getVisibleParts() {
  const visible = (await getCollection("post"))
    .filter((post) => !post.data.hidden)
    .sort((a, b) => a.data.order - b.data.order);
  return PARTS.map(({ part, title }) => ({
    title,
    posts: visible.filter((p) => p.data.part === part),
  }));
}
