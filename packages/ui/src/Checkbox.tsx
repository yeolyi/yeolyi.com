import { clsx } from "clsx";
import type { ReactNode } from "react";

interface Props {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  children?: ReactNode; // 라벨(선택). 없으면 사각만 — 라벨이 밖에 따로 있을 때 aria-label.
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

// 체크박스 — 켜고 끄기. 2px 잉크 사각이 켜지면 채워진다(체크 표시 없음).
// 네이티브 input 이라 키보드·폼·스크린리더가 그대로 동작한다. 라벨 전체가 누를 자리.
// 고대비(forced-colors)에선 브라우저가 바탕색을 덮어 채움이 사라지므로 시스템 색으로 직접 칠한다.
export default function Checkbox({
  checked,
  defaultChecked,
  onCheckedChange,
  children,
  disabled,
  id,
  "aria-label": ariaLabel,
  className,
}: Props) {
  return (
    <label
      // 연달아 누를 때 더블·트리플 클릭으로 라벨 글자가 선택되지 않게(클릭 자체는 그대로). Button 과 같다.
      onMouseDown={(e) => {
        if (e.detail > 1) e.preventDefault();
      }}
      className={clsx(
        "inline-flex cursor-pointer items-center gap-2.5 has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="border-foreground bg-background checked:bg-foreground focus-border size-[1.125rem] shrink-0 cursor-[inherit] appearance-none border-2 checked:shadow-[inset_0_0_0_2px_var(--color-background)] focus-visible:checked:shadow-[inset_0_0_0_2px_var(--color-background)] forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:forced-color-adjust-none forced-colors:checked:bg-[CanvasText] forced-colors:checked:shadow-[inset_0_0_0_2px_Canvas] forced-colors:focus-visible:border-[Highlight]"
      />
      {children}
    </label>
  );
}
