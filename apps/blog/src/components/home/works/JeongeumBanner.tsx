import { type PointerEvent, useRef, useState } from "react";

// 정음이 바꾼 글: 영어 위키백과 "Hunminjeongeum" 첫머리를 실제 정음 엔진(~/Downloads/monttang)으로
// 낱말마다 변환한 결과. [원문, 정음] 쌍. 배너보다 길게 두고 넘치는 아래는 잘린다.
// 예외: 엔진이 "Hunminjeongeum"을 "헌민제아윰"으로 읽어, 그 낱말만 "훈민정음"으로 바꿔 적었다.
const TEXT: [string, string][] = [
  ["Hunminjeongeum", "훈민정음"],
  ["(Korean:", "(코리안:"],
  ["훈민정음;", "훈민정음;"],
  ["Hanja:", "핸자:"],
  ["訓民正音;", "쉰민정인;"],
  ["lit.", "릿."],
  ["'The", "'더"],
  ["Correct", "코렉트"],
  ["Sounds", "사운즈"],
  ["for", "포"],
  ["the", "더"],
  ["Instruction", "인스트럭션"],
  ["of", "오브"],
  ["the", "더"],
  ["People')", "피플')"],
  ["is", "이즈"],
  ["a", "어"],
  ["1446", "1446"],
  ["work", "워크"],
  ["that", "댓"],
  ["formally", "포몰리"],
  ["introduced", "인트러두스트"],
  ["the", "더"],
  ["first", "퍼스트"],
  ["native", "네이티브"],
  ["Korean", "코리안"],
  ["alphabet.", "앨파벳."],
  ["That", "댓"],
  ["alphabet", "앨파벳"],
  ["was", "워즈"],
  ["originally", "오리지놀리"],
  ["also", "올소"],
  ["called", "콜드"],
  ['"Hunminjeongeum",', '"훈민정음",'],
  ["although", "올도"],
  ["it", "잇"],
  ["is", "이즈"],
  ["now", "나우"],
  ["widely", "와이들리"],
  ["called", "콜드"],
  ['"Hangul"', '"핸굴"'],
  ["(international", "(인터내셔널"],
  ["spelling;", "스펠링;"],
  ["spelled", "스펠드"],
  ["in", "인"],
  ["South", "사우스"],
  ["Korea", "코리아"],
  ['"Hangeul")', '"해율")'],
  ["or", "오어"],
  ['"Chosŏn\'gŭl"', '"초존걸"'],
  ["(in", "(인"],
  ["North", "노스"],
  ["Korea).", "코리아)."],
  ["The", "더"],
  ["base", "베이스"],
  ["Hunminjeongeum", "훈민정음"],
  ["was", "워즈"],
  ["first", "퍼스트"],
  ["published", "퍼블리슈트"],
  ["around", "어라운드"],
  ["October", "악토버"],
  ["1446", "1446"],
  ["(Gregorian", "(그러고리언"],
  ["calendar)", "캘렌더)"],
  ["and", "앤드"],
  ["authored", "오서드"],
  ["by", "바이"],
  ["Joseon", "자제안"],
  ["king", "킹"],
  ["Sejong", "세종"],
  ["the", "더"],
  ["Great", "그레이트"],
  ["(r.", "(알."],
  ["1418–1450).", "1418–1450)."],
  ["It", "잇"],
  ["was", "워즈"],
  ["originally", "오리지놀리"],
  ["written", "리튼"],
  ["in", "인"],
  ["Classical", "클래시컬"],
  ["Chinese", "차이니즈"],
  ["using", "유징"],
  ["the", "더"],
  ["Hanja", "핸자"],
  ["script.", "스크립트."],
  ["It", "잇"],
  ["was", "워즈"],
  ["later", "레이터"],
  ["translated", "트랜즐레이티드"],
  ["to", "투"],
  ["the", "더"],
  ["Korean", "코리안"],
  ["language", "랭궈지"],
  ["using", "유징"],
  ["Korean", "코리안"],
  ["mixed", "믹스트"],
  ["script;", "스크립트;"],
  ["such", "서치"],
  ["translated", "트랜즐레이티드"],
  ["editions", "이디션즈"],
  ["are", "아"],
  ["called", "콜드"],
  ["Eonhae", "에안해"],
  ["(언해;", "(언해;"],
  ["諺解;", "옌제;"],
  ["Ŏnhae).", "온해)."],
  ["While", "와일"],
  ["the", "더"],
  ["base", "베이스"],
  ["Hunminjeongeum", "훈민정음"],
  ["remained", "리메인드"],
  ["in", "인"],
  ["the", "더"],
  ["historical", "히스토리컬"],
  ["record,", "레코드,"],
  ["the", "더"],
  ["Haerye", "해에리"],
  ["was", "워즈"],
  ["lost", "로스트"],
  ["and", "앤드"],
  ["forgotten.", "포고튼."],
  ["It", "잇"],
  ["was", "워즈"],
  ["only", "온리"],
  ["rediscovered", "리디스커버드"],
  ["in", "인"],
  ["1940.", "1940."],
  ["The", "더"],
  ["Hunminjeongeum", "훈민정음"],
  ["and", "앤드"],
  ["Haerye", "해에리"],
  ["are", "아"],
  ["considered", "컨시더드"],
  ["to", "투"],
  ["be", "비"],
  ["among", "어멍"],
  ["the", "더"],
  ["most", "모스트"],
  ["important", "임포턴트"],
  ["works", "워크스"],
  ["in", "인"],
  ["the", "더"],
  ["study", "스터디"],
  ["of", "오브"],
  ["the", "더"],
  ["Korean", "코리안"],
  ["language.", "랭궈지."],
  ["A", "에이"],
  ["copy", "코피"],
  ["of", "오브"],
  ["the", "더"],
  ["full", "풀"],
  ["text,", "텍스트,"],
  ["including", "인클루딩"],
  ["the", "더"],
  ["Haerye", "해에리"],
  ["section,", "섹션,"],
  ["was", "워즈"],
  ["designated", "데지그네이티드"],
  ["a", "어"],
  ["National", "내셔널"],
  ["Treasure", "트레저"],
  ["of", "오브"],
  ["South", "사우스"],
  ["Korea", "코리아"],
  ["in", "인"],
  ["1962", "1962"],
  ["and", "앤드"],
  ["entered", "엔터드"],
  ["into", "인투"],
  ["the", "더"],
  ["UNESCO", "유네스코"],
  ["Memory", "메모리"],
  ["of", "오브"],
  ["the", "더"],
  ["World", "월드"],
  ["Register", "레지스터"],
  ["in", "인"],
  ["1997.", "1997."],
];

// 빨간 바탕에 정음으로 바뀐 줄글(제목 1 크기 32px·굵게, 모바일 24px, 바깥 여백 없음). 포인터가 올라간
// 낱말은 글자 자체가 원문으로 바뀐다(덮지 않고 그 자리의 글이 바뀌어, 길이가 다르면 뒤 글이 밀린다).
//
// 바뀌면 폭이 달라져 포인터가 낱말 밖으로 나가고 → 되돌아가 다시 들어오는 깜빡임이 생긴다. 그래서
// 낱말별 enter/leave 를 쓰지 않고, 바뀌기 전 낱말의 자리(anchor)를 기억해 포인터가 그 자리나 바뀐
// 낱말 위에 있는 동안은 그대로 둔다. 둘 다 벗어나면 그때 포인터 아래 낱말로 옮긴다.
export default function JeongeumBanner() {
  const [over, setOver] = useState<number | null>(null);
  const anchor = useRef<DOMRect | null>(null);

  const inside = (r: DOMRect | null | undefined, x: number, y: number) =>
    !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const { clientX: x, clientY: y } = e;
    if (over !== null) {
      const current = e.currentTarget.querySelector(`[data-i="${over}"]`);
      if (
        inside(anchor.current, x, y) ||
        inside(current?.getBoundingClientRect(), x, y)
      )
        return;
    }
    const hit = (
      document.elementFromPoint(x, y) as HTMLElement | null
    )?.closest<HTMLElement>("[data-i]");
    if (!hit) {
      anchor.current = null;
      setOver(null);
      return;
    }
    anchor.current = hit.getBoundingClientRect();
    setOver(Number(hit.dataset.i));
  };
  const onLeave = () => {
    anchor.current = null;
    setOver(null);
  };

  return (
    <div
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={onLeave}
      className="absolute inset-0 overflow-hidden bg-[rgb(200,50,31)] text-2xl leading-[1.35] font-bold text-[#fff7ef] sm:text-[2rem] sm:leading-[1.25]"
    >
      <p lang="ko">
        {TEXT.map(([en, ko], i) => (
          <span key={`${i}-${en}`}>
            <span
              data-i={i}
              lang={over === i ? "en" : undefined}
              className={
                over === i ? "bg-[#fff7ef] text-[rgb(200,50,31)]" : undefined
              }
            >
              {over === i ? en : ko}
            </span>{" "}
          </span>
        ))}
      </p>
    </div>
  );
}
