import { addDays, fmtDate, todayYmd } from "@shared/dates.ts";
import { regionsOf } from "@shared/rules.ts";
import { applyEnd, isLive } from "@shared/site.ts";
import type { Notice, Settings } from "@shared/types.ts";
import { judge, type Verdict } from "@shared/verdict.ts";
import Input from "@yeolyi/ui/Input";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import { useMemo } from "react";
import { facts } from "../components/Facts.tsx";
import { nextMilestone } from "../components/Schedule.tsx";
import { useNotices } from "../data.ts";
import { go, setQuery } from "../util.ts";
import { isFresh } from "./Settings.tsx";

// 블로그 글 목록과 같은 꼴: 날짜(고정폭) + 제목 링크, 아래에 한 줄. 판정의 근거와 나머지는 상세에.
// 아직 개인화하지 않았으면 판정하지 않는다(기본값은 임의의 가정이라 남의 조건으로 거르는 셈이다). 진행 중·마감만 나눈다.
// 조건을 넣었으면 진행 중인 공고를 후보·제외로 나누고, 마감은 판정과 상관없이 최근 3개월.
type Scope = "candidate" | "rejected" | "live" | "closed";
const CLOSED_DAYS = 90;
const SCOPES: Record<Scope, { label: string; empty: string }> = {
  candidate: {
    label: "후보",
    empty: "지금 후보가 없습니다. 넣을 수 있는 새 공고가 나오면 여기 뜹니다.",
  },
  rejected: { label: "제외", empty: "빠진 공고가 없습니다." },
  live: {
    label: "진행 중",
    empty: "지금 접수 중이거나 접수를 앞둔 공고가 없습니다.",
  },
  closed: { label: "마감", empty: "최근 3개월에 접수가 끝난 공고가 없습니다." },
};

export function Notices({ query, s }: { query: URLSearchParams; s: Settings }) {
  const notices = useNotices();
  const fresh = isFresh(s);
  const scopes: [Scope, ...Scope[]] = fresh
    ? ["live", "closed"]
    : ["candidate", "rejected", "closed"];
  const asked = query.get("status") as Scope | null;
  const scope: Scope = asked && scopes.includes(asked) ? asked : scopes[0];
  const today = todayYmd();

  // 검색은 단지 이름·주소·사업주체에서 띄어쓰기를 무시하고 찾는다. 묶음 숫자도 검색 결과로 센다.
  const q = query.get("q") ?? "";
  const needle = q.replace(/\s+/g, "").toLowerCase();
  const judged = useMemo(
    () =>
      (notices.data ?? [])
        .filter(
          (n) =>
            !needle ||
            [n.name, n.address, n.builder]
              .join(" ")
              .replace(/\s+/g, "")
              .toLowerCase()
              .includes(needle),
        )
        .map((n) => ({
          n,
          v: judge(n, s),
          live: isLive(n, today),
        })),
    [notices.data, s, today, needle],
  );
  const since = addDays(today, -CLOSED_DAYS);
  const inScope = (x: (typeof judged)[number], sc: Scope) =>
    sc === "closed"
      ? !x.live && applyEnd(x.n) >= since
      : sc === "live"
        ? x.live
        : x.live && x.v.status === sc;
  const rows = judged
    .filter((x) => inScope(x, scope))
    .map((x) => {
      const next = nextMilestone(x.n, today);
      // 이미 시작한 접수는 마감일로 줄 세운다. 목록에 보이는 날짜도 그것이다.
      const when =
        next && (next.date < today && next.end ? next.end : next.date);
      return { ...x, next, when };
    })
    .sort((a, b) =>
      scope === "closed"
        ? applyEnd(a.n) > applyEnd(b.n)
          ? -1
          : 1
        : (a.when ?? "9") < (b.when ?? "9")
          ? -1
          : 1,
    );

  return (
    <>
      <h1>공고</h1>
      <p className="mt-[0.5rlh]">
        {fresh ? (
          <>
            청약홈과 마이홈에서 모은 전국 공고입니다.{" "}
            <a href="/settings">개인화</a>하면 넣을 수 있는 공고만 골라
            드립니다.
          </>
        ) : (
          <>
            사는 곳 기준으로 넣을 수 있는{" "}
            {regionsOf(s.people.map((p) => p.sido).filter(Boolean))
              .map((r) => r.label)
              .join("·") || "전국"}{" "}
            공고를 <a href="/settings">개인화</a>에 맞춰 골랐습니다.
          </>
        )}
      </p>
      <div className="mt-[1rlh]">
        <RadioGroup
          aria-label="공고 묶음"
          value={scope}
          onValueChange={(v) =>
            go("", {
              ...(v === scopes[0] ? {} : { status: v }),
              ...(q ? { q } : {}),
            })
          }
          options={scopes.map((sc) => ({
            value: sc,
            label: `${SCOPES[sc].label} ${judged.filter((x) => inScope(x, sc)).length}`,
          }))}
        />
      </div>

      <div className="mt-[0.5rlh]">
        <Input
          type="search"
          aria-label="공고 검색"
          placeholder="단지 이름이나 주소로 찾기"
          value={q}
          onChange={(e) => setQuery("q", e.target.value || undefined)}
          // 브라우저 기본 지우기 버튼(파란 ×)은 DS 색이 아니라 숨긴다.
          className="w-full max-w-md [&::-webkit-search-cancel-button]:appearance-none"
        />
      </div>

      <div className="mt-[1rlh]">
        {notices.isPending && <p className="meta">불러오는 중</p>}
        {notices.error && (
          <p className="mark px-2">공고를 못 읽음: {notices.error.message}</p>
        )}
        {notices.data && rows.length === 0 && (
          <p className="text-muted-foreground">
            {q ? `"${q}"에 맞는 공고가 없습니다.` : SCOPES[scope].empty}
          </p>
        )}
        <ul className="space-y-[0.5rlh]">
          {rows.map(({ n, v, next, when }) => (
            <li key={n.id}>
              <span className="meta">
                {scope === "closed"
                  ? fmtDate(applyEnd(n))
                  : when
                    ? `${when !== next?.date ? "~" : ""}${fmtDate(when)}`
                    : ""}{" "}
              </span>
              {scope !== "closed" && next && (
                <span className="text-muted-foreground">
                  {next.label
                    .replace(" 접수", "")
                    .replace("(첫날 특공)", "")}{" "}
                </span>
              )}
              <a href={`/notices/${encodeURIComponent(n.id)}`}>{n.name}</a>
              <p className="text-muted-foreground text-base">
                {summary(n, v, scope)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/** 한 줄 요약. 제외는 걸린 이유를 먼저. */
function summary(n: Notice, v: Verdict, scope: Scope): string {
  // 제외 묶음은 걸린 이유만 보인다(지역·분양가 같은 부가 정보는 상세에).
  if (scope === "rejected")
    return v.region === "out"
      ? `사는 곳의 권역 밖(${n.sido})`
      : v.assetBlocked
        ? `자산 기준 초과(${v.assetBlocked})`
        : "";
  const price =
    v.maxPriceEok === undefined
      ? "분양가 미상"
      : v.minPriceEok === v.maxPriceEok
        ? `${v.maxPriceEok}억`
        : `${v.minPriceEok}~${v.maxPriceEok}억`;
  return [n.sido, ...facts(n).slice(0, 2), price].filter(Boolean).join(" · ");
}
