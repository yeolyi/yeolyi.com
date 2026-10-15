// contentEditable ↔ 마크업 변환과 서식 명령.
import { parseMarkup, RED, type Run, runsToMarkup } from "../model";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function markupToHtml(src: string): string {
  let html = parseMarkup(src)
    .map((r) => {
      let s = esc(r.text).replace(/\n/g, "<br>");
      if (r.underline) s = `<u>${s}</u>`;
      // 편집 중엔 블러를 취소선 태그로 들고 다닌다(execCommand 로 켜고 끄기 쉬워서). 모양은 CSS 가 바꾼다.
      if (r.blur) s = `<s>${s}</s>`;
      if (r.bold) s = `<b>${s}</b>`;
      if (r.red) s = `<font color="${RED}">${s}</font>`;
      return s;
    })
    .join("");
  // 끝 줄바꿈이 보이려면 자리표시 <br> 이 하나 더 필요하다.
  if (src.endsWith("\n")) html += "<br>";
  return html;
}

const sameColor = (a: string, b: string) => {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return false;
  ctx.fillStyle = a;
  const x = ctx.fillStyle;
  ctx.fillStyle = b;
  return x === ctx.fillStyle;
};

type St = { bold: boolean; red: boolean; underline: boolean; blur: boolean };

export function htmlToMarkup(root: HTMLElement): string {
  const runs: Run[] = [];
  const push = (text: string, st: St) => runs.push({ text, ...st });
  const walk = (node: Node, st: St) => {
    if (node.nodeType === Node.TEXT_NODE) {
      push((node.textContent ?? "").replace(/​/g, ""), st);
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      push("\n", st);
      return;
    }
    const next = { ...st };
    const tag = node.tagName;
    if (tag === "B" || tag === "STRONG") next.bold = true;
    if (tag === "U") next.underline = true;
    if (tag === "S" || tag === "STRIKE" || tag === "DEL") next.blur = true;
    const fw = node.style.fontWeight;
    if (fw) next.bold = fw === "bold" || Number(fw) >= 600;
    const color =
      (tag === "FONT" && node.getAttribute("color")) || node.style.color;
    if (color) next.red = sameColor(color, RED);
    const td = node.style.textDecoration || node.style.textDecorationLine;
    if (td) {
      next.underline = td.includes("underline");
      if (td.includes("line-through")) next.blur = true;
    }
    const block = tag === "DIV" || tag === "P";
    if (block && runs.length && !runs[runs.length - 1].text.endsWith("\n"))
      push("\n", st);
    for (const c of node.childNodes) walk(c, next);
  };
  const base = { bold: false, red: false, underline: false, blur: false };
  const kids = [...root.childNodes];
  // 크롬이 끝에 붙이는 자리표시 <br> 은 버린다.
  if (kids.length && kids[kids.length - 1].nodeName === "BR") kids.pop();
  for (const k of kids) walk(k, base);
  return runsToMarkup(runs);
}

export type Mark = "bold" | "red" | "underline" | "blur";

export function execMark(mark: Mark) {
  if (mark === "bold") document.execCommand("bold");
  else if (mark === "underline") document.execCommand("underline");
  else if (mark === "blur") document.execCommand("strikeThrough");
  else {
    const cur = document.queryCommandValue("foreColor");
    document.execCommand(
      "foreColor",
      false,
      sameColor(cur, RED) ? "#000000" : RED,
    );
  }
}

// 편집 중 선택한 글자에 색을 칠한다.
export function execColor(color: "black" | "red") {
  document.execCommand("foreColor", false, color === "red" ? RED : "#000000");
}

// 상자 전체 색을 바꿀 땐 글자 단위 빨강을 지운다(상자 색이 그대로 보이게).
export function stripRed(src: string): string {
  return runsToMarkup(parseMarkup(src).map((r) => ({ ...r, red: false })));
}

// 편집 중이 아닐 때: 상자 전체 블러를 켜고 끈다(전부 켜져 있으면 끈다).
export function toggleWholeBlur(src: string): string {
  const runs = parseMarkup(src);
  const all = runs.filter((r) => r.text.trim()).every((r) => r.blur);
  return runsToMarkup(runs.map((r) => ({ ...r, blur: !all })));
}
