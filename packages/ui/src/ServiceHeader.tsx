import { clsx } from "clsx";
import type { ReactNode } from "react";
import { siteUrl } from "./sites.ts";
import ThemeToggle from "./ThemeToggle.tsx";

// 서비스 헤더 — yeolyi.com 아래 서비스(house·carousel …)의 맨 위 한 줄. "yeolyi.com / 서비스 이름" 경로와 오른쪽 메뉴.
// 공통 헤더(블로그 머리띠의 GitHub·테마 같은 링크)는 서비스에 두지 않는다. 서비스가 주인공이고, 돌아갈 길은 경로의 yeolyi.com 하나면 된다.
// - 줄 높이는 블로그 머리띠와 같은 44px(min-h-control). 블로그에서 넘어와도 이름 줄이 같은 자리에 있게.
//   폭과 위 여백은 쓰는 쪽이 정한다(글 폭 앱은 measure-col + pt-[1.5lh] 로 블로그와 맞추고, 도구는 화면 폭).
// - nav: 지금 화면은 current 로 굵게(aria-current="page"). 오른쪽에 메뉴 말고 둘 것(로그아웃 등)은 children.
// - 오른쪽 끝엔 늘 테마 버튼. 서비스와 상관없이 어디서나 라이트/다크를 고를 수 있어야 한다.
export default function ServiceHeader({
  name,
  href = "/",
  nav = [],
  children,
  className,
}: {
  name: string;
  href?: string;
  nav?: { label: string; href: string; current?: boolean }[];
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={clsx(
        "min-h-control flex flex-wrap items-center justify-between gap-x-6 gap-y-1",
        className,
      )}
    >
      <span className="leading-snug">
        <a
          href={siteUrl("blog")}
          className="text-muted-foreground no-underline hover:underline"
        >
          yeolyi.com
        </a>
        <span aria-hidden className="text-muted-foreground">
          {" / "}
        </span>
        <a href={href} className="font-bold no-underline hover:underline">
          {name}
        </a>
      </span>
      {/* 오른쪽 끝 아이콘 버튼의 안쪽 여백(-mr-2)을 상쇄해 오른쪽 선을 글 폭에 맞춘다(블로그 머리띠와 같다). */}
      <div className="-mr-2 flex flex-wrap items-center gap-x-4">
        {(nav.length > 0 || children) && (
        <nav className="flex flex-wrap items-center gap-x-4" aria-label={`${name} 메뉴`}>
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              aria-current={n.current ? "page" : undefined}
              className={clsx(n.current && "font-bold")}
            >
              {n.label}
            </a>
          ))}
          {children}
        </nav>
        )}
        {(nav.length > 0 || children) && <span aria-hidden className="bg-border -mr-2 h-6 w-px" />}
        <ThemeToggle />
      </div>
    </header>
  );
}
