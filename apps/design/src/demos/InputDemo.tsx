import Input from "@yeolyi/ui/Input";
import Textarea from "@yeolyi/ui/Textarea";

// 라벨·설명·칸 사이는 눈에 보이는 간격이 모두 약 8px(라벨·설명 줄 높이 1.4 + 칸 위 4px).
export default function InputDemo() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <label htmlFor="ds-name" className="leading-[1.4]">
          이름
        </label>
        <span className="text-muted-foreground leading-[1.4]">
          댓글 옆에 보입니다.
        </span>
        <Input id="ds-name" className="mt-1 w-fit" defaultValue="이성열" />
      </div>
      <div className="flex flex-col">
        <label htmlFor="ds-body" className="leading-[1.4]">
          여러 줄
        </label>
        <Textarea
          id="ds-body"
          className="mt-1"
          rows={4}
          defaultValue={
            "한 줄 칸과 같은 상자에 높이만 늘립니다.\n줄이 넘치면 아래로 늘려 쓸 수 있습니다."
          }
        />
      </div>
    </div>
  );
}
