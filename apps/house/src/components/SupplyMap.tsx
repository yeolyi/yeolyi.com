import { clsx } from "clsx";
import type { ReactNode } from "react";

// 청약의 지도: 누가 짓나(민영·공공) × 누구에게 먼저 주나(특별·일반). 두 갈래가 서로 독립이라 나무 대신 2×2 표로 둔다.
// 칸 안의 항목은 가이드의 해당 쪽으로 간다. 이 표는 특별공급 쪽에 있어서, 그 뒤에 나올 개념(가점제 등)은 이름을 적지 않는다. at 을 주면 그 칸을 강조한다(쪽 위치 표시).
export type Cell =
  | "private-special"
  | "private-general"
  | "public-special"
  | "public-general";

const G = (slug: string, label: string) => (
  <a key={slug + label} href={`/guide/${slug}`}>
    {label}
  </a>
);
const list = (items: ReactNode[]) =>
  items.flatMap((x, i) => (i ? [", ", x] : [x]));

const CELLS: Record<Cell, ReactNode> = {
  "private-special": list([
    G("newlywed", "신혼부부"),
    G("first-home", "생애최초"),
    G("newborn", "신생아"),
    G("other-special", "다자녀"),
    G("other-special", "노부모 부양"),
  ]),
  "private-general": [G("rank", "1순위"), ", 2순위"],
  "public-special": list([
    G("newlywed", "신혼부부"),
    G("first-home", "생애최초"),
    G("newborn", "신생아"),
    G("other-special", "청년"),
    G("other-special", "다자녀"),
    G("other-special", "노부모 부양"),
  ]),
  "public-general": [G("rank", "1순위"), ", 2순위"],
};

export function SupplyMap({ at = [] }: { at?: Cell[] }) {
  const td = (c: Cell) => (
    <td className={clsx("align-top", at.includes(c) && "bg-muted font-bold")}>
      {CELLS[c]}
    </td>
  );
  return (
    <div className="mt-[1rlh]">
      <table className="w-full table-fixed border-collapse text-base [&_td]:border [&_td]:p-3 [&_th]:border [&_th]:p-3 [&_th]:text-left">
        <thead>
          <tr>
            <th className="w-[5.5rem]" />
            <th>
              <a href="/guide/special">특별공급</a>
            </th>
            <th>일반공급</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>
              <a href="/guide/sector">민영</a>
            </th>
            {td("private-special")}
            {td("private-general")}
          </tr>
          <tr>
            <th>공공</th>
            {td("public-special")}
            {td("public-general")}
          </tr>
        </tbody>
      </table>
      <p className="text-muted-foreground mt-[0.25rlh] text-base">
        다 끝나고 남은 집은 <a href="/guide/leftover">무순위·임의공급</a>으로
        다시 뽑습니다.
      </p>
    </div>
  );
}

export const CELL_LABEL: Record<Cell, string> = {
  "private-special": "민영 · 특별공급",
  "private-general": "민영 · 일반공급",
  "public-special": "공공 · 특별공급",
  "public-general": "공공 · 일반공급",
};
