import { useEffect, useRef, useState } from "react";
import { usePointer } from "./pointer";

// cse.snu.ac.kr 첫 화면의 무늬에서 가져왔다(원본 스크린샷에서 잰 48개의 모양·색).
// 칸 간격 X·Y, 점 지름 32·막대 20×40(원본 px). 포인터 근처의 것은 모양이 바뀌고(점↔막대) 조금 커진다.
// 바탕은 그 사이트의 색 그대로(두 모드 같음).
const X = 88;
const Y = 71.5;
const RADIUS = 80;
// [행, 열, 막대(1)/점(0), 색]
const RAW: [number, number, number, string][] = [
  [0, 1, 0, "#e55015"],
  [0, 2, 1, "#e8741b"],
  [0, 3, 0, "#e15716"],
  [0, 4, 1, "#ea6c1a"],
  [0, 5, 0, "#e8521b"],
  [0, 6, 0, "#df5115"],
  [0, 7, 1, "#e97517"],
  [0, 8, 1, "#ea651a"],
  [1, 2, 0, "#e95918"],
  [1, 3, 1, "#ea401e"],
  [1, 4, 0, "#e67316"],
  [1, 5, 0, "#e9471c"],
  [1, 6, 1, "#de4916"],
  [1, 7, 1, "#ea591a"],
  [1, 8, 1, "#e95118"],
  [1, 9, 0, "#e86e1a"],
  [2, 0, 0, "#dc3516"],
  [2, 1, 1, "#e75017"],
  [2, 2, 0, "#e55317"],
  [2, 3, 1, "#e55b15"],
  [2, 4, 0, "#e26415"],
  [2, 5, 1, "#d64d14"],
  [2, 6, 0, "#e04816"],
  [2, 7, 1, "#e86316"],
  [3, 1, 0, "#e85616"],
  [3, 2, 1, "#e56519"],
  [3, 3, 0, "#e24615"],
  [3, 4, 0, "#e8571c"],
  [3, 5, 0, "#e86e18"],
  [3, 6, 0, "#e85817"],
  [3, 7, 1, "#d82d14"],
  [3, 8, 1, "#e65117"],
  [4, 2, 0, "#e55814"],
  [4, 3, 1, "#e84917"],
  [4, 4, 0, "#e15c15"],
  [4, 5, 1, "#e85a1d"],
  [4, 6, 0, "#e95620"],
  [4, 7, 0, "#e9621c"],
  [4, 8, 1, "#e84615"],
  [4, 9, 1, "#e06415"],
  [5, 1, 0, "#e04115"],
  [5, 2, 1, "#df4c15"],
  [5, 3, 0, "#e94922"],
  [5, 4, 0, "#d95a15"],
  [5, 5, 0, "#e45e16"],
  [5, 6, 1, "#e95618"],
  [5, 7, 0, "#e97c1a"],
  [5, 8, 1, "#ea8020"],
];
// 원본의 48개를 읽는 순서대로 되풀이해, 글처럼 왼쪽 위부터 한 줄씩 채운다(줄 끝에서 저절로 넘어간다).
// 크기는 원본 px 의 SCALE 배. 배너 크기를 재서 칸 수를 정한다.
const SCALE = 0.57;

export default function CseBanner() {
  const { pointer, handlers } = usePointer();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // viewBox 는 원본 px 단위. 배너 px 을 SCALE 로 나눈 만큼이 보인다.
  const W = size.w / SCALE;
  const H = size.h / SCALE;
  const cols = Math.max(1, Math.floor(W / X));
  const cw = W / cols; // 줄 끝에 빈 자리가 남지 않게 칸 너비를 폭에 맞춰 나눈다
  const rows = Math.ceil(H / Y);
  const items = Array.from({ length: cols * rows }, (_, i) => {
    const [, , bar, color] = RAW[i % RAW.length];
    return {
      id: i,
      x: (i % cols) * cw + cw / 2,
      y: Math.floor(i / cols) * Y + Y / 2,
      bar: bar === 1,
      color,
    };
  });

  const px = pointer ? pointer.x / SCALE : Number.NaN;
  const py = pointer ? pointer.y / SCALE : Number.NaN;

  return (
    <div ref={ref} {...handlers} className="absolute inset-0 bg-[#1b1b1b]">
      <svg
        viewBox={`0 0 ${W || 1} ${H || 1}`}
        className="block h-full w-full"
        aria-hidden="true"
      >
        {items.map((d) => {
          const near = Math.hypot(d.x - px, d.y - py) < RADIUS;
          const bar = d.bar !== near;
          const shape =
            "origin-center transition-[opacity,transform] duration-200 ease-out [transform-box:fill-box] motion-reduce:transition-none";
          return (
            <g key={d.id} transform={`translate(${d.x} ${d.y})`} fill={d.color}>
              <g
                className={shape}
                style={{ transform: `scale(${near ? 1.3 : 1})` }}
              >
                <circle
                  r={16}
                  className={shape}
                  style={{
                    opacity: bar ? 0 : 1,
                    transform: `scale(${bar ? 0.4 : 1})`,
                  }}
                />
                <rect
                  x={-10}
                  y={-20}
                  width={20}
                  height={40}
                  className={shape}
                  style={{
                    opacity: bar ? 1 : 0,
                    transform: `scale(${bar ? 1 : 0.4})`,
                  }}
                />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
