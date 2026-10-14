// MDX 요소 매핑. 마크다운 표는 블로그처럼 ui/Table(가로 스크롤 래퍼 + .md-table)로 그린다.
// 접기는 마크다운 문법이 없어 글에 태그를 직접 쓰는데, MDX 는 직접 쓴 소문자 태그(<details>)를 바꿔 끼우지 않는다.
// 그래서 대문자 이름으로 넘겨 글에서 import 없이 <Details><Summary>…</Summary>…</Details> 로 쓰게 한다.
// 표가 있는 MDX 는 이걸 import 해 `export const components = mdx` 로 다시 내보낸다(재수출 구문은 MDX 안에서 이름이 안 생긴다).
import { Details, Summary } from "@yeolyi/ui/Details";
import { Table } from "@yeolyi/ui/Table";

export const components = { table: Table, Details, Summary };
