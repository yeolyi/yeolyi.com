import { Button } from "@/components/ui/button";
import { startTransition, useRef, useState } from "react";

export default function Lane() {
  const [num, setNum] = useState(1);
  const log = useRef<string[]>([]);
  log.current.push(`rendering ${num}`);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        onClick={() => {
          // 낮은 우선순위(transition)로 실행 — 사용자 입력을 블로킹하지 않음
          startTransition(() => {
            setNum((n) => {
              log.current.push(`🐢 transition ${n} -> ${n + 1}`);
              return n + 1;
            });
          });

          // 보통/즉시성 높은 업데이트
          setNum((n) => {
            log.current.push(`🐇 normal ${n} -> ${n * 10}`);
            return n * 10;
          });
        }}
      >
        click me ({num})
      </Button>
      <ol>
        {log.current.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ol>
    </div>
  );
}
