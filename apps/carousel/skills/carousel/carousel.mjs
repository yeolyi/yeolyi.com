#!/usr/bin/env node
// carousel(https://carousel.yeolyi.com) 덱 JSON 을 읽고 쓰는 스크립트. Node 18+ 만 있으면 된다(설치 없음).
//
//   node carousel.mjs list                      내 덱 목록
//   node carousel.mjs get <덱 id> [파일]          덱 JSON 받기(파일을 안 주면 화면에 출력)
//   node carousel.mjs put <파일>                 고친 덱 올리기(파일의 id·updated_at 으로 충돌 확인)
//   node carousel.mjs new <파일>                 새 덱 만들기(파일의 id 는 무시)
//
// 토큰: 웹앱 홈 → "AI 연결"에서 발급. 환경 변수 CAROUSEL_TOKEN 이나 ~/.config/carousel/token 에 둔다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// 공개용 주소·키다(anon). 실제 권한은 토큰이 정한다.
const URL_ = process.env.CAROUSEL_SUPABASE_URL ?? "https://jfzhtdcyaqwgugipnmhs.supabase.co";
const ANON = process.env.CAROUSEL_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impmemh0ZGN5YXF3Z3VnaXBubWhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MzYwNDQsImV4cCI6MjA2MDAxMjA0NH0.Xa1rEYFrw4zTLk7YUZQWKdq7FVT8f7WWRlBFbAGMH8M";

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

const [cmd, a, b] = process.argv.slice(2);
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
} else {
	fail("사용법: node carousel.mjs list | get <id> [파일] | put <파일> | new <파일>");
}
