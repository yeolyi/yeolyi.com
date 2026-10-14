import { clsx } from "clsx";
import type { ComponentPropsWithoutRef } from "react";

// 한 줄 입력 — 2px 잉크 상자, 높이 44px. 내용 폭에 맞춰 늘고 준다(최소 20ch).
// 라벨은 칸 위, 설명은 라벨 아래(쓰는 쪽이 둔다). 표준 input prop 그대로.
export default function Input({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      type="text"
      className={clsx(
        "border-foreground bg-background placeholder:text-muted-foreground focus-border h-control [field-sizing:content] max-w-full min-w-[20ch] border-2 px-3.5 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
