import { Select, SelectItem } from "@yeolyi/ui/Select";
import { Table } from "@yeolyi/ui/Table";
import { clsx } from "clsx";
import { IMM_MAX, INSTRUCTION_SET, REG_MAP } from "../instructions";
import {
  asmToBinary,
  getType,
  lineToAsm,
  toBinary,
  useCpuStore,
} from "../store";

const INSTRUCTIONS = [
  "NOOP",
  ...Object.values(INSTRUCTION_SET).map((i) => i.name),
];
const IMM_VALUES = Array.from({ length: IMM_MAX + 1 }, (_, i) => i);
const ADDR_VALUES = Array.from({ length: 16 }, (_, i) => i);
// 빽빽한 표 안이라 셀렉트 최소 폭(min-w-40)을 풀어 내용 폭에 맞춘다.
const DENSE = "min-w-0! gap-2!";

function RegSelect({
  value,
  onValueChange,
  disabled,
}: {
  value: string;
  onValueChange: (val: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      className={DENSE}
      aria-label="레지스터"
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      {REG_MAP.map((r) => (
        <SelectItem key={r} value={r}>
          {r}
        </SelectItem>
      ))}
    </Select>
  );
}

export function InstructionBuilder({
  disabled,
  pc,
}: {
  disabled?: boolean;
  pc?: number;
}) {
  const slots = useCpuStore((s) => s.slots);
  const memory = useCpuStore((s) => s.memory);
  const updateSlot = useCpuStore((s) => s.updateSlot);

  return (
    <Table>
      <thead>
        <tr>
          <th className="pl-1">주소</th>
          <th className="pl-1">데이터</th>
          <th>명령어</th>
        </tr>
      </thead>
      <tbody>
        {slots.map((line, idx) => {
          const binary = disabled
            ? toBinary(memory[idx], 8)
            : asmToBinary(lineToAsm(line));
          const type = getType(line.op);
          const addr = idx.toString(2).padStart(4, "0");
          return (
            <tr key={addr}>
              {/* 실행 중 지금 PC 칸은 반전(mark). 셀렉트는 제 상자가 있어 주소·데이터만 뒤집는다. */}
              <td
                className={clsx(
                  "pl-1 font-mono",
                  disabled && idx === pc && "mark",
                )}
              >
                {addr}
              </td>

              <td
                className={clsx(
                  "pl-1 font-mono",
                  disabled && idx === pc && "mark",
                )}
              >
                {binary}
              </td>

              <td>
                <div className="flex items-center gap-1 font-mono">
                  <Select
                    className={DENSE}
                    aria-label="명령어"
                    value={line.op}
                    onValueChange={(val) => updateSlot(idx, { op: val })}
                    disabled={disabled}
                  >
                    {INSTRUCTIONS.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </Select>

                  {(type === "R" || type === "I") && (
                    <RegSelect
                      value={line.arg1}
                      onValueChange={(val) => updateSlot(idx, { arg1: val })}
                      disabled={disabled}
                    />
                  )}

                  {type === "R" && (
                    <RegSelect
                      value={line.arg2}
                      onValueChange={(val) => updateSlot(idx, { arg2: val })}
                      disabled={disabled}
                    />
                  )}

                  {type === "I" && (
                    <Select
                      className={DENSE}
                      aria-label="값"
                      value={line.arg2}
                      onValueChange={(val) => updateSlot(idx, { arg2: val })}
                      disabled={disabled}
                    >
                      {IMM_VALUES.map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          {v}
                        </SelectItem>
                      ))}
                    </Select>
                  )}

                  {type === "M" && (
                    <Select
                      className={DENSE}
                      aria-label="주소"
                      value={line.arg1}
                      onValueChange={(val) => updateSlot(idx, { arg1: val })}
                      disabled={disabled}
                    >
                      {ADDR_VALUES.map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          {v}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
