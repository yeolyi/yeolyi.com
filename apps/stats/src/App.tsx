import type { Session } from "@supabase/supabase-js";
import Button from "@yeolyi/ui/Button";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import { Select } from "@yeolyi/ui/Select";
import ServiceHeader from "@yeolyi/ui/ServiceHeader";
import { SITES } from "@yeolyi/ui/sites";
import { Table } from "@yeolyi/ui/Table";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// stats.yeolyi.com — 모든 사이트의 방문 지표. 나만 본다: 로그인은 누구나 되지만 public.stats 가 analytics.admins 에 없는 사람은 막는다.
// 한 화면에 사이트·기간 고르기 → 숫자 셋(방문자·페이지뷰·지금) → 막대 그래프 → 표 셋(페이지·유입·기기).

type Row = { key: string; views: number; visitors: number; site?: string };
type Stats = {
  views: number;
  visitors: number;
  live: number;
  series: { t: string; views: number; visitors: number }[];
  sites: Row[];
  pages: Row[];
  referrers: Row[];
  devices: Row[];
};

// 바깥 사이트도 같은 표에 쌓는다(@yeolyi/track 의 site 이름).
const SITE_OPTIONS = [
  { value: "all", label: "전체" },
  ...[...Object.keys(SITES).filter((s) => s !== "stats"), "chadcn"].map(
    (s) => ({ value: s, label: s }),
  ),
];

const PERIODS = [
  { value: "today", label: "오늘" },
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
  { value: "12m", label: "12개월" },
] as const;
type Period = (typeof PERIODS)[number]["value"];

// 기간은 보는 사람(나, 한국)의 자정·월초로 자른다. DB 도 묶음 단위를 Asia/Seoul 로 자른다.
function range(period: Period) {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(midnight.getTime() + 86_400_000);
  switch (period) {
    case "today":
      return { from: midnight, to: tomorrow, bucket: "hour" };
    case "7d":
      return {
        from: new Date(midnight.getTime() - 6 * 86_400_000),
        to: tomorrow,
        bucket: "day",
      };
    case "30d":
      return {
        from: new Date(midnight.getTime() - 29 * 86_400_000),
        to: tomorrow,
        bucket: "day",
      };
    case "12m":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 11, 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        bucket: "month",
      };
  }
}

const num = (n: number) => n.toLocaleString("ko-KR");

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <>
      <ServiceHeader
        name="통계"
        className="mx-auto max-w-[60rem] px-4 pt-[1.5rlh]"
      >
        {session && (
          <button
            type="button"
            className="text-muted-foreground cursor-pointer hover:underline"
            onClick={() => supabase.auth.signOut()}
          >
            로그아웃
          </button>
        )}
      </ServiceHeader>
      <main className="mx-auto max-w-[60rem] px-4 pt-[2rlh] pb-[5rlh]">
        {session === undefined ? null : session ? (
          <Dashboard />
        ) : (
          <>
            <h1>통계</h1>
            <p className="mt-[0.5rlh]">
              yeolyi.com과 그 아래 서비스의 방문 지표입니다. 관리자만 볼 수
              있습니다.
            </p>
            <div className="mt-[1rlh]">
              <Button
                variant="primary"
                onClick={() =>
                  supabase.auth.signInWithOAuth({
                    provider: "github",
                    options: { redirectTo: location.href },
                  })
                }
              >
                GitHub로 로그인
              </Button>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function Dashboard() {
  const [site, setSite] = useState("all");
  const [period, setPeriod] = useState<Period>("7d");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    const { from, to, bucket } = range(period);
    supabase
      .rpc("stats", {
        p_site: site === "all" ? null : site,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
        p_bucket: bucket,
      })
      .then(({ data, error }) => {
        if (stale) return;
        if (error)
          setError(
            error.code === "42501"
              ? "이 계정은 볼 수 없습니다."
              : error.message,
          );
        else {
          setError(null);
          setStats(data as Stats);
        }
      });
    return () => {
      stale = true;
    };
  }, [site, period]);

  if (error) return <p>{error}</p>;
  const bucket = range(period).bucket;
  return (
    <>
      <h1 className="sr-only">통계</h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Select
          aria-label="사이트"
          value={site}
          onValueChange={setSite}
          options={SITE_OPTIONS}
          className="w-40"
        />
        <RadioGroup
          aria-label="기간"
          options={[...PERIODS]}
          value={period}
          onValueChange={(v) => setPeriod(v as Period)}
        />
      </div>

      {stats && (
        <>
          <dl className="mt-[2rlh] grid grid-cols-3 gap-4">
            <Figure label="방문자" value={stats.visitors} />
            <Figure label="페이지뷰" value={stats.views} />
            <Figure label="지금(5분)" value={stats.live} />
          </dl>

          <div className="mt-[2rlh]">
            <Bars series={stats.series} bucket={bucket} />
          </div>

          {site === "all" && <RowTable title="사이트" rows={stats.sites} />}
          <RowTable
            title="페이지"
            rows={stats.pages}
            showSite={site === "all"}
          />
          <RowTable title="유입" rows={stats.referrers} />
          <RowTable
            title="기기"
            rows={stats.devices.map((d) => ({
              ...d,
              key: DEVICE[d.key] ?? d.key,
            }))}
          />
        </>
      )}
    </>
  );
}

const DEVICE: Record<string, string> = {
  desktop: "데스크톱",
  mobile: "휴대폰",
  tablet: "태블릿",
};

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-[2rem] leading-tight">{num(value)}</dd>
    </div>
  );
}

// 방문자 막대. 칸마다 <title> 로 값을 보인다(마우스를 올리면 뜬다). 라이브러리 없이 SVG 하나.
function Bars({ series, bucket }: { series: Stats["series"]; bucket: string }) {
  const W = 1000;
  const H = 200;
  const max = Math.max(1, ...series.map((s) => s.visitors));
  const bw = W / Math.max(1, series.length);
  // DB 는 묶음 시각을 Asia/Seoul 기준 '시간대 없는' 값으로 준다. Date 가 브라우저 시간대(한국)로 읽어 그대로 맞는다.
  const label = (t: string) => {
    const d = new Date(t);
    if (bucket === "hour") return `${d.getHours()}시`;
    if (bucket === "month")
      return `${d.getFullYear() % 100}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    return `${d.getMonth() + 1}.${d.getDate()}`;
  };
  const ends = series.length ? [series[0]!, series[series.length - 1]!] : [];
  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-[12.5rem] w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="기간별 방문자"
      >
        <line
          x1={0}
          x2={W}
          y1={H - 0.5}
          y2={H - 0.5}
          className="stroke-border"
          vectorEffect="non-scaling-stroke"
        />
        {series.map((s, i) => {
          const h = (s.visitors / max) * (H - 4);
          return (
            <rect
              key={s.t}
              x={i * bw + bw * 0.15}
              width={bw * 0.7}
              y={H - h}
              height={h}
              className="fill-foreground hover:fill-accent"
            >
              <title>{`${label(s.t)} · 방문자 ${num(s.visitors)} · 페이지뷰 ${num(s.views)}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="text-muted-foreground mt-1 flex justify-between font-mono text-base">
        {ends.map((s, i) => (
          <span key={i}>{label(s.t)}</span>
        ))}
      </figcaption>
    </figure>
  );
}

function RowTable({
  title,
  rows,
  showSite,
}: {
  title: string;
  rows: Row[];
  showSite?: boolean;
}) {
  return (
    <section className="mt-[2rlh]">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-[0.5rlh]">없음</p>
      ) : (
        <div className="mt-[0.5rlh]">
          {/* 표마다 숫자 열 폭을 같게 해 위아래로 훑어 비교할 수 있게 한다. */}
          <Table className="table-fixed">
            <thead>
              <tr>
                <th>{title}</th>
                <th className="w-28 text-right">방문자</th>
                <th className="w-28 text-right">페이지뷰</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.site ?? ""}${r.key}`}>
                  <td className="break-all">
                    {showSite && r.site && (
                      <span className="text-muted-foreground">{r.site} </span>
                    )}
                    {r.key}
                  </td>
                  <td className="text-right font-mono">{num(r.visitors)}</td>
                  <td className="text-right font-mono">{num(r.views)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
}
