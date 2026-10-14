import Button from "@yeolyi/ui/Button";
import { useRef, useState } from "react";
import { trimIncomplete } from "../lib/tokenizer";
import { trainerStore } from "../lib/trainerStore";
import { useTrainer } from "../lib/useTrainer";
import LossChart from "./LossChart";

// 8절(실록)·10절(아무 텍스트) 공용 학습 패널.
// custom=true면 파일 드롭으로 코퍼스를 받는다.

export default function TrainerPanel({ custom = false }: { custom?: boolean }) {
  const state = useTrainer();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const onFile = async (file: File) => {
    const text = await file.text();
    if (text.length < 100_000) {
      alert(
        `${(text.length / 1000).toFixed(0)}k자는 너무 짧습니다. 10만 자 이상을 권합니다.`,
      );
      if (text.length < 10_000) return;
    }
    trainerStore.init(file.name, text);
  };

  // 첫 샘플부터 전부 시간순으로 — 진화 과정을 숨기지 않는다
  const samples = state.samples;

  return (
    <div className="flex flex-col gap-[1lh] font-mono">
      <div className="flex flex-wrap items-center gap-[1ch]">
        {custom ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            <Button onClick={() => fileRef.current?.click()}>
              .txt 파일 선택
            </Button>
          </>
        ) : (
          state.status === "idle" && (
            <Button onClick={() => void trainerStore.initSillok()}>
              실록 데이터 준비
            </Button>
          )
        )}
        {state.status === "ready" && (
          <Button onClick={() => trainerStore.start()}>학습 시작</Button>
        )}
        {state.status === "training" && (
          <Button onClick={() => trainerStore.pause()}>일시정지</Button>
        )}
        {state.status === "ready" && state.iter > 0 && (
          <Button
            onClick={() =>
              void trainerStore.saveToBrowser().then(() => setSaved(true))
            }
          >
            {saved ? "저장됨" : "브라우저에 저장"}
          </Button>
        )}
      </div>

      {state.status === "initializing" && <p className="m-0">준비 중...</p>}
      {state.error && (
        <p className="text-muted-foreground m-0">오류: {state.error}</p>
      )}

      {state.status !== "idle" && state.backend && (
        <p className="text-muted-foreground m-0">
          {state.corpusName} {(state.corpusChars / 10000).toFixed(0)}만 자 ·
          자모 {state.vocabSize}종 · 파라미터{" "}
          {(state.paramCount / 1e6).toFixed(2)}M · {state.backend}
          {state.iter > 0 &&
            ` · ${state.iter.toLocaleString()}번 갱신 (초당 ${state.itPerSec.toFixed(1)}번)`}
          {state.tokensSeen > 0 &&
            ` · 지금까지 ${(state.tokensSeen / 1e6).toFixed(0)}M 토큰 학습`}
        </p>
      )}

      {state.lossHistory.length > 0 && (
        <LossChart history={state.lossHistory} />
      )}

      {samples.length > 0 && (
        <div className="flex flex-col gap-[0.5lh]">
          {samples.map((s) => (
            <div key={s.iter}>
              <p className="text-muted-foreground m-0">
                {s.iter.toLocaleString()}번 갱신 시점의 생성:
              </p>
              <p className="m-0 break-all whitespace-pre-wrap">
                {trimIncomplete(s.text)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
