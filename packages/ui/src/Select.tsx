import { Select } from "@base-ui/react/select";
import { clsx } from "clsx";
import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  type ComponentProps,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

// 셀렉트 — 고를 게 다섯 이상일 때(적으면 RadioGroup). 입력 칸과 같은 2px 잉크 상자에
// 오른쪽 끝 화살표, 열리면 트리거 아래로 같은 폭의 목록. 고른 항목엔 체크, 가리킨 항목은 반전 +
// 왼쪽 주황 막대(마우스·키보드 같음). Base UI Select 위에 얹었다.
// 보이는 라벨이 없으면 aria-label 을 준다(트리거의 이름이 된다).
interface Props {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  // 간단한 경우엔 배열로. 세밀히 제어할 땐 SelectItem children 을 넘긴다.
  options?: { value: string; label: string }[];
  children?: ReactNode;
}

function DSSelect({
  value,
  defaultValue,
  onValueChange,
  disabled,
  placeholder,
  className,
  "aria-label": ariaLabel,
  options,
  children,
}: Props) {
  // Base UI 는 items(값→라벨)가 있어야 트리거에 값 대신 라벨을 보인다. children 으로 받았으면 거기서 모은다.
  const items: { value: string; label: ReactNode }[] =
    options ??
    Children.toArray(children)
      .filter((c): c is ReactElement<ComponentProps<typeof SelectItem>> =>
        isValidElement(c),
      )
      .map((c) => ({ value: c.props.value, label: c.props.children }));

  return (
    <Select.Root
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(v) => {
        if (typeof v === "string") onValueChange?.(v);
      }}
      disabled={disabled}
    >
      <Select.Trigger
        aria-label={ariaLabel}
        className={clsx(
          "border-foreground bg-background hover:bg-foreground hover:text-background press-down data-popup-open:bg-foreground data-popup-open:text-background focus-border h-control group inline-flex min-w-40 cursor-pointer items-center justify-between gap-6 border-2 pr-3 pl-3.5 font-mono transition-colors data-disabled:cursor-not-allowed data-disabled:opacity-50 data-pressed:pt-[2px]",
          className,
        )}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon
          render={
            <ChevronDown
              aria-hidden
              className="size-[1.25em] transition-transform group-data-popup-open:rotate-180"
            />
          }
        />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className="z-50"
          alignItemWithTrigger={false}
          sideOffset={4}
        >
          <Select.Popup className="border-foreground bg-background text-foreground max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto border-2 font-mono">
            <Select.List>
              {options
                ? options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))
                : children}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function SelectItem({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Select.Item
      value={value}
      className={clsx(
        "h-control data-highlighted:bg-foreground data-highlighted:text-background flex cursor-pointer items-center justify-between gap-6 px-3 outline-none select-none data-highlighted:shadow-[inset_4px_0_0_var(--color-accent)]",
        className,
      )}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator>
        <Check aria-hidden className="size-[1.1em]" />
      </Select.ItemIndicator>
    </Select.Item>
  );
}

export { DSSelect as Select, SelectItem };
