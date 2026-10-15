import { kakaoSearch, naverSearch, searchableAddress } from "@shared/links.ts";
import type { Notice } from "@shared/types.ts";

/** 단지 위치를 지도 앱에서 연다. 통근 시간은 거기서 길찾기로 본다. */
export function MapLinks({ n }: { n: Notice }) {
  // 마이홈 잔여세대는 주소가 없어 공고명(지구명)으로 찾는다.
  const where = n.address
    ? searchableAddress(n.address)
    : n.name.replace(/\(.*$/, "").trim();
  return (
    <>
      <a href={kakaoSearch(where)} target="_blank" rel="noreferrer">
        카카오맵
      </a>{" "}
      <a href={naverSearch(where)} target="_blank" rel="noreferrer">
        네이버 지도
      </a>
    </>
  );
}
