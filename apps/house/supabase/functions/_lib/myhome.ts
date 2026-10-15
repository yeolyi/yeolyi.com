import { normalizeSido } from "../_shared/classify.ts";
import { normalizeYmd } from "../_shared/dates.ts";
import type { Notice } from "../_shared/types.ts";
import { publicTypeOf } from "./applyhome.ts";

// 마이홈(myhome.go.kr) 공공분양 공고판이 쓰는 내부 조회. 청약홈에 안 실리는 LH 잔여세대 추가모집·일반매각을 보충한다.
// 공개 API가 아니라 필드가 바뀌면 깨진다(CLAUDE.md "원천이 바뀌었을 때"). 폼 인코딩 POST, 응답은 5건씩 페이지.

const LIST_URL =
  "https://www.myhome.go.kr/hws/portal/sch/selectLttotHouseList.do";
const DETAIL_URL =
  "https://www.myhome.go.kr/hws/portal/sch/selectLttotHouseDetailView.do?pblancId=";
// 마이홈 시도 표기 → 청약홈 표기. "전남광주통합특별시"처럼 앞에 시도가 붙은 것도 앞 두 글자로 맞춘다.
const SIDO: Record<string, string> = {
  서울: "서울",
  경기: "경기",
  인천: "인천",
  부산: "부산",
  대구: "대구",
  광주: "광주",
  대전: "대전",
  울산: "울산",
  세종: "세종",
  강원: "강원",
  제주: "제주",
  충청북: "충북",
  충북: "충북",
  충청남: "충남",
  충남: "충남",
  전라북: "전북",
  전북: "전북",
  전라남: "전남",
  전남: "전남",
  경상북: "경북",
  경북: "경북",
  경상남: "경남",
  경남: "경남",
};
/** 전남광주통합특별시는 "전남"으로 시작해 아래 표로는 전부 전남이 되므로 공고명으로 먼저 가른다. */
export const sidoOf = (brtc: string, name = "") =>
  /전남광주|광주전남/.test(brtc)
    ? normalizeSido(brtc, name)
    : Object.entries(SIDO).find(([k]) => brtc.startsWith(k))?.[1];
// 본청약은 청약홈이 더 완전하니 여기선 청약홈에 없는 종류만 남긴다.
// 무순위·추가모집: 공공 사업주체는 비규제지역 무순위를 청약홈 밖에서 받을 수 있다(주택공급규칙 제19조 ⑥ 괄호).
// 2025-09~2026-09 에 이 둘로 새로 걸린 3건(GH 고덕 무순위 5차, LH 양주옥정 추가모집, 서귀포 무순위 선착순)은 모두 청약홈에 없던 차수다.
const LEFTOVER = /잔여|추가입주|추가 입주|추가모집|무순위|일반매각|공가|해약/;

export type Row = {
  pblancId: string;
  pblancNm: string;
  suplyInsttNm: string;
  brtcCodeNm: string;
  rcritPblancDe: string;
  przwnerPresnatnDe?: string | null;
};
export type Page = (
  fromYm: string,
  toYm: string,
  pageIndex: number,
) => Promise<{ rows: Row[]; total: number }>;

const defaultPage: Page = async (fromYm, toYm, pageIndex) => {
  const body = new URLSearchParams({
    pageIndex: String(pageIndex),
    srchbrtcCode: "",
    srchsignguCode: "",
    srchHouseTy: "",
    srchSuplyPrvuseAr: "",
    srchPrgrStts: "",
    srchPblancNm: "",
    srchLttotPblancDeYearMtBegin: fromYm,
    srchLttotPblancDeYearMtEnd: toYm,
  });
  const res = await fetch(LIST_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer:
        "https://www.myhome.go.kr/hws/portal/sch/selectLttotHouseView.do",
      "x-requested-with": "XMLHttpRequest",
      "user-agent": "Mozilla/5.0",
    },
    body,
  });
  if (!res.ok) throw new Error(`마이홈 ${res.status}`);
  const json = (await res.json()) as { resultList?: Row[]; resultCnt?: number };
  return { rows: json.resultList ?? [], total: json.resultCnt ?? 0 };
};

export function toNotice(row: Row, sido: string, now: string): Notice {
  return {
    id: `mh:${row.pblancId}`,
    source: "myhome",
    kind: "LH잔여",
    name: row.pblancNm,
    sido,
    builder: row.suplyInsttNm,
    url: DETAIL_URL + row.pblancId,
    announcedAt: normalizeYmd(row.rcritPblancDe) ?? now,
    winnerAt: normalizeYmd(row.przwnerPresnatnDe ?? undefined),
    publicHousing: true,
    publicType: publicTypeOf(row.pblancNm),
    firstSeenAt: now,
  };
}

export class Myhome {
  requestCount = 0;
  private readonly page: Page;
  constructor(page: Page = defaultPage) {
    this.page = page;
  }

  /** fromYm~toYm(YYYYMM) 전국 LH 잔여세대류. 같은 공고가 여러 줄로 오므로 pblancId로 접는다. */
  async leftovers(
    fromYm: string,
    toYm: string,
    now: string,
  ): Promise<Notice[]> {
    const seen = new Map<string, Notice>();
    for (let p = 1; p < 60; p++) {
      this.requestCount++;
      const { rows, total } = await this.page(fromYm, toYm, p);
      for (const row of rows) {
        const sido = sidoOf(row.brtcCodeNm, row.pblancNm);
        if (!sido || !LEFTOVER.test(row.pblancNm) || seen.has(row.pblancId))
          continue;
        seen.set(row.pblancId, toNotice(row, sido, now));
      }
      if (!rows.length || p * 5 >= total) break;
    }
    return [...seen.values()];
  }
}
