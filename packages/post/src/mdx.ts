// MDX 요소 매핑 — 스타일은 prose.css 의 요소 셀렉터가 걸므로, 여기엔 DOM 구조를
// 바꿔야 하는 것만 남긴다: Img(alt→캡션 figure), Table(가로 스크롤 래퍼).
// 접기는 ui/Details 를 대문자 이름으로 넘겨 글에서 import 없이 <Details><Summary>…</Summary>…</Details> 로 쓴다
// (MDX 는 직접 쓴 소문자 태그 <details> 를 바꿔 끼우지 않는다).
// Table 은 React 데모·MDX JSX 표와 공용(ui/Table) — 마크다운 표도 이걸로 override.
import { Details, Summary } from "@yeolyi/ui/Details";
import { Table } from "@yeolyi/ui/Table";
import Img from "./Img.astro";

export const mdxComponents = {
  img: Img,
  table: Table,
  Details,
  Summary,
};
