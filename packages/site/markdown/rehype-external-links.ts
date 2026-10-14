import type { Element, Root, RootContent } from "hast";

/* =============================================================================
 * rehype-external-links — 외부(절대 http) 링크에 target=_blank + rel 을 단다.
 * 끝의 화살표는 @yeolyi/site/base.css 가 href 로 붙이므로 여기선 동작(새 창 + noopener)만 더한다.
 * 마크다운 링크는 평문 <a> 그대로 남고 별도 컴포넌트 매핑이 필요 없다.
 * ========================================================================== */
export default function rehypeExternalLinks() {
  const walk = (nodes: RootContent[]) => {
    for (const node of nodes) {
      if (node.type !== "element") continue;
      const el = node as Element;
      if (el.tagName === "a") {
        const href = String(el.properties?.href ?? "");
        if (/^https?:\/\//.test(href)) {
          el.properties = {
            ...el.properties,
            target: "_blank",
            rel: "noopener noreferrer",
          };
        }
      }
      walk(el.children as RootContent[]);
    }
  };
  return (tree: Root) => walk(tree.children);
}
