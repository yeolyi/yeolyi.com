import Button from "@yeolyi/ui/Button";
import { randomInt } from "es-toolkit";
import { useMemo, useState } from "react";
import { useCorpus } from "../lib/useCorpus";

// 1절: 실록의 실제 문장에서 다음 글자를 맞혀보는 컴포넌트.
// 보기는 정답 + 코퍼스에서 무작위로 뽑은 글자 3개.

function pickProblem(corpus: string, seed: number) {
  const rand = mulberry32(seed);
  const lines = corpus.split("\n");
  let line = "";
  for (let i = 0; i < 50 && line.length < 40; i++) {
    line = lines[Math.floor(rand() * lines.length)];
  }
  const cut = 12 + Math.floor(rand() * 20);
  const prefix = line.slice(0, cut);
  const answer = line[cut];
  const options = new Set([answer]);
  while (options.size < 4) {
    const c = corpus[Math.floor(rand() * corpus.length)];
    if (c !== "\n" && c !== " ") options.add(c);
  }
  return {
    prefix,
    answer,
    rest: line.slice(cut + 1, cut + 30),
    options: [...options].sort(() => rand() - 0.5),
  };
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function NextCharQuiz() {
  const corpus = useCorpus();
  // client:visible로만 렌더되므로 하이드레이션 불일치 걱정 없이 매번 랜덤
  const [seed, setSeed] = useState(() => randomInt(2 ** 31));
  const [picked, setPicked] = useState<string | null>(null);

  const problem = useMemo(
    () => (corpus ? pickProblem(corpus, seed) : null),
    [corpus, seed],
  );

  if (!problem)
    return (
      <div className="text-muted-foreground font-mono">실록 불러오는 중...</div>
    );

  return (
    <div className="flex flex-col gap-[1rlh] font-mono">
      <p className="m-0">
        {problem.prefix}
        <span className="bg-muted px-[0.4ch]">
          {picked ? problem.answer : "?"}
        </span>
        {picked && (
          <span className="text-muted-foreground">{problem.rest}…</span>
        )}
      </p>
      <div className="flex flex-wrap gap-[1ch]">
        {problem.options.map((c) => (
          <Button
            key={c}
            disabled={picked !== null}
            onClick={() => setPicked(c)}
            // 공백 글자는 빈 버튼이 되므로 ␣ 로 보여 준다.
            aria-label={c === " " ? "공백" : undefined}
            className={
              picked !== null && c === problem.answer ? "bg-muted" : ""
            }
          >
            {c === " " ? "␣" : c}
          </Button>
        ))}
        {picked !== null && (
          <span className="self-center">
            {picked === problem.answer
              ? "정답"
              : `오답, 정답은 ${problem.answer === " " ? "공백" : `"${problem.answer}"`}`}
          </span>
        )}
      </div>
      {picked !== null && (
        <div>
          <Button
            onClick={() => {
              setSeed((s) => s + 1);
              setPicked(null);
            }}
          >
            다른 문장
          </Button>
        </div>
      )}
    </div>
  );
}
