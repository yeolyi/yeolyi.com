// blog-seoul 프로젝트의 house 스키마를 쓴다. anon 키는 공개용이고, 접근은 RLS 가 막는다(공고는 누구나 읽기, 설정은 본인만).
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient<any, "house">(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  {
    db: { schema: "house" },
  },
);
