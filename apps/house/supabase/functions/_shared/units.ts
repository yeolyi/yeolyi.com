/** 청약홈 주택형 "084.9100A" → "84.91㎡ A". 전용면적과 타입 글자. */
export const unitLabel = (type: string) => {
  const m = /^0*(\d+)(?:\.(\d*))?(.*)$/.exec(type.trim());
  if (!m) return type;
  const [, int = "", frac = "", rest = ""] = m;
  // 반올림하면 59.9968 이 "60.0" 이 되어 60㎡ 초과처럼 보인다. 둘째 자리에서 버린다.
  // 숫자로 바꿔 곱하면 부동소수 오차로 16.06 이 16.05 가 되니 글자로 자른다.
  const dec = frac.slice(0, 2).replace(/0+$/, "");
  const suffix = rest.trim();
  return `${int}${dec ? `.${dec}` : ""}㎡${suffix ? ` ${suffix}` : ""}`;
};
