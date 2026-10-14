import BasePicker from "./BasePicker";

export default function RGBPicker() {
  const sliders = [
    { label: "Red", min: 0, max: 255, defaultValue: 0xf9 },
    { label: "Green", min: 0, max: 255, defaultValue: 0xe0 },
    { label: "Blue", min: 0, max: 255, defaultValue: 0 },
  ];

  const getColor = (red: number, green: number, blue: number) =>
    `rgb(${red}, ${green}, ${blue})`;

  const getColorDisplay = (red: number, green: number, blue: number) => {
    const hexColor = `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
    return `${getColor(red, green, blue)} / ${hexColor.toUpperCase()}`;
  };

  return (
    <BasePicker
      sliders={sliders}
      getColor={getColor}
      getColorDisplay={getColorDisplay}
    />
  );
}
