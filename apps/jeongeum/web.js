// 정음 엔진을 확장 밖(웹페이지·빌드)에서 쓰는 입구. 확장의 content.js 와 같은 방식으로 변환기를 만든다.
// 사전(ext/data.js, 약 1.5MB)과 엔진은 전역(MONTTANG_DATA·MonttangEngine)에 올라가는 스크립트라 import 하면 실행만 된다.
// 동적 import 라 쓰는 쪽 번들에선 따로 떨어진 조각이 되고, 부를 때 받는다.
let converter;

export async function loadConverter() {
  if (converter) return converter;
  await import("./ext/data.js");
  await import("./ext/engine.js");
  const D = globalThis.MONTTANG_DATA;
  const en = new Map();
  for (const line of D.en.split("\n")) {
    const t = line.indexOf("\t");
    en.set(line.slice(0, t), line.slice(t + 1));
  }
  converter = globalThis.MonttangEngine.createConverter({ en, zh: D.zh.split("|"), ko: D.ko.split("|") });
  return converter;
}
