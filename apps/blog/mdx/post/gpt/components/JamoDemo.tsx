import Input from "@yeolyi/ui/Input";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { decompose, displayJamo, jamoKind } from "../lib/tokenizer";
import { useCorpus } from "../lib/useCorpus";

// 5절: 자모 분해 데모 + 실록 코퍼스의 사전 크기 축소 실측.

interface CorpusStats {
  chars: number; // 분해 전 고유 문자 종수
  total: number; // 분해 후 고유 종수 (자모 + 부호·숫자)
  jamo: number; // 그중 한글 자모
}

export default function JamoDemo() {
  const corpus = useCorpus();
  const [text, setText] = useState("임금이 말하기를");
  const [stats, setStats] = useState<CorpusStats | null>(null);

  useEffect(() => {
    if (!corpus) return;
    const id = setTimeout(() => {
      const decomposed = [...new Set(decompose(corpus))];
      const jamo = decomposed.filter((c) => jamoKind(c) !== "etc").length;
      setStats({
        chars: new Set(corpus).size,
        total: decomposed.length,
        jamo,
      });
    }, 0);
    return () => clearTimeout(id);
  }, [corpus]);

  const jamo = useMemo(() => [...decompose(text)], [text]);

  return (
    <div className="flex flex-col gap-[1rlh] font-mono">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="max-w-[24ch]"
      />
      <p className="m-0 break-all">
        {jamo.map((c, i) => (
          <span key={i} className={i % 2 ? "bg-muted" : ""}>
            {displayJamo(c)}
          </span>
        ))}
      </p>
      <p className="text-muted-foreground m-0">
        이 문장: 문자 {new Set(text).size}종{" "}
        <ArrowRight
          aria-hidden
          className="inline size-[1.2em] align-[-0.25em]"
        />{" "}
        분해하면 {new Set(jamo).size}종
        {stats && (
          <>
            <br />
            실록 전체: 문자 {stats.chars.toLocaleString()}종{" "}
            <ArrowRight
              aria-hidden
              className="inline size-[1.2em] align-[-0.25em]"
            />{" "}
            분해하면 {stats.total}종 (한글 자모 {stats.jamo} + 부호·숫자{" "}
            {stats.total - stats.jamo})
          </>
        )}
      </p>
    </div>
  );
}
