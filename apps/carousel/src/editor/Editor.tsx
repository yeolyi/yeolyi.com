// 덱 편집 화면: 상단 바 + 슬라이드 목록 + 캔버스 + 속성 패널, 그리고 단축키.
import Button from "@yeolyi/ui/Button";
import { Details, Summary } from "@yeolyi/ui/Details";
import IconButton from "@yeolyi/ui/IconButton";
import Input from "@yeolyi/ui/Input";
import {
  ArrowLeft,
  Download,
  ImagePlus,
  Redo2,
  Share,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { navigate } from "../App";
import { api } from "../api";
import {
  canShare,
  downloadZip,
  type Rendered,
  renderDeck,
  share,
} from "../exportClient";
import { type Deck, H, type Layer, uid, W } from "../model";
import { ic } from "../ui";
import { useMobile } from "../useMobile";
import { CaptionBox } from "./CaptionBox";
import { Panel, type ZOp } from "./Panel";
import { SlideList } from "./SlideList";
import { Stage } from "./Stage";
import { mapSlide, useDeckStore } from "./store";

type Pt = { x: number; y: number };

const CLIP = "carousel-layer";
function readClip(text: string): { deck: string; layer: Layer } | null {
  if (!text.includes(CLIP)) return null;
  try {
    const v = JSON.parse(text);
    return v?.[CLIP] && v.layer?.type
      ? { deck: String(v.deck), layer: v.layer as Layer }
      : null;
  } catch {
    return null;
  }
}

// 글자 칸에서 온 입력인지. 코드 레이어(Shadow DOM) 안의 입력칸은 e.target 이 바깥 상자로 바뀌어 오므로 실제 경로의 맨 앞을 본다.
const isTyping = (e: Event) => {
  const t = e.composedPath()[0];
  return (
    t instanceof HTMLElement &&
    (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA")
  );
};

export function Editor({ slug }: { slug: string }) {
  const store = useDeckStore(slug);
  const { deck, commit } = store;
  const [si, setSiRaw] = useState(
    () => Number(new URLSearchParams(location.search).get("s") ?? 1) - 1 || 0,
  );
  const [sel, setSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; caret?: Pt } | null>(
    null,
  );
  const [cropping, setCropping] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  // 모바일: 다 만든 뒤 공유 시트를 사용자가 직접 눌러 연다(iOS 는 탭 안에서만 공유를 허락한다).
  const [ready, setReady] = useState<Rendered | null>(null);
  const [sheetTab, setSheetTab] = useState<"layers" | "caption">("layers");
  const mobile = useMobile();
  const fileInput = useRef<HTMLInputElement>(null);

  const slideCount = deck?.slides.length ?? 0;
  const cur = Math.min(si, Math.max(0, slideCount - 1));

  const setSi = useCallback((i: number) => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setSiRaw(i);
    setSel(null);
    setEditing(null);
    setCropping(null);
    history.replaceState(null, "", `${location.pathname}?s=${i + 1}`);
  }, []);

  const layers = deck?.slides[cur]?.layers ?? [];
  const selLayer = layers.find((l) => l.id === sel) ?? null;

  const addLayer = useCallback(
    (l: Layer, edit = false) => {
      commit((d) => mapSlide(d, cur, (ls) => [...ls, l]));
      setSel(l.id);
      if (edit) setEditing({ id: l.id });
    },
    [commit, cur],
  );

  const addText = () =>
    addLayer(
      {
        id: uid(),
        type: "text",
        style: "body",
        color: "black",
        align: "left",
        x: 90,
        y: 150,
        text: "텍스트",
      },
      true,
    );

  const onFiles = useCallback(
    async (files: File[], at?: Pt) => {
      for (const [i, f] of files.entries()) {
        try {
          const { src, nw, nh } = await api.upload(slug, f);
          const s = Math.min(1, (W * 0.8) / nw, (H * 0.8) / nh);
          const w = nw * s;
          const h = nh * s;
          const c = at ?? { x: W / 2, y: H / 2 };
          addLayer({
            id: uid(),
            type: "image",
            src,
            nw,
            nh,
            x: Math.round(c.x - w / 2 + i * 24),
            y: Math.round(c.y - h / 2 + i * 24),
            w: Math.round(w),
            h: Math.round(h),
            crop: { x: 0, y: 0, w: 1, h: 1 },
          });
        } catch (e) {
          store.setError(e instanceof Error ? e.message : String(e));
        }
      }
    },
    [slug, addLayer, store.setError],
  );

  const zMove = useCallback(
    (id: string, op: ZOp) =>
      commit((d) =>
        mapSlide(d, cur, (ls) => {
          const i = ls.findIndex((l) => l.id === id);
          if (i < 0) return ls;
          const next = [...ls];
          const [l] = next.splice(i, 1);
          const to = {
            front: next.length,
            back: 0,
            forward: Math.min(next.length, i + 1),
            backward: Math.max(0, i - 1),
          }[op];
          next.splice(to, 0, l);
          return next;
        }),
      ),
    [commit, cur],
  );

  const remove = useCallback(
    (id: string) => {
      commit((d) => mapSlide(d, cur, (ls) => ls.filter((l) => l.id !== id)));
      setSel(null);
      setCropping(null);
    },
    [commit, cur],
  );

  // 복사한 레이어를 지금 장에 붙인다. 같은 장에 같은 자리 레이어가 있으면 살짝 비켜 놓는다.
  // 다른 덱에서 복사한 이미지는 이미지 파일도 이 덱으로 복사한다.
  const pasteLayer = useCallback(
    async (l: Layer, fromDeck: string) => {
      try {
        if (l.type === "image" && fromDeck !== slug)
          await api.copyAsset(fromDeck, slug, l.src);
        const taken = layers.some((x) => x.x === l.x && x.y === l.y);
        addLayer({
          ...structuredClone(l),
          id: uid(),
          x: taken ? l.x + 24 : l.x,
          y: taken ? l.y + 24 : l.y,
        });
      } catch (e) {
        store.setError(e instanceof Error ? e.message : String(e));
      }
    },
    [slug, layers, addLayer, store.setError],
  );

  // 단축키·클립보드. 핸들러는 매 렌더 새로 만들고, 리스너는 한 번만 달아 늘 최신 핸들러를 부른다
  // (렌더 직후 effect 가 다시 달리기 전에 들어온 입력이 예전 상태로 처리되던 문제).
  const onKey = (e: KeyboardEvent) => {
    if (isTyping(e)) return;
    const k = e.key.toLowerCase();
    const meta = e.metaKey || e.ctrlKey;
    if (meta && k === "z") {
      e.preventDefault();
      setEditing(null);
      if (e.shiftKey) store.redo();
      else store.undo();
      return;
    }
    if (meta && k === "s") {
      e.preventDefault();
      store.flush();
      return;
    }
    if (cropping && (e.key === "Enter" || e.key === "Escape")) {
      e.preventDefault();
      setCropping(null);
      return;
    }
    if (!selLayer) {
      if (e.key === "ArrowDown" || e.key === "PageDown")
        (e.preventDefault(), setSi(Math.min(slideCount - 1, cur + 1)));
      if (e.key === "ArrowUp" || e.key === "PageUp")
        (e.preventDefault(), setSi(Math.max(0, cur - 1)));
      return;
    }
    const id = selLayer.id;
    if (e.key === "Escape") setSel(null);
    else if (e.key === "Backspace" || e.key === "Delete")
      (e.preventDefault(), remove(id));
    else if (e.key === "Enter" && selLayer.type === "text")
      (e.preventDefault(), setEditing({ id }));
    else if (e.key === "Enter" && selLayer.type === "image")
      (e.preventDefault(), setCropping(id));
    else if (meta && e.code === "BracketRight")
      (e.preventDefault(), zMove(id, e.shiftKey ? "front" : "forward"));
    else if (meta && e.code === "BracketLeft")
      (e.preventDefault(), zMove(id, e.shiftKey ? "back" : "backward"));
    else if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const n = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -n : e.key === "ArrowRight" ? n : 0;
      const dy = e.key === "ArrowUp" ? -n : e.key === "ArrowDown" ? n : 0;
      commit(
        (d) =>
          mapSlide(d, cur, (ls) =>
            ls.map((l) =>
              l.id === id ? { ...l, x: l.x + dx, y: l.y + dy } : l,
            ),
          ),
        `nudge:${id}`,
      );
    }
  };
  // 레이어 복사: 시스템 클립보드에 표시가 붙은 JSON 으로 넣는다(다른 장·다른 덱·다른 탭에도 붙일 수 있게).
  const onCopy = (e: ClipboardEvent) => {
    if (isTyping(e) || !selLayer) return;
    e.clipboardData?.setData(
      "text/plain",
      JSON.stringify({ [CLIP]: 1, deck: slug, layer: selLayer }),
    );
    e.preventDefault();
  };
  const onCut = (e: ClipboardEvent) => {
    if (isTyping(e) || !selLayer) return;
    onCopy(e);
    remove(selLayer.id);
  };
  // 클립보드 이미지는 장에 붙인다. 글자 칸에 커서가 있어도 클립보드에 글자가 없으면(스크린샷 복사 등) 이미지로 본다.
  const onPaste = (e: ClipboardEvent) => {
    const data = e.clipboardData;
    if (!data) return;
    if (!isTyping(e)) {
      const copied = readClip(data.getData("text/plain"));
      if (copied) {
        e.preventDefault();
        pasteLayer(copied.layer, copied.deck);
        return;
      }
    }
    const fromItems = [...data.items]
      .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
      .map((i) => i.getAsFile());
    const files = (fromItems.length ? fromItems : [...data.files]).filter(
      (f): f is File => !!f && f.type.startsWith("image/"),
    );
    if (!files.length) return;
    if (isTyping(e) && data.getData("text/plain").trim()) return;
    e.preventDefault();
    // 텍스트를 편집하던 중이면 편집을 끝내고 붙인다.
    (document.activeElement as HTMLElement | null)?.blur?.();
    onFiles(files);
  };
  const handlers = useRef({ onKey, onCopy, onCut, onPaste });
  handlers.current = { onKey, onCopy, onCut, onPaste };
  useEffect(() => {
    const key = (e: KeyboardEvent) => handlers.current.onKey(e);
    const copy = (e: ClipboardEvent) => handlers.current.onCopy(e);
    const cut = (e: ClipboardEvent) => handlers.current.onCut(e);
    const paste = (e: ClipboardEvent) => handlers.current.onPaste(e);
    window.addEventListener("keydown", key);
    window.addEventListener("copy", copy);
    window.addEventListener("cut", cut);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("copy", copy);
      window.removeEventListener("cut", cut);
      window.removeEventListener("paste", paste);
    };
  }, []);

  const doExport = async () => {
    if (!deck) return;
    await store.flush();
    setExporting("준비 중…");
    try {
      const r = await renderDeck(deck, slug, (done, total) =>
        setExporting(`${done}/${total}장`),
      );
      if (mobile) setReady(r);
      else downloadZip(r);
    } catch (e) {
      store.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(null);
    }
  };

  if (store.error && !deck) return <div className="fatal">{store.error}</div>;
  if (!deck) return <div className="fatal">불러오는 중…</div>;

  const stage = (
    <Stage
      deck={deck}
      slug={slug}
      si={cur}
      sel={sel}
      setSel={setSel}
      editing={editing}
      setEditing={setEditing}
      cropping={cropping}
      setCropping={setCropping}
      commit={commit}
      onFiles={onFiles}
    />
  );
  const panel = (
    <Panel
      deck={deck}
      si={cur}
      layer={selLayer}
      editing={editing?.id === selLayer?.id}
      commit={commit}
      setSel={setSel}
      cropping={cropping}
      setCropping={setCropping}
      onDelete={remove}
    >
      {!mobile && <Shortcuts />}
    </Panel>
  );

  const back = async () => {
    await store.flush();
    navigate("/");
  };
  const pickImages = () => fileInput.current?.click();

  return (
    <div className={`editor ${mobile ? "mobile" : ""}`}>
      <header className="bar">
        <IconButton aria-label="목록" title="목록" onClick={back}>
          <ArrowLeft {...ic} />
        </IconButton>
        <Input
          className={
            mobile ? "m-1 [field-sizing:fixed]! w-0 min-w-0! flex-1" : ""
          }
          aria-label="제목"
          value={deck.title}
          onChange={(e) =>
            commit((d: Deck) => ({ ...d, title: e.target.value }), "title")
          }
        />
        {!mobile && (
          <span
            className={
              store.save === "error" ? "mark px-1 font-mono text-base" : "meta"
            }
            aria-live="polite"
          >
            {
              {
                saved: "저장됨",
                dirty: "수정됨",
                saving: "저장 중",
                error: "저장 실패",
              }[store.save]
            }
          </span>
        )}
        <div className="spacer" />
        <IconButton
          onClick={store.undo}
          disabled={!store.canUndo}
          title="되돌리기 ⌘Z"
          aria-label="되돌리기"
        >
          <Undo2 {...ic} />
        </IconButton>
        <IconButton
          onClick={store.redo}
          disabled={!store.canRedo}
          title="다시 하기 ⌘⇧Z"
          aria-label="다시 하기"
        >
          <Redo2 {...ic} />
        </IconButton>
        {!mobile && <span className="sep" />}
        <IconButton
          onClick={addText}
          aria-label="텍스트 추가"
          title="텍스트 추가. 캡션은 추가한 뒤 오른쪽에서 바꿉니다"
        >
          <Type {...ic} />
        </IconButton>
        <IconButton
          onClick={pickImages}
          aria-label="이미지 추가"
          title="이미지 추가. 끌어다 놓거나 붙여 넣어도 됩니다"
        >
          <ImagePlus {...ic} />
        </IconButton>
        {/* 진행 중엔 아이콘 자리에 "3/14장". 모바일은 토스트로도 보인다 */}
        <Button
          variant="primary"
          className={`min-w-control flex-none ${exporting ? "px-2" : "px-0!"}`}
          onClick={doExport}
          disabled={!!exporting}
          aria-label="내보내기"
          title="내보내기. 장마다 JPEG 과 캡션을 zip 으로 받습니다"
        >
          {exporting ? (
            <span className="font-mono text-base">{exporting}</span>
          ) : (
            <Download {...ic} />
          )}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </header>
      {store.error && (
        <button
          type="button"
          className="error"
          onClick={() => store.setError(null)}
        >
          {store.error} (누르면 닫힙니다)
        </button>
      )}
      {mobile ? (
        <>
          <SlideList
            deck={deck}
            slug={slug}
            si={cur}
            setSi={setSi}
            commit={commit}
            horizontal
          />
          {stage}
          <div className="sheet">
            <div className="sheet-tabs" role="tablist">
              {(
                [
                  ["layers", "레이어"],
                  ["caption", "인스타 캡션"],
                ] as const
              ).map(([tab, label], i) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={sheetTab === tab}
                  className={`focus-fill press-down h-control flex-1 transition-colors ${i > 0 ? "border-l" : ""} ${sheetTab === tab ? "mark" : "hover:bg-muted"}`}
                  onClick={() => setSheetTab(tab)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="sheet-body">
              {sheetTab === "layers" ? (
                panel
              ) : (
                <CaptionBox deck={deck} commit={commit} wide />
              )}
            </div>
          </div>
          {exporting && <div className="toast">내보내는 중 {exporting}</div>}
          {ready && (
            <div className="share-sheet">
              <p className="pr-12">{ready.files.length}장을 만들었습니다.</p>
              {canShare(ready) && (
                <Button
                  variant="primary"
                  onClick={() =>
                    share(ready).catch((e) => store.setError(String(e)))
                  }
                >
                  <Share {...ic} />
                  공유
                </Button>
              )}
              <Button onClick={() => downloadZip(ready)}>
                <Download {...ic} />
                zip 받기
              </Button>
              <IconButton
                className="absolute top-2 right-2"
                aria-label="닫기"
                onClick={() => setReady(null)}
              >
                <X {...ic} />
              </IconButton>
            </div>
          )}
        </>
      ) : (
        <div className="body">
          <div className="left">
            <SlideList
              deck={deck}
              slug={slug}
              si={cur}
              setSi={setSi}
              commit={commit}
            />
            <CaptionBox deck={deck} commit={commit} />
          </div>
          {stage}
          {panel}
        </div>
      )}
    </div>
  );
}

// 단축키 안내(데스크톱 속성 패널 맨 아래).
const SHORTCUTS: [string, string][] = [
  ["더블클릭", "글 편집·크롭"],
  ["손잡이 끌기", "코드 레이어 옮기기"],
  ["⌥ 끌기", "스냅 끄기"],
  ["화살표", "1px 옮기기(⇧ 10px)"],
  ["⌘C ⌘X ⌘V", "레이어 복사"],
  ["⌘[ ⌘]", "겹침 순서"],
  ["⌘B ⌘E ⌘U", "편집 중 굵게·빨강·밑줄"],
  ["⌘⇧X", "편집 중 블러"],
];

function Shortcuts() {
  return (
    <section>
      <Details>
        <Summary>단축키</Summary>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {SHORTCUTS.map(([key, what]) => (
            <div key={key} className="contents">
              <dt className="font-mono text-base leading-[inherit]">{key}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </Details>
    </section>
  );
}
