import { clsx } from "clsx";
import { useId, useState } from "react";
import Input from "./Input";

// 이미 아는 날짜(생년월일·전입일 같은)를 넣는 연·월·일 세 칸. 달력을 띄우지 않는다(GOV.UK date input).
// 값은 문자열 하나. 실제 있는 날짜면 "YYYY-MM-DD", 덜 넣었거나 없는 날짜면 넣은 그대로 "연-월-일", 다 비우면 "".
// 그래서 쓰는 쪽은 isRealDate 로 확인하고 오류 문장을 띄운다. id 는 연도 칸에 붙어 바깥 라벨·포커스가 거기로 간다.
// 칸에는 친 글자를 그대로 둔다(월에 1을 쳤다고 01로 바꾸면 12를 칠 수 없다). 바깥에서 값을 바꿨을 때만 칸을 다시 채운다.
type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  /** "bday" 면 각 칸에 bday-year·bday-month·bday-day 자동 완성을 단다. */
  autoComplete?: "bday";
  className?: string;
  /** 세 칸 묶음의 이름. 바깥 라벨이 연도 칸만 가리킬 때 묶음 전체에 이름을 준다. */
  "aria-label"?: string;
};

const FIELDS = [
  { key: "y", label: "연도", max: 4, width: "w-[calc(4ch+2rem)]", ac: "bday-year" },
  { key: "m", label: "월", max: 2, width: "w-[calc(2ch+2rem)]", ac: "bday-month" },
  { key: "d", label: "일", max: 2, width: "w-[calc(2ch+2rem)]", ac: "bday-day" },
] as const;

export function isRealDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

function split(value: string) {
  const [y = "", m = "", d = ""] = value.split("-");
  return { y, m, d };
}

function join(y: string, m: string, d: string) {
  if (!y && !m && !d) return "";
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return y.length === 4 && m && d && isRealDate(iso) ? iso : `${y}-${m}-${d}`;
}

export default function DateInput({ value, onChange, id, autoComplete, className, "aria-label": ariaLabel }: Props) {
  const base = useId();
  // 칸 글자와 그 글자로 만든 값을 같이 든다. 받은 값이 그것과 다르면 바깥에서 바꾼 것이니 칸을 다시 채운다.
  const [state, setState] = useState(() => ({ v: split(value), value }));
  if (value !== state.value) setState({ v: split(value), value });
  const { v } = state;
  return (
    <div role="group" aria-label={ariaLabel} className={clsx("flex gap-4", className)}>
      {FIELDS.map((f) => {
        const fieldId = f.key === "y" && id ? id : `${base}-${f.key}`;
        return (
          <div key={f.key} className="flex flex-col">
            <label htmlFor={fieldId} className="leading-[1.4]">
              {f.label}
            </label>
            <Input
              id={fieldId}
              inputMode="numeric"
              maxLength={f.max}
              autoComplete={autoComplete ? f.ac : "off"}
              value={v[f.key]}
              onChange={(e) => {
                const next = { ...v, [f.key]: e.target.value.replace(/\D/g, "").slice(0, f.max) };
                const joined = join(next.y, next.m, next.d);
                setState({ v: next, value: joined });
                onChange(joined);
              }}
              className={clsx("mt-1 min-w-0! tabular-nums [field-sizing:fixed]!", f.width)}
            />
          </div>
        );
      })}
    </div>
  );
}
