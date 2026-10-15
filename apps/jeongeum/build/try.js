require("../ext/data.js");
const E = require("../src/engine.js");
const D = globalThis.MONTTANG_DATA;
const en = new Map(D.en.split("\n").map((l) => l.split("\t")));
const conv = E.createConverter({
  en,
  zh: D.zh.split("|"),
  ko: D.ko.split("|"),
});
const lines = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "Hello, world! Welcome to my YouTube channel.",
      "The quick brown fox jumps over the lazy dog.",
      "Sign in to GitHub — Build software better, together.",
      "Anthropic's Claude is an AI assistant. I don't know, it's fine.",
      "Frontend Developer at Kakao, working with React and TypeScript",
      "Café résumé naïve Zürich Müller",
      "東京に行きたいです。ラーメンが大好き！コーヒーとチョコレート",
      "北京欢迎你。中国人民银行。我爱学习中文",
      "API, HTML, CSS, NASA, USA, OK, iPhone 17 Pro",
      "Price: $1,299.99 on 2026-10-09",
    ];
for (const l of lines)
  console.log(l + "\n  → " + conv(l, { numbers: true }) + "\n");
