import Button from "@yeolyi/ui/Button";
import Input from "@yeolyi/ui/Input";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import Slider from "@yeolyi/ui/Slider";
import { useState } from "react";
import { compose, trimIncomplete } from "../lib/tokenizer";
import type { ModelSource } from "../lib/useModelSource";
import { MODEL_OPTIONS, useModelSource } from "../lib/useModelSource";

// 9절: 학습된 모델로 생성. temperature 슬라이더.

export default function Playground() {
  const { source, setSource, store, state, ready, hint } = useModelSource();
  const [prompt, setPrompt] = useState("임금이 말하기를");
  const [temp, setTemp] = useState(0.8);

  return (
    <div className="flex flex-col gap-[1rlh] font-mono">
      <RadioGroup
        options={MODEL_OPTIONS}
        value={source}
        onValueChange={(v) => setSource(v as ModelSource)}
        aria-label="모델 선택"
      />
      {hint && <p className="text-muted-foreground m-0">{hint}</p>}
      <div className="flex flex-wrap items-center gap-[2ch]">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="max-w-[28ch]"
          aria-label="프롬프트"
        />
        <span>T {temp.toFixed(1)}</span>
        <Slider
          value={temp * 10}
          onValueChange={(v) => setTemp(v / 10)}
          min={1}
          max={20}
          step={1}
          width={12}
        />
        <Button
          disabled={!ready || state.generating || state.status === "training"}
          onClick={() => store.generate(prompt, temp, 300)}
        >
          {state.generating ? "생성 중..." : "생성"}
        </Button>
      </div>
      {state.status === "training" && (
        <p className="text-muted-foreground m-0">
          학습 중에는 생성이 느려서, 학습을 잠시 멈추고 생성하는 걸 권한다.
        </p>
      )}
      {state.generated && (
        <p className="m-0 break-all whitespace-pre-wrap">
          {state.generating
            ? compose(state.generated)
            : trimIncomplete(state.generated)}
        </p>
      )}
    </div>
  );
}
