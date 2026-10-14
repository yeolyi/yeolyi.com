import Button from "@yeolyi/ui/Button";
import Checkbox from "@yeolyi/ui/Checkbox";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import { clsx } from "clsx";
import { useState } from "react";

// 홈 둘러보기 배너(Sections.astro)의 내용. 그림이 아니라 실제 부품이라 누르고 골라 볼 수 있다.

const SWATCHES = [
  { name: "바탕", bg: "bg-background", fg: "text-foreground" },
  { name: "옅은 바탕", bg: "bg-muted", fg: "text-foreground" },
  { name: "가는 선", bg: "bg-border", fg: "text-foreground" },
  { name: "보조", bg: "bg-muted-foreground", fg: "text-background" },
  { name: "기본", bg: "bg-foreground", fg: "text-background" },
  { name: "주황", bg: "bg-accent", fg: "text-on-accent" },
];

// 스타일: 색 띠를 누르면 그 띠가 넓어지고 이름이 보인다. 전환 없이 딱 바뀐다.
export function StylesBanner() {
  const [cur, setCur] = useState<number | null>(null);
  return (
    <div className="absolute inset-0 flex">
      {SWATCHES.map((s, i) => (
        <button
          key={s.name}
          type="button"
          aria-pressed={cur === i}
          onClick={() => setCur(cur === i ? null : i)}
          className={clsx(s.bg, s.fg, "focus-fill flex cursor-pointer items-end overflow-hidden p-3 text-left")}
          style={{ flexGrow: cur === i ? 3 : 1, flexBasis: 0 }}
        >
          <span className={clsx("font-mono text-base whitespace-nowrap", cur === i ? "visible" : "sr-only")}>{s.name}</span>
        </button>
      ))}
    </div>
  );
}

export function ComponentsBanner() {
  return (
    <div className="bg-background absolute inset-0 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4">
      <Button variant="primary">저장</Button>
      <RadioGroup options={["자동", "밝게", "어둡게"]} aria-label="테마" />
      <Checkbox defaultChecked>새 글</Checkbox>
    </div>
  );
}

// 패턴: 서비스 헤더 아래 한 페이지에 질문 하나. 세로 라디오 두 줄이 높이를 다 차지해, 넓으면 질문 옆에 답을 두고
// 좁으면 헤더 줄을 뺀다.
export function PatternsBanner() {
  return (
    <div className="bg-background absolute inset-0 flex flex-col justify-center gap-x-10 px-6 sm:flex-row sm:items-center sm:justify-start">
      <div>
        <span className="text-muted-foreground hidden text-base sm:block">
          yeolyi.com / <b className="text-foreground">서비스</b>
        </span>
        <span className="block text-[1.5rem] leading-tight font-bold sm:mt-1">누구와 함께 신청하나요?</span>
      </div>
      <RadioGroup orientation="vertical" options={["혼자", "배우자와"]} aria-label="누구와 함께 신청하나요?" />
    </div>
  );
}
