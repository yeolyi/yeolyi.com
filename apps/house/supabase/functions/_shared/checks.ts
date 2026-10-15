import { PUBLIC_ASSET_CAP_EOK } from "./rules.ts";
import type { Notice, Settings } from "./types.ts";
import { assetGated, type Verdict } from "./verdict.ts";

// 카드·상세의 "왜 후보인지, 왜 아닌지" — 기준마다 한 줄. 값과 기준과의 부등식.
export type Check = {
  key: string;
  label: string;
  value: string;
  ok: boolean | undefined;
  detail: string;
};

export function checks(n: Notice, v: Verdict, s: Settings): Check[] {
  const out: Check[] = [];
  out.push({
    key: "region",
    label: "지역",
    value: n.sido || "미상",
    ok: v.region === "in",
    detail: v.region === "in" ? "" : "고른 시도 밖",
  });
  const t = v.tickets;
  const tickets = [
    t.young && `청년 ${t.young}`,
    t.newlywed && `신혼 ${t.newlywed}`,
    t.firstHome && `생애최초 ${t.firstHome}`,
    t.newborn && `신생아 ${t.newborn}`,
  ].filter(Boolean);
  out.push({
    key: "tickets",
    label: "특공 물량",
    value: tickets.length ? tickets.join(" · ") : n.units ? "없음" : "미상",
    ok: !n.units ? undefined : tickets.length ? true : undefined,
    detail: "",
  });
  if (assetGated(n)) {
    out.push({
      key: "asset",
      label: "자산 자격",
      value:
        s.totalAssetsEok === null
          ? "총자산 모름"
          : `총자산 ${s.totalAssetsEok}억`,
      ok: s.totalAssetsEok === null ? undefined : !v.assetBlocked,
      detail: `${v.assetBlocked ? ">" : "≤"} ${PUBLIC_ASSET_CAP_EOK}억`,
    });
  }
  return out;
}
