import { normalizeYmd } from "../_shared/dates.ts";
import type { Kind, Notice, PublicType, Unit } from "../_shared/types.ts";

// 청약홈 분양정보 API(공공데이터포털). 민영 전부와 공공 본청약 전부를 담는다. 마이홈 공고와 12개월치를 대조해 확인했다.
// 인증키는 Edge Function 비밀값 APPLYHOME_KEY. 개발계정 하루 10,000회 — 한 사이클이 3 + 새 공고당 1회라 걸릴 일은 없다.

const BASE = "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1";
export type Row = Record<string, string | number | null>;
export type Fetch = (url: string) => Promise<unknown>;

const defaultFetch: Fetch = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`청약홈 ${res.status}`);
  return res.json();
};

const str = (r: Row, k: string) =>
  r[k] == null || r[k] === "" ? undefined : String(r[k]);
const num = (r: Row, k: string) => (r[k] == null ? 0 : Number(r[k]) || 0);
const ymd = (r: Row, k: string) => normalizeYmd(str(r, k));

/** 공공인가. 주택상세구분(국민/민영)이 정답이고, 그 칸이 비는 잔여세대·임의공급은 사업주체 이름으로 본다. */
const PUBLIC_BUILDER =
  /토지주택공사|주택도시공사|도시공사|도시개발공사|^LH|^SH|^GH/;
export function isPublic(r: Row): boolean {
  const dtl = str(r, "HOUSE_DTL_SECD_NM");
  return dtl
    ? dtl === "국민"
    : PUBLIC_BUILDER.test(str(r, "BSNS_MBY_NM") ?? "");
}
/** 나눔형(이익공유형)·토지임대부·선택형(6년 분양전환)은 공고명에만 드러난다. 그 외 공공은 일반형. 마이홈도 이것을 쓴다. */
export const publicTypeOf = (name: string): PublicType =>
  /이익공유|나눔형/.test(name)
    ? "나눔형"
    : /토지임대/.test(name)
      ? "토지임대부"
      : /분양전환|선택형/.test(name)
        ? "선택형"
        : "일반형";

// compact: 임의공급 조회만 공고일을 YYYYMMDD로 저장해서 조건값도 그 꼴이어야 걸러진다(하이픈을 주면 전부 통과, 반대면 전부 탈락 — 실측).
const LIST_OPS: { op: string; kind: (r: Row) => Kind; compact?: boolean }[] = [
  {
    op: "getAPTLttotPblancDetail",
    kind: (r) =>
      str(r, "HOUSE_SECD_NM") === "신혼희망타운" ? "신혼희망타운" : "APT",
  },
  { op: "getRemndrLttotPblancDetail", kind: () => "잔여세대" },
  { op: "getOPTLttotPblancDetail", kind: () => "임의공급", compact: true },
];
const UNITS_OP: Record<Kind, string> = {
  APT: "getAPTLttotPblancMdl",
  신혼희망타운: "getAPTLttotPblancMdl",
  잔여세대: "getRemndrLttotPblancMdl",
  임의공급: "getOPTLttotPblancMdl",
  LH잔여: "getAPTLttotPblancMdl", // 청약홈에 없는 공고라 부를 일이 없다
};

export function toNotice(r: Row, kind: Kind, now: string): Notice {
  const pub = isPublic(r);
  const name = str(r, "HOUSE_NM") ?? "";
  return {
    id: `ah:${str(r, "HOUSE_MANAGE_NO")}:${str(r, "PBLANC_NO")}`,
    source: "applyhome",
    kind,
    name,
    address: str(r, "HSSPLY_ADRES"),
    sido: str(r, "SUBSCRPT_AREA_CODE_NM") ?? "",
    builder: str(r, "BSNS_MBY_NM"),
    url: str(r, "PBLANC_URL"),
    announcedAt: ymd(r, "RCRIT_PBLANC_DE") ?? now,
    spStart: ymd(r, "SPSPLY_RCEPT_BGNDE"),
    spEnd: ymd(r, "SPSPLY_RCEPT_ENDDE"),
    // 잔여세대·임의공급은 순위 없는 접수 기간(SUBSCRPT_RCEPT_*) 하나뿐이라 1순위 칸에 둔다
    r1Start:
      ymd(r, "GNRL_RNK1_CRSPAREA_RCPTDE") ?? ymd(r, "SUBSCRPT_RCEPT_BGNDE"),
    r1End: ymd(r, "GNRL_RNK1_CRSPAREA_ENDDE") ?? ymd(r, "SUBSCRPT_RCEPT_ENDDE"),
    r2Start: ymd(r, "GNRL_RNK2_CRSPAREA_RCPTDE"),
    r2End: ymd(r, "GNRL_RNK2_CRSPAREA_ENDDE"),
    winnerAt: ymd(r, "PRZWNER_PRESNATN_DE"),
    contractStart: ymd(r, "CNTRCT_CNCLS_BGNDE"),
    contractEnd: ymd(r, "CNTRCT_CNCLS_ENDDE"),
    moveInYm: str(r, "MVN_PREARNGE_YM"),
    totalUnits: num(r, "TOT_SUPLY_HSHLDCO") || undefined,
    publicHousing: pub,
    publicType: pub && kind !== "신혼희망타운" ? publicTypeOf(name) : undefined,
    priceCap: str(r, "PARCPRC_ULS_AT") === "Y",
    regulated: str(r, "SPECLT_RDN_EARTH_AT") === "Y",
    firstSeenAt: now,
  };
}

export function toUnit(r: Row): Unit {
  return {
    type: str(r, "HOUSE_TY") ?? "",
    area: Number(str(r, "SUPLY_AR")) || 0,
    total: num(r, "SUPLY_HSHLDCO"),
    special: num(r, "SPSPLY_HSHLDCO"),
    topPriceMan: num(r, "LTTOT_TOP_AMOUNT") || undefined,
    young: num(r, "YGMN_HSHLDCO"),
    newlywed: num(r, "NWWDS_HSHLDCO"),
    firstHome: num(r, "LFE_FRST_HSHLDCO"),
    newborn: num(r, "NWBB_HSHLDCO"),
  };
}

export class Applyhome {
  requestCount = 0;
  private readonly fetchJson: Fetch;
  private readonly key: () => string | undefined;
  constructor(key: () => string | undefined, fetchJson: Fetch = defaultFetch) {
    this.fetchJson = fetchJson;
    this.key = key;
  }

  private async all(op: string, cond: Record<string, string>): Promise<Row[]> {
    const key = this.key();
    if (!key) throw new Error("APPLYHOME_KEY 가 없음");
    const rows: Row[] = [];
    for (let page = 1; page < 20; page++) {
      const q = new URLSearchParams({
        page: String(page),
        perPage: "500",
        serviceKey: key,
      });
      for (const [k, v] of Object.entries(cond)) q.set(`cond[${k}]`, v);
      this.requestCount++;
      const body = (await this.fetchJson(`${BASE}/${op}?${q}`)) as {
        data?: Row[];
        totalCount?: number;
      };
      rows.push(...(body.data ?? []));
      if (!body.data?.length || rows.length >= (body.totalCount ?? 0)) break;
    }
    return rows;
  }

  /** 공고일이 since 이후인 전국 공고. 시도는 사람마다 달라 거르지 않는다. */
  async notices(since: string, now: string): Promise<Notice[]> {
    const out: Notice[] = [];
    for (const { op, kind, compact } of LIST_OPS) {
      const rows = await this.all(op, {
        "RCRIT_PBLANC_DE::GTE": compact ? since.replace(/-/g, "") : since,
      });
      out.push(...rows.map((r) => toNotice(r, kind(r), now)));
    }
    return out;
  }

  /** 주택형별 세대수·분양가. 잔여세대·임의공급 조회엔 분양가와 특공 칸이 없다. */
  async units(n: Notice): Promise<Unit[]> {
    const [, houseManageNo, pblancNo] = n.id.split(":");
    const rows = await this.all(UNITS_OP[n.kind], {
      "HOUSE_MANAGE_NO::EQ": houseManageNo!,
      "PBLANC_NO::EQ": pblancNo!,
    });
    return rows.map(toUnit);
  }
}
