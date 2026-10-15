import Button from "@yeolyi/ui/Button";
import Input from "@yeolyi/ui/Input";
import { useMemo, useState } from "react";
import { bigramGenerate, buildBigramCounts, topNext } from "../lib/ngram";
import { useCorpus } from "../lib/useCorpus";

// 2절: 실록 전체를 집계해 만드는 bigram 모델.

export default function BigramExplorer() {
  const corpus = useCorpus();
  const [built, setBuilt] = useState<{
    counts: Map<string, Map<string, number>>;
    ms: number;
    vocab: number;
  } | null>(null);
  const [char, setChar] = useState("임");
  const [output, setOutput] = useState("");

  const top = useMemo(
    () => (built ? topNext(built.counts, char, 10) : []),
    [built, char],
  );

  if (!corpus)
    return (
      <div className="text-muted-foreground font-mono">실록 불러오는 중...</div>
    );

  if (!built)
    return (
      <div className="font-mono">
        <Button
          onClick={() => {
            const t0 = performance.now();
            const counts = buildBigramCounts(corpus);
            setBuilt({
              counts,
              ms: performance.now() - t0,
              vocab: counts.size,
            });
          }}
        >
          실록 {(corpus.length / 10000).toFixed(0)}만 글자 집계하기
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-[1rlh] font-mono">
      <p className="text-muted-foreground m-0">
        집계 완료: {built.ms.toFixed(0)}ms, 고유 글자{" "}
        {built.vocab.toLocaleString()}종
      </p>
      <div>
        <Input
          value={char}
          onChange={(e) => setChar([...e.target.value].pop() ?? "")}
          className="min-w-[4ch]"
          aria-label="글자"
        />
        <span className="text-muted-foreground"> 다음에 온 글자 상위 10개</span>
      </div>
      <div>
        {top.map(({ char: c, p }) => (
          <div key={c}>
            {c === "\n" ? "'\\n'" : c === " " ? "' '" : ` ${c} `}
            {"▓".repeat(Math.max(1, Math.round(p * 40)))}{" "}
            <span className="text-muted-foreground">
              {(p * 100).toFixed(1)}%
            </span>
          </div>
        ))}
        {top.length === 0 && (
          <p className="text-muted-foreground m-0">실록에 없는 글자</p>
        )}
      </div>
      <div>
        <Button
          onClick={() =>
            setOutput(bigramGenerate(built.counts, "임금이 ", 150))
          }
        >
          이 확률로 생성
        </Button>
      </div>
      {output && <p className="m-0 break-all whitespace-pre-wrap">{output}</p>}
    </div>
  );
}
