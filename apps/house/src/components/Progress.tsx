// 여러 쪽을 차례로 넘기는 곳(개인화 질문, 가이드)의 위치. 숫자·묶음 이름 대신 글 폭만큼 늘어나는 막대 하나로 보인다.
export function Progress({
  at,
  of,
  label,
}: {
  at: number;
  of: number;
  label: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={of}
      aria-valuenow={at}
      className="bg-muted h-1 w-full"
    >
      <div
        className="bg-foreground h-full"
        style={{ width: `${(at / of) * 100}%` }}
      />
    </div>
  );
}
