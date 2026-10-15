// /frame: 스크린샷에 기기 프레임(아이폰·아이패드·워치·맥북·아이맥)이나 브라우저 창을 씌워 투명 PNG 로 내려받는다. 로그인 없이 쓴다.
// 기기 목록·화면 자리는 skills/device-frame/frames.json 하나를 스킬 스크립트(frame.py)와 같이 쓴다. 그림은 브라우저 안에서만 만든다.
import Button from "@yeolyi/ui/Button";
import IconButton from "@yeolyi/ui/IconButton";
import Input from "@yeolyi/ui/Input";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import ServiceHeader from "@yeolyi/ui/ServiceHeader";
import { Download, ImagePlus, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import FRAMES from "../skills/device-frame/frames.json";
import { signOut } from "./Auth";
import { supabase } from "./supabase";
import { ic } from "./ui";

type DeviceFrame = {
  label: string;
  file: string;
  screen: number[];
  auto?: { minWidth?: number; maxWidth?: number; tolerance?: number };
};
const DEVICES = FRAMES as Record<string, DeviceFrame>;
const FILES = import.meta.glob<string>("../skills/device-frame/assets/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const frameUrl = (d: DeviceFrame) => FILES[`../skills/device-frame/${d.file}`];

type Kind = keyof typeof DEVICES | "browser";
const KINDS: { value: "auto" | Kind; label: string }[] = [
  { value: "auto", label: "자동" },
  ...Object.entries(DEVICES).map(([value, d]) => ({ value, label: d.label })),
  { value: "browser", label: "브라우저" },
];

const loaded = new Map<string, Promise<HTMLImageElement>>();
function loadImage(url: string) {
  let p = loaded.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    loaded.set(url, p);
  }
  return p;
}

const screenRatio = (d: DeviceFrame) =>
  (d.screen[2] - d.screen[0]) / (d.screen[3] - d.screen[1]);

// 방향이 같고 frames.json 의 auto 조건(폭·비율 허용치)을 지키는 기기 중 비율이 가장 가까운 것. frame.py 와 같은 규칙.
// 맞는 기기가 없으면(창 캡처·외부 모니터 등) 브라우저 창.
function pickKind(w: number, h: number): Kind {
  const ratio = w / h;
  const ok = ([, d]: [string, DeviceFrame]) => {
    const a = d.auto ?? {};
    const sr = screenRatio(d);
    return (
      sr > 1 === ratio > 1 &&
      w >= (a.minWidth ?? 0) &&
      w <= (a.maxWidth ?? Infinity) &&
      (a.tolerance === undefined || Math.abs(ratio / sr - 1) <= a.tolerance)
    );
  };
  const fits = Object.entries(DEVICES).filter(ok);
  if (!fits.length) return "browser";
  return fits.reduce((best, cur) =>
    Math.abs(ratio - screenRatio(cur[1])) <
    Math.abs(ratio - screenRatio(best[1]))
      ? cur
      : best,
  )[0];
}

// 기기: 화면 자리를 빈틈없이 채우게 캡처를 깔고(넘치면 위아래는 위 기준, 좌우는 가운데 기준으로 자름) 프레임을 덮는다. frame.py 와 같은 방식.
async function deviceCanvas(shot: HTMLImageElement, d: DeviceFrame) {
  const frame = await loadImage(frameUrl(d));
  const [l, t, r, b] = d.screen;
  const c = document.createElement("canvas");
  c.width = frame.naturalWidth;
  c.height = frame.naturalHeight;
  const g = c.getContext("2d")!;
  const w = r - l;
  const h = b - t;
  const scale = Math.max(w / shot.naturalWidth, h / shot.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  g.drawImage(shot, (shot.naturalWidth - sw) / 2, 0, sw, sh, l, t, w, h);
  g.drawImage(frame, 0, 0);
  return c;
}

// 브라우저 창: 캡처 크기에 맞춰 위에 주소 막대를 그린다. 둥근 모서리와 옅은 그림자, 바깥은 투명.
function browserCanvas(shot: HTMLImageElement, url: string) {
  const W = shot.naturalWidth;
  const H = shot.naturalHeight;
  const u = W / 1280; // 1280px 폭 창 기준 치수
  const bar = Math.round(52 * u);
  const radius = Math.round(12 * u);
  const pad = Math.round(48 * u);
  const c = document.createElement("canvas");
  c.width = W + pad * 2;
  c.height = H + bar + pad * 2;
  const g = c.getContext("2d")!;
  const win = () => {
    g.beginPath();
    g.roundRect(pad, pad, W, H + bar, radius);
  };
  g.save();
  g.shadowColor = "rgba(0,0,0,0.18)";
  g.shadowBlur = 32 * u;
  g.shadowOffsetY = 8 * u;
  g.fillStyle = "#fff";
  win();
  g.fill();
  g.restore();
  g.save();
  win();
  g.clip();
  g.fillStyle = "#ececec";
  g.fillRect(pad, pad, W, bar);
  g.fillStyle = "#d4d4d4";
  g.fillRect(pad, pad + bar - Math.max(1, u), W, Math.max(1, u));
  ["#ff5f57", "#febc2e", "#28c840"].forEach((color, i) => {
    g.beginPath();
    g.arc(pad + (24 + i * 20) * u, pad + bar / 2, 6 * u, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
  });
  if (url) {
    const bw = Math.min(W * 0.5, 560 * u);
    const bh = 30 * u;
    g.beginPath();
    g.roundRect(pad + (W - bw) / 2, pad + (bar - bh) / 2, bw, bh, bh / 2);
    g.fillStyle = "#fff";
    g.fill();
    g.fillStyle = "#525252";
    g.font = `${14 * u}px Pretendard, system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(url, pad + W / 2, pad + bar / 2, bw - 24 * u);
  }
  g.drawImage(shot, pad, pad + bar);
  g.restore();
  return c;
}

type Shot = { name: string; img: HTMLImageElement };

async function render(shot: HTMLImageElement, kind: Kind, url: string) {
  const c =
    kind === "browser"
      ? browserCanvas(shot, url)
      : await deviceCanvas(shot, DEVICES[kind]);
  const png = await new Promise<Blob>((resolve) =>
    c.toBlob((b) => resolve(b!), "image/png"),
  );
  return { png, preview: URL.createObjectURL(png) };
}

function save(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const kindLabel = (k: Kind) =>
  k === "browser" ? "브라우저" : DEVICES[k].label;

// 한 번에 한 장. 새 스크린샷을 놓거나 붙여 넣으면 바꿔 끼운다.
export function FramePage() {
  const [shot, setShot] = useState<Shot | null>(null);
  const [choice, setChoice] = useState<"auto" | Kind>("auto");
  const [url, setUrl] = useState("");
  const [out, setOut] = useState<{ png: Blob; preview: string } | null>(null);
  // 프레임은 로그인 없이 쓰지만, 로그인한 상태면 덱 화면과 같이 머리에 로그아웃을 둔다.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_, session) =>
      setSignedIn(!!session),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const kind: Kind | null =
    shot &&
    (choice === "auto"
      ? pickKind(shot.img.naturalWidth, shot.img.naturalHeight)
      : choice);

  const take = async (files: FileList | File[]) => {
    const f = [...files].find((x) => x.type.startsWith("image/"));
    if (!f) return;
    setShot({
      name: f.name || "screenshot.png",
      img: await loadImage(URL.createObjectURL(f)),
    });
  };

  // 스크린샷·프레임·주소가 바뀌면 다시 그린다.
  useEffect(() => {
    if (!shot || !kind) return setOut(null);
    let alive = true;
    render(shot.img, kind, url).then((r) => alive && setOut(r));
    return () => {
      alive = false;
    };
  }, [shot, kind, url]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) =>
      e.clipboardData && take(e.clipboardData.files);
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  return (
    <div className="home">
      <ServiceHeader
        name="Carousel"
        className="border-b px-4 py-1"
        nav={[
          { label: "캐러셀", href: "/" },
          { label: "프레임", href: "/frame", current: true },
        ]}
      >
        {signedIn && (
          <IconButton title="로그아웃" aria-label="로그아웃" onClick={signOut}>
            <LogOut {...ic} />
          </IconButton>
        )}
      </ServiceHeader>
      {/* 도구 하나짜리 문서형 화면. design.yeolyi.com 의 글 페이지와 같은 폭·머리 구조 */}
      <main className="measure-col mt-[2rlh] grid gap-[1.5rlh] pb-[5rlh]">
        <header className="border-b pb-[0.5rlh]">
          <h1>프레임 씌우기</h1>
          <p className="text-muted-foreground mt-[0.25rlh]">
            스크린샷 한 장을 놓거나 붙여 넣으면
            아이폰·아이패드·워치·맥북·아이맥이나 브라우저 창을 씌워 바깥이
            투명한 PNG 로 만듭니다. 그림은 이 브라우저 안에서만 만들고 어디에도
            올리지 않습니다.
          </p>
        </header>
        {/* 세그먼트·입력칸이 컬럼 폭만큼 늘어나지 않게 왼쪽에 붙인다. */}
        <section className="grid justify-items-start gap-3">
          <RadioGroup
            aria-label="프레임"
            options={KINDS}
            value={choice}
            onValueChange={(v) => setChoice(v as "auto" | Kind)}
          />
          {kind === "browser" && (
            <div className="grid w-full max-w-md gap-1">
              <label htmlFor="frame-url">브라우저 주소(비우면 막대만)</label>
              <Input
                id="frame-url"
                value={url}
                placeholder="example.com"
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}
        </section>
        <label
          className="text-muted-foreground flex w-full cursor-pointer flex-col items-center gap-2 border-2 border-dashed p-8"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            take(e.dataTransfer.files);
          }}
        >
          <ImagePlus {...ic} />
          {shot
            ? "다른 스크린샷으로 바꾸기(끌어 놓기·누르기·붙여 넣기)"
            : "스크린샷을 끌어 놓거나 눌러서 고르기(붙여 넣기도 됨)"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files && take(e.target.files)}
          />
        </label>
        {shot && kind && (
          <figure className="grid justify-items-start gap-3">
            <div className="frame-checker h-[28rem] w-full p-2">
              {out && (
                <img
                  src={out.preview}
                  alt={`${shot.name}에 ${kindLabel(kind)} 프레임`}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            <figcaption className="text-muted-foreground">
              {shot.name} ·{" "}
              {choice === "auto"
                ? `자동으로 ${kindLabel(kind)}`
                : kindLabel(kind)}
            </figcaption>
            <Button
              variant="primary"
              disabled={!out}
              onClick={() =>
                out &&
                save(
                  out.png,
                  `${shot.name.replace(/\.[^.]+$/, "")}-${kind}.png`,
                )
              }
            >
              <Download {...ic} /> PNG 받기
            </Button>
          </figure>
        )}
      </main>
    </div>
  );
}
