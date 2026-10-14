import { randomInt } from "es-toolkit";
import BaseQuiz from "./BaseQuiz";

export default function RGBQuiz() {
  const generateRandomHex = () => {
    const hex = randomInt(16777215).toString(16);
    return `#${hex.padStart(6, "0")}`;
  };

  const formatColorDisplay = (color: string) => color.toUpperCase();

  return (
    <BaseQuiz
      generateRandomColor={generateRandomHex}
      formatColorDisplay={formatColorDisplay}
    />
  );
}
