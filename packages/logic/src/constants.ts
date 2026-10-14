export const PROPAGATION_DELAY_MS = 200;

export const minZoomOptions = { maxZoom: 1, padding: 0.25 };

export const HANDLE_SIZE = 16;

// 핸들은 평소 투명하다(보이는 조건은 index.tsx 의 HANDLE_VISIBILITY_CLASS). 보일 때는
// 원 하나 — 출력은 실선, 입력은 점선. 바탕을 채워 아래 선이 비치지 않게 한다.
export const RIGHT_HANDLE_STYLE = {
  border: "1px solid",
  width: `${HANDLE_SIZE}px`,
  height: `${HANDLE_SIZE}px`,
  borderColor: "var(--color-foreground)",
  backgroundColor: "var(--color-background)",
  transform: "translateX(100%) translateY(-50%)",
};

export const LEFT_HANDLE_STYLE = {
  border: "1px dashed",
  width: `${HANDLE_SIZE}px`,
  height: `${HANDLE_SIZE}px`,
  borderColor: "var(--color-foreground)",
  backgroundColor: "var(--color-background)",
  transform: "translateX(-100%) translateY(-50%)",
};
