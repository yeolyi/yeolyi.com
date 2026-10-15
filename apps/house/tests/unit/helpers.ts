import {
  DEFAULT_SETTINGS,
  type Notice,
  type Settings,
  type Unit,
} from "../../supabase/functions/_shared/types.ts";

// 테스트 가구: 예비신혼 둘, 경기 성남 거주. 숫자는 각 테스트의 기대값과 맞물려 있어 바꾸면 테스트도 고친다.
const HOUSEHOLD: Partial<Settings> = {
  areas: ["서울", "경기"],
  people: [
    {
      name: "갑",
      birth: "1999-11-01",
      sido: "경기",
      sigungu: "성남시",
      movedInAt: "2026-01-07",
      householder: true,
      accountOpenedAt: "2009-01-01",
      accountCount: 105,
      accountPaidMan: 635,
    },
    {
      name: "을",
      birth: "",
      sido: "",
      sigungu: "",
      movedInAt: "",
      householder: false,
      accountOpenedAt: "",
      accountCount: 0,
      accountPaidMan: 0,
    },
  ],
  equityEok: 5.5,
  liquidEok: 2.2,
  totalAssetsEok: 5.8,
  incomeMan: 950,
};

export const TODAY = "2026-09-17";
export const settings = (over: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  ...HOUSEHOLD,
  ...over,
});

export const notice = (over: Partial<Notice> = {}): Notice => ({
  id: "ah:1:1",
  source: "applyhome",
  kind: "APT",
  name: "테스트 단지",
  address: "경기도 성남시 분당구 정자동 90번지",
  sido: "경기",
  announcedAt: "2026-09-10",
  spStart: "2026-09-21",
  spEnd: "2026-09-21",
  r1Start: "2026-09-22",
  r1End: "2026-09-22",
  winnerAt: "2026-09-29",
  publicHousing: false,
  regulated: true,
  firstSeenAt: TODAY,
  ...over,
});

export const unit = (topPriceMan: number, over: Partial<Unit> = {}): Unit => ({
  type: `${String(Math.round(topPriceMan / 2000)).padStart(3, "0")}A`,
  area: 84,
  total: 10,
  special: 5,
  topPriceMan,
  young: 0,
  newlywed: 0,
  firstHome: 0,
  newborn: 0,
  ...over,
});
