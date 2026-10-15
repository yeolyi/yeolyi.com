import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

// 접기 — 상자 없이 화살표 아이콘(chevron-right)과 글자만, 펼치면 90도 돈다. 네이티브 details/summary 라
// 키보드·찾기(Ctrl+F 로 접힌 내용 열기)는 브라우저가 한다. 글(MDX)에서는 details·summary 를 이것으로 바꿔 끼운다.
//   <Details><Summary>풀이 보기</Summary>내용</Details>
export function Details({
  className,
  ...props
}: ComponentPropsWithoutRef<"details">) {
  return (
    <details
      className={clsx("group/details [&>:not(summary)]:mt-[0.5rlh]", className)}
      {...props}
    />
  );
}

export function Summary({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"summary">) {
  return (
    <summary
      className={clsx(
        // 누르면 내용물만 1px 아래로(높이가 늘어난 만큼 아래 마진으로 되돌린다). 기본 삼각형은 숨긴다.
        "hover:bg-foreground hover:text-background focus-fill flex w-fit cursor-pointer list-none items-center gap-1.5 active:-mb-px active:pt-px [&::-webkit-details-marker]:hidden",
        className,
      )}
      {...props}
    >
      <ChevronRight
        aria-hidden
        className="size-[1.25em] flex-none transition-transform group-open/details:rotate-90"
      />
      {children}
    </summary>
  );
}
