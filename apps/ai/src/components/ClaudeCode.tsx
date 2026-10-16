import type { ReactNode } from "react";

// Claude Code 터미널 화면. 값은 실제 claude(v2.1.301)를 tmux 로 돌려 받은 ANSI 에서 옮겼다:
// 바탕은 사용자 Ghostty 테마(Xcode Dark hc), 요청 줄은 회색 띠(237) 위 ❯(246), 답은 ⏺ 뒤 두 칸 들여쓰기,
// 인라인 코드는 153, 굵게는 bold, 끝의 "✻ Baked for 6s · done 7:11 PM" 은 246. 창 테두리·입력 상자·환영 머리는 그리지 않는다.
// 답(ai)은 Claude Code 가 그리는 만큼의 마크다운만 받는다: 빈 줄로 문단, **굵게**, `코드`. 목록 기호(- 1))는 글자 그대로 나온다.
export type Turn = { user: string; ai: string; meta?: string };

const C = {
  bg: "#1f1f24",
  fg: "#ffffff",
  dim: "#949494", // 246
  band: "#3a3a3a", // 237
  code: "#afd7ff", // 153
};

// 터미널은 한글 같은 넓은 글자를 두 칸(2ch)에 그려 글자 사이가 벌어진다. 그 칸을 그대로 만들고,
// 칸이 줄바꿈 지점이 되지 않게 단어 단위로 묶는다(Claude Code 도 단어 단위로 접는다).
const WIDE =
  /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
function cells(text: string): ReactNode[] {
  return text.split(/(\s+)/).map((word, i) => {
    if (!word || /^\s+$/.test(word)) return word;
    return (
      <span key={i} style={{ whiteSpace: "nowrap" }}>
        {[...word].map((ch, j) =>
          WIDE.test(ch) ? (
            <span
              key={j}
              style={{ display: "inline-block", width: "2ch", textIndent: 0 }}
            >
              {ch}
            </span>
          ) : (
            ch
          ),
        )}
      </span>
    );
  });
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <b key={i}>{cells(part.slice(2, -2))}</b>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <span key={i} style={{ color: C.code }}>
          {cells(part.slice(1, -1))}
        </span>
      );
    return <span key={i}>{cells(part)}</span>;
  });
}

export default function ClaudeCode({
  turns,
  className,
}: {
  turns: Turn[];
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: C.bg,
        color: C.fg,
        fontFamily: `"FiraCode Nerd Font Mono", D2Coding, var(--font-mono)`,
        lineHeight: 1.53,
        padding: "1.53em 2ch",
        wordBreak: "keep-all",
        overflowWrap: "break-word",
      }}
    >
      {turns.map((t, i) => (
        <div key={i} style={{ marginTop: i ? "1.53em" : 0 }}>
          <p
            style={{
              background: C.band,
              margin: "0 -2ch",
              padding: "0 2ch 0 4ch",
              textIndent: "-2ch",
              whiteSpace: "pre-wrap",
            }}
          >
            <span style={{ color: C.dim }}>❯ </span>
            {cells(t.user)}
          </p>
          <div
            style={{
              marginTop: "1.53em",
              paddingLeft: "2ch",
              position: "relative",
            }}
          >
            <span style={{ position: "absolute", left: 0 }}>⏺</span>
            {t.ai.split(/\n{2,}/).map((para, j) => (
              <p
                key={j}
                style={{ marginTop: j ? "1.53em" : 0, whiteSpace: "pre-wrap" }}
              >
                {inline(para)}
              </p>
            ))}
          </div>
          {t.meta && (
            <p style={{ marginTop: "1.53em", color: C.dim }}>
              ✻ {cells(t.meta)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
