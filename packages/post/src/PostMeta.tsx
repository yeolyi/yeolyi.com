import { actions } from "astro:actions";
import { useEffect, useState } from "react";

interface PostMetaProps {
  date?: string; // CS 글은 날짜 없이 순서로 읽는다
  site: string; // 조회수를 셀 사이트(@yeolyi/track 의 site 와 같다)
}

// 글 메타 — "날짜 · 조회 N". 날짜는 prop 으로 서버 렌더(무JS·즉시 표시), 조회수는
// 글 페이지가 정적(getStaticPaths)이라 서버에서 못 읽어 하이드레이션 후 클라이언트에서
// 붙인다. 기록(@yeolyi/track)과 같은 키(사이트, 경로)로 읽는다.
export default function PostMeta({ date, site }: PostMetaProps) {
  const [viewCount, setViewCount] = useState<number | null>(null);

  useEffect(() => {
    actions.pageView
      .getCount({
        site,
        path: window.location.pathname.replace(/(.)\/$/, "$1"),
      })
      .then(({ data }) => {
        if (data) setViewCount(data.viewCount);
      });
  }, [site]);

  return (
    <p className="text-muted-foreground font-mono text-base">
      {[date, viewCount !== null && `조회 ${viewCount.toLocaleString()}`]
        .filter(Boolean)
        .join(" · ")}
    </p>
  );
}
