/**
 * 실록 코퍼스 로더 (모듈 캐시).
 * n-gram 절 컴포넌트들이 워커/프로토콜 모듈을 끌어오지 않고 코퍼스만 쓸 수 있게
 * trainerStore와 분리되어 있다.
 */
let corpusPromise: Promise<string> | null = null;

export function getSillokCorpus(): Promise<string> {
  if (!corpusPromise) {
    corpusPromise = fetch("/gpt/sillok.txt").then((r) => {
      if (!r.ok) throw new Error(`corpus ${r.status}`);
      return r.text();
    });
    // 실패한 fetch가 캐시에 남으면 재시도가 영영 불가능하다 — 비워서 재시도 허용
    corpusPromise.catch(() => {
      corpusPromise = null;
    });
  }
  return corpusPromise;
}
