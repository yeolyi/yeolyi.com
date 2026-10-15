import { addDays } from "./dates.ts";
import type { Notice } from "./types.ts";

// 우리에게 공고가 살아 있는 건 "아직 넣을 수 있을 때"까지다. 접수가 끝나면 발표·계약이 남았어도 남의 일이다.
// 접수일이 아예 없는 공고(마이홈 LH 잔여)는 발표일, 그것도 없으면 공고일 + 2주로 본다.
export const applyEnd = (n: Notice) =>
  n.r2End ??
  n.r1End ??
  n.spEnd ??
  n.r2Start ??
  n.r1Start ??
  n.spStart ??
  n.winnerAt ??
  addDays(n.announcedAt, 14);
export const isLive = (n: Notice, today: string) => applyEnd(n) >= today;
export const isMainRound = (n: Notice) =>
  n.kind === "APT" || n.kind === "신혼희망타운";

// 한 단지는 여러 번 공고되고 청약홈은 그때마다 번호를 새로 매기지만 공급위치 주소는 그대로다(12개월 168쌍 실측).
// 그래서 주소가 단지의 키다. 좌표·소요시간·분양가를 앞선 공고에서 물려받을 때 쓴다. 화면은 이 키를 모른다.
export function siteKey(n: Notice): string {
  if (n.address) {
    return n.address
      .replace(/\(.*?\)/g, "")
      .replace(/일원|일대|외\s*\d+\s*(필지|개동|개\s*동)|번지/g, "")
      .replace(/\s+/g, "");
  }
  const s = n.name.replace(/BL/g, "블록");
  const place = s
    .replace(/(지구|공공주택지구|택지|신도시).*/, "")
    .replace(/[^가-힣]/g, "")
    .slice(0, 4);
  const blocks = (s.match(/[A-Za-z]{1,3}\s*-?\s*\d+/g) ?? [])
    .map((b) => b.replace(/[\s-]/g, "").toUpperCase())
    .join(",");
  return `${place}#${blocks}`;
}
