import { clsx } from "clsx";
import type { ReactNode } from "react";

// 가이드의 작은 차트. DS 에 색이 없어 순서·구분은 잉크 → 보조 → 연한 회색으로, 이름은 범례와 칸 안 숫자로 준다.
// 칸 사이는 2px 바탕색 틈. 칸 너비는 % 대신 flex 비율로(틈까지 더하면 100%를 넘쳐 가로로 밀린다). 화면 읽기 프로그램에는 같은 내용을 표로 준다.

const FILL = [
  "bg-foreground text-background",
  "bg-muted-foreground text-background",
  "bg-muted text-foreground",
] as const;
const swatch = (i: number) => FILL[i]?.split(" ")[0];

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
  const labeled = rows.length > 1 || rows[0]?.label;
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
