import Button from "@yeolyi/ui/Button";

// −/값/+ 스테퍼 — 12·13 글 공용
export function Stepper({
  value,
  min,
  max,
  onValueChange,
}: {
  value: number;
  min: number;
  max: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => onValueChange(Math.max(min, value - 1))}
        disabled={value === min}
      >
        -
      </Button>
      <span className="w-4 text-center font-mono">{value}</span>
      <Button
        onClick={() => onValueChange(Math.min(max, value + 1))}
        disabled={value === max}
      >
        +
      </Button>
    </div>
  );
}
