import { Slider as Base } from "@base-ui/react/slider";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";

// 슬라이더 — 값 조절. 얇은 선(지나온 쪽 잉크, 남은 쪽 연한 회색) 위에 잉크 세로 막대 손잡이. 동그라미 대신 각진 막대가 DS 결이다.
// 손잡이가 선 위로 튀어나와 "끌 수 있다"가 보인다(예전엔 상자를 반쯤 칠한 꼴이라 진행 막대로 읽혔다). 잡는 자리는 여전히 줄 전체(28px).
// 키보드 초점은 손잡이에 주황 테두리, 끄는 동안 손잡이가 조금 굵어진다.
// Base UI Slider 위에 얹었다: 막대 어디를 눌러도(터치 포함) 그 자리로 값이 옮겨지고, 키보드(←→·PageUp/Down·Home/End)와
// 스크린리더는 안쪽의 숨은 range 입력이 맡는다. 네이티브 range 는 iOS 에서 손잡이를 잡아야만 움직여 손잡이 없는 모양과 맞지 않았다.
// 값 표시는 쓰는 쪽이 옆에 고정폭으로. 값은 숫자 하나다(Base UI 와 같다. 배열이면 쓰는 쪽마다 [v] 를 풀어야 한다).
// 값이 바뀌면 네이티브 range 처럼 버블링되는 input 이벤트를 낸다. Base UI 는 숨은 입력의 값을 코드로 바꿔
// 이벤트가 나지 않아, React 밖에서 폼의 input 이벤트와 FormData(name)로 값을 읽는 데모가 멈췄었다.
interface Props {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  width?: number; // 막대 폭(ch). 없으면 컨테이너 폭을 채운다.
  // 보이는 라벨이 있으면 그 요소의 id(aria-labelledby). 없으면 aria-label.
  "aria-labelledby"?: string;
  name?: string; // FormData 수집용
  "aria-label"?: string;
  className?: string;
}

export default function Slider({
  value,
  defaultValue = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  width,
  "aria-labelledby": labelledBy,
  name,
  "aria-label": ariaLabel = "값 조절",
  className,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [changes, setChanges] = useState(0);
  useEffect(() => {
    if (changes === 0) return;
    rootRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [changes]);

  return (
    <Base.Root
      ref={rootRef}
      value={value}
      defaultValue={value === undefined ? defaultValue : undefined}
      onValueChange={(v) => {
        onValueChange?.(v as number);
        setChanges((n) => n + 1);
      }}
      min={min}
      max={max}
      step={step}
      name={name}
      aria-labelledby={labelledBy}
      thumbAlignment="edge"
      className={clsx(!width && "w-full", className)}
      style={{ width: width ? `${width}ch` : undefined }}
    >
      <Base.Control className="group flex h-7 w-full cursor-ew-resize touch-pan-y items-center select-none">
        <Base.Track className="bg-muted relative h-1.5 w-full forced-colors:bg-[GrayText]">
          <Base.Indicator className="bg-foreground forced-colors:bg-[CanvasText]" />
          <Base.Thumb
            aria-label={labelledBy ? undefined : ariaLabel}
            className="bg-foreground has-focus-visible:outline-accent h-5 w-1 outline-offset-2 transition-[width] duration-150 group-active:w-1.5 has-focus-visible:outline-2 forced-colors:bg-[CanvasText] forced-colors:forced-color-adjust-none"
          />
        </Base.Track>
      </Base.Control>
    </Base.Root>
  );
}
