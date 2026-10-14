import { create } from "zustand";

interface HeartEntry {
  count: number;
  hearted: boolean;
}

interface HeartStore {
  entries: Record<string, HeartEntry>;
  setEntry: (postId: string, entry: HeartEntry) => void;
}

// 게시물별 추천 상태를 아일랜드 간 공유한다. 한 글에 HeartButton 이 여러 개(상단
// 헤더·하단)여도 같은 스토어 엔트리를 읽고 써서 동기화된다.
export const useHeartStore = create<HeartStore>((set) => ({
  entries: {},
  setEntry: (postId, entry) =>
    set((s) => ({ entries: { ...s.entries, [postId]: entry } })),
}));
