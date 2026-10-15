import RadioGroup from "@yeolyi/ui/RadioGroup";
import { useState } from "react";

// 쪽 끝의 확인 문제 하나. 고르면 맞았는지만 나온다(쉬운 문제라 이유·정답은 적지 않는다). 답은 그 쪽 본문에 있는 것만 묻는다.
// 판정 ✓/✗ 는 기호와 굵기로 가른다(초록·빨강이 없다). 틀은 DS 의 데모 상자(1px 선, 왼쪽 위 고정폭 이름)와 같고, 이름 자리를 legend 로 둔다.
export type QuizItem = { q: string; options: string[]; answer: number };

export function Quiz({ quiz }: { quiz: QuizItem }) {
  const [picked, setPicked] = useState<string>();
  const right = picked === String(quiz.answer);
  return (
    <fieldset className="border-border mt-[1rlh] border px-6 pt-2 pb-6">
      <legend className="text-muted-foreground px-1.5 font-mono text-base">
        확인 문제
      </legend>
      <p className="font-bold">{quiz.q}</p>
      <div className="mt-[0.25rlh]">
        <RadioGroup
          aria-label={quiz.q}
          orientation="vertical"
          options={quiz.options.map((label, i) => ({
            value: String(i),
            label,
          }))}
          value={picked ?? ""}
          onValueChange={setPicked}
        />
      </div>
      {picked !== undefined && (
        <p className="mt-[0.5rlh]" aria-live="polite">
          <strong>{right ? "✓ 정답입니다." : "✗ 다시 골라 보세요."}</strong>
        </p>
      )}
    </fieldset>
  );
}
