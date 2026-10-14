import Slider from "@yeolyi/ui/Slider";
import { useState } from "react";

export default function SliderDemo() {
  const [v, setV] = useState([60]);
  return (
    <div className="flex max-w-96 items-center gap-4">
      <Slider value={v} onValueChange={setV} aria-label="밝기" />
      <output className="text-muted-foreground min-w-[3ch] text-right font-mono text-base">
        {v[0]}
      </output>
    </div>
  );
}
