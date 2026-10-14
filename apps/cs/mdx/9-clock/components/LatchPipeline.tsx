import Button from "@yeolyi/ui/Button";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

function Stage({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-muted-foreground">{label}</span>
      <div
        className={`flex h-10 w-10 items-center justify-center border font-mono ${
          value !== null ? "bg-muted" : ""
        }`}
      >
        {value !== null ? value + 1 : "-"}
      </div>
    </div>
  );
}

export default function LatchPipeline({
  withClock = false,
}: {
  withClock?: boolean;
}) {
  const [values, setValues] = useState<(number | null)[]>([null, null, null]);
  const [counter, setCounter] = useState(0);

  const sendData = () => {
    if (withClock) {
      setValues(([, b, c]) => [counter, b, c]);
    } else {
      setValues(() => [counter, counter, counter]);
    }
    setCounter((c) => c + 1);
  };

  const clockTick = () => {
    setValues(([a, b]) => [a, a, b]);
  };

  const reset = () => {
    setValues([null, null, null]);
    setCounter(0);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <Stage label="A" value={values[0]} />
        <span className="text-muted-foreground mt-5 flex items-center">
          <ArrowRight aria-hidden className="size-[1.2em]" />
        </span>
        <Stage label="B" value={values[1]} />
        <span className="text-muted-foreground mt-5 flex items-center">
          <ArrowRight aria-hidden className="size-[1.2em]" />
        </span>
        <Stage label="C" value={values[2]} />
      </div>
      <div className="flex gap-2">
        <Button onClick={sendData}>A에 새 데이터</Button>
        {withClock && <Button onClick={clockTick}>클럭</Button>}
        {counter > 0 && <Button onClick={reset}>초기화</Button>}
      </div>
    </div>
  );
}
