import { clsx } from "clsx";
import type { ReactNode } from "react";

// 단계 배너 — 서비스 헤더 바로 아래 한 줄. 아직 만드는 중(베타)이라는 걸 알리고 의견 받을 곳으로 잇는다(GOV.UK phase banner).
// 색이 없는 DS 라 단계 이름은 1px 테두리의 고정폭 작은 꼬리표, 문장은 보조 색, 의견 링크만 본문 링크다. 배경 띠는 두지 않는다.
// 폭과 위아래 여백은 쓰는 쪽이 정한다(서비스 헤더와 같은 폭으로).
export default function PhaseBanner({
  phase = "베타",
  feedbackHref,
  children = "틀린 곳이나 불편한 점을 알려 주세요.",
  className,
}: {
  phase?: string;
  feedbackHref: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={clsx(
        "text-muted-foreground flex flex-wrap items-baseline gap-x-2 text-base",
        className,
      )}
    >
      <strong className="text-foreground border px-1.5 font-mono text-sm font-normal">
        {phase}
      </strong>
      <span>
        {children} <a href={feedbackHref}>의견 보내기</a>
      </span>
    </p>
  );
}
