import type { CSSProperties } from "react";
import { useReducedMotion } from "./pointer";

// ai.yeolyi.com(AI 로 해 본 것들)의 조각: 비어 있는 Claude Code 입력 상자. 위아래 회색 선 사이 ❯ 뒤에서
// 커서만 깜빡인다. 다룬 게 늘면 요청 예시를 채운다.
// 색은 ai 앱의 ClaudeCode 와 같고(실제 터미널 캡처 값) 두 테마 모두 어두운 그대로 둔다.
const TERM: CSSProperties = {
  background: "#1f1f24",
  color: "#fff",
  fontFamily: `"FiraCode Nerd Font Mono", D2Coding, var(--font-mono)`,
  lineHeight: 1.53,
};
const DIM = "#949494";

export default function AiBanner() {
  const reduce = useReducedMotion();
  return (
    <div
      className="absolute inset-0 flex flex-col justify-center overflow-hidden px-[2ch] text-[13px] whitespace-nowrap select-none sm:text-[17px]"
      style={TERM}
    >
      <div style={{ borderBlock: `1px solid ${DIM}` }}>
        <p style={{ whiteSpace: "nowrap" }}>
          <span style={{ color: DIM }}>❯ </span>
          <span
            className={reduce ? undefined : "animate-pulse"}
            style={{
              display: "inline-block",
              width: "1ch",
              height: "1.2em",
              verticalAlign: "-0.2em",
              background: "#fff",
            }}
          />
        </p>
      </div>
      <p style={{ color: DIM, whiteSpace: "nowrap", paddingLeft: "2ch" }}>
        ? for shortcuts
      </p>
    </div>
  );
}
