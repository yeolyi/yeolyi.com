import MonthCalendar from "@yeolyi/ui/MonthCalendar";

// 청약 공고 하나의 일정. 하루짜리와 기간이 섞여 있고, 계약이 다음 달로 넘어간다.
export default function MonthCalendarDemo() {
  return (
    <MonthCalendar
      today="2026-09-15"
      events={[
        { start: "2026-09-04", label: "공고" },
        { start: "2026-09-14", label: "특공" },
        { start: "2026-09-15", label: "1순위" },
        { start: "2026-09-16", label: "2순위" },
        { start: "2026-09-22", label: "발표" },
        { start: "2026-10-05", end: "2026-10-08", label: "계약" },
      ]}
    />
  );
}
