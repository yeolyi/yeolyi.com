// 왼쪽 슬라이드 목록: 선택·추가·삭제·끌어서 순서 바꾸기.
import Button from "@yeolyi/ui/Button";
import IconButton from "@yeolyi/ui/IconButton";
import { Plus, X } from "lucide-react";
import { Fragment, useState } from "react";
import { type Deck, type Slide, uid } from "../model";
import { Thumb } from "../SlideView";
import { ic } from "../ui";
import type { Commit } from "./store";

export function SlideList({
  deck,
  slug,
  si,
  setSi,
  commit,
  horizontal = false,
}: {
  deck: Deck;
  slug: string;
  si: number;
  setSi: (i: number) => void;
  commit: Commit;
  // 모바일: 가로 띠, 작은 썸네일, 삭제는 지금 장에만
  horizontal?: boolean;
}) {
  const thumb = horizontal ? 56 : 180;
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

  const insert = (at: number, make: (d: Deck) => Deck["slides"][number]) => {
    commit((d) => {
      const slides = [...d.slides];
      slides.splice(at, 0, make(d));
      return { ...d, slides };
    });
    setSi(at);
  };
  const remove = (i: number) => {
    if (deck.slides.length <= 1) return;
    commit((d) => ({ ...d, slides: d.slides.filter((_, j) => j !== i) }));
    setSi(Math.max(0, Math.min(si, deck.slides.length - 2)));
  };
  const move = (from: number, to: number) => {
    if (from === to || from + 1 === to) return;
    commit((d) => {
      const slides = [...d.slides];
      const [s] = slides.splice(from, 1);
      slides.splice(to > from ? to - 1 : to, 0, s);
      return { ...d, slides };
    });
    setSi(to > from ? to - 1 : to);
  };

  const blank = (): Slide => ({
    id: uid(),
    memo: "",
    valign: "top",
    layers: [],
  });
  // 장 사이 틈: 올리면 + 가 보이고, 누르면 그 자리에 빈 장을 넣는다.
  const gap = (at: number) => (
    <button
      type="button"
      className="slide-gap focus-fill transition-colors"
      title={`${at + 1}번 자리에 새 장`}
      aria-label={`${at + 1}번 자리에 새 장`}
      onClick={() => insert(at, blank)}
    >
      <Plus {...ic} />
    </button>
  );

  return (
    <nav className={`slides ${horizontal ? "horizontal" : ""}`}>
      {deck.slides.map((s, i) => (
        <Fragment key={s.id}>
          {gap(i)}
          {/* 장 고르기는 썸네일 클릭. 키보드는 Editor 의 ↑↓·PageUp/Down 단축키가 맡는다 */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: 위 주석 */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: 위 주석 */}
          <div
            className={`slide-item ${i === si ? "on" : ""} ${dropAt === i ? "drop-before" : ""} ${dropAt === i + 1 && i === deck.slides.length - 1 ? "drop-after" : ""}`}
            draggable
            onDragStart={(e) => {
              setDragFrom(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              const before = horizontal
                ? e.clientX < r.left + r.width / 2
                : e.clientY < r.top + r.height / 2;
              setDropAt(before ? i : i + 1);
            }}
            onDragEnd={() => {
              setDragFrom(null);
              setDropAt(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom !== null && dropAt !== null) move(dragFrom, dropAt);
              setDragFrom(null);
              setDropAt(null);
            }}
            onClick={() => setSi(i)}
          >
            <span className="no">{i + 1}</span>
            <Thumb deck={deck} slug={slug} index={i} width={thumb} />
            {(!horizontal || i === si) && (
              <IconButton
                className={`slide-delete bg-background ${horizontal ? "min-h-7! min-w-7! px-0!" : ""}`}
                title={`${i + 1}번 장 삭제`}
                aria-label={`${i + 1}번 장 삭제`}
                disabled={deck.slides.length <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    deck.slides[i].layers.length === 0 ||
                    confirm(`${i + 1}번 장을 지우겠습니까?`)
                  )
                    remove(i);
                }}
              >
                <X {...ic} />
              </IconButton>
            )}
          </div>
        </Fragment>
      ))}
      <Button
        className={
          horizontal ? "h-[70px]! w-14 flex-none px-0!" : "mt-4 w-[180px] px-0!"
        }
        aria-label="새 장"
        title="새 장"
        onClick={() => insert(deck.slides.length, blank)}
      >
        <Plus {...ic} />
      </Button>
    </nav>
  );
}
