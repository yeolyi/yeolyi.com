import Button from "@yeolyi/ui/Button";
import { Table } from "@yeolyi/ui/Table";
import Textarea from "@yeolyi/ui/Textarea";
import { clsx } from "clsx";
import { type Dispatch, type SetStateAction, useState } from "react";
import type { Rules, State, TapeSymbol } from "./turingMachineStore";

export function ControlUnit({
  rules,
  currentState,
  currentSymbol,
  editable,
  rulesCsv,
  onRulesCsvChange,
  isEditing,
  setIsEditing,
}: {
  rules: Rules;
  currentState: State;
  currentSymbol: TapeSymbol;
  editable?: boolean;
  rulesCsv: string;
  onRulesCsvChange: (newCsv: string) => void;
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasScroll, setHasScroll] = useState(false);
  const [editedCsv, setEditedCsv] = useState(rulesCsv.trim());

  const handleApply = () => {
    onRulesCsvChange(editedCsv);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedCsv(rulesCsv.trim());
    setIsEditing(false);
  };

  return (
    <div className="mt-6">
      <div className="mb-2 flex w-full items-center justify-between">
        <span />
        <div className="flex items-center gap-2">
          {editable && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>편집</Button>
          )}
          {hasScroll && !isEditing && (
            <Button onClick={() => setIsExpanded((prev) => !prev)}>
              {isExpanded ? "접기" : "펼치기"}
            </Button>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <Textarea
            name="rules"
            className="h-48 w-full p-2 font-mono"
            value={editedCsv}
            onChange={(e) => setEditedCsv(e.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button onClick={handleCancel}>취소</Button>
            <Button onClick={handleApply}>적용</Button>
          </div>
        </div>
      ) : (
        <div
          className={clsx("overflow-auto", !isExpanded && "h-fit max-h-72")}
          style={{ scrollbarGutter: "stable" }}
          ref={(ref) => {
            if (ref) setHasScroll(ref.scrollHeight > 288);
          }}
        >
          <Table className="font-mono">
            <thead>
              <tr>
                <th>현재 상태</th>
                <th>읽은 기호</th>
                <th>다음 상태</th>
                <th>쓸 기호</th>
                <th>이동</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rules).flatMap(([state, transitions]) =>
                Object.entries(transitions).map(
                  ([symbol, rule]) =>
                    rule && (
                      <tr
                        key={`${state}-${symbol}`}
                        className={clsx(
                          state === currentState &&
                            symbol === currentSymbol &&
                            currentState !== "q_halt" &&
                            "mark",
                        )}
                      >
                        <td>{state}</td>
                        <td>{symbol}</td>
                        <td>{rule.newState}</td>
                        <td>{rule.newSymbol}</td>
                        <td>{{ L: "←", R: "→", N: "-" }[rule.direction]}</td>
                      </tr>
                    ),
                ),
              )}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
