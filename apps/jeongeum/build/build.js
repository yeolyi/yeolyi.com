// data/*.tsv → ext/data.js (확장 프로그램에 실리는 사전)
const fs = require("fs");
const path = require("path");
const E = require("../src/engine.js");
const { pinyinToHangul } = require("./pinyin.js");
const OVERRIDES = require("./overrides.js");
// 여러 소리가 나는 한자 중 기본값이 덜 흔한 쪽으로 잡힌 것
const PINYIN_FIX = { "长": "chang" };

const root = path.join(__dirname, "..");
const out = path.join(root, "ext");
fs.mkdirSync(out, { recursive: true });

// 영어
const en = [];
const seen = new Set();
for (const [w, h] of Object.entries(OVERRIDES)) if (h) { en.push(`${w}\t${h}`); seen.add(w); }
for (const line of fs.readFileSync(path.join(root, "data/en.tsv"), "utf8").split("\n")) {
  if (!line) continue;
  const [w, ph] = line.split("\t");
  if (seen.has(w)) continue;
  seen.add(w);
  const h = E.phonemesToHangul(ph.split(" "), w);
  if (h) en.push(`${w}\t${h}`);
}

// 한자
const zh = [];
const ko = [];
for (const line of fs.readFileSync(path.join(root, "data/han.tsv"), "utf8").split("\n")) {
  if (!line) continue;
  const [, py, kor] = line.split("\t");
  zh.push(py ? pinyinToHangul(PINYIN_FIX[String.fromCodePoint(parseInt(line.split("\t")[0], 16))] || py) : "");
  ko.push(kor || "");
}

const js = `// 자동 생성 파일 (build/build.js). 영어 발음: CMU Pronouncing Dictionary, 단어 빈도: wordfreq, 병음: pypinyin, 한자음: hanja.
globalThis.MONTTANG_DATA = ${JSON.stringify({ en: en.join("\n"), zh: zh.join("|"), ko: ko.join("|") })};
`;
fs.writeFileSync(path.join(out, "data.js"), js);
fs.copyFileSync(path.join(root, "src/engine.js"), path.join(out, "engine.js"));
console.log(`en ${en.length}개, 한자 ${zh.length}자, data.js ${(js.length / 1024).toFixed(0)}KB`);
