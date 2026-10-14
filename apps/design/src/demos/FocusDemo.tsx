import Button from "@yeolyi/ui/Button";
import Input from "@yeolyi/ui/Input";

// Tab 으로 옮겨 보는 초점 견본. 링크 · 버튼 · 주황 버튼 · 입력 칸.
export default function FocusDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href="#초점">링크</a>
      <Button>버튼</Button>
      <Button variant="primary">주황 버튼</Button>
      <Input aria-label="입력 칸 예시" placeholder="입력 칸" />
    </div>
  );
}
