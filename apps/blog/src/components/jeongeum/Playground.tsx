import Checkbox from "@yeolyi/ui/Checkbox";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import Textarea from "@yeolyi/ui/Textarea";
import { loadConverter } from "jeongeum/web";
import { useEffect, useState } from "react";

// 정음 써 보기: 확장과 같은 엔진으로 입력을 바로 한글 소리로 바꾼다. 사전(약 1.5MB)은 이 칸이 보일 때 받는다.
const PRESETS = {
  영어: "Hello, world! Welcome to my YouTube channel.",
  일본어: "ラーメンとコーヒー",
  중국어: "北京欢迎你",
} as const;
type Preset = keyof typeof PRESETS;

export default function Playground() {
  const [convert, setConvert] = useState<
    ((s: string, o?: { numbers?: boolean }) => string) | null
  >(null);
  const [preset, setPreset] = useState<Preset | "">("영어");
  const [text, setText] = useState<string>(PRESETS.영어);
  const [numbers, setNumbers] = useState(false);
  useEffect(() => {
    loadConverter().then((c) => setConvert(() => c));
  }, []);

  return (
    <div className="flex flex-col items-start gap-4">
      <RadioGroup
        aria-label="예문"
        value={preset}
        onValueChange={(v) => {
          setPreset(v as Preset);
          setText(PRESETS[v as Preset]);
        }}
        options={Object.keys(PRESETS)}
      />
      <Textarea
        aria-label="바꿀 글"
        className="w-full"
        rows={2}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreset("");
        }}
      />
      <Checkbox checked={numbers} onCheckedChange={setNumbers}>
        숫자도 읽기
      </Checkbox>
      <p
        aria-live="polite"
        className="min-h-[1lh] text-[1.5rem] leading-snug font-bold"
      >
        {convert ? (
          convert(text, { numbers })
        ) : (
          <span className="text-muted-foreground text-base font-normal">
            사전을 받는 중
          </span>
        )}
      </p>
    </div>
  );
}
