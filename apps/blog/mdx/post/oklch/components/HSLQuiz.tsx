import { randomInt } from "es-toolkit";
import BaseQuiz from "./BaseQuiz";

export default function HSLQuiz() {
  const generateRandomHSL = () => {
    const h = randomInt(360);
    const s = randomInt(100);
    const l = randomInt(100);
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  return <BaseQuiz generateRandomColor={generateRandomHSL} />;
}
