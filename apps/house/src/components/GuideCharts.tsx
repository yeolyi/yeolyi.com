import { clsx } from "clsx";
import type { ReactNode } from "react";

// 가이드의 작은 차트. DS 에 색이 없어 순서·구분은 잉크 → 보조 → 연한 회색으로, 이름은 범례와 칸 안 숫자로 준다.
// 칸 사이는 2px 바탕색 틈. 칸 너비는 % 대신 flex 비율로(틈까지 더하면 100%를 넘쳐 가로로 밀린다). 화면 읽기 프로그램에는 같은 내용을 표로 준다.

const FILL = [
  "bg-foreground text-background",
  "bg-muted-foreground text-background",
  "bg-muted text-foreground",
] as const;
const swatch = (i: number) => FILL[i]!.split(" ")[0];

function Legend({ names }: { names: string[] }) {
  return (
    <ul
      className="text-muted-foreground flex flex-wrap gap-x-4 text-base"
      aria-hidden
    >
      {names.map((n, i) => (
        <li key={n} className="flex items-center gap-1.5">
          <span className={clsx("inline-block size-3", swatch(i))} />
          {n}
        </li>
      ))}
    </ul>
  );
}

/** 100% 누적 막대 여러 줄. 줄마다 같은 순서의 칸(names)이고 값은 합이 100. */
export function StackBars({
  names,
  rows,
  caption,
}: {
  names: string[];
  rows: { label: string; values: number[] }[];
  caption?: ReactNode;
}) {
  const labeled = rows.length > 1 || rows[0]!.label;
  return (
    <figure className="mt-[0.5rlh]">
      <Legend names={names} />
      <div
        className={clsx(
          "mt-[0.5rlh] grid gap-x-3 gap-y-2",
          labeled ? "grid-cols-[max-content_1fr]" : "grid-cols-1",
        )}
        aria-hidden
      >
        {rows.map((r) => (
          <div key={r.label} className="contents">
            {labeled && <span className="self-center">{r.label}</span>}
            <div className="flex h-8 gap-[2px]">
              {r.values.map((v, i) =>
                v > 0 ? (
                  <div
                    key={names[i]}
                    className={clsx(
                      "flex items-center justify-center font-mono text-base tabular-nums",
                      FILL[i],
                    )}
                    style={{ flex: `${v} 1 0` }}
                    title={`${r.label ? `${r.label} ` : ""}${names[i]} ${v}%`}
                  >
                    {v}%
                  </div>
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
      {caption && (
        <figcaption className="text-muted-foreground mt-[0.5rlh] text-base">
          {caption}
        </figcaption>
      )}
      <div className="sr-only">
        <table>
          <thead>
            <tr>
              <th />
              {names.map((n) => (
                <th key={n}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                {r.values.map((v, i) => (
                  <td key={names[i]}>{v}%</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** 특별공급 종류별 물량 상한(건설량 대비 %). 민영은 규칙(제35조의3·40·41·43·46조), 공공은 공공주택 특별법 시행규칙 별표 6(청년은 별표 6의6).
 *  민영 신혼부부는 "15% 범위에서 국토부 고시 비율", 생애최초는 공공택지 밖이면 7%. 민영 신혼·생애최초·신생아는 85㎡ 이하 건설량 기준. */
const SHARES: { label: string; private?: number; public?: number }[] = [
  { label: "신혼부부", private: 15, public: 10 },
  { label: "생애최초", private: 17, public: 15 },
  { label: "신생아", private: 10, public: 20 },
  { label: "다자녀", private: 10, public: 10 },
  { label: "노부모 부양", private: 3, public: 5 },
  { label: "청년", public: 15 },
];
const SHARE_MAX = 20;
export function SpecialShareChart() {
  const bar = (v: number | undefined, i: number) => (
    <div className="flex h-5 items-center gap-2">
      {v ? (
        <div
          className={clsx("h-full", swatch(i))}
          style={{ width: `${(v / SHARE_MAX) * 100}%` }}
        />
      ) : null}
      <span
        className={clsx(
          "font-mono text-base tabular-nums",
          !v && "text-muted-foreground",
        )}
      >
        {v ? `${v}%` : "없음"}
      </span>
    </div>
  );
  return (
    <figure className="mt-[0.5rlh]">
      <Legend names={["민영", "공공"]} />
      <div
        className="mt-[0.5rlh] grid grid-cols-[max-content_1fr] gap-x-3 gap-y-3"
        aria-hidden
      >
        {SHARES.map((s) => (
          <div key={s.label} className="contents">
            <span className="self-center">{s.label}</span>
            <div className="space-y-[2px]">
              {bar(s.private, 0)}
              {bar(s.public, 1)}
            </div>
          </div>
        ))}
      </div>
      <figcaption className="text-muted-foreground mt-[0.5rlh] text-base">
        건설량 가운데 그 특별공급에 줄 수 있는 몫의 상한입니다. 민영 신혼부부는
        15% 안에서 국토교통부가 정하고, 민영 생애최초는 공공택지 밖이면
        7%입니다. 청년은 공공 나눔형·토지임대부에만 있습니다.
      </figcaption>
      <div className="sr-only">
        <table>
          <thead>
            <tr>
              <th>종류</th>
              <th>민영</th>
              <th>공공</th>
            </tr>
          </thead>
          <tbody>
            {SHARES.map((s) => (
              <tr key={s.label}>
                <td>{s.label}</td>
                <td>{s.private ? `${s.private}%` : "없음"}</td>
                <td>{s.public ? `${s.public}%` : "없음"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
