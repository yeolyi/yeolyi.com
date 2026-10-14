import { useEffect, useState } from "react";
import { getSillokCorpus } from "./corpus";

/** 실록 코퍼스를 로드하는 훅. 모듈 캐시라 여러 컴포넌트가 공유한다. */
export function useCorpus(): string | null {
  const [corpus, setCorpus] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getSillokCorpus().then((t) => {
      if (alive) setCorpus(t);
    });
    return () => {
      alive = false;
    };
  }, []);
  return corpus;
}
