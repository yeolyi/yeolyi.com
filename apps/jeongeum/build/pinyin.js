// 중국어 병음 → 한글 (국립국어원 중국어 표기법 기준, 단순화)
const { compose, decompose } = require("../src/engine.js");

const INITIAL = {
  b: "ㅂ", p: "ㅍ", m: "ㅁ", f: "ㅍ", d: "ㄷ", t: "ㅌ", n: "ㄴ", l: "ㄹ", g: "ㄱ", k: "ㅋ", h: "ㅎ",
  j: "ㅈ", q: "ㅊ", x: "ㅅ", zh: "ㅈ", ch: "ㅊ", sh: "ㅅ", r: "ㄹ", z: "ㅉ", c: "ㅊ", s: "ㅆ",
};
// 자음 뒤 운모 (ㅇ 초성 자리에 성모가 들어간다)
const FINAL = {
  a: "아", o: "오", e: "어", ai: "아이", ei: "에이", ao: "아오", ou: "어우", an: "안", en: "언",
  ang: "앙", eng: "엉", ong: "웅", er: "얼", i: "이", ia: "야", ie: "예", iao: "야오", iu: "유",
  ian: "옌", in: "인", iang: "양", ing: "잉", iong: "융", u: "우", ua: "와", uo: "워", uai: "와이",
  ui: "우이", uan: "완", un: "운", uang: "왕", ue: "웨", v: "위", ve: "웨", van: "위안", vn: "윈",
};
// 성모 없는 음절
const ZERO = {
  a: "아", o: "오", e: "어", ai: "아이", ei: "에이", ao: "아오", ou: "어우", an: "안", en: "언",
  ang: "앙", eng: "엉", er: "얼", yi: "이", ya: "야", ye: "예", yao: "야오", you: "유", yan: "옌",
  yin: "인", yang: "양", ying: "잉", yong: "융", yo: "요", yu: "위", yue: "웨", yuan: "위안", yun: "윈",
  wu: "우", wa: "와", wo: "워", wai: "와이", wei: "웨이", wan: "완", wen: "원", wang: "왕", weng: "웡",
};
const UNY = { "ㅑ": "ㅏ", "ㅒ": "ㅐ", "ㅕ": "ㅓ", "ㅖ": "ㅔ", "ㅛ": "ㅗ", "ㅠ": "ㅜ" };

function pinyinToHangul(py) {
  py = py.replace(/ü/g, "v");
  if (ZERO[py]) return ZERO[py];
  const m = py.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcs])(.*)$/);
  if (!m) return "";
  const [, ini, fin0] = m;
  let fin = fin0;
  if ("jqx".includes(ini) && ini.length === 1) { // j/q/x 뒤의 u 는 ü
    fin = { u: "v", ue: "ve", uan: "van", un: "vn" }[fin] || fin;
  }
  let hang = FINAL[fin];
  if (fin === "i" && ["zh", "ch", "sh", "r", "z", "c", "s"].includes(ini)) hang = "으";
  if (!hang) return "";
  const first = decompose(hang[0]);
  let v = first.v;
  if ("ㅈㅊㅉ".includes(INITIAL[ini])) v = UNY[v] || v; // 자/차 (쟈·챠 안 씀)
  return compose({ c: INITIAL[ini], v, j: first.j }) + hang.slice(1);
}

module.exports = { pinyinToHangul };
