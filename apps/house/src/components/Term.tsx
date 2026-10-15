import { Popover } from "@base-ui/react/popover";
import { clsx } from "clsx";
import type { ReactNode } from "react";

/** 용어에 점선 밑줄 + 풀이(plain 이면 밑줄 없이, 세그먼트 칸처럼 모양이 따로 있을 때). 올리면(마우스) 또는 누르면(터치) 뜬다. 라벨은 전부 이걸로, 처음 보는 사람이 물어볼 수 있게. */
export function Term({
  tip,
  className,
  plain,
  children,
}: {
  tip: string;
  className?: string;
  plain?: boolean;
  children: ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        nativeButton={false}
        render={
          <span
            className={clsx(
              "cursor-help",
              !plain && "underline decoration-dotted underline-offset-4",
              className,
            )}
          />
        }
      >
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={6}
          collisionPadding={16}
          className="z-50"
        >
          <Popover.Popup className="tip">{tip}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** ✓ 통과 / ✗ 못 넘음(굵게) / ? 모름(보조 색). 판정 줄과 사다리가 같이 쓴다. 디자인 시스템엔 초록·빨강이 없어 기호와 굵기로 가른다. */
export function Mark({
  ok,
  neutral = "?",
}: {
  ok: boolean | null | undefined;
  neutral?: string;
}) {
  return (
    <span
      className={clsx(
        "w-4 shrink-0 text-center",
        ok == null ? "text-muted-foreground" : !ok && "font-bold",
      )}
      aria-label={ok == null ? "모름" : ok ? "통과" : "못 넘음"}
    >
      {ok == null ? neutral : ok ? "✓" : "✗"}
    </span>
  );
}
