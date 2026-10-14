import IconButton from "@yeolyi/ui/IconButton";
import { Heart } from "lucide-react";
import { useHeart } from "./useHeart";

interface HeartButtonProps {
  postId: string;
}

// 추천 — 테두리 없는 하트 아이콘 + 숫자. 누른 상태(aria-pressed)는 하트를 주황으로 채운다.
export default function HeartButton({ postId }: HeartButtonProps) {
  const { heartCount, isHearted, handleHeartClick } = useHeart(postId);

  return (
    <IconButton
      onClick={handleHeartClick}
      aria-pressed={isHearted}
      aria-label="추천"
    >
      <Heart aria-hidden />
      <span className="font-mono">{heartCount}</span>
    </IconButton>
  );
}
