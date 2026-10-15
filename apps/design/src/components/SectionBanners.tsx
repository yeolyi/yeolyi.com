import Button from "@yeolyi/ui/Button";
import Checkbox from "@yeolyi/ui/Checkbox";
import RadioGroup from "@yeolyi/ui/RadioGroup";

// 홈 둘러보기 배너(Sections.astro)의 내용. 그림이 아니라 실제 부품이라 누르고 골라 볼 수 있다. 스타일 배너는 @yeolyi/ui/ColorStrips.

export function ComponentsBanner() {
  return (
    <div className="bg-background absolute inset-0 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4">
      <Button variant="primary">저장</Button>
      <RadioGroup options={["자동", "밝게", "어둡게"]} aria-label="테마" />
      <Checkbox defaultChecked>새 글</Checkbox>
    </div>
  );
}

// 패턴: 서비스 헤더 아래 한 페이지에 질문 하나. 세로 라디오 두 줄이 높이를 다 차지해, 넓으면 질문 옆에 답을 두고
// 좁으면 헤더 줄을 뺀다.
export function PatternsBanner() {
  return (
    <div className="bg-background absolute inset-0 flex flex-col justify-center gap-x-10 px-6 sm:flex-row sm:items-center sm:justify-start">
      <div>
        <span className="text-muted-foreground hidden text-base sm:block">
          yeolyi.com / <b className="text-foreground">서비스</b>
        </span>
        <span className="block text-[1.5rem] leading-tight font-bold sm:mt-1">
          누구와 함께 신청하나요?
        </span>
      </div>
      <RadioGroup
        orientation="vertical"
        options={["혼자", "배우자와"]}
        aria-label="누구와 함께 신청하나요?"
      />
    </div>
  );
}
