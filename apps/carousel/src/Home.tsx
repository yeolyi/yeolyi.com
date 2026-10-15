// 덱 목록.
import Button from "@yeolyi/ui/Button";
import IconButton from "@yeolyi/ui/IconButton";
import Input from "@yeolyi/ui/Input";
import ServiceHeader from "@yeolyi/ui/ServiceHeader";
import { LogOut, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { navigate } from "./App";
import { signOut } from "./Auth";
import { api, type DeckEntry } from "./api";
import { Thumb } from "./SlideView";
import { supabase } from "./supabase";
import { ic } from "./ui";

// 26.10.10 17:30
const fmt = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getFullYear() % 100)}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function Home() {
  const [decks, setDecks] = useState<DeckEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    () => api.list().then(setDecks, (e) => setError(String(e))),
    [],
  );

  useEffect(() => {
    load();
    const channel = supabase
      .channel("decks")
      .on(
        "postgres_changes",
        { event: "*", schema: "carousel", table: "decks" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const create = async () => {
    const title = prompt("컨텐츠 제목", "새 컨텐츠");
    if (!title) return;
    const { slug } = await api.create(title);
    navigate(`/d/${encodeURIComponent(slug)}`);
  };

  return (
    <div className="home">
      <ServiceHeader
        name="Carousel"
        className="border-b px-4 py-1"
        nav={[
          { label: "캐러셀", href: "/", current: true },
          { label: "프레임", href: "/frame" },
        ]}
      >
        <IconButton title="로그아웃" aria-label="로그아웃" onClick={signOut}>
          <LogOut {...ic} />
        </IconButton>
      </ServiceHeader>
      <WatermarkSetting onSaved={load} />
      {error && <div className="error">{error}</div>}
      <main className="deck-grid">
        <Button
          className="aspect-[4/5] h-auto! w-[216px] max-w-full flex-col gap-3"
          onClick={create}
        >
          <Plus {...ic} />
          새로 만들기
        </Button>
        {decks?.map(({ slug, deck, mtime }) => {
          const href = `/d/${encodeURIComponent(slug)}`;
          const open = (e: React.MouseEvent) => {
            e.preventDefault();
            navigate(href);
          };
          return (
            <article key={slug} className="deck-card">
              {/* 썸네일과 제목이 같은 곳으로 간다. 키보드·스크린리더에는 제목 링크 하나만 */}
              {/* biome-ignore lint/a11y/useAnchorContent: 위 주석. 포인터용 중복 링크라 보조 기술에서 숨긴다 */}
              <a
                href={href}
                onClick={open}
                tabIndex={-1}
                aria-hidden="true"
                className="w-fit"
              >
                <Thumb deck={deck} slug={slug} index={0} width={216} />
              </a>
              <h2 className="mt-3">
                <a href={href} onClick={open}>
                  {deck.title}
                </a>
              </h2>
              <p className="text-muted-foreground truncate">
                {deck.caption.trim()
                  ? deck.caption.trim().split("\n")[0]
                  : "본문 없음"}
              </p>
              <p className="meta">
                {deck.slides.length}장 · {fmt(mtime)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <IconButton
                  aria-label="삭제"
                  title="삭제"
                  onClick={async () => {
                    if (
                      !confirm(
                        `'${deck.title}'을 지우겠습니까? 이미지까지 지워지며 되돌릴 수 없습니다.`,
                      )
                    )
                      return;
                    await api.remove(slug);
                    load();
                  }}
                >
                  <Trash2 {...ic} />
                </IconButton>
              </div>
            </article>
          );
        })}
        {/* 덱이 다 뜬 뒤 맨 끝에 */}
      </main>
    </div>
  );
}

// 계정별 워터마크(모든 덱 하단에 "워터마크 · 3/14" 로 들어간다). 비우면 장 번호만.
function WatermarkSetting({ onSaved }: { onSaved: () => void }) {
  const id = useId();
  const [value, setValue] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  useEffect(() => {
    api.watermark().then((w) => {
      setValue(w);
      setSaved(w);
    });
  }, []);
  if (value === null) return null;
  const save = async () => {
    if (value === saved) return;
    await api.setWatermark(value.trim());
    setSaved(value.trim());
    onSaved();
  };
  return (
    <section className="flex flex-col border-b px-4 py-4">
      <label htmlFor={id} className="leading-[1.4]">
        워터마크
      </label>
      <p id={`${id}-desc`} className="text-muted-foreground leading-[1.4]">
        {value === saved
          ? "모든 캐러셀의 장 아래에 들어갑니다."
          : "Enter 를 누르면 저장합니다."}
      </p>
      <Input
        id={id}
        aria-describedby={`${id}-desc`}
        className="mt-1 w-fit"
        value={value}
        placeholder="@인스타아이디"
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
    </section>
  );
}
