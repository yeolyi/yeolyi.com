import { clsx } from "clsx";
import type { ComponentPropsWithoutRef } from "react";

// 여러 줄 입력 — 한 줄 입력과 같은 2px 잉크 상자에 높이만 늘린다(rows). 코드를 받는 곳은 font-mono 를 준다.
export default function Textarea({
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={clsx(
        "border-foreground bg-background placeholder:text-muted-foreground focus-border w-full border-2 px-3.5 py-2.5 leading-normal disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
