import Button from "@yeolyi/ui/Button";
import Slider from "@yeolyi/ui/Slider";
import { useRef, useState } from "react";
import { ngramGenerate } from "../lib/ngram";
import { useCorpus } from "../lib/useCorpus";

// 3절: 문맥 길이 k를 늘려가며 n-gram의 딜레마를 관찰.

const KS = [1, 2, 4, 8, 16, 24];

export default function NgramExplorer() {
  const corpus = useCorpus();
  const [kIdx, setKIdx] = useState(0);
  const [output, setOutput] = useState("");
  const [copyRate, setCopyRate] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const runId = useRef(0);

  const k = KS[kIdx];

  const generate = () => {
    if (!corpus) return;
    const id = ++runId.current;
    setRunning(true);
    setOutput("");
    setCopyRate(null);
    const gen = ngramGenerate(corpus, k, "임금이 말하기를", 180);
    let forced = 0;
    let steps = 0;
    const tick = () => {
      if (id !== runId.current) return;
      // 프레임당 몇 스텝씩 (긴 k는 스텝당 코퍼스 전체 검색이라 무거움)
      for (let i = 0; i < 8; i++) {
        const { value, done } = gen.next();
        if (done) {
          setRunning(false);
          setCopyRate(steps ? forced / steps : 0);
          return;
        }
        steps++;
        if (value.choices === 1) forced++;
        setOutput(value.text);
      }
      setTimeout(tick, 0);
    };
    tick();
  };

  if (!corpus)
    return (
      <div className="text-muted-foreground font-mono">실록 불러오는 중...</div>
    );

  return (
    <div className="flex flex-col gap-[1rlh] font-mono">
      <div className="flex items-center gap-[2ch]">
        <span>문맥 {k}글자</span>
        <Slider
          value={[kIdx]}
          onValueChange={([v]) => setKIdx(v)}
          min={0}
          max={KS.length - 1}
          step={1}
          width={12}
        />
        <Button onClick={generate} disabled={running}>
          생성
        </Button>
      </div>
      {output && <p className="m-0 break-all whitespace-pre-wrap">{output}</p>}
      {copyRate !== null && (
        <p className="text-muted-foreground m-0">
          다음 글자 후보가 하나뿐이던 스텝: {(copyRate * 100).toFixed(0)}%
        </p>
      )}
    </div>
  );
}
