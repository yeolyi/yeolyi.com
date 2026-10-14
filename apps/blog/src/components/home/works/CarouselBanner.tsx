import { type CSSProperties, type PointerEvent, useState } from "react";
import { useReducedMotion } from "./pointer";

// 캐러셀 편집기(~/Developer/carousel)의 조각: 회색 작업대 위의 장 하나와 오른쪽 서식 단추.
// 단추에 포인터를 올리면 장에서 선택한 글자에 그 서식이 바로 입혀진다.
// 편집기 UI 는 무채색 브루탈리즘(2px 선, 모서리 없음, 켜짐은 반전)이라 어두운 모드에선 선과 바탕만 뒤집고,
// 장(내보낼 이미지)은 두 모드 모두 흰 종이 그대로 둔다.

const TOKENS = {
  "--c-ink": "light-dark(#000, #fff)",
  "--c-paper": "light-dark(#fff, #000)",
  "--c-g2": "light-dark(#d4d4d4, #333)",
} as CSSProperties;

const RED = "#EE220C";

type Mark = "bold" | "red" | "underline" | "blur";
const MARKS: [Mark, string][] = [
  ["bold", "굵게"],
  ["red", "빨강"],
  ["underline", "밑줄"],
  ["blur", "블러"],
];
const MARK_STYLE: Record<Mark, CSSProperties> = {
  bold: { fontWeight: 700 },
  red: { color: RED },
  underline: { textDecoration: "underline", textUnderlineOffset: "0.15em" },
  // 편집기는 블러를 글자색을 지우고 번진 그림자로 그린다
  blur: { color: "transparent", textShadow: "0 0 0.2em #000" },
};

export default function CarouselBanner() {
  const reduce = useReducedMotion();
  const [mark, setMark] = useState<Mark>("bold");

  // 마우스는 떠나면 처음으로, 손가락은 마지막 것을 남긴다
  const leave = (e: PointerEvent) => {
    if (e.pointerType === "mouse") setMark("bold");
  };

  return (
    <div
      className="absolute inset-0 flex font-sans text-(--c-ink) select-none"
      style={TOKENS}
    >
      {/* 작업대와 장. 장은 위쪽만 보이고 아래는 배너 밖으로 잘린다 */}
      <div className="relative min-w-0 flex-1 overflow-hidden bg-(--c-g2)">
        <div className="absolute top-3 left-1/2 aspect-4/5 w-[170px] -translate-x-1/2 border-2 border-black bg-white px-3 py-3 text-[14px] leading-5 whitespace-nowrap text-black sm:top-5 sm:w-[300px] sm:px-6 sm:py-5 sm:text-[20px] sm:leading-8">
          다음으로 살펴볼 건
          <br />
          <span
            className="bg-[#d4d4d4]"
            style={{
              ...MARK_STYLE[mark],
              transition: reduce ? undefined : "color 120ms, text-shadow 120ms",
            }}
          >
            회원가입 플로우
          </span>
          입니다.
        </div>
      </div>

      {/* 서식 단추 */}
      <div
        className="grid w-[132px] shrink-0 grid-cols-2 content-center gap-1.5 border-l-2 border-(--c-ink) bg-(--c-paper) p-2.5 sm:w-[160px] sm:grid-cols-1"
        onPointerLeave={leave}
      >
        {MARKS.map(([m, label]) => (
          <span
            key={m}
            onPointerEnter={() => setMark(m)}
            className={`flex h-8 items-center justify-center border-2 border-(--c-ink) text-[14px] font-bold sm:h-7 ${
              mark === m ? "bg-(--c-ink) text-(--c-paper)" : ""
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
