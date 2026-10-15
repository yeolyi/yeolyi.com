import { actions } from "astro:actions";
import { useEffect } from "react";
import { useHeartStore } from "./heartStore";
import { tempUserId } from "./tempUser";

// 한 글에 아일랜드가 여러 개(상단·하단)라 postId 별로 최초 1회만 fetch 한다.
const inflightByPostId = new Map<string, Promise<void>>();

function fetchHeart(postId: string): Promise<void> {
  const inflight = inflightByPostId.get(postId);
  if (inflight) return inflight;
  const promise = actions.like
    .getLikeInfo({ postId, tempUserId })
    .then(({ data }) => {
      if (data)
        useHeartStore
          .getState()
          .setEntry(postId, { count: data.count, hearted: data.userLiked });
    })
    .finally(() => inflightByPostId.delete(postId));
  inflightByPostId.set(postId, promise);
  return promise;
}

export function useHeart(postId: string) {
  const entry = useHeartStore((s) => s.entries[postId]);
  const setEntry = useHeartStore((s) => s.setEntry);

  const heartCount = entry?.count ?? 0;
  const isHearted = entry?.hearted ?? false;

  const handleHeartClick = async () => {
    const prevIsHearted = isHearted;
    const prevHeartCount = heartCount;

    setEntry(postId, {
      count: prevIsHearted ? prevHeartCount - 1 : prevHeartCount + 1,
      hearted: !prevIsHearted,
    });

    // 액션은 서버 에러를 throw 하지 않고 { error } 로 반환한다(throw 는 네트워크
    // 실패뿐). 둘 다 잡아 낙관적 업데이트를 롤백한다.
    try {
      const action = prevIsHearted
        ? actions.like.removeThumbsUp
        : actions.like.addThumbsUp;
      const { error } = await action({ postId, tempUserId });
      if (error) throw error;
    } catch {
      setEntry(postId, { count: prevHeartCount, hearted: prevIsHearted });
    }
  };

  useEffect(() => {
    if (useHeartStore.getState().entries[postId]) return;
    fetchHeart(postId);
  }, [postId]);

  return {
    heartCount,
    isHearted,
    handleHeartClick,
  };
}
