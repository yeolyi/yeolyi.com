// 홈의 "AI 사용법" 카드: AI 에게 붙여 넣을 프롬프트(토큰 포함)와 복사·토큰 재발급 버튼.
// 토큰은 처음 볼 때 자동으로 발급된다(carousel.my_api_token).
import Button from "@yeolyi/ui/Button";
import { Bot, Check, Copy, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ic } from "./ui";

const RAW = "https://raw.githubusercontent.com/yeolyi/carousel/main/skills/carousel";

const promptFor = (token: string) => `carousel.yeolyi.com 캐러셀 편집기의 내 덱을 다룰 수 있게 준비해 줘.
1. ${RAW}/SKILL.md 와 ${RAW}/carousel.mjs 를 받아 내 스킬 폴더(Claude Code 면 ~/.claude/skills/carousel/)에 넣어.
2. 아래 토큰을 ~/.config/carousel/token 파일에 저장해. 다른 곳에는 적지 마.
${token}
3. node <스킬 폴더>/carousel.mjs list 로 연결을 확인하고 내 덱 목록을 보여 줘.
그다음부터 덱을 쓰거나 고칠 땐 SKILL.md 를 따라.`;

export function AiCard() {
	const [token, setToken] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const rpc = async (fn: "my_api_token" | "reissue_api_token") => {
		const { data, error } = await supabase.schema("carousel").rpc(fn);
		if (error) setError(error.message);
		else setToken(data as string);
	};
	useEffect(() => {
		rpc("my_api_token");
	}, []);

	return (
		<article className="deck-card border p-4">
			<h2 className="flex items-center gap-2">
				<Bot {...ic} /> AI 사용법
			</h2>
			<p className="text-muted-foreground mt-2 flex-1">
				Claude Code 같은 AI 에게 붙여 넣으면 AI 가 이 편집기와 연결되어 내 덱을 읽고 고칠 수 있습니다. 내 계정 토큰이 들어 있으니 남에게
				공유하지 마십시오.
			</p>
			{error && <p className="mt-2">{error}</p>}
			<div className="mt-4 grid gap-2">
				<Button
					variant="primary"
					disabled={!token}
					onClick={async () => {
						if (!token) return;
						await navigator.clipboard.writeText(promptFor(token));
						setCopied(true);
						setTimeout(() => setCopied(false), 1500);
					}}
				>
					{copied ? <Check {...ic} /> : <Copy {...ic} />}
					{copied ? "복사했습니다" : "프롬프트 복사"}
				</Button>
				<Button
					onClick={() => confirm("토큰을 다시 만들겠습니까? 이전 토큰을 쓰던 AI 는 더 접근하지 못합니다.") && rpc("reissue_api_token")}
				>
					<RefreshCw {...ic} />
					토큰 재발급
				</Button>
			</div>
		</article>
	);
}
