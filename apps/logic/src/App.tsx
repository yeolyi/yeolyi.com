import Flow from "@yeolyi/logic";
import Button from "@yeolyi/ui/Button";
import ServiceHeader from "@yeolyi/ui/ServiceHeader";
import { type ComponentType, lazy, Suspense, useEffect, useState } from "react";
import { EXAMPLES, type ExampleSlug } from "./examples/examples.ts";

// 주소: / 시작 페이지(회로 하나 + 예제 목록) · /editor 편집기(반가산기에서 시작) · /examples/<slug> 예제 회로. /examples 는 시작 페이지를 보여 준다.
// 편집기와 예제 회로는 화면 전체를 쓰는 도구라 폭 제한이 없다.
// 같은 앱 안 링크는 history 로 옮겨 다시 불러오지 않는다.

// 편집기는 저장하지 않으니, 고친 게 있으면 나가기 전에 한 번 묻는다. 나가는 길은 셋이다.
// - 새로 고침·탭 닫기·바깥 링크: beforeunload. 문구는 브라우저가 정한다(사이트가 바꿀 수 없다).
// - 앱 안 링크(navigate): confirm 으로 묻고, 취소하면 이동하지 않는다.
// - 뒤로·앞으로 가기(popstate): 이미 주소가 바뀐 뒤라 막을 수 없어서, 취소하면 편집기 주소를 다시 넣는다.
let edited = false;
const LEAVE = "고친 회로는 저장되지 않습니다. 나갈까요?";
const onEditor = (path: string) => path.startsWith("/editor");
addEventListener("beforeunload", (e) => {
  if (edited) e.preventDefault();
});

function usePath() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const on = () => {
      if (edited && !onEditor(location.pathname)) {
        if (!confirm(LEAVE)) return history.pushState(null, "", "/editor");
        edited = false;
      }
      setPath(location.pathname);
    };
    addEventListener("popstate", on);
    return () => removeEventListener("popstate", on);
  }, []);
  return path;
}

function navigate(path: string) {
  if (edited && !onEditor(path)) {
    if (!confirm(LEAVE)) return;
    edited = false;
  }
  history.pushState(null, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
  scrollTo(0, 0);
}

function go(e: React.MouseEvent<HTMLElement>) {
  const a = (e.target as HTMLElement).closest("a");
  if (
    !a ||
    a.origin !== location.origin ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey
  )
    return;
  e.preventDefault();
  navigate(a.pathname);
}

// 슬러그별 lazy. 회로 데이터를 따로 받아 Flow 로 그린다.
const flows = Object.fromEntries(
  EXAMPLES.map((ex): [ExampleSlug, ComponentType] => [
    ex.slug,
    lazy(async () => {
      const { default: initialJSON } = await ex.load();
      return {
        default: () => (
          <Flow
            id={ex.id}
            initialJSON={initialJSON as never}
            fillHeight
            edgeStyle={"edgeStyle" in ex ? ex.edgeStyle : undefined}
          />
        ),
      };
    }),
  ]),
) as Record<ExampleSlug, ComponentType>;

// 편집기는 빈 캔버스 대신 반가산기를 깔고 연다. 무엇을 할 수 있는지 바로 보이고, 지우고 새로 시작해도 된다.
const halfAdder = EXAMPLES.find((e) => e.slug === "half-adder")!;
const EditorFlow = lazy(async () => {
  const { default: initialJSON } = await halfAdder.load();
  return {
    default: () => {
      // 새로 연 편집기는 아직 고친 게 없다.
      useEffect(() => {
        edited = false;
      }, []);
      return (
        <Flow
          id="editor"
          initialJSON={initialJSON as never}
          fillHeight
          onEdit={() => {
            edited = true;
          }}
        />
      );
    },
  };
});

export function App() {
  const path = usePath();
  const slug = path.match(/^\/examples\/([\w-]+)/)?.[1] as
    | ExampleSlug
    | undefined;
  const example = EXAMPLES.find((e) => e.slug === slug);
  const tab = example
    ? "example"
    : path.startsWith("/editor")
      ? "editor"
      : "home";
  const tool = tab !== "home";
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: 링크 클릭만 가로챈다(키보드 Enter 도 click 이벤트로 온다)
    // biome-ignore lint/a11y/noStaticElementInteractions: 위와 같다. 안의 <a> 가 상호작용 요소다
    <div className={tool ? "flex h-dvh flex-col" : undefined} onClick={go}>
      {/* 시작 페이지는 블로그와 같은 자리, 화면을 다 쓰는 도구(편집기·예제 회로)는 화면 폭에 아래 선. */}
      <ServiceHeader
        name="논리 게이트 시뮬레이터"
        className={tool ? "border-b px-4" : "measure-col shrink-0 pt-[1.5rlh]"}
      />
      {tab === "home" ? (
        <Landing />
      ) : tab === "editor" ? (
        <main className="min-h-0 flex-1">
          <Suspense>
            <EditorFlow />
          </Suspense>
        </main>
      ) : tab === "example" && example ? (
        <main className="flex min-h-0 flex-1 flex-col">
          <p className="text-muted-foreground px-4 py-[0.25rlh]">
            <strong className="text-foreground">{example.label}</strong>{" "}
            {example.hint}
          </p>
          <div className="min-h-0 flex-1">
            <Suspense>
              {(() => {
                const C = flows[example.slug];
                return <C />;
              })()}
            </Suspense>
          </div>
        </main>
      ) : null}
    </div>
  );
}

// 시작 페이지의 회로: 7-세그먼트 디코더를 보기 전용으로(스위치만 눌리고 크기는 내용에 맞춤). 고치는 건 편집기에서.
const featured = EXAMPLES.find((e) => e.slug === "seven-segment")!;
const Featured = lazy(async () => {
  const { default: initialJSON } = await featured.load();
  return {
    default: () => (
      <Flow id="landing" initialJSON={initialJSON as never} viewOnly />
    ),
  };
});

/** 시작 페이지. 빈 캔버스 대신 바로 만져 볼 회로 하나를 먼저 보여 준다. */
function Landing() {
  // 세로 간격은 디자인 시스템 단계대로: 헤더→내용 2, 제목→설명 0.5, 문단 사이 1, 목록 페이지의 섹션 사이 2, 제목→목록 0.5, 페이지 끝 5.
  return (
    <main className="pb-[5rlh]">
      <div className="measure-col pt-[2rlh]">
        <h1>논리 게이트 시뮬레이터</h1>
        <p className="mt-[0.5rlh]">
          NAND·AND·OR 같은 게이트와 래치를 선으로 이어 디지털 회로를 만듭니다.
          스위치를 누르면 결과가 바로 흐릅니다.
        </p>
        <div className="mt-[1rlh]">
          <Button variant="primary" onClick={() => navigate("/editor")}>
            편집기 열기
          </Button>
        </div>
        {/* 간격은 본문 크기 칸에 건다. lh 는 그 요소의 줄 높이라 작은 글씨에 걸면 짧아진다. */}
        <div className="mt-[2rlh]">
          <p className="text-muted-foreground text-base">
            7-세그먼트 디코더입니다. 왼쪽 8·4·2·1 스위치로 2진수(0~9)를 만들면
            오른쪽에 숫자가 그려집니다.
          </p>
        </div>
      </div>
      {/* 글 폭보다 넓게, 이 폭까지 회로가 커진다. */}
      <div className="mx-auto mt-[0.5rlh] max-w-[60rem]">
        <Suspense>
          <Featured />
        </Suspense>
      </div>
      <div className="measure-col mt-[2rlh]">
        <h2>예제</h2>
        <ul className="mt-[0.5rlh] space-y-[0.5rlh]">
          {EXAMPLES.map((e) => (
            <li key={e.slug}>
              <a href={`/examples/${e.slug}`}>{e.label}</a>
              <p className="text-muted-foreground text-base">{e.hint}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
