import { clsx } from "clsx";
import type { TapeSymbol } from "./turingMachineStore";

const CYCLE: TapeSymbol[] = ["0", "1", "_"];

export function Tape({
  tape,
  head,
  canEdit,
  onCellClick,
}: {
  tape: TapeSymbol[];
  head: number;
  canEdit?: boolean;
  onCellClick?: (idx: number, symbol: TapeSymbol) => void;
}) {
  const handleClick = (idx: number) => {
    if (!canEdit || !onCellClick) return;
    const current = tape[idx];
    const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
    onCellClick(idx, next);
  };

  return (
    <div>
      <div className="relative flex flex-wrap">
        {tape.map((cell, idx) => (
          <button
            key={`${idx}-${cell}`}
            type="button"
            className={clsx(
              "relative mb-6 flex h-12 w-12 shrink-0 items-center justify-center border font-mono",
              idx === head && "mark",
              canEdit &&
                "hover:bg-foreground hover:text-background focus-border cursor-pointer",
            )}
            disabled={!canEdit}
            onClick={() => handleClick(idx)}
          >
            {cell}
            {idx === head && (
              // 칸 밖(아래)에 놓이니 칸의 반전 글자색을 물려받지 않게 한다
              <p className="text-foreground absolute -bottom-0 translate-y-full">
                헤드
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
