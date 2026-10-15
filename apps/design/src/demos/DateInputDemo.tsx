import DateInput, { isRealDate } from "@yeolyi/ui/DateInput";
import { useState } from "react";

// 질문, 설명(예시), 세 칸. 다 넣었는데 없는 날짜면 칸 위에 굵게 알린다.
export default function DateInputDemo() {
  const [value, setValue] = useState("1995-03-12");
  const filled = value.split("-").every(Boolean);
  return (
    <div className="flex flex-col">
      <label htmlFor="ds-birth" className="leading-[1.4]">
        생년월일
      </label>
      <span className="text-muted-foreground leading-[1.4]">예: 1995 3 12</span>
      {filled && !isRealDate(value) && (
        <span role="alert" className="leading-[1.4] font-bold">
          실제 있는 날짜를 넣으세요
        </span>
      )}
      <DateInput
        id="ds-birth"
        aria-label="생년월일"
        autoComplete="bday"
        value={value}
        onChange={setValue}
        className="mt-1"
      />
    </div>
  );
}
