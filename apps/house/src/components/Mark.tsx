import { clsx } from "clsx";

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
      role="img"
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
