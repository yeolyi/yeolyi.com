import Slider from "@yeolyi/ui/Slider";
import { Fragment, useId, useState } from "react";

interface SliderConfig {
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  step?: number;
}

export interface BasePickerProps {
  sliders: SliderConfig[];
  getColor: (...values: number[]) => string;
  getColorDisplay?: (...values: number[]) => string;
}

export default function BasePicker({
  sliders,
  getColor,
  getColorDisplay,
}: BasePickerProps) {
  // 한 페이지에 피커가 여러 개 올라가므로 슬라이더 id가 겹치지 않게 한다
  const id = useId();
  const [values, setValues] = useState(sliders.map((s) => s.defaultValue));

  const handleChange = (index: number, value: number) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
  };

  const color = getColor(...values);
  const colorDisplay = getColorDisplay ? getColorDisplay(...values) : color;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="h-16 w-full" style={{ backgroundColor: color }} />

      <p className="text-muted-foreground text-center font-mono">
        {colorDisplay}
      </p>

      <div className="grid grid-cols-[auto_1fr_4ch] items-center gap-x-3 gap-y-2.5">
        {sliders.map((slider, index) => (
          <Fragment key={slider.label}>
            <span
              id={`${id}-slider-${index}`}
              className="text-muted-foreground whitespace-nowrap"
            >
              {slider.label}
            </span>
            <Slider
              aria-labelledby={`${id}-slider-${index}`}
              value={[values[index] ?? slider.defaultValue]}
              min={slider.min}
              max={slider.max}
              step={slider.step ?? 1}
              onValueChange={(value) =>
                handleChange(index, value[0] ?? slider.defaultValue)
              }
            />
            <p className="text-muted-foreground text-right font-mono">
              {values[index]}
            </p>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
