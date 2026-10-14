import { useEffect, useRef } from "react";
import type { LossPoint } from "../lib/trainerStore";

// 학습 loss 곡선 (train 실선 + val 점). y축 0~5 고정 — 찍기(≈4.8)에서 출발해
// 내려가는 걸 같은 눈금에서 보게 한다. x 도메인은 다음 눈금으로 올림해
// 곡선이 오른쪽 끝에 붙지 않게 한다.

const PAD = { left: 30, right: 8, top: 4, bottom: 16 };

/** 1-2-5 계열에서 targetTicks개쯤 나오는 눈금 간격 */
function tickStep(max: number, targetTicks = 4): number {
  const raw = max / targetTicks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) {
    if (m * pow >= raw) return m * pow;
  }
  return 10 * pow;
}

export default function LossChart({ history }: { history: LossPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const color = getComputedStyle(canvas).color;

    const yMax = 5;
    const lastIter = history.at(-1)?.iter ?? 0;
    const step = tickStep(Math.max(200, lastIter));
    // 곡선 끝이 마지막 눈금에 닿으면 한 칸 더 — 항상 오른쪽에 여백이 남는다
    const xMax = (Math.floor(lastIter / step) + 1) * step;

    const plotW = w - PAD.left - PAD.right;
    const plotH = h - PAD.top - PAD.bottom;
    const sx = (iter: number) => PAD.left + (iter / xMax) * plotW;
    const sy = (loss: number) =>
      PAD.top + (1 - Math.min(loss, yMax) / yMax) * plotH;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.font = "10px monospace";

    // 가로 눈금(y) + 라벨
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.3;
    for (const y of [0, 1, 2, 3, 4, 5]) {
      ctx.beginPath();
      ctx.moveTo(PAD.left, sy(y));
      ctx.lineTo(w - PAD.right, sy(y));
      ctx.stroke();
      ctx.fillText(String(y), PAD.left - 6, sy(y));
    }

    // 세로 눈금(x, iter) + 라벨. 오른쪽 끝 라벨은 캔버스 밖으로 잘리지 않게 정렬 전환
    ctx.textBaseline = "top";
    for (let iter = 0; iter <= xMax; iter += step) {
      ctx.beginPath();
      ctx.moveTo(sx(iter), PAD.top);
      ctx.lineTo(sx(iter), h - PAD.bottom);
      ctx.stroke();
      if (iter > 0) {
        const atEdge = sx(iter) > w - 24;
        ctx.textAlign = atEdge ? "right" : "center";
        ctx.fillText(
          iter.toLocaleString(),
          atEdge ? w : sx(iter),
          h - PAD.bottom + 4,
        );
      }
    }
    ctx.globalAlpha = 1;

    // 플롯 영역 밖으로 절대 나가지 않게 클리핑
    ctx.save();
    ctx.beginPath();
    ctx.rect(PAD.left, PAD.top, plotW, plotH);
    ctx.clip();

    if (history.length > 1) {
      ctx.beginPath();
      history.forEach((p, i) => {
        if (i === 0) ctx.moveTo(sx(p.iter), sy(p.loss));
        else ctx.lineTo(sx(p.iter), sy(p.loss));
      });
      ctx.stroke();
    }
    for (const p of history) {
      if (p.valLoss !== undefined) {
        ctx.beginPath();
        ctx.arc(sx(p.iter), sy(p.valLoss), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }, [history]);

  return <canvas ref={canvasRef} className="w-full" />;
}
