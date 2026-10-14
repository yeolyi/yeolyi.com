import Button from "@yeolyi/ui/Button";
import IconButton from "@yeolyi/ui/IconButton";
import { Heart, Sun, X } from "lucide-react";
import { useState } from "react";

export default function ButtonDemo() {
  const [liked, setLiked] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">저장</Button>
      <Button>취소</Button>
      <Button disabled>비활성</Button>
      <IconButton aria-label="테마 바꾸기">
        <Sun aria-hidden />
      </IconButton>
      <IconButton aria-label="닫기">
        <X aria-hidden />
      </IconButton>
      <IconButton
        aria-label="추천"
        aria-pressed={liked}
        onClick={() => setLiked(!liked)}
      >
        <Heart aria-hidden />
        <span className="font-mono">{liked ? 11 : 10}</span>
      </IconButton>
    </div>
  );
}
