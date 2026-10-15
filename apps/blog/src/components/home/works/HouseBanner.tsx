import { clsx } from "clsx";
import { usePointer } from "./pointer";

// 청약 알리미(house.yeolyi.com)의 "내 순위" 조각: 신혼부부 특별공급 소득 구간 막대 위의 우리 가구 세로선.
// 포인터를 좌우로 움직이면 가구 소득이 바뀌고, 세로선이 따라가며 어느 구간에서 시작하는지 바로 보인다.
// 구간은 공공분양 맞벌이(공공주택 특별법 시행규칙 별표 6 2.나): 우선 120% 이하 70%, 일반 140% 이하 20%, 추첨 200% 이하 10%.
// 기준 금액은 2026년 도시근로자 월평균소득(3인 이하 753만 원). 물량은 84세대 견본.
const AXIS = 220; // 막대 오른쪽 끝(%)
const BASE_MAN = 753;
const UNITS = 84;
const TIERS = [
  { label: "우선", cap: 120, share: 70, fill: "bg-foreground" },
  { label: "일반", cap: 140, share: 20, fill: "bg-muted-foreground" },
  { label: "추첨", cap: 200, share: 10, fill: "bg-border" },
] as const;
const DEFAULT_PCT = 96;

export default function HouseBanner() {
  const { pointer, handlers } = usePointer();
  // 막대는 좌우 여백(px-4/6) 안쪽. 포인터 x 를 그 폭의 비율로 바꾼다.
  const pct = pointer
    ? Math.round(
        Math.min(
          AXIS,
          Math.max(0, ((pointer.x - 24) / (pointer.w - 48)) * AXIS),
        ),
      )
    : DEFAULT_PCT;
  const at = TIERS.findIndex((t) => pct <= t.cap);
  const tier = TIERS[at];
  const left = (p: number) => `${(p / AXIS) * 100}%`;
  return (
    <div
      className="bg-background absolute inset-0 flex touch-none flex-col justify-center gap-2 px-4 sm:px-6"
      {...handlers}
    >
      <p className="flex items-baseline justify-between gap-3 text-base whitespace-nowrap">
        <span>
          월{" "}
          <b className="tabular-nums">{Math.round((pct * BASE_MAN) / 100)}</b>만
          원 · <b className="tabular-nums">{pct}%</b>
        </span>
        <span className="text-muted-foreground truncate">
          {tier
            ? `${tier.label} 구간 · 약 ${Math.ceil((UNITS * tier.share) / 100)}세대`
            : "소득 상한을 넘어요"}
        </span>
      </p>
      <div className="relative">
        <div className="flex h-7 sm:h-9">
          {TIERS.map((t, i) => (
            <div
              key={t.label}
              className={clsx(
                "border-background flex items-center justify-center border-r-2 font-mono text-sm",
                t.fill,
                i === 0 ? "text-background" : "text-foreground",
                tier && i !== at && "opacity-40",
              )}
              style={{
                width: left(t.cap - (TIERS[i - 1]?.cap ?? 0)),
              }}
            >
              {t.share}%
            </div>
          ))}
        </div>
        {/* 우리 가구 세로선 */}
        <div
          className="bg-foreground absolute -top-1.5 -bottom-1.5 w-[3px] -translate-x-1/2"
          style={{ left: left(pct) }}
        />
        <div className="text-muted-foreground relative mt-1 h-4 font-mono text-xs">
          {/* 120·140 은 가까워 좁은 화면에서 붙으니 앞 것은 왼쪽, 뒤 것은 오른쪽으로 비킨다 */}
          {TIERS.map((t, i) => (
            <span
              key={t.label}
              className={clsx(
                "absolute",
                i === 0
                  ? "-translate-x-full pr-0.5"
                  : i === 1
                    ? "pl-0.5"
                    : "-translate-x-1/2",
              )}
              style={{ left: left(t.cap) }}
            >
              {t.cap}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
