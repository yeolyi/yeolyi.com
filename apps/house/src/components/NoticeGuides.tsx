import { isMainRound } from "@shared/site.ts";
import type { Notice } from "@shared/types.ts";
import type { Verdict } from "@shared/verdict.ts";
import { guidePages } from "../views/Guide.tsx";

// 이 공고를 읽는 데 필요한 가이드 쪽만 골라 가이드 순서대로. 용어 풀이는 공고 화면에 따로 두지 않고 여기로 모은다.
export function NoticeGuides({ n, v }: { n: Notice; v: Verdict }) {
  const main = isMainRound(n);
  const t = v.tickets;
  const slugs = [
    n.publicHousing || n.kind === "신혼희망타운" ? "public-types" : "sector",
    n.regulated && "regulated",
    ...(main
      ? [
          "special",
          t.newlywed && "newlywed",
          t.newlywed && "income",
          t.firstHome && "first-home",
          t.newborn && "newborn",
          t.young && "other-special",
          "rank",
          n.publicHousing ? "public-order" : "points",
          "local",
          "schedule",
        ]
      : ["leftover"]),
    "money",
    "after",
  ].filter((x): x is string => !!x);
  return (
    <ul className="list">
      {guidePages(slugs).map((p) => (
        <li key={p.slug}>
          <a href={`/guide/${p.slug}`}>{p.title}</a>
        </li>
      ))}
    </ul>
  );
}
