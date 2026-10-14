import clsx from "clsx";
import { useState } from "react";

type Bit = 0 | 1;
type HalfPort = "hA" | "hB" | "hSum" | "hCarry";
type FullPort = "fA" | "fB" | "fCin" | "fSum" | "fCout";
type Port = HalfPort | FullPort;

const bitColor = (v: Bit) => (v ? "text-foreground" : "text-muted-foreground");

const BIT_ON = "var(--color-foreground)";
const BIT_OFF = "var(--color-muted-foreground)";
const bitSvgColor = (v: Bit) => (v ? BIT_ON : BIT_OFF);
const F = 14;
const FONT = {
  fontSize: F,
  fontFamily: "var(--font-mono, monospace)",
} as const;

function AdderSVG({
  title,
  inputs,
  outputs,
  highlight,
  full,
}: {
  title: string;
  inputs: [string, Bit, Port][];
  outputs: [string, Bit, Port][];
  highlight: Port | null;
  full?: boolean;
}) {
  const boxX = 70;
  const boxW = 90;
  const boxY = 10;
  const boxH = full ? 80 : 60;
  const boxCx = boxX + boxW / 2;
  const boxCy = boxY + boxH / 2;
  const h = boxY * 2 + boxH;

  const inStep = boxH / (inputs.length + 1);
  const outStep = boxH / (outputs.length + 1);

  const allPorts = [
    ...inputs.map(([, , p]) => p),
    ...outputs.map(([, , p]) => p),
  ];
  const isActive = (port: Port) => highlight === port;
  const isRelated = highlight !== null && allPorts.includes(highlight);

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-muted-foreground font-mono">{title}</p>
      <svg
        viewBox={`0 0 250 ${h}`}
        className="w-full max-w-[250px]"
        role="img"
        aria-label={title}
      >
        <rect
          x={boxX}
          y={boxY}
          width={boxW}
          height={boxH}
          fill="none"
          className={isRelated ? "stroke-foreground" : "stroke-border"}
          strokeWidth={1}
          style={{ transition: "stroke 0.15s" }}
        />
        <text
          x={boxCx}
          y={boxCy - 4}
          textAnchor="middle"
          className="fill-muted-foreground"
          {...FONT}
        >
          {full ? "FULL" : "HALF"}
        </text>
        <text
          x={boxCx}
          y={boxCy + 4}
          textAnchor="middle"
          dominantBaseline="hanging"
          className="fill-muted-foreground"
          {...FONT}
        >
          ADDER
        </text>

        {inputs.map(([label, value, port], i) => {
          const y = boxY + inStep * (i + 1);
          const color = bitSvgColor(value);
          return (
            <g key={label}>
              <line
                x1={46}
                y1={y}
                x2={boxX}
                y2={y}
                stroke={color}
                strokeWidth={1}
              />
              <circle cx={46} cy={y} r={3.5} fill={color} />
              <text
                x={40}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                className={
                  isActive(port) ? "fill-foreground" : "fill-muted-foreground"
                }
                style={{ transition: "fill 0.15s" }}
                {...FONT}
              >
                {label}
              </text>
            </g>
          );
        })}

        {outputs.map(([label, value, port], i) => {
          const y = boxY + outStep * (i + 1);
          const color = bitSvgColor(value);
          return (
            <g key={label}>
              <line
                x1={boxX + boxW}
                y1={y}
                x2={194}
                y2={y}
                stroke={color}
                strokeWidth={1}
              />
              <circle cx={194} cy={y} r={3.5} fill={color} />
              <text
                x={200}
                y={y}
                textAnchor="start"
                dominantBaseline="central"
                className={
                  isActive(port) ? "fill-foreground" : "fill-muted-foreground"
                }
                style={{ transition: "fill 0.15s" }}
                {...FONT}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const portHoverProps = (onHover: (port: Port | null) => void, port?: Port) =>
  port
    ? {
        onMouseEnter: () => onHover(port),
        onMouseLeave: () => onHover(null),
      }
    : {};

function Btn({
  value,
  onClick,
  port,
  onHover,
}: {
  value: Bit;
  onClick: () => void;
  port?: Port;
  onHover: (port: Port | null) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "bg-background hover:bg-foreground hover:text-background press-down border-foreground focus-border size-control cursor-pointer border-2 tabular-nums transition-colors",
        bitColor(value),
      )}
      {...portHoverProps(onHover, port)}
    >
      {value}
    </button>
  );
}

function Val({
  value,
  port,
  onHover,
}: {
  value: Bit;
  port?: Port;
  onHover: (port: Port | null) => void;
}) {
  return (
    <span
      className={clsx("tabular-nums", bitColor(value))}
      {...portHoverProps(onHover, port)}
    >
      {value}
    </span>
  );
}

export default function BinaryAdditionDemo() {
  const [a1, setA1] = useState<Bit>(1);
  const [a0, setA0] = useState<Bit>(1);
  const [b1, setB1] = useState<Bit>(0);
  const [b0, setB0] = useState<Bit>(1);
  const [hover, setHover] = useState<Port | null>(null);

  const toggle = (v: Bit): Bit => (v ? 0 : 1);

  const sum0: Bit = (a0 ^ b0) as Bit;
  const carry0: Bit = (a0 & b0) as Bit;
  const sum1: Bit = (a1 ^ b1 ^ carry0) as Bit;
  const carry1: Bit = ((a1 & b1) | (carry0 & (a1 ^ b1))) as Bit;

  const hoverProps = (port: Port) => portHoverProps(setHover, port);

  return (
    <div className="flex flex-col items-center gap-6 font-mono">
      {/* 이진수 덧셈 */}
      <div className="grid grid-cols-4 place-items-center gap-x-1 gap-y-1">
        <span />
        <span />
        <span
          className={clsx(carry0 ? "text-foreground" : "text-muted-foreground")}
          {...hoverProps("fCin")}
        >
          {carry0}
        </span>
        <span />

        <span />
        <span />
        <Btn
          value={a1}
          onClick={() => setA1(toggle(a1))}
          port="fA"
          onHover={setHover}
        />
        <Btn
          value={a0}
          onClick={() => setA0(toggle(a0))}
          port="hA"
          onHover={setHover}
        />

        <span className="text-muted-foreground">+</span>
        <span />
        <Btn
          value={b1}
          onClick={() => setB1(toggle(b1))}
          port="fB"
          onHover={setHover}
        />
        <Btn
          value={b0}
          onClick={() => setB0(toggle(b0))}
          port="hB"
          onHover={setHover}
        />

        <div className="bg-border col-span-4 my-0.5 h-px w-full" />

        <span />
        <Val value={carry1} port="fCout" onHover={setHover} />
        <Val value={sum1} port="fSum" onHover={setHover} />
        <Val value={sum0} port="hSum" onHover={setHover} />
      </div>

      {/* 다이어그램 */}
      <div className="flex flex-wrap justify-center gap-4">
        <AdderSVG
          title="1의 자리 반가산기"
          inputs={[
            ["A", a0, "hA"],
            ["B", b0, "hB"],
          ]}
          outputs={[
            ["Sum", sum0, "hSum"],
            ["Carry", carry0, "hCarry"],
          ]}
          highlight={hover}
        />
        <AdderSVG
          title="2의 자리 전가산기"
          inputs={[
            ["A", a1, "fA"],
            ["B", b1, "fB"],
            ["Cin", carry0, "fCin"],
          ]}
          outputs={[
            ["Sum", sum1, "fSum"],
            ["Cout", carry1, "fCout"],
          ]}
          highlight={hover}
          full
        />
      </div>
    </div>
  );
}
