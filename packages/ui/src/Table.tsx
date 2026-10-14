import { clsx } from "clsx";

// 동적(React) 표 래퍼 — 마크다운 표(mdx/Table.astro)와 같은 .md-table 를 달아 동일하게
// 보이게 한다. 셀은 데모가 native <thead>/<tbody>/<tr>/<th>/<td> 로 쓰고, 스타일은
// prose.css 의 .md-table th/td 셀렉터가 입힌다(마크다운·데모 공용).
export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="md-table-wrap">
      <table className={clsx("md-table w-full", className)} {...props} />
    </div>
  );
}
