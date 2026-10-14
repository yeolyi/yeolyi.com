import Button from "@yeolyi/ui/Button";
import { delay, random } from "es-toolkit";
import { useState } from "react";

const N = 10;
const STEP = 160;

type Task = "a" | "b";

function Lane({
  ch,
  done,
  cursor,
}: {
  ch: string;
  done: number;
  cursor: boolean;
}) {
  const showCursor = cursor && done < N;
  return (
    <span>
      {ch.repeat(done)}
      {showCursor && (
        <span className="bg-foreground text-background">{ch}</span>
      )}
      <span className="text-muted-foreground">
        {"·".repeat(N - done - (showCursor ? 1 : 0))}
      </span>
    </span>
  );
}

function Out({ text }: { text: string }) {
  return (
    <span>
      {text}
      <span className="text-muted-foreground">
        {"·".repeat(N * 2 - text.length)}
      </span>
    </span>
  );
}

export default function ThreadsDemo() {
  const [single, setSingle] = useState({
    a: 0,
    b: 0,
    cursor: null as Task | null,
    out: "",
  });
  const [multi, setMulti] = useState({ a: 0, b: 0, out: "" });
  const [running, setRunning] = useState(false);

  async function runSingle() {
    for (const task of ["a", "b"] as const) {
      setSingle((s) => ({ ...s, cursor: task }));
      for (let i = 0; i < N; i++) {
        await delay(STEP);
        setSingle((s) => ({
          ...s,
          [task]: s[task] + 1,
          out: s.out + task.toUpperCase(),
        }));
      }
    }
    setSingle((s) => ({ ...s, cursor: null }));
  }

  async function runMulti() {
    // 스레드별 타이밍에 무작위 흔들림 — 출력 순서가 매 실행 달라진다
    const worker = async (task: Task) => {
      for (let i = 0; i < N; i++) {
        await delay(random(STEP * 0.5, STEP * 1.5));
        setMulti((m) => ({
          ...m,
          [task]: m[task] + 1,
          out: m.out + task.toUpperCase(),
        }));
      }
    };
    await Promise.all([worker("a"), worker("b")]);
  }

  async function run() {
    setRunning(true);
    setSingle({ a: 0, b: 0, cursor: null, out: "" });
    setMulti({ a: 0, b: 0, out: "" });
    await Promise.all([runSingle(), runMulti()]);
    setRunning(false);
  }

  return (
    <div className="py-[1lh] font-mono">
      <div className="mx-auto flex w-fit flex-col gap-[1lh]">
        <section>
          <p className="text-muted-foreground">싱글 스레드</p>
          <div className="grid w-fit grid-cols-[auto_auto] gap-x-[2ch]">
            <span>작업 A</span>
            <Lane ch="A" done={single.a} cursor={single.cursor === "a"} />
            <span>작업 B</span>
            <Lane ch="B" done={single.b} cursor={single.cursor === "b"} />
            <span className="text-muted-foreground">출력</span>
            <Out text={single.out} />
          </div>
        </section>
        <section>
          <p className="text-muted-foreground">멀티 스레드</p>
          <div className="grid w-fit grid-cols-[auto_auto] gap-x-[2ch]">
            <span>작업 A</span>
            <Lane ch="A" done={multi.a} cursor={running && multi.a < N} />
            <span>작업 B</span>
            <Lane ch="B" done={multi.b} cursor={running && multi.b < N} />
            <span className="text-muted-foreground">출력</span>
            <Out text={multi.out} />
          </div>
        </section>
        <Button className="w-fit" disabled={running} onClick={run}>
          실행
        </Button>
      </div>
    </div>
  );
}
