/**
 * 자모 단위 토크나이저.
 * 한글 음절을 유니코드 정규화(NFD)로 자모 분해해 vocab을 줄인다 (실록 기준 1,234 → 143).
 * 재조합(NFC)은 무손실.
 */
export interface Tokenizer {
  vocab: string[];
  stoi: Map<string, number>;
  encode(text: string): number[];
  decode(ids: number[]): string;
  vocabSize: number;
}

export function decompose(text: string): string {
  return text.normalize("NFD");
}

export function compose(jamo: string): string {
  return jamo.normalize("NFC");
}

/** 코퍼스에서 vocab을 만들어 토크나이저 생성 */
export function buildTokenizer(corpus: string): Tokenizer {
  const vocab = [...new Set(decompose(corpus))].sort();
  return fromVocab(vocab);
}

/** 저장된 vocab(체크포인트)에서 복원 */
export function fromVocab(vocab: string[]): Tokenizer {
  const stoi = new Map(vocab.map((c, i) => [c, i]));
  return {
    vocab,
    stoi,
    vocabSize: vocab.length,
    encode(text) {
      const ids: number[] = [];
      for (const ch of decompose(text)) {
        const id = stoi.get(ch);
        if (id !== undefined) ids.push(id); // vocab 밖 글자는 버림
      }
      return ids;
    },
    decode(ids) {
      return compose(ids.map((i) => vocab[i] ?? "").join(""));
    },
  };
}

/** 생성 결과 끝의 미완성 음절(조합 안 된 자모) 제거 */
export function trimIncomplete(text: string): string {
  return text.replace(/[ᄀ-ᇿ]+$/u, "");
}

// 조합용 자모(U+1100대) → 낱자(호환 자모) 표시 문자. 단독 렌더링용.
const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNGSEONG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONGSEONG = "ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";

/** 자모 1글자를 사람이 읽을 수 있는 형태로 (그 외 문자는 그대로) */
export function displayJamo(ch: string): string {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x1100 && code <= 0x1112) return CHOSEONG[code - 0x1100];
  if (code >= 0x1161 && code <= 0x1175) return JUNGSEONG[code - 0x1161];
  if (code >= 0x11a8 && code <= 0x11c2) return JONGSEONG[code - 0x11a8];
  return ch;
}

/** 자모 종류: 초성/중성/종성/기타 (임베딩 시각화 색상용) */
export function jamoKind(ch: string): "cho" | "jung" | "jong" | "etc" {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x1100 && code <= 0x1112) return "cho";
  if (code >= 0x1161 && code <= 0x1175) return "jung";
  if (code >= 0x11a8 && code <= 0x11c2) return "jong";
  return "etc";
}
