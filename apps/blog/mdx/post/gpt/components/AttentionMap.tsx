import Button from "@yeolyi/ui/Button";
import Input from "@yeolyi/ui/Input";
import Slider from "@yeolyi/ui/Slider";
import { useEffect, useRef, useState } from "react";
import { displayJamo } from "../lib/tokenizer";
import { useModelSource } from "../lib/useModelSource";

// 7절: attention 가중치 히트맵. 이 절 시점에는 독자가 학습한 모델이 아직
// 없으므로 사전학습 모델 고정.

export default function AttentionMap() {
  const { store, ready, hint } = useModelSource("pretrained");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prompt, setPrompt] = useState("임금이 말하기를,");
  const [layer, setLayer] = useState(2);
  const [head, setHead] = useState(0);
  const [result, setResult] = useState<{
    weights: number[][][];
    tokens: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (l = layer) => {
    setBusy(true);
    try {
      const r = await store.attention(prompt, l);
      setResult({ weights: r.weights, tokens: r.tokens });
    } catch {
      // 워커의 error 메시지가 state.error에 실려 hint로 표시된다
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const { weights, tokens } = result;
    const T = tokens.length;
    const w = weights[head];
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const label = 18;
    const size = Math.min(canvas.clientWidth, 480);
    const cell = (size - label) / T;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.height = `${size}px`;
    canvas.style.width = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const color = getComputedStyle(canvas).color;
    ctx.fillStyle = color;
    ctx.font = `${Math.min(11, cell)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < T; i++) {
      const ch = displayJamo(tokens[i]);
      ctx.globalAlpha = 0.6;
      ctx.fillText(ch, label + i * cell + cell / 2, label / 2); // 열 라벨(참조 대상)
      ctx.fillText(ch, label / 2, label + i * cell + cell / 2); // 행 라벨(참조 주체)
    }
    for (let i = 0; i < T; i++) {
      for (let j = 0; j < T; j++) {
        ctx.globalAlpha = Math.min(1, w[i][j]);
        ctx.fillRect(label + j * cell, label + i * cell, cell - 1, cell - 1);
      }
    }
    ctx.globalAlpha = 1;
  }, [result, head]);

  return (
    <div className="flex flex-col gap-[1rlh] font-mono">
      <div className="flex flex-wrap items-center gap-[2ch]">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="max-w-[28ch]"
          aria-label="문장"
        />
        <Button onClick={() => void run()} disabled={!ready || busy}>
          {busy ? "계산 중..." : "attention 보기"}
        </Button>
      </div>
      {hint && <p className="text-muted-foreground m-0">{hint}</p>}
      <div className="flex flex-wrap items-center gap-[2ch]">
        <span>layer {layer}</span>
        <Slider
          value={layer}
          onValueChange={(v) => {
            setLayer(v);
            // head와 달리 layer는 워커 재계산이 필요하다
            if (result && ready && !busy) void run(v);
          }}
          min={0}
          max={5}
          step={1}
          width={8}
        />
        <span>head {head}</span>
        <Slider
          value={head}
          onValueChange={setHead}
          min={0}
          max={5}
          step={1}
          width={8}
        />
      </div>
      {result && <canvas ref={canvasRef} className="max-w-full" />}
    </div>
  );
}
