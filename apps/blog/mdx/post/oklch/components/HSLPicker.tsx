import BasePicker from "./BasePicker";

export default function HSLPicker() {
  const sliders = [
    { label: "Hue", min: 0, max: 360, defaultValue: 0 },
    { label: "Saturation", min: 0, max: 100, defaultValue: 100 },
    { label: "Lightness", min: 0, max: 100, defaultValue: 50 },
  ];

  const getColor = (hue: number, saturation: number, lightness: number) =>
    `hsl(${hue}deg ${saturation}% ${lightness}%)`;

  return <BasePicker sliders={sliders} getColor={getColor} />;
}
