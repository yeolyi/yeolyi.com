// /frame: 스크린샷에 기기 프레임(아이폰·아이패드)이나 브라우저 창을 씌워 투명 PNG 로 내려받는다. 로그인 없이 쓴다.
// 기기 목록·화면 자리는 skills/device-frame/frames.json 하나를 스킬 스크립트(frame.py)와 같이 쓴다. 그림은 브라우저 안에서만 만든다.
import Button from "@yeolyi/ui/Button";
import Input from "@yeolyi/ui/Input";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import ServiceHeader from "@yeolyi/ui/ServiceHeader";
import { zipSync } from "fflate";
import { Download, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import FRAMES from "../skills/device-frame/frames.json";
import { ic } from "./ui";

type DeviceFrame = { label: string; file: string; screen: number[] };
const DEVICES = FRAMES as Record<string, DeviceFrame>;
const FILES = import.meta.glob<string>("../skills/device-frame/assets/*.png", { eager: true, query: "?url", import: "default" });
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

// 가로가 긴 캡처는 브라우저 창, 세로는 화면 비율이 가장 가까운 기기.
function pickKind(w: number, h: number): Kind {
	if (w > h) return "browser";
	const ratio = w / h;
	const screenRatio = (d: DeviceFrame) => (d.screen[2] - d.screen[0]) / (d.screen[3] - d.screen[1]);
	return Object.entries(DEVICES).reduce((best, [k, d]) =>
		Math.abs(ratio - screenRatio(d)) < Math.abs(ratio - screenRatio(DEVICES[best])) ? k : best, Object.keys(DEVICES)[0]);
}

// 기기: 화면 자리 폭에 맞춰 캡처를 깔고(비율이 다르면 위 기준으로 자름) 프레임을 덮는다. frame.py 와 같은 방식.
async function deviceCanvas(shot: HTMLImageElement, d: DeviceFrame) {
	const frame = await loadImage(frameUrl(d));
	const [l, t, r, b] = d.screen;
	const c = document.createElement("canvas");
	c.width = frame.naturalWidth;
	c.height = frame.naturalHeight;
	const g = c.getContext("2d")!;
	const w = r - l;
	const h = Math.min(b - t, Math.round((shot.naturalHeight * w) / shot.naturalWidth));
	g.drawImage(shot, 0, 0, shot.naturalWidth, (h * shot.naturalWidth) / w, l, t, w, h);
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

type Item = { id: string; name: string; shot: HTMLImageElement; kind: Kind; png?: Blob; preview?: string };

async function render(item: Item, url: string) {
	const c = item.kind === "browser" ? browserCanvas(item.shot, url) : await deviceCanvas(item.shot, DEVICES[item.kind]);
	const png = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), "image/png"));
	return { png, preview: URL.createObjectURL(png) };
}

const outName = (item: Item) => `${item.name.replace(/\.[^.]+$/, "")}-${item.kind}.png`;

function save(blob: Blob, name: string) {
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function FramePage() {
	const [items, setItems] = useState<Item[]>([]);
	const [choice, setChoice] = useState<"auto" | Kind>("auto");
	const [url, setUrl] = useState("");

	const add = async (files: FileList | File[]) => {
		const next: Item[] = [];
		for (const f of files) {
			if (!f.type.startsWith("image/")) continue;
			const shot = await loadImage(URL.createObjectURL(f));
			const kind = choice === "auto" ? pickKind(shot.naturalWidth, shot.naturalHeight) : choice;
			next.push({ id: crypto.randomUUID(), name: f.name || "screenshot.png", shot, kind });
		}
		setItems((prev) => [...prev, ...next]);
	};

	// 고른 기기·주소가 바뀌면 다시 그린다.
	useEffect(() => {
		let alive = true;
		(async () => {
			const done = await Promise.all(
				items.map(async (it) => {
					const kind = choice === "auto" ? pickKind(it.shot.naturalWidth, it.shot.naturalHeight) : choice;
					return { ...it, kind, ...(await render({ ...it, kind }, url)) };
				}),
			);
			if (alive) setItems((prev) => (prev.length === done.length ? done : prev));
		})();
		return () => {
			alive = false;
		};
		// biome-ignore lint/correctness/useExhaustiveDependencies: 목록 길이가 바뀔 때만 다시 그린다(그린 결과를 다시 넣어도 돌지 않게)
	}, [choice, url, items.length]);

	useEffect(() => {
		const onPaste = (e: ClipboardEvent) => e.clipboardData && add(e.clipboardData.files);
		window.addEventListener("paste", onPaste);
		return () => window.removeEventListener("paste", onPaste);
	});

	const saveAll = async () => {
		const files: Record<string, Uint8Array> = {};
		for (const it of items) if (it.png) files[outName(it)] = new Uint8Array(await it.png.arrayBuffer());
		save(new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: "application/zip" }), "frames.zip");
	};

	return (
		<div className="home">
			<ServiceHeader
				name="Carousel"
				className="border-b px-4 py-1"
				nav={[
					{ label: "덱", href: "/" },
					{ label: "프레임", href: "/frame", current: true },
				]}
			/>
			<main className="grid gap-6 p-4">
				<section className="grid gap-3">
					<h1>프레임 씌우기</h1>
					<p className="text-muted-foreground">
						스크린샷을 놓거나 붙여 넣으면 아이폰·아이패드·브라우저 창을 씌워 바깥이 투명한 PNG 로 만듭니다. 그림은 이 브라우저 안에서만 만들고 어디에도
						올리지 않습니다.
					</p>
					<RadioGroup aria-label="프레임" options={KINDS} value={choice} onValueChange={(v) => setChoice(v as "auto" | Kind)} />
					{(choice === "browser" || items.some((it) => it.kind === "browser")) && (
						<label className="grid gap-1">
							<span>브라우저 주소(비우면 막대만)</span>
							<Input value={url} placeholder="example.com" onChange={(e) => setUrl(e.target.value)} />
						</label>
					)}
				</section>
				<label
					className="text-muted-foreground flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed p-8"
					onDragOver={(e) => e.preventDefault()}
					onDrop={(e) => {
						e.preventDefault();
						add(e.dataTransfer.files);
					}}
				>
					<ImagePlus {...ic} />
					스크린샷을 끌어 놓거나 눌러서 고르기(여러 장 가능, 붙여 넣기도 됨)
					<input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
				</label>
				{items.length > 0 && (
					<section className="grid gap-3">
						<div className="flex gap-2">
							<Button variant="primary" onClick={saveAll} disabled={items.some((it) => !it.png)}>
								<Download {...ic} /> 모두 받기(zip)
							</Button>
							<Button onClick={() => setItems([])}>
								<Trash2 {...ic} /> 비우기
							</Button>
						</div>
						<div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
							{items.map((it) => (
								<figure key={it.id} className="grid min-w-0 gap-2">
									<div className="frame-checker h-80 p-2">
										{it.preview && <img src={it.preview} alt={it.name} className="h-full w-full object-contain" />}
									</div>
									<figcaption className="flex min-w-0 items-center justify-between gap-2">
										<span className="min-w-0 truncate">
											{it.name} · {it.kind === "browser" ? "브라우저" : DEVICES[it.kind].label}
										</span>
										<Button disabled={!it.png} onClick={() => it.png && save(it.png, outName(it))}>
											<Download {...ic} />
										</Button>
									</figcaption>
								</figure>
							))}
						</div>
					</section>
				)}
			</main>
		</div>
	);
}
