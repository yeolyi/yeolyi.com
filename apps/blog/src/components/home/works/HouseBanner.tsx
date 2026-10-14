import Checkbox from "@yeolyi/ui/Checkbox";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import { clsx } from "clsx";
import { useState } from "react";

// 청약 알리미(house.yeolyi.com)의 핵심을 만져 보는 조각: 내 정보(사는 곳·신혼 여부)를 바꾸면 넣을 수 없는 공고에
// 바로 줄이 그어진다. 공고와 규칙은 실제 데이터가 아닌 고정 견본. 전환 없이 딱 바뀐다.
type Region = "서울" | "경기" | "인천";
const NOTICES: { name: string; region: Region; newlywed?: boolean }[] = [
  { name: "서울 마포 민영", region: "서울" },
  { name: "성남 신혼희망타운", region: "경기", newlywed: true },
  { name: "수원 공공 나눔형", region: "경기" },
  { name: "인천 검단 민영", region: "인천" },
  { name: "하남 신혼 특공", region: "경기", newlywed: true },
];

export default function HouseBanner() {
  const [region, setRegion] = useState<Region>("경기");
  const [newlywed, setNewlywed] = useState(false);
  const ok = (n: (typeof NOTICES)[number]) =>
    n.region === region && (!n.newlywed || newlywed);
  return (
    <div className="bg-background absolute inset-0 flex items-center gap-6 px-4 sm:gap-10 sm:px-6">
      <div className="flex shrink-0 flex-col items-start gap-1">
        <RadioGroup
          options={["서울", "경기", "인천"]}
          value={region}
          onValueChange={(v) => setRegion(v as Region)}
          aria-label="사는 곳"
        />
        <Checkbox checked={newlywed} onCheckedChange={setNewlywed}>
          신혼부부
        </Checkbox>
      </div>
      <ul className="min-w-0 flex-1 text-base leading-[1.6]">
        {NOTICES.map((n) => (
          <li
            key={n.name}
            className={clsx(
              "truncate",
              !ok(n) && "text-muted-foreground line-through",
            )}
          >
            {n.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
