import bold from "pretendard/dist/web/static/woff2/Pretendard-Bold.woff2?url";
import regular from "pretendard/dist/web/static/woff2/Pretendard-Regular.woff2?url";
import { startTracking } from "@yeolyi/track";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// 슬라이드 폰트는 Pretendard Regular·Bold 두 벌뿐이다.
// 내보내기(modern-screenshot)가 문서의 @font-face 를 읽어 이미지에 심으므로 스타일시트로 넣는다.
const style = document.createElement("style");
style.textContent = [
	[regular, 400],
	[bold, 700],
]
	.map(([url, weight]) => `@font-face{font-family:Pretendard;font-weight:${weight};font-display:block;src:url(${url}) format("woff2");}`)
	.join("\n");
document.head.appendChild(style);
document.fonts.load("400 40px Pretendard");
document.fonts.load("700 40px Pretendard");

startTracking("carousel");

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
