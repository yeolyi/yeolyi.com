import Textarea from "@yeolyi/ui/Textarea";
import { useState } from "react";

const WIDTH = 10;
const HEIGHT = 10;

const PALETTE = [
  "#FFFFFF", // 0: White
  "#000000", // 1: Black
];

const CREEPER_PATTERN = [
  "0000000000",
  "0000000000",
  "0011001100",
  "0011001100",
  "0000110000",
  "0001111000",
  "0001111000",
  "0001001000",
  "0000000000",
  "0000000000",
].join("");

export function MonitorSimulator() {
  const [text, setText] = useState(
    CREEPER_PATTERN.match(new RegExp(`.{1,${WIDTH}}`, "g"))?.join("\n") ?? "",
  );

  const memory = Array.from({ length: HEIGHT }, (_, rowIndex) => {
    const line = text.split("\n")[rowIndex] || "";
    return line.replace(/[^01]/g, "").slice(0, WIDTH).padEnd(WIDTH, "0");
  })
    .join("")
    .split("")
    .map(Number);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-center">{`화면 (${HEIGHT}×${WIDTH})`}</h3>
          <div
            className="grid border"
            style={{
              gridTemplateColumns: `repeat(${WIDTH}, 1fr)`,
              width: "100%",
              aspectRatio: `${WIDTH}/${HEIGHT}`,
            }}
          >
            {memory.map((colorIndex, i) => (
              <div
                key={i}
                className="h-full w-full"
                style={{ backgroundColor: PALETTE[colorIndex] }}
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2">VRAM</h3>
          <Textarea
            name="vram"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={HEIGHT}
            className="font-mono leading-5 tracking-widest"
          />
          <p className="text-muted-foreground mt-2">0: 흰색, 1: 검은색</p>
        </div>
      </div>
    </div>
  );
}
