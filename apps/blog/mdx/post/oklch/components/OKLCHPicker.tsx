import BasePicker from "./BasePicker";

export default function OKLCHPicker() {
  const sliders = [
    { label: "Lightness", min: 0, max: 1, defaultValue: 0.7, step: 0.01 },
    { label: "Chroma", min: 0, max: 0.4, defaultValue: 0.2, step: 0.01 },
    { label: "Hue", min: 0, max: 360, defaultValue: 0 },
  ];

  const getColor = (lightness: number, chroma: number, hue: number) =>
    `oklch(${lightness} ${chroma} ${hue})`;

  return <BasePicker sliders={sliders} getColor={getColor} />;
}
