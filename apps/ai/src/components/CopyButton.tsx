import Button from "@yeolyi/ui/Button";
import { useState } from "react";

// 프롬프트 원문 복사. 누르면 잠깐 "복사했습니다"로 바뀐다.
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="primary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "복사했습니다" : "프롬프트 복사"}
    </Button>
  );
}
