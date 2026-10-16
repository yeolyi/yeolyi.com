import { type Settings, withDefaults } from "./types.ts";

// 개인화 정보의 저장 형식(localStorage)과 내보내기 파일. 화면만 쓰지만 테스트가 부르게 여기 둔다.

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

/** localStorage 에 둔 값을 읽는다. { version, settings } 꼴이고, 판 번호가 없으면(옛 저장분) 값 자체가 설정이다. */
export function readStored(raw: unknown): Partial<Settings> | null {
  if (!raw || typeof raw !== "object") return null;
  return "version" in raw && "settings" in raw
    ? migrate(
        (raw.settings as Partial<Settings> | null) ?? {},
        Number(raw.version) || 0,
      )
    : migrate(raw as Partial<Settings>, 0);
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
