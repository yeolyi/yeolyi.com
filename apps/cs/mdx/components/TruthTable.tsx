/** biome-ignore-all lint/suspicious/noArrayIndexKey: 라벨이랑 섞어서 ㄱㅊ */

import Checkbox from "@yeolyi/ui/Checkbox";
import { clsx } from "clsx";
import { useState } from "react";

type LabelType = "input" | "output";

type TableLabel = {
  label: string;
  type: LabelType;
};

type TruthTableProps = {
  labels: TableLabel[];
  data: boolean[][];
};

export default function TruthTable({ labels, data }: TruthTableProps) {
  // "입력이 앞"이라는 순서 가정 없이 컬럼 인덱스로 매칭한다. 출력 자리는 false로 남는다.
  const inputIndices = labels.flatMap((l, i) =>
    l.type === "input" ? [i] : [],
  );

  const [inputs, setInputs] = useState<boolean[]>(() =>
    Array(labels.length).fill(false),
  );

  const matchingRowIndex = data.findIndex((row) =>
    inputIndices.every((col) => inputs[col] === row[col]),
  );

  const handleCheckedChange = (index: number) => (checked: boolean) => {
    const newInputs = [...inputs];
    newInputs[index] = checked;
    setInputs(newInputs);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 좁은 화면에선 표만 가로로 민다(본문 폭을 넘지 않게). */}
      <div className="overflow-x-auto">
        <table className="mx-auto w-fit">
          <thead>
            <tr className="border-b">
              {labels.map((labelObj, index) => (
                <th
                  key={`header-${labelObj.label}-${index}`}
                  className="h-10 px-2 text-center align-middle"
                >
                  {labelObj.type === "input" ? (
                    <Checkbox
                      checked={inputs[index]}
                      onCheckedChange={handleCheckedChange(index)}
                    >
                      {labelObj.label}
                    </Checkbox>
                  ) : (
                    <span>{labelObj.label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {data.map((row, rowIdx) => (
              <tr
                key={`row-${rowIdx}`}
                className={clsx(
                  "border-b transition-colors",
                  rowIdx === matchingRowIndex
                    ? "mark"
                    : "hover:bg-foreground hover:text-background",
                )}
              >
                {row.map((cell, colIdx) => (
                  <td
                    key={`cell-${rowIdx}-${colIdx}`}
                    className="p-2 text-center align-middle"
                  >
                    {cell ? "1" : "0"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
