// 라이트/다크 테마. yeolyi.com 과 그 아래 서비스가 같은 값을 쓰도록 쿠키(theme)에 둔다.
// 운영에선 .yeolyi.com 도메인 쿠키라 한 번 고르면 모든 서비스에 같이 적용되고, 로컬에선 쿠키가 포트를 가리지 않아 앱끼리 같이 바뀐다.
// "auto" 는 쿠키를 지워 OS 설정(color-scheme: light dark)에 맡긴다. 화면 쪽 CSS 는 theme.css 의 :root[data-theme].
export type Theme = "auto" | "light" | "dark";
export const THEMES: readonly Theme[] = ["auto", "light", "dark"];
export const THEME_LABEL: Record<Theme, string> = {
  auto: "테마: 시스템 설정",
  light: "테마: 라이트",
  dark: "테마: 다크",
};

/** 페인트 전에 <head> 에서 돌릴 한 줄. 예전 블로그가 쓰던 localStorage 값도 읽는다. */
export const THEME_INIT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)/);var t=m?m[1]:localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`;

const domain = () =>
  location.hostname.endsWith("yeolyi.com") ? "; domain=.yeolyi.com" : "";

export function readTheme(): Theme {
  const m = document.cookie.match(/(?:^|; )theme=(light|dark)/);
  if (m) return m[1] as Theme;
  // 예전 블로그(localStorage)에서 넘어온 값은 쿠키로 옮긴다.
  const legacy = localStorage.getItem("theme");
  if (legacy === "light" || legacy === "dark") {
    writeTheme(legacy);
    return legacy;
  }
  return "auto";
}

export function writeTheme(t: Theme) {
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API 는 Firefox 에 없다
  document.cookie =
    t === "auto"
      ? `theme=; path=/; max-age=0${domain()}`
      : `theme=${t}; path=/; max-age=31536000; samesite=lax${domain()}`;
  localStorage.removeItem("theme");
}

export function applyTheme(t: Theme) {
  if (t === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

const resolve = (t: Theme) =>
  t === "auto"
    ? matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : t;
// x(t) = 1 − (1 + ωt)·e^(−ωt), ω·1 ≈ 9.23 이라 t=1 에서 99.9% 에 닿는다(튕김 없는 스프링).
const SPRING =
  "linear(0.000, 0.034, 0.114, 0.215, 0.321, 0.423, 0.516, 0.599, 0.671, 0.732, 0.783, 0.825, 0.860, 0.888, 0.911, 0.930, 0.944, 0.956, 0.966, 0.973, 0.979, 0.983, 0.987, 0.990, 0.992, 0.994, 0.995, 0.996, 0.997, 0.998, 0.998, 0.999, 1)";

/** 다음 테마로 넘긴다. 실제로 보이는 스킴이 바뀔 때만 버튼 중심에서 원이 퍼지며 바뀐다. onApply 는 버튼 모양 갱신용. */
export function cycleTheme(
  current: Theme,
  origin: HTMLElement,
  onApply: (t: Theme) => void,
): Theme {
  const next: Theme =
    THEMES[(THEMES.indexOf(current) + 1) % THEMES.length] ?? "auto";
  const commit = () => {
    applyTheme(next);
    writeTheme(next);
    onApply(next);
  };
  // 안 바뀌는 전환(OS 라이트에서 자동→라이트)까지 돌리면 화면 변화 없이 입력만 막힌다. 미지원·움직임 줄이기는 즉시.
  if (
    resolve(next) === resolve(current) ||
    !document.startViewTransition ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    commit();
    return next;
  }
  const { left, top, width, height } = origin.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const r = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  );
  // 전환 중엔 화면이 스냅샷이라 연달아 누른 클릭이 문서로 간다. 그동안만 선택을 끈다.
  const root = document.documentElement;
  root.style.userSelect = "none";
  const transition = document.startViewTransition(commit);
  transition.finished.finally(() => {
    root.style.userSelect = "";
    getSelection()?.removeAllRanges();
  });
  transition.ready.then(() => {
    root.animate(
      {
        clipPath: [
          `circle(0 at ${x}px ${y}px)`,
          `circle(${r}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 500,
        easing: SPRING,
        pseudoElement: "::view-transition-new(root)",
      },
    );
  });
  return next;
}

/** Vite 앱의 index.html <head> 에 THEME_INIT 을 넣는 플러그인(vite.config 에서 쓴다). */
export function themeInitPlugin() {
  return {
    name: "yeolyi-theme-init",
    transformIndexHtml: (html: string) =>
      html.replace("</head>", `<script>${THEME_INIT}</script></head>`),
  };
}
