import Button from "@yeolyi/ui/Button";
import { random } from "es-toolkit";
import { useEffect, useRef, useState } from "react";
import { decodeF16, fetchCheckpoint } from "../lib/checkpoint";
import { displayJamo, jamoKind } from "../lib/tokenizer";

// 6절: 사전학습된 글자 임베딩 행렬 E를 PCA로 2차원 투영.
// 초성/중성/종성이 군집을 이루는 걸 보여준다.

interface Point {
  x: number;
  y: number;
  label: string;
  kind: ReturnType<typeof jamoKind>;
}

// Okabe-Ito 팔레트 — 색맹 안전, 라이트/다크 배경 양쪽에서 구분됨
const KIND_COLOR: Record<string, string> = {
  cho: "#0072B2", // 초성: 파랑
  jung: "#E69F00", // 중성: 주황
  jong: "#009E73", // 종성: 초록
};

async function loadPoints(): Promise<Point[]> {
  const { header, buffer } = await fetchCheckpoint("/gpt/sillok-gpt");
  const D = header.config.nEmbd;
  const V = header.config.vocabSize;
  const all = decodeF16(new Uint16Array(buffer));
  const wte = all.subarray(0, V * D); // flattenParams에서 wte가 첫 텐서

  // 평균 제거
  const mean = new Float64Array(D);
  for (let v = 0; v < V; v++)
    for (let d = 0; d < D; d++) mean[d] += wte[v * D + d] / V;
  const X = new Float64Array(V * D);
  for (let v = 0; v < V; v++)
    for (let d = 0; d < D; d++) X[v * D + d] = wte[v * D + d] - mean[d];

  // 공분산 없이 X에 대한 power iteration으로 상위 2개 주성분
  const pc = (deflate: Float64Array | null): Float64Array => {
    const w = Float64Array.from({ length: D }, () => random(-0.5, 0.5));
    for (let it = 0; it < 60; it++) {
      if (deflate) {
        const dot = w.reduce((a, wi, i) => a + wi * deflate[i], 0);
        for (let i = 0; i < D; i++) w[i] -= dot * deflate[i];
      }
      // w ← Xᵀ X w
      const proj = new Float64Array(V);
      for (let v = 0; v < V; v++) {
        let s = 0;
        for (let d = 0; d < D; d++) s += X[v * D + d] * w[d];
        proj[v] = s;
      }
      const nw = new Float64Array(D);
      for (let v = 0; v < V; v++)
        for (let d = 0; d < D; d++) nw[d] += X[v * D + d] * proj[v];
      const norm = Math.hypot(...nw);
      for (let d = 0; d < D; d++) w[d] = nw[d] / norm;
    }
    return w;
  };
  const p1 = pc(null);
  const p2 = pc(p1);

  return header.vocab.map((ch, v) => {
    let x = 0;
    let y = 0;
    for (let d = 0; d < D; d++) {
      x += X[v * D + d] * p1[d];
      y += X[v * D + d] * p2[d];
    }
    return { x, y, label: displayJamo(ch), kind: jamoKind(ch) };
  });
}

export default function EmbeddingMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!points || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = Math.round(w * 0.75);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const color = getComputedStyle(canvas).color;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    const pad = 16;
    const sx = (x: number) => pad + ((x - x0) / (x1 - x0)) * (w - 2 * pad);
    const sy = (y: number) => pad + ((y - y0) / (y1 - y0)) * (h - 2 * pad);

    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 이 컴포넌트는 예외적으로 유채색 사용 (Okabe-Ito, 라이트/다크 공용)
    for (const p of points) {
      ctx.fillStyle = KIND_COLOR[p.kind] ?? color;
      ctx.globalAlpha = p.kind === "etc" ? 0.4 : 1;
      ctx.fillText(
        p.label === "\n" ? "↵" : p.label === " " ? "␣" : p.label,
        sx(p.x),
        sy(p.y),
      );
    }
    ctx.globalAlpha = 1;
  }, [points]);

  if (error)
    return <div className="text-muted-foreground font-mono">{error}</div>;

  if (!points)
    return (
      <div className="font-mono">
        <Button
          onClick={() =>
            loadPoints().then(setPoints, (e) => setError(e.message))
          }
        >
          사전학습 모델의 임베딩 불러오기
        </Button>
      </div>
    );

  return (
    <div className="font-mono">
      <canvas ref={canvasRef} className="w-full" />
      <p className="text-muted-foreground m-0">
        <span style={{ color: KIND_COLOR.cho }}>초성</span> ·{" "}
        <span style={{ color: KIND_COLOR.jung }}>중성</span> ·{" "}
        <span style={{ color: KIND_COLOR.jong }}>종성</span> · 흐리게: 부호·숫자
        (192차원 → PCA 2차원)
      </p>
    </div>
  );
}
