import Button from "@yeolyi/ui/Button";
import { clsx } from "clsx";
import { randomInt } from "es-toolkit";
import { useEffect, useState } from "react";

export interface BaseQuizProps {
  generateRandomColor: () => string;
  /** 생략하면 색 문자열을 그대로 표시한다 */
  formatColorDisplay?: (color: string) => string;
}

interface Quiz {
  targetColor: string;
  options: string[];
}

export default function BaseQuiz({
  generateRandomColor,
  formatColorDisplay = (color) => color,
}: BaseQuizProps) {
  // Math.random 기반이라 서버 렌더 결과와 어긋나므로 마운트 후에 문제를 만든다
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  function generateQuiz(): Quiz {
    const targetColor = generateRandomColor();
    const correctPosition = randomInt(3);
    const options = Array.from({ length: 3 }, (_, i) =>
      i === correctPosition ? targetColor : generateRandomColor(),
    );
    return { targetColor, options };
  }

  useEffect(() => {
    setQuiz(generateQuiz());
  }, []);

  const handleOptionClick = (index: number) => {
    if (showResult) return;

    setSelectedOption(index);
    setShowResult(true);
  };

  const handleNext = () => {
    setQuiz(generateQuiz());
    setSelectedOption(null);
    setShowResult(false);
  };

  const isCorrect = (index: number) =>
    quiz !== null && quiz.options[index] === quiz.targetColor;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5">
      <p className="text-center">
        <span className="font-mono">
          {quiz ? formatColorDisplay(quiz.targetColor) : "…"}
        </span>
        에 해당하는 색은?
      </p>

      <div className="flex gap-4">
        {(quiz?.options ?? ["", "", ""]).map((color, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            {/* 누를 수 있는 색 칸: 2px 잉크 테두리, 초점은 주황 테두리, 누르면 살짝 내려간다.
                답을 고른 뒤엔 정답 칸만 굵은 선을 남기고 나머지는 가는 선 색으로 물린다. */}
            <button
              type="button"
              aria-label={`보기 ${index + 1}`}
              onClick={() => handleOptionClick(index)}
              disabled={showResult || quiz === null}
              className={clsx(
                "focus-border press-down size-14 border-2 transition-colors",
                quiz === null && "bg-muted",
                showResult && !isCorrect(index)
                  ? "border-border"
                  : "border-foreground",
              )}
              style={{ backgroundColor: color || undefined }}
            />
            <span
              className={clsx(
                "px-1 font-mono text-base",
                showResult && isCorrect(index) ? "mark" : "invisible",
              )}
            >
              정답
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-control flex items-center gap-4">
        {showResult ? (
          <>
            <p>
              {selectedOption !== null && isCorrect(selectedOption)
                ? "맞았습니다."
                : "틀렸습니다."}
            </p>
            <Button onClick={handleNext}>다음</Button>
          </>
        ) : (
          <p className="text-muted-foreground">색을 선택하세요</p>
        )}
      </div>
    </div>
  );
}
