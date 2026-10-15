import { addDays, todayYmd } from "@shared/dates.ts";
import {
  type CollectRun,
  type Notice,
  type Settings,
  withDefaults,
} from "@shared/types.ts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase.ts";

// 공고는 Supabase 에서 누구나 읽는다. 개인화 정보는 이 브라우저(localStorage)에만 두고 서버로 보내지 않는다.
// 판정도 브라우저에서 한다. 다른 브라우저로 옮길 땐 개인화 화면의 내보내기·가져오기(파일)를 쓴다.

const CLOSED_DAYS = 90; // 마감 탭이 보여 주는 기간
const LOCAL_KEY = "house:settings";

export const keys = {
  notices: ["notices"] as const,
  lastRun: ["lastRun"] as const,
  settings: ["settings"] as const,
};

export function useNotices() {
  return useQuery({
    queryKey: keys.notices,
    queryFn: async () => {
      const since = addDays(todayYmd(), -CLOSED_DAYS);
      const { data, error } = await supabase
        .from("notices")
        .select("data")
        .gte("apply_end", since);
      if (error) throw error;
      return (data as { data: Notice }[]).map((r) => r.data);
    },
  });
}

/** 공고 하나. 목록(최근 90일)에 있으면 그것을 쓰고, 없으면(가이드가 거는 지난 공고) 그 하나만 받는다. */
export function useNotice(id: string) {
  const list = useNotices();
  const found = list.data?.find((x) => x.id === id);
  const one = useQuery({
    queryKey: ["notice", id],
    enabled: list.isSuccess && !found,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("data")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as { data: Notice } | null)?.data ?? null;
    },
  });
  return {
    notice: found ?? one.data ?? undefined,
    isPending: list.isPending || (!found && one.isPending),
  };
}

/** 가이드의 실제 공고 예시. 최근 1년의 수도권 본청약만 받는다(나눔형·선택형은 1년에 몇 건뿐이라 90일로는 비기 쉽다).
 *  지난 공고는 scripts/backfill.ts 로 채워 두었다. */
const GUIDE_DAYS = 365;
export function useGuideNotices() {
  return useQuery({
    queryKey: ["guideNotices"],
    queryFn: async () => {
      const since = addDays(todayYmd(), -GUIDE_DAYS);
      const { data, error } = await supabase
        .from("notices")
        .select("data")
        .gte("apply_end", since)
        .in("data->>kind", ["APT", "신혼희망타운"])
        .in("data->>sido", ["서울", "경기", "인천"]);
      if (error) throw error;
      return (data as { data: Notice }[]).map((r) => r.data);
    },
  });
}

export function useLastRun() {
  return useQuery({
    queryKey: keys.lastRun,
    queryFn: async (): Promise<CollectRun | null> => {
      const { data, error } = await supabase
        .from("runs")
        .select("finished_at, error, stats")
        .eq("job", "collect")
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        finishedAt: data.finished_at,
        error: data.error ?? undefined,
        noticeCount: data.stats?.noticeCount ?? 0,
        added: data.stats?.added ?? 0,
      };
    },
  });
}

/** 저장 형식의 판. 칸의 뜻이 바뀌거나 값을 고쳐야 할 때 올리고, migrate 에 한 단계를 더한다.
 *  칸이 새로 생기기만 하면 올릴 필요 없다(withDefaults 가 기본값으로 채운다). 내보내기 파일도 같은 판을 쓴다. */
export const SETTINGS_VERSION = 1;

/** 옛 판의 값을 지금 판으로 고친다. 판 번호가 없는 값은 0판(처음 공개 전 저장분). */
function migrate(saved: Partial<Settings>, from: number): Partial<Settings> {
  let s = saved;
  // 0 → 1: 예전엔 총자산 3억·월소득 600만이 기본값으로 채워져 저장됐다. 둘 다 그 값 그대로면 넣은 적 없는 것으로 보고 비운다.
  if (from < 1 && s.totalAssetsEok === 3 && s.incomeMan === 600)
    s = { ...s, totalAssetsEok: null, incomeMan: null };
  return s;
}

/** localStorage 에는 { version, settings } 로 둔다. 판 번호가 없으면(옛 저장분) 값 자체가 설정이다. */
const readLocal = (): Partial<Settings> | null => {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    return "version" in raw && "settings" in raw
      ? migrate(raw.settings ?? {}, Number(raw.version) || 0)
      : migrate(raw, 0);
  } catch {
    return null;
  }
};
const writeLocal = (s: Settings) => {
  try {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({ version: SETTINGS_VERSION, settings: s }),
    );
  } catch {
    // 사생활 보호 창 등. 이번 화면에서만 쓰인다
  }
};

/** 개인화 정보. 이 브라우저(localStorage)에만 있다. 서버로 보내지 않는다. */
export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    staleTime: Infinity,
    queryFn: async (): Promise<Settings> => withDefaults(readLocal()),
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Settings) => {
      writeLocal(s);
      return s;
    },
    onSuccess: (s) => qc.setQueryData(keys.settings, s),
  });
}

/** 이 브라우저에서 개인화 정보를 지운다(기본값으로 덮지 않고 저장소에서 뺀다). */
export function useClearSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        localStorage.removeItem(LOCAL_KEY);
      } catch {
        // 사생활 보호 창 등
      }
      return withDefaults(null);
    },
    onSuccess: (s) => qc.setQueryData(keys.settings, s),
  });
}

/** 내보내기·가져오기용 파일 내용. 다른 브라우저로 옮길 때 쓴다. */
const EXPORT_KIND = "house-settings";
export const exportSettings = (s: Settings) =>
  JSON.stringify(
    { kind: EXPORT_KIND, version: SETTINGS_VERSION, settings: s },
    null,
    2,
  );
/** 가져온 파일을 읽는다. 개인화 파일이 아니면 undefined. 빠진 칸은 기본값으로 채운다. */
export function parseSettings(text: string): Settings | undefined {
  try {
    const v = JSON.parse(text) as {
      kind?: string;
      version?: number;
      settings?: Partial<Settings>;
    };
    // 내보내기 파일은 처음부터 1판이었다
    return v.kind === EXPORT_KIND &&
      v.settings &&
      typeof v.settings === "object"
      ? withDefaults(migrate(v.settings, v.version ?? 1))
      : undefined;
  } catch {
    return undefined;
  }
}
