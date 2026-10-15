import Slider from "@yeolyi/ui/Slider";
import { useState } from "react";

// 수치는 마크다운 인라인 코드(`…`)와 같은 모양 — prose 재진입으로 bare <code>.
const Num = ({ children }: { children: React.ReactNode }) => (
  <code>{children}</code>
);

const AmdahlLawExample = () => {
  const [proportion, setProportion] = useState(40); // P(%)
  const [speedup, setSpeedup] = useState(2); // S

  const p = proportion / 100;
  const overallSpeedup = 1 / (1 - p + p / speedup);
  const maxSpeedup = p === 1 ? Infinity : 1 / (1 - p);

  return (
    <div className="prose py-[1rlh]">
      <p>
        전체의 <Num>{proportion}%</Num> 부분의 성능이{" "}
        <Num>{speedup.toFixed(1)}배</Num>로 향상되었을 때, 전체 성능은{" "}
        <Num>{overallSpeedup.toFixed(1)}배</Num> 증가합니다. 하지만 성능
        향상폭이 무한히 높아져도 전체 성능의 증가폭은{" "}
        <Num>
          {maxSpeedup === Infinity ? "∞" : `${maxSpeedup.toFixed(1)}배`}
        </Num>
        를 넘지 못합니다.
      </p>
      <div className="flex flex-wrap gap-x-8 gap-y-[0.5rlh]">
        <div className="w-3xs">
          <span id="proportion-label" className="text-muted-foreground">
            개선할 부분의 비율
          </span>
          <Slider
            aria-labelledby="proportion-label"
            value={proportion}
            onValueChange={setProportion}
            max={100}
            step={1}
            className="mt-2"
          />
        </div>
        <div className="w-3xs">
          <span id="speedup-label" className="text-muted-foreground">
            해당 부분의 성능 향상 배율
          </span>
          <Slider
            aria-labelledby="speedup-label"
            value={speedup}
            onValueChange={setSpeedup}
            min={1}
            max={100}
            step={0.1}
            className="mt-2"
          />
        </div>
      </div>
    </div>
  );
};

export default AmdahlLawExample;
