#!/usr/bin/env node
// carousel(https://carousel.yeolyi.com) 덱 JSON 을 읽고 쓰는 스크립트. Node 18+ 만 있으면 된다(설치 없음).
//
//   node carousel.mjs list                      내 덱 목록
//   node carousel.mjs get <덱 id> [파일]          덱 JSON 받기(파일을 안 주면 화면에 출력)
//   node carousel.mjs put <파일>                 고친 덱 올리기(파일의 id·updated_at 으로 충돌 확인)
//   node carousel.mjs new <파일>                 새 덱 만들기(파일의 id 는 무시)
//   node carousel.mjs upload <덱 id> <이미지...>   이미지 올리기. 이미지 레이어에 쓸 src·nw·nh 를 JSON 으로 출력
//   node carousel.mjs assets <덱 id> [--unused] [--delete]   올라간 이미지 목록(안 쓰는 것만 / 안 쓰는 것 지우기)
//   node carousel.mjs render <덱 id> [폴더] [--slides 1,3] [--scale 0.5]
//                                               장마다 JPEG 과 layout.json(레이어 상자·배치 경고)을 폴더에 받는다
//
// 토큰: 웹앱 홈 → "AI 연결"에서 발급. 환경 변수 CAROUSEL_TOKEN 이나 ~/.config/carousel/token 에 둔다.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// 공개용 주소·키다(anon). 실제 권한은 토큰이 정한다.
const URL_ = process.env.CAROUSEL_SUPABASE_URL ?? "https://jfzhtdcyaqwgugipnmhs.supabase.co";
const ANON = process.env.CAROUSEL_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmemh0ZGN5YXF3Z3VnaXBubWhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MzYwNDQsImV4cCI6MjA2MDAxMjA0NH0.Xa1rEYFrw4zTLk7YUZQWKdq7FVT8f7WWRlBFbAGMH8M";

// 이미지 올리기·렌더는 앱 서버(/api)가 한다. 비공개 버킷을 만지는 키는 서버에만 있다.
const API = process.env.CAROUSEL_API ?? "https://carousel.yeolyi.com";

function token() {
	if (process.env.CAROUSEL_TOKEN) return process.env.CAROUSEL_TOKEN.trim();
	const file = path.join(os.homedir(), ".config", "carousel", "token");
	if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
	fail("토큰이 없어요. 웹앱 홈 → 'AI 연결'에서 발급해 CAROUSEL_TOKEN 이나 ~/.config/carousel/token 에 넣어 주세요.");
}

function fail(msg) {
	console.error(msg);
	process.exit(1);
}

async function rpc(fn, args) {
	const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
		method: "POST",
		headers: { apikey: ANON, "Content-Type": "application/json", "Content-Profile": "carousel" },
		body: JSON.stringify({ p_token: token(), ...args }),
	});
	const body = await res.json();
	if (!res.ok) fail(body.message ?? JSON.stringify(body));
	return body;
}

async function api(method, op, deckId, body) {
	const res = await fetch(`${API}/api/${op}?${new URLSearchParams({ deck: deckId })}`, {
		method,
		headers: { Authorization: `Bearer ${token()}`, ...(body && { "Content-Type": "application/json" }) },
		body: body && JSON.stringify(body),
	});
	const text = await res.text();
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		fail(`${res.status} ${text.slice(0, 200)}`);
	}
	if (!res.ok) fail(data.message ?? text);
	return data;
}

// 이미지 크기(픽셀). PNG·JPEG·WebP·GIF 헤더만 읽는다.
function imageSize(buf) {
	if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
	if (buf.toString("ascii", 0, 3) === "GIF") return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
	if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
		const kind = buf.toString("ascii", 12, 16);
		if (kind === "VP8X") return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
		if (kind === "VP8L") {
			const b = buf.readUInt32LE(21);
			return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)];
		}
		return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
	}
	if (buf[0] === 0xff && buf[1] === 0xd8) {
		for (let i = 2; i < buf.length; ) {
			if (buf[i] !== 0xff) break;
			const marker = buf[i + 1];
			const len = buf.readUInt16BE(i + 2);
			if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
			i += 2 + len;
		}
	}
	fail("PNG·JPEG·WebP·GIF 만 올릴 수 있어요");
}

async function upload(deckId, file) {
	const buf = fs.readFileSync(file);
	const [nw, nh] = imageSize(buf);
	const ext = path.extname(file).slice(1).toLowerCase();
	const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
	const r = await api("POST", "assets", deckId, { sha256, ext });
	if (!r.exists) {
		const res = await fetch(r.uploadUrl, { method: "PUT", headers: { "Content-Type": r.contentType, "x-upsert": "false" }, body: buf });
		if (!res.ok) fail(`${file}: 업로드 실패 ${res.status} ${await res.text()}`);
	}
	return { file, src: r.src, nw, nh, uploaded: !r.exists };
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((v, i) => !v.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && ["--slides", "--scale"].includes(args[i - 1])));
const [cmd, a, b] = positional;
if (cmd === "list") {
	for (const d of await rpc("api_list", {})) console.log(`${d.id}  ${d.slides}장  ${d.updated_at}  ${d.title}`);
} else if (cmd === "get" && a) {
	const text = `${JSON.stringify(await rpc("api_get", { p_id: a }), null, 2)}\n`;
	if (b) {
		fs.writeFileSync(b, text);
		console.log(`${b} 에 저장했어요`);
	} else process.stdout.write(text);
} else if ((cmd === "put" || cmd === "new") && a) {
	const deck = JSON.parse(fs.readFileSync(a, "utf8"));
	const isNew = cmd === "new" || !deck.id;
	const r = await rpc("api_save", {
		p_deck: { title: deck.title, caption: deck.caption, slides: deck.slides },
		p_id: isNew ? null : deck.id,
		p_expected: isNew ? null : (deck.updated_at ?? null),
	});
	// 다음 put 이 충돌 확인을 할 수 있게 id·updated_at 을 파일에 적어 둔다.
	fs.writeFileSync(a, `${JSON.stringify({ ...deck, id: r.id, updated_at: r.updated_at }, null, 2)}\n`);
	console.log(`${isNew ? "새 덱을 만들었어요" : "올렸어요"}: ${r.id}`);
} else if (cmd === "upload" && a && positional.length > 2) {
	for (const file of positional.slice(2)) console.log(JSON.stringify(await upload(a, file)));
} else if (cmd === "assets" && a) {
	const r = await api("GET", "assets", a);
	const list = flag("--unused") || flag("--delete") ? r.assets.filter((x) => !x.used) : r.assets;
	if (flag("--delete")) {
		const d = await api("DELETE", "assets", a, { srcs: list.map((x) => x.src) });
		console.log(`지웠어요 ${d.removed.length}개${d.kept.length ? `, 쓰는 중이라 남김 ${d.kept.length}개` : ""}`);
	} else {
		for (const x of list) console.log(`${x.used ? "쓰는 중" : "안 씀  "}  ${(x.size / 1024).toFixed(0).padStart(6)}KB  ${x.src}`);
		console.log(`${list.length}개`);
	}
	for (const m of r.missing) console.log(`없음(덱이 가리키는데 파일이 없어요): ${m}`);
} else if (cmd === "render" && a) {
	const out = b ?? path.join(os.tmpdir(), `carousel-${a.slice(0, 8)}`);
	const q = new URLSearchParams({ deck: a, ...(opt("--slides") && { slides: opt("--slides") }), ...(opt("--scale") && { scale: opt("--scale") }) });
	const res = await fetch(`${API}/api/render?${q}`, { headers: { Authorization: `Bearer ${token()}` } });
	const data = await res.json().catch(() => ({ message: `${res.status}` }));
	if (!res.ok) fail(data.message);
	fs.mkdirSync(out, { recursive: true });
	for (const s of data.slides) {
		const f = path.join(out, `${String(s.index).padStart(2, "0")}.jpg`);
		fs.writeFileSync(f, Buffer.from(s.jpeg, "base64"));
		console.log(f);
	}
	fs.writeFileSync(path.join(out, "layout.json"), `${JSON.stringify({ size: data.size, layout: data.layout, warnings: data.warnings }, null, 2)}\n`);
	console.log(path.join(out, "layout.json"));
	for (const w of data.warnings) console.log(`경고: ${w}`);
} else {
	fail(
		"사용법: node carousel.mjs list | get <id> [파일] | put <파일> | new <파일> | upload <id> <이미지...> | assets <id> [--unused] [--delete] | render <id> [폴더] [--slides 1,3] [--scale 0.5]",
	);
}
