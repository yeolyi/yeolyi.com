// blog-seoul 프로젝트의 carousel 스키마를 쓴다. anon 키는 공개용이고, 접근은 RLS(carousel.editors)가 막는다.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient<any, "carousel">(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY, {
	db: { schema: "carousel" },
});

export const BUCKET = "carousel";

// 이미지 저장 경로: <deck id>/<deck.json 의 src>  (src 는 "assets/파일이름")
export const assetPath = (deckId: string, src: string) => `${deckId}/${src}`;
