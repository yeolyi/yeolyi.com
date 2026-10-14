import Slider from "@yeolyi/ui/Slider";
import { clamp, meanBy, minBy } from "es-toolkit";
import { useState } from "react";

const SEGMENT_COUNT = 24;
const POINTS_PER_SEGMENT = 6;

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const findClosest = (value: number, levels: number[]) =>
  minBy(levels, (level) => Math.abs(value - level)) ?? 0;

const generateWaveformData = (
  levels: number[],
  noiseLevel: number,
  rng = Math.random,
) => {
  const randNoise = (level: number) => (rng() * 2 - 1) * level;

  const signal = Array.from(
    { length: SEGMENT_COUNT },
    () => levels[Math.floor(rng() * levels.length)],
  );

  const segmentData = signal.map((base, i) => {
    const pts = Array.from({ length: POINTS_PER_SEGMENT }, (_, j) => {
      const y = clamp(base + randNoise(noiseLevel), 0, 1);
      return [i + j / POINTS_PER_SEGMENT, y] as [number, number];
    });
    const avg = meanBy(pts, (p) => p[1]);
    return { pts, avg };
  });

  const points: [number, number][] = [
    ...segmentData.flatMap((d) => d.pts),
    [signal.length, clamp((signal.at(-1) ?? 0) + randNoise(noiseLevel), 0, 1)],
  ];

  const reads = segmentData.map((d) => findClosest(d.avg, levels));
  const errors = reads.filter((r, i) => r !== signal[i]).length;

  return { signal, points, reads, errors };
};

const BINARY_LEVELS = [0, 1];
const DECIMAL_LEVELS = Array.from({ length: 10 }, (_, i) => i / 9);

const INITIAL_NOISE = 0.2;

interface WaveformData {
  signal: number[];
  points: [number, number][];
  reads: number[];
  errors: number;
}

interface WaveformPanelProps {
  label: string;
  errorLabel: string;
  levels: number[];
  data: WaveformData;
}

function WaveformPanel({
  label,
  errorLabel,
  levels,
  data,
}: WaveformPanelProps) {
  const { signal, points, reads, errors } = data;

  const padding = { top: 0.08, bottom: 0.15 };
  const viewH = 1 + padding.top + padding.bottom;
  const toY = (v: number) => padding.top + (1 - v);

  const sortedLevels = [...levels].sort((a, b) => a - b);
  const thresholds = sortedLevels
    .slice(0, -1)
    .map((l, i) => (l + sortedLevels[i + 1]) / 2);

  const noisyPath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${p[0].toFixed(3)},${toY(p[1]).toFixed(3)}`,
    )
    .join(" ");

  const stepPath = signal
    .flatMap((v, i) => {
      const yStr = toY(v).toFixed(3);
      const prefix = i === 0 ? "M" : "L";
      return [
        `${prefix}${i.toFixed(3)},${yStr}`,
        `L${(i + 1).toFixed(3)},${yStr}`,
      ];
    })
    .join(" ");

  const indicatorY = padding.top + 1 + 0.03;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span>{label}</span>
        <span className="text-muted-foreground font-mono tabular-nums">
          {errorLabel} {errors}/{SEGMENT_COUNT}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${SEGMENT_COUNT} ${viewH}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: 120 }}
        role="img"
        aria-label={label}
      >
        {sortedLevels.map((level, i) => {
          const bandTop = i < sortedLevels.length - 1 ? thresholds[i] : 1;
          const bandBottom = i > 0 ? thresholds[i - 1] : 0;
          return (
            <rect
              key={`band-${level}`}
              x={0}
              y={toY(bandTop)}
              width={SEGMENT_COUNT}
              height={toY(bandBottom) - toY(bandTop)}
              className={i % 2 === 0 ? "fill-foreground" : "fill-transparent"}
              opacity={0.04}
            />
          );
        })}

        {thresholds.map((t) => (
          <line
            key={`th-${t}`}
            x1={0}
            y1={toY(t)}
            x2={SEGMENT_COUNT}
            y2={toY(t)}
            className="stroke-foreground"
            strokeWidth={0.02}
            strokeDasharray="0.3 0.2"
            opacity={0.3}
          />
        ))}

        <path
          d={stepPath}
          fill="none"
          className="stroke-foreground"
          strokeWidth={0.04}
          opacity={0.2}
        />
        <path
          d={noisyPath}
          fill="none"
          className="stroke-foreground"
          strokeWidth={0.06}
          opacity={0.7}
        />

        {/* 오류(판독≠원신호) 구간만 진한 막대로 표시. 정상 구간은 표시하지 않아
            대비가 명확하다. */}
        {reads.map((val, i) =>
          val !== signal[i] ? (
            <rect
              key={`r-${i}-${val}`}
              x={i + 0.05}
              y={indicatorY}
              width={0.9}
              height={0.06}
              rx={0.02}
              className="fill-foreground"
            />
          ) : null,
        )}
      </svg>
    </div>
  );
}

export default function SignalComparison() {
  const [noiseLevel, setNoiseLevel] = useState(INITIAL_NOISE);
  const [binaryData, setBinaryData] = useState(() =>
    generateWaveformData(BINARY_LEVELS, INITIAL_NOISE, mulberry32(42)),
  );
  const [decimalData, setDecimalData] = useState(() =>
    generateWaveformData(DECIMAL_LEVELS, INITIAL_NOISE, mulberry32(123)),
  );

  const handleNoiseChange = (value: number[]) => {
    const noise = value[0];
    setNoiseLevel(noise);
    setBinaryData(generateWaveformData(BINARY_LEVELS, noise));
    setDecimalData(generateWaveformData(DECIMAL_LEVELS, noise));
  };

  return (
    <div className="flex flex-col gap-4">
      <WaveformPanel
        label="2진법 (2레벨)"
        errorLabel="오류"
        levels={BINARY_LEVELS}
        data={binaryData}
      />
      <WaveformPanel
        label="10진법 (10레벨)"
        errorLabel="오류"
        levels={DECIMAL_LEVELS}
        data={decimalData}
      />
      <p className="text-muted-foreground">
        수신된 신호를 가장 가까운 레벨로 판독한다.{" "}
        <span className="text-foreground">판독 오류</span>가 난 구간만 아래에
        표시된다.
      </p>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground shrink-0">노이즈</span>
        <Slider
          name="noise"
          value={[noiseLevel]}
          onValueChange={handleNoiseChange}
          min={0.05}
          max={0.45}
          step={0.01}
        />
        <span className="text-muted-foreground shrink-0 font-mono tabular-nums">
          ±{Math.round(noiseLevel * 100)}%
        </span>
      </div>
    </div>
  );
}
