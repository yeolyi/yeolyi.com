import { Slider } from "@base-ui/react/slider";
import { useRef, useState } from "react";

export default function ImageCompareSlider() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const getHandle = () =>
    rootRef.current
      ?.closest("[data-image-compare]")
      ?.querySelector<HTMLElement>("[data-compare-handle]");

  const handleChange = (value: number | readonly number[]) => {
    const v = typeof value === "number" ? value : (value[0] ?? 0);
    const container = rootRef.current?.closest("[data-image-compare]");
    const clip = container?.querySelector<HTMLElement>("[data-compare-clip]");
    if (clip) clip.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
    const handle = getHandle();
    if (handle) handle.style.left = `${v}%`;
  };

  return (
    <Slider.Root
      ref={rootRef}
      className="absolute inset-0 z-20 cursor-ew-resize"
      defaultValue={33}
      onValueChange={handleChange}
      onPointerDown={() => setDragging(true)}
      onPointerUp={() => setDragging(false)}
      min={0}
      max={100}
      step={dragging ? 0.1 : 5}
    >
      <Slider.Control className="h-full w-full touch-pan-y">
        <Slider.Track className="relative h-full w-full">
          <Slider.Thumb
            aria-label="Image comparison"
            className="h-full w-0"
            onFocus={() => getHandle()?.classList.add("focused")}
            onBlur={() => getHandle()?.classList.remove("focused")}
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
