import Tabs from "@yeolyi/ui/Tabs";

export default function TabsDemo() {
  return (
    <Tabs
      aria-label="공고 내용"
      items={[
        {
          value: "info",
          label: "공고 정보",
          content: <p>주소, 사업주체, 세대, 주택형</p>,
        },
        {
          value: "me",
          label: "내 자격",
          content: <p>개인화한 답으로 따진 결과</p>,
        },
        { value: "schedule", label: "일정", content: <p>공고부터 계약까지</p> },
      ]}
    />
  );
}
