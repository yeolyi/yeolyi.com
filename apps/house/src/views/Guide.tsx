import { ArrowLeft, ArrowRight } from "lucide-react";
import { isValidElement, type ReactNode } from "react";
import { MoneyCalc, PointsCalc } from "../components/GuideCalcs.tsx";
import { StackBars } from "../components/GuideCharts.tsx";
import {
  LatestNotices,
  PublicTypesNow,
  ScheduleExample,
  SectorNow,
} from "../components/GuideLive.tsx";
import {
  FIRST_HOME_ROWS,
  IncomeTable,
  NEWBORN_ROWS,
  PrepayCalc,
  SameLineOrder,
  TierCascade,
  TierChart,
} from "../components/GuideWidgets.tsx";
import { Progress } from "../components/Progress.tsx";
import { Quiz, type QuizItem } from "../components/Quiz.tsx";
import { SupplyMap } from "../components/SupplyMap.tsx";
import { ic } from "../util.ts";

// 청약을 하나도 몰라도 넘기며 읽는 기초. 한 페이지에 개념 하나, 합니다체, 짧게.
// 숫자는 2026-10 규칙 기준이고 가능한 한 shared/rules.ts 에서 가져온다(판정과 설명이 어긋나지 않게).

// 근거는 문장 끝에 <C s={…} /> 로 단다. 화면엔 안 보이고 쪽 아래 출처 목록을 만든다. 법령(국가법령정보센터)과 정부·공공기관 자료만. 근거를 못 단 사실 문장은 쓰지 않는다.
type Source = { label: string; href: string };
type Page = { slug: string; title: string; body: ReactNode; quiz?: QuizItem };

// 조문 링크는 국가법령정보센터가 그 조로 바로 연다. 별표는 조문 링크가 없어 법령 전체로 건다.
// 조 이름은 원문 제목 그대로 둬서, 한 쪽에서 같은 조를 여러 번 달아도 출처 목록엔 한 줄로 모인다.
const RULE_TITLES = {
  제2조: "정의",
  제3조: "적용대상",
  제4조: "주택의 공급대상",
  제7조: "입주자저축의 통장 사용",
  제10조: "월납입금을 선납 또는 연체한 경우 등의 처리",
  제19조: "입주자모집 방법",
  제21조: "입주자모집 공고",
  제25조: "주택의 공급방법",
  제26조: "일반공급 예비입주자의 선정",
  제27조: "국민주택의 일반공급",
  제28조: "민영주택의 일반공급",
  제34조: "대규모 택지개발지구 등에서의 우선공급",
  제35조의2: "국민주택의 청년 특별공급",
  제35조의3: "신생아 특별공급",
  제40조: "다자녀가구 특별공급",
  제41조: "신혼부부 특별공급",
  제43조: "생애최초 주택 구입자 특별공급",
  제46조: "노부모 부양자에 대한 특별공급",
  제48조: "특별공급의 입주자저축 요건",
  제50조: "입주자선정업무 등의 대행",
  제54조: "재당첨 제한",
  제55조: "특별공급 횟수 제한",
  제55조의2: "부부 동시 당첨에 관한 특례",
  제57조: "당첨자의 명단관리",
  제58조: "부적격 당첨자의 명단관리 등",
  제60조: "입주금의 납부",
  "별표 1": "가점제 점수",
  "별표 2": "민영주택 청약 예치기준금액",
} as const;
const rule = (article: keyof typeof RULE_TITLES): Source => ({
  label: `주택공급에 관한 규칙 ${article}(${RULE_TITLES[article]})`,
  href: `https://www.law.go.kr/법령/주택공급에관한규칙${article.startsWith("별표") ? "" : `/${article}`}`,
});
const housingAct = (article: string, what: string): Source => ({
  label: `주택법 ${article}(${what})`,
  href: `https://www.law.go.kr/법령/주택법/${article}`,
});
const PUBLIC_RULE: Source = {
  label: "공공주택 특별법 시행규칙 별표 6 등(공공분양 입주자 자격)",
  href: "https://www.law.go.kr/법령/공공주택특별법시행규칙",
};
const PUBLIC_RULE_SHARED: Source = {
  label:
    "공공주택 특별법 시행규칙 별표 6의6(이익공유형·토지임대부 분양주택 입주자 자격)",
  href: "https://www.law.go.kr/법령/공공주택특별법시행규칙",
};
const INCOME_TABLE: Source = {
  label:
    "LH - 공공분양(일반) 소득 기준 표(2026년 적용 도시근로자 가구당 월평균소득)",
  href: "https://www.lh.or.kr/menu.es?mid=a10402010100",
};
const INCOME_ORIGIN: Source = {
  label:
    "KOSIS(통계청) - 전년도 도시근로자 가구당 월평균소득은 어디서 나오나(답변)",
  href: "https://kosis.kr/civilComplaint/qnaDetail.do?boardIdx=21562",
};
const LH_INCOME_CHECK: Source = {
  label:
    "LH 성남복정2 A1 신혼희망타운 입주자모집공고(2026-08) - 소득 판정 기준",
  href: "https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=2026820008&pblancNo=2026820008",
};
const FIRST_HOME_GUIDE: Source = {
  label: "생애최초 주택 특별공급 운용지침(국토교통부 고시)",
  href: "https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000206145",
};
const NHIS: Source = {
  label: "국민건강보험공단 - 보험료 조회",
  href: "https://www.nhis.or.kr",
};
const APPLYHOME: Source = {
  label: "청약홈(한국부동산원)",
  href: "https://www.applyhome.co.kr",
};
const LH_PLUS: Source = {
  label: "LH 청약플러스",
  href: "https://apply.lh.or.kr",
};
const publicAct = (article: string, what: string): Source => ({
  label: `공공주택 특별법 ${article}(${what})`,
  href: `https://www.law.go.kr/법령/공공주택특별법/${article}`,
});
const publicRuleArt = (article: string, what: string): Source => ({
  label: `공공주택 특별법 시행규칙 ${article}(${what})`,
  href: `https://www.law.go.kr/법령/공공주택특별법시행규칙/${article}`,
});
const LH_PUBLIC: Source = {
  label: "LH - 공공분양(일반)",
  href: "https://www.lh.or.kr/menu.es?mid=a10402010100",
};
const LH_NEWLYWED_TOWN: Source = {
  label: "LH - 신혼희망타운(총자산 3억 6,200만 원 이하, 2026년 기준)",
  href: "https://www.lh.or.kr/menu.es?mid=a10402010200",
};
const NEWLYWED_GUIDE: Source = {
  label: "신혼부부 주택 특별공급 운용지침(국토교통부 고시)",
  href: "https://www.law.go.kr/LSW//admRulInfoP.do?admRulSeq=2100000256910&chrClsCd=010201",
};
const LTV_FIRST: Source = {
  label:
    "정책브리핑(금융위원회) - 2025.6.27 가계부채 관리 강화: 생애최초 LTV 70%",
  href: "https://www.korea.kr/news/policyNewsView.do?newsId=148945077",
};
const LTV_CAP: Source = {
  label:
    "정책브리핑(국토교통부) - 2025.10.15 규제지역 지정: 15억 이하 대출 상한 6억",
  href: "https://www.korea.kr/news/policyNewsView.do?newsId=148950973",
};
const NO_RANK_2025: Source = {
  label: "KDI 경제정보센터 - 무순위 청약 무주택 요건(2025.6.10 개정)",
  href: "https://eiec.kdi.re.kr/policy/materialView.do?num=263149",
};
const WIN_LIMIT_GUIDE: Source = {
  label: "찾기 쉬운 생활법령정보(법제처) - 당첨 취소와 제한",
  href: "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=1773&ccfNo=4&cciNo=3&cnpClsNo=2",
};

// 출처 목록은 본문에 처음 나온 순서. 렌더 전에 본문 트리를 훑어 모으므로(같은 출처는 한 줄) 쪽마다 목록을 따로 적지 않는다.
function collectSources(node: ReactNode, out: Source[] = []): Source[] {
  if (Array.isArray(node)) for (const x of node) collectSources(x, out);
  else if (
    isValidElement<{
      s?: Source;
      children?: ReactNode;
      items?: ReactNode[];
    }>(node)
  ) {
    const { s, children, items } = node.props;
    if (
      node.type === C &&
      s &&
      !out.some((x) => x.href === s.href && x.label === s.label)
    )
      out.push(s);
    collectSources(children, out);
    collectSources(items, out);
  }
  return out;
}
/** 문장의 근거 표시. 화면엔 그리지 않고 collectSources 가 읽어 출처 목록을 만든다. */
function C(_: { s: Source }) {
  return null;
}

const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-[1rlh] first:mt-0">{children}</p>
);

const L = ({ items }: { items: ReactNode[] }) => (
  <ul className="list mt-[0.5rlh]">
    {items.map((x, i) => (
      <li key={i}>{x}</li>
    ))}
  </ul>
);

const PAGES: Page[] = [
  {
    slug: "what",
    quiz: {
      q: "청약 규칙이 정하는 두 가지는 무엇인가요?",
      options: ["자격과 순위", "분양가와 면적", "지역과 날짜"],
      answer: 0,
    },
    title: "청약이란",
    body: (
      <>
        <P>
          새로 짓는 아파트는 다 짓기 전에 살 사람을 모읍니다. 이걸 분양이라고
          하고, 사겠다고 신청하는 걸 청약이라고 합니다.
        </P>
        <P>
          누가 살지는 나라가 정한 규칙으로 뽑습니다.
          <C s={rule("제3조")} />
        </P>
        <P>규칙은 결국 두 가지를 정합니다.</P>
        <L
          items={[
            "누가 넣을 수 있나 (자격)",
            "넣은 사람 중 누가 먼저 뽑히나 (순위, 점수, 추첨)",
          ]}
        />
        <P>
          이 가이드는 이 두 가지를 차례로 풉니다. 지금 실제로 나온 공고는 이런
          것들입니다.
        </P>
        <LatestNotices />
      </>
    ),
  },
  {
    slug: "sector",
    quiz: {
      q: "LH가 짓는 아파트는 어느 쪽인가요?",
      options: ["민영", "공공"],
      answer: 1,
    },
    title: "민영과 공공",
    body: (
      <>
        <P>아파트를 누가 짓느냐에 따라 규칙이 크게 다릅니다.</P>
        <L
          items={[
            <>
              <strong>민영</strong>: 건설사가 짓습니다.
            </>,
            <>
              <strong>공공</strong>: LH, SH, GH 같은 공공기관이 짓습니다.
              <C s={PUBLIC_RULE} />
            </>,
          ]}
        />
        <P>최근 수도권에 나온 본청약을 둘로 나누면 이렇습니다.</P>
        <SectorNow />
      </>
    ),
  },
  {
    slug: "public-types",
    quiz: {
      q: "팔 때 공공이 다시 사들이고 이익이나 손해를 나누는 공공분양은 무엇인가요?",
      options: ["일반형", "나눔형", "선택형"],
      answer: 1,
    },
    title: "공공분양의 종류",
    body: (
      <>
        <P>공공분양은 다시 몇 가지로 나뉩니다.</P>
        <L
          items={[
            <>
              <strong>일반형</strong>: 분양가를 내고 집을 온전히 갖는
              공공분양입니다.
              <C s={LH_PUBLIC} />
            </>,
            <>
              <strong>나눔형</strong>: 팔 때는 공공이 다시 사들이고, 남긴
              이익이나 손해를 공공과 나눕니다. 법에선 이익공유형 분양주택이라고
              합니다.
              <C s={publicAct("제2조", "정의, 이익공유형 분양주택")} />
              <C s={publicAct("제49조의10", "이익공유형 분양주택의 환매")} />
            </>,
            <>
              <strong>선택형</strong>: 공공임대로 6년 살고, 그 뒤 분양받을지
              고릅니다. 법에선 임대의무기간이 6년인 분양전환공공임대주택이라고
              합니다.
              <C
                s={publicRuleArt(
                  "제19조",
                  "분양전환공공임대주택 등의 입주자 선정",
                )}
              />
            </>,
            <>
              <strong>신혼희망타운</strong>: 신혼부부, 결혼할 사이, 한부모가족만
              넣는 공공분양입니다.
              <C
                s={publicRuleArt(
                  "제19조",
                  "분양전환공공임대주택 등의 입주자 선정",
                )}
              />
              <C s={LH_NEWLYWED_TOWN} />
            </>,
          ]}
        />
        <P>
          공고 목록의 "공공 나눔형" 같은 말이 이 종류를 가리킵니다. 수도권에
          최근 나온 공고로 보면 이렇습니다.
        </P>
        <PublicTypesNow />
        <P>종류에 따라 보는 자산도 다릅니다(2026년 기준).</P>
        <L
          items={[
            <>
              일반형: 가진 부동산(건물과 토지) 2억 1,550만 원, 자동차 4,542만 원
              이하. 예금이나 전세보증금 같은 금융자산은 보지 않습니다.
              <C s={LH_PUBLIC} />
            </>,
            <>
              나눔형, 선택형, 신혼희망타운: 부동산, 자동차, 금융자산(전세보증금
              포함)을 더하고 빚을 뺀 총자산 3억 6,200만 원 이하.
              <C s={LH_NEWLYWED_TOWN} />
              <C s={PUBLIC_RULE} />
            </>,
          ]}
        />
      </>
    ),
  },
  {
    slug: "account",
    quiz: {
      q: "민영분양이 청약통장에서 보는 것은 무엇인가요?",
      options: ["납입 횟수", "예치금"],
      answer: 1,
    },
    title: "청약통장",
    body: (
      <>
        <P>
          청약을 하려면 먼저 <strong>주택청약종합저축</strong>(청약통장)이
          있어야 합니다. 은행에서 만들고, 매달 돈을 넣는 적금 같은 통장입니다.
        </P>
        <P>청약에서 이 통장으로 보는 건 세 가지입니다.</P>
        <L
          items={[
            <>
              <strong>가입 기간</strong>: 오래될수록 유리합니다.
              <C s={rule("제27조")} />
              <C s={rule("제28조")} />
              <C s={rule("별표 1")} />
            </>,
            <>
              <strong>예치금</strong>: 민영분양이 봅니다. 사는 지역과 집 크기에
              따라 정해진 금액 이상이 통장에 있어야 합니다.
              <C s={rule("제28조")} />
            </>,
            <>
              <strong>납입 횟수</strong>: 공공분양이 봅니다. 몇 달 꼬박꼬박
              넣었는지입니다.
              <C s={rule("제27조")} />
            </>,
          ]}
        />
        <P>
          아직 통장이 없다면 지금 만드는 게 첫걸음입니다. 기간은 돈으로 살 수
          없습니다.
        </P>
      </>
    ),
  },
  {
    slug: "deposit",
    quiz: {
      q: "그 밖의 시·군에 살고 공고일에 통장에 300만 원이 있다면, 넣을 수 있는 가장 큰 면적은 무엇인가요?",
      options: ["85㎡ 이하", "102㎡ 이하", "135㎡ 이하"],
      answer: 1,
    },
    title: "민영 예치금",
    body: (
      <>
        <P>
          민영분양은 사는 곳과 넣으려는 집의 전용면적에 따라, 공고일까지 통장에
          이만큼 있어야 합니다.
          <C s={rule("별표 2")} />
        </P>
        <div className="mt-[0.5rlh] overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>사는 곳</th>
                <th className="text-right">85㎡ 이하</th>
                <th className="text-right">102㎡ 이하</th>
                <th className="text-right">135㎡ 이하</th>
                <th className="text-right">모든 면적</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>서울·부산</td>
                <td className="text-right">300만</td>
                <td className="text-right">600만</td>
                <td className="text-right">1,000만</td>
                <td className="text-right">1,500만</td>
              </tr>
              <tr>
                <td>그 밖의 광역시</td>
                <td className="text-right">250만</td>
                <td className="text-right">400만</td>
                <td className="text-right">700만</td>
                <td className="text-right">1,000만</td>
              </tr>
              <tr>
                <td>그 밖의 시·군</td>
                <td className="text-right">200만</td>
                <td className="text-right">300만</td>
                <td className="text-right">400만</td>
                <td className="text-right">500만</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          예치금은 공고일 현재 통장에 그 금액이 있는지만 봅니다.
          <C s={rule("제28조")} />
        </P>
      </>
    ),
  },
  {
    slug: "special",
    quiz: {
      q: "특별공급은 한 세대가 몇 번 당첨될 수 있나요?",
      options: ["원칙적으로 평생 한 번", "1년에 한 번", "제한 없음"],
      answer: 0,
    },
    title: "특별공급과 일반공급",
    body: (
      <>
        <P>한 단지의 집을 두 덩어리로 나눕니다.</P>
        <L
          items={[
            <>
              <strong>특별공급(특공)</strong>: 나라가 먼저 도우려는 사람에게
              따로 떼어 둔 몫입니다. 신혼부부, 생애최초, 신생아, 다자녀, 노부모
              부양, 청년(공공 나눔형·토지임대부) 같은 종류가 있습니다.
              <C s={rule("제35조의3")} />
              <C s={rule("제40조")} />
              <C s={rule("제41조")} />
              <C s={rule("제43조")} />
              <C s={rule("제46조")} />
              <C s={PUBLIC_RULE} />
            </>,
            <>
              <strong>일반공급</strong>: 나머지 몫입니다. 통장 조건만 맞으면
              누구나 넣습니다.
              <C s={rule("제27조")} />
              <C s={rule("제28조")} />
            </>,
          ]}
        />
        <P>
          여기에 누가 짓느냐(민영·공공)까지 나누면 네 가지가 됩니다. 아래 표처럼
          저마다 뽑는 방식이 다릅니다.
        </P>
        <SupplyMap />
        <P>
          특별공급은 한 세대가 원칙적으로 평생 한 번만 당첨될 수 있습니다.
          <C s={rule("제55조")} /> 종류마다 소득과 자산 기준도 따로 있습니다.
          민영은 소득 기준이 특별공급에만 있습니다.
          <C s={rule("제41조")} /> 민영 신혼부부, 생애최초, 신생아 특별공급은
          전용 85㎡ 이하 집에만 있습니다.
          <C s={rule("제35조의3")} />
          <C s={rule("제41조")} />
          <C s={rule("제43조")} />
        </P>
        <P>
          당첨되면 계약하지 않아도 이 한 번을 쓴 것으로 남고, 그 청약통장도 다시
          쓸 수 없습니다.
          <C s={rule("제55조")} />
          <C s={rule("제57조")} />
          <C s={rule("제7조")} />
        </P>
        <p className="mt-[1rlh] text-[1.5rem] leading-snug font-bold">
          들어가 살 집에만 넣으세요.
        </p>
      </>
    ),
  },
  {
    slug: "newlywed",
    quiz: {
      q: "아직 혼인신고를 하지 않은 예비신혼부부가 넣을 수 있는 쪽은 어디인가요?",
      options: ["민영", "공공"],
      answer: 1,
    },
    title: "신혼부부 특별공급",
    body: (
      <>
        <P>
          혼인한 지 7년이 안 된 부부가 넣는 특별공급입니다.
          <C s={rule("제41조")} />
        </P>
        <L
          items={[
            <>
              민영은 혼인신고를 해야 넣을 수 있습니다.
              <C s={rule("제41조")} />
            </>,
            <>
              공공은 결혼할 사이(예비신혼부부)도 넣고, 입주 전까지 혼인신고를
              하면 됩니다. 한부모가족과 6세 이하 자녀를 둔 사람도 넣을 수
              있습니다.
              <C s={PUBLIC_RULE} />
            </>,
          ]}
        />
        <P>
          혼인한 지 7년이 안 됐는지는 공고일을 기준으로 봅니다.
          <C s={rule("제41조")} />
        </P>
        <P>
          부부가 같은 날 발표하는 단지에 각각 넣을 수도 있습니다. 둘 다 당첨되면
          먼저 접수한 사람의 당첨만 인정됩니다.
          <C s={rule("제55조의2")} />
        </P>
        <P>
          민영과 공공 모두 가구 소득으로 물량을 나눕니다. 이건 다음 쪽에서
          봅니다.
          <C s={rule("제41조")} />
          <C s={PUBLIC_RULE} />
        </P>
      </>
    ),
  },
  {
    slug: "income-base",
    quiz: {
      q: "2026년 3인 이하 가구의 도시근로자 월평균소득 100%는 대략 얼마인가요?",
      options: ["월 753만 원", "월 1,000만 원"],
      answer: 0,
    },
    title: "소득 기준",
    body: (
      <>
        <P>
          특별공급의 소득 기준은 <strong>가구 소득</strong>으로 봅니다. 두 사람
          월소득을 더해 "도시근로자 가구당 월평균소득"과 비교한 %입니다.
          <C s={NEWLYWED_GUIDE} />
          <C s={rule("제41조")} />
          <C s={PUBLIC_RULE} />
        </P>
        <P>
          도시근로자 가구당 월평균소득은 국토교통부가 해마다 정합니다.
          <C s={INCOME_ORIGIN} /> 공고일 기준 금액을 쓰니 공고마다 다를 수 있고,
          공고문에 나옵니다. 2026년 금액은 이렇습니다.
          <C s={INCOME_TABLE} />
        </P>
        <IncomeTable />
        <P>
          1명, 2명, 3명은 모두 같은 금액입니다. 3명 이하는 가구원 수로 나누지
          않은 전체 가구 평균을 쓰고, 4명부터 가구원 수별 금액을 씁니다.
          <C s={rule("제43조")} />
          <C s={INCOME_TABLE} />
        </P>
        <P>내 소득을 어떻게 계산하는지는 민영과 공공이 다릅니다.</P>
        <L
          items={[
            <>
              <strong>민영</strong>: 전년도 근로소득 원천징수영수증의 "총급여"
              칸(양식의 21번)을 일한 개월 수로 나눕니다. 원천징수영수증은
              회사에서 받습니다. 신혼부부와 생애최초 특별공급 기준이고, 신생아는
              공고문에서 확인하세요.
              <C s={NEWLYWED_GUIDE} />
              <C s={FIRST_HOME_GUIDE} />
            </>,
            <>
              <strong>공공</strong>: LH 같은 공공기관이 당첨자의 소득을
              사회보장정보시스템으로 직접 조회합니다. 회사에 다니면 건강보험
              보수월액을 먼저 보고, 이 값은 국민건강보험공단 누리집의 직장보험료
              조회에서 볼 수 있습니다. 공고일 뒤에 바뀐 소득이 조회되면 그
              값으로 봅니다.
              <C s={NEWLYWED_GUIDE} />
              <C s={LH_INCOME_CHECK} />
              <C s={NHIS} />
            </>,
          ]}
        />
      </>
    ),
  },
  {
    slug: "income",
    quiz: {
      q: "소득이 낮은 구간에서 떨어지면 어떻게 되나요?",
      options: ["그 공고는 끝입니다", "다음 구간으로 내려가 다시 경쟁합니다"],
      answer: 1,
    },
    title: "신혼부부 소득 구간",
    body: (
      <>
        <P>
          신혼부부 특별공급은 물량을 가구 소득에 따라 구간으로 나눠 뽑습니다.
          맞벌이인지 외벌이인지에 따라 구간 경계가 다릅니다.
          <C s={rule("제41조")} />
          <C s={PUBLIC_RULE} />
        </P>
        <TierChart />
        <P>
          민영 추첨 구간에 소득 상한이 없는 건, 소득이 일반 구간 상한을 넘어도
          가구가 가진 부동산 가액이 기준(건강보험 재산 29등급의 평균 금액)
          이하면 넣을 수 있어서입니다. 생애최초와 신생아도 160%를 넘으면 같은
          기준을 봅니다. 공공은 상한을 넘으면 넣을 수 없습니다.
          <C s={rule("제41조")} />
          <C s={rule("제43조")} />
          <C s={rule("제35조의3")} />
          <C s={PUBLIC_RULE} />
        </P>
        <P>
          소득이 낮은 구간에서 떨어진 사람은 다음 구간으로 내려가 다시
          경쟁합니다. 그래서 소득이 낮을수록 기회가 여러 번입니다.
          <C s={rule("제41조")} />
          <C s={PUBLIC_RULE} />
        </P>
        <TierCascade />
      </>
    ),
  },
  {
    slug: "same-line",
    quiz: {
      q: "공공 신혼부부 특별공급의 우선 구간에서 같은 순위끼리는 어떻게 뽑나요?",
      options: ["점수 순", "추첨"],
      answer: 0,
    },
    title: "같은 구간 안의 순서",
    body: (
      <>
        <P>
          같은 소득 구간 안에서 누가 먼저인지는 민영과 공공이 다릅니다.
          <C s={rule("제41조")} />
          <C s={PUBLIC_RULE} />
        </P>
        <SameLineOrder />
      </>
    ),
  },
  {
    slug: "first-home",
    quiz: {
      q: "생애최초 특별공급은 같은 구간 안에서 어떻게 뽑나요?",
      options: ["추첨", "점수 순"],
      answer: 0,
    },
    title: "생애최초 특별공급",
    body: (
      <>
        <P>
          가구원 모두 집을 가진 적이 없는 사람이 처음 집을 살 때 넣는
          특별공급입니다. 근로자나 자영업자로 5년 이상 소득세를 냈어야 합니다.
          <C s={rule("제43조")} />
          <C s={PUBLIC_RULE} />
        </P>
        <L
          items={[
            <>
              민영은 혼인 중이거나 자녀가 있어야 하지만, 혼자 사는 사람도 전용
              60㎡ 이하 집의 추첨 몫에는 넣을 수 있습니다.
              <C s={rule("제43조")} />
            </>,
            <>
              공공은 혼인 중이거나 자녀가 있어야 하고, 통장에 600만 원 이상
              있어야 합니다.
              <C s={PUBLIC_RULE} />
            </>,
          ]}
        />
        <P>
          신혼부부처럼 소득으로 구간을 나누지만, 같은 구간 안에서는 민영과 공공
          모두 추첨입니다.
          <C s={rule("제43조")} />
          <C s={PUBLIC_RULE} />
        </P>
        <TierChart rows={FIRST_HOME_ROWS} />
      </>
    ),
  },
  {
    slug: "newborn",
    quiz: {
      q: "신생아 특별공급은 혼인한 부부만 넣을 수 있나요?",
      options: ["혼인 여부는 따지지 않습니다", "혼인한 부부만 넣습니다"],
      answer: 0,
    },
    title: "신생아 특별공급",
    body: (
      <>
        <P>
          공고일에 2세 미만 자녀(임신 중이거나 입양한 경우 포함)가 있는 무주택
          가구가 넣는 특별공급입니다. 혼인 여부는 따지지 않습니다.
          <C s={rule("제35조의3")} />
          <C s={PUBLIC_RULE} />
        </P>
        <L
          items={[
            <>
              민영은 같은 구간 안에서 추첨입니다.
              <C s={rule("제35조의3")} />
            </>,
            <>
              공공은 같은 구간 안에서 소득, 자녀 수, 그 지역에 산 기간, 납입
              횟수로 매긴 점수 순입니다.
              <C s={PUBLIC_RULE} />
            </>,
          ]}
        />
        <P>
          소득 구간은 이렇습니다.
          <C s={rule("제35조의3")} />
          <C s={PUBLIC_RULE} />
        </P>
        <TierChart rows={NEWBORN_ROWS} />
      </>
    ),
  },
  {
    slug: "other-special",
    quiz: {
      q: "청년 특별공급이 있는 곳은 어디인가요?",
      options: ["민영", "공공 나눔형·토지임대부", "일반형 공공분양"],
      answer: 1,
    },
    title: "그 밖의 특별공급",
    body: (
      <>
        <L
          items={[
            <>
              <strong>다자녀</strong>: 미성년 자녀(임신 포함)가 2명 이상인
              무주택 가구. 민영은 소득 기준이 없고, 공공은 소득 120% 이하(맞벌이
              200%)입니다. 뽑는 점수표는 공고문에 있습니다.
              <C s={rule("제40조")} />
              <C s={PUBLIC_RULE} />
            </>,
            <>
              <strong>노부모 부양</strong>: 65세 이상 부모(배우자의 부모 포함)를
              3년 이상 같은 주민등록표에 두고 모신 무주택 가구. 민영은 세대주만
              넣고 가점으로 뽑습니다. 공공은 소득 120% 이하(맞벌이 200%)입니다.
              <C s={rule("제46조")} />
              <C s={PUBLIC_RULE} />
            </>,
            <>
              <strong>청년</strong>: 19~39세에 혼인하지 않았고 집을 가진 적이
              없는 사람. 공공 나눔형과 토지임대부에만 있고, 전용 60㎡ 이하 집에
              본인 소득 140% 이하입니다.
              <C s={rule("제35조의2")} />
              <C s={PUBLIC_RULE_SHARED} />
            </>,
          ]}
        />
      </>
    ),
  },
  {
    slug: "regulated",
    quiz: {
      q: "다음 중 규제지역이 아닌 것은 무엇인가요?",
      options: ["투기과열지구", "청약과열지역", "지정되지 않은 수도권 지역"],
      answer: 2,
    },
    title: "규제지역",
    body: (
      <>
        <P>
          <strong>규제지역</strong>은 집값 과열을 막으려고 정부가 지정한
          투기과열지구와 청약과열지역(조정대상지역)입니다.
          <C s={rule("제2조")} />
          <C s={housingAct("제63조", "투기과열지구의 지정")} />
          <C s={housingAct("제63조의2", "조정대상지역의 지정")} />
        </P>
        <P>
          규제지역에서는 청약 조건이 더 까다롭고 대출도 덜 나옵니다. 뒤의 여러
          쪽이 규제지역인지에 따라 달라집니다.
          <C s={rule("제28조")} />
          <C s={LTV_CAP} />
        </P>
      </>
    ),
  },
  {
    slug: "rank",
    quiz: {
      q: "규제지역에서 1순위가 되려면 통장 가입 기간이 얼마나 필요한가요?",
      options: ["6개월", "1년", "2년"],
      answer: 2,
    },
    title: "1순위와 2순위",
    body: (
      <>
        <P>
          일반공급은 1순위부터 받고, 1순위로 집이 다 차면 2순위는 기회가
          없습니다.
          <C s={rule("제27조")} />
          <C s={rule("제28조")} />
        </P>
        <P>1순위가 되려면 대략 이렇습니다.</P>
        <L
          items={[
            <>
              통장 가입 기간: 수도권 밖 6개월, 수도권 1년, 규제지역 2년
              <C s={rule("제27조")} />
              <C s={rule("제28조")} />
            </>,
            <>
              민영은 예치금, 공공은 납입 횟수(수도권 밖 6회, 수도권 12회,
              규제지역 24회)
              <C s={rule("제27조")} />
            </>,
            <>
              규제지역은 세대주(주민등록표의 세대주)여야 하고, 가구가 5년 안에
              당첨된 적이 없어야 합니다. 민영은 가구가 집을 두 채 이상 갖고
              있어도 안 됩니다
              <C s={rule("제27조")} />
              <C s={rule("제28조")} />
            </>,
          ]}
        />
        <P>
          2순위는 1순위 요건을 못 채운 사람입니다.
          <C s={rule("제28조")} />
        </P>
        <P>
          시·도가 기간을 늘려 공고하기도 하니 공고문을 함께 보세요.
          <C s={rule("제27조")} />
          <C s={rule("제28조")} />
        </P>
      </>
    ),
  },
  {
    slug: "points",
    quiz: {
      q: "민영 가점제의 만점은 몇 점인가요?",
      options: ["64점", "84점", "100점"],
      answer: 1,
    },
    title: "민영: 가점제와 추첨제",
    body: (
      <>
        <P>민영 1순위 안에서는 두 방식으로 나눠 뽑습니다.</P>
        <L
          items={[
            <>
              <strong>가점제</strong>: 점수 높은 순. 84점 만점입니다. 무주택
              기간(최대 32점, 만 30세부터 계산합니다. 그 전에 혼인했다면
              혼인신고일부터), 부양가족 수(최대 35점), 통장 가입 기간(최대
              17점)을 더합니다.
              <C s={rule("별표 1")} />
              <C s={rule("제27조")} />
            </>,
            <>
              <strong>추첨제</strong>: 무작위. 추첨 물량의 75%는 집이 없는
              사람에게 먼저 돌아갑니다.
              <C s={rule("제28조")} />
            </>,
          ]}
        />
        <PointsCalc />
        <P>
          투기과열지구라면 집 크기에 따라 가점제와 추첨제 몫이 이렇게 나뉩니다.
          <C s={rule("제28조")} />
        </P>
        <StackBars
          names={["가점제", "추첨제"]}
          rows={[
            { label: "60㎡ 이하", values: [40, 60] },
            { label: "60~85㎡", values: [70, 30] },
            { label: "85㎡ 초과", values: [80, 20] },
          ]}
          caption="전용면적 기준입니다. 그 밖의 지역은 시·군·구가 정해 공고합니다."
        />
      </>
    ),
  },
  {
    slug: "public-order",
    quiz: {
      q: "일반형 공공분양의 일반공급에서 물량의 절반을 먼저 받는 가구는 어디인가요?",
      options: ["2세 미만 자녀가 있는 가구", "저축총액이 가장 많은 가구"],
      answer: 0,
    },
    title: "공공: 순차와 추첨",
    body: (
      <>
        <P>
          일반형 공공분양의 일반공급은 점수 대신 물량을 셋으로 나눠 뽑습니다.
          <C s={PUBLIC_RULE} />
        </P>
        <StackBars
          names={[
            "2세 미만 자녀가 있는 가구 먼저",
            "1순위끼리 순서대로",
            "남은 사람끼리 추첨",
          ]}
          rows={[{ label: "", values: [50, 30, 20] }]}
        />
        <P>
          앞 몫에서 떨어진 사람은 다음 몫으로 내려가 다시 경쟁합니다. 자녀
          몫에서 떨어지면 순서 몫으로, 순서 몫에서 떨어지면 추첨으로 갑니다.
          <C s={PUBLIC_RULE} />
        </P>
        <P>
          30% 몫의 순서는 집 크기에 따라 다릅니다.
          <C s={rule("제27조")} />
        </P>
        <L
          items={[
            "전용 40㎡ 초과: 무주택 3년 이상인 사람 중 통장에 모은 돈(저축총액)이 많은 순, 그다음 저축총액이 많은 순",
            "전용 40㎡ 이하: 무주택 3년 이상인 사람 중 납입 횟수가 많은 순, 그다음 납입 횟수가 많은 순",
            "저축총액이나 납입 횟수가 같으면 추첨",
          ]}
        />
        <P>
          무주택 기간은 만 30세가 되는 날부터 계산합니다. 그 전에 혼인했다면
          혼인신고일부터입니다.
          <C s={rule("제27조")} /> 전용 60㎡ 이하 집은 자녀 몫과 순서 몫에 소득
          기준도 붙습니다.
          <C s={PUBLIC_RULE} />
        </P>
      </>
    ),
  },
  {
    slug: "account-time",
    quiz: {
      q: "매달 10만 원 내는 통장에 목돈 600만 원을 한 번에 넣으면, 선납으로 인정되는 회차는 몇 회인가요?",
      options: ["24회", "60회"],
      answer: 0,
    },
    title: "선납과 연체",
    body: (
      <>
        <P>
          통장의 회차와 저축총액은 넣은 돈이 아니라 지난 달만큼 쌓입니다. 미리
          내거나 많이 넣어도 앞당겨지지 않고, 늦게 내면 뒤로 밀립니다.
          <C s={rule("제10조")} />
        </P>
        <L
          items={[
            <>
              <strong>미리 내기(선납)</strong>: 앞으로 낼 돈을 한 번에 넣을 수
              있지만, 미리 낸 것으로 쳐 주는 건 24회분까지입니다. 그리고
              인정되는 횟수는 가입한 날부터 공고일까지 지난 달 수를 넘지
              못합니다. 가입한 지 1년 된 통장에 2년 치를 미리 넣어도 1년 치만
              셉니다.
              <C s={rule("제10조")} />
            </>,
            <>
              <strong>늦게 내기(연체)</strong>: 밀린 돈을 나중에 내면 회차마다
              인정일이 "약정납입일 + (연체총일수 − 선납총일수) ÷ 납입횟수"로
              뒤로 밀립니다.
              <C s={rule("제10조")} />
            </>,
            <>
              <strong>많이 넣기</strong>: 공공분양이 보는 저축총액은 한 달에
              25만 원까지만 인정합니다. 더 넣어도 저축총액은 빨리 늘지 않습니다.
              <C s={rule("제10조")} />
            </>,
          ]}
        />
        <P>두 경우를 골라 계산해 보세요.</P>
        <PrepayCalc />
      </>
    ),
  },
  {
    slug: "local",
    quiz: {
      q: "투기과열지구에서 해당지역으로 쳐 주려면 그 지역에 얼마나 살아야 하나요?",
      options: ["6개월", "1년", "2년 이상"],
      answer: 2,
    },
    title: "해당지역 우선",
    body: (
      <>
        <P>
          같은 순위라면 공고가 난 시·군에 사는 사람(해당지역)이 먼저 뽑힙니다.
          해당지역에서 다 안 차야 다른 지역 사람에게 기회가 갑니다.
          <C s={rule("제4조")} />
          <C s={rule("제25조")} />
        </P>
        <P>
          다른 지역 사람끼리는 해당지역 안에서와 같은 방식(민영은 가점제·추첨제,
          공공은 순차)으로 뽑습니다. 순위가 먼저라, 다른 지역 1순위가 해당지역
          2순위보다 앞섭니다. 다른 지역 사람도 같은 권역(수도권처럼 규칙이 묶어
          둔 시·도)에 살아야 넣을 수 있습니다.
          <C s={rule("제25조")} />
          <C s={rule("제27조")} />
          <C s={rule("제28조")} />
          <C s={rule("제4조")} />
        </P>
        <P>
          투기과열지구는 그 지역에 2년 이상 살아야 해당지역으로 쳐 줍니다.
          <C s={rule("제4조")} /> 이사 온 지 얼마 안 됐다면 전입일을 기억해
          두세요.
        </P>
        <P>
          수도권의 큰 택지개발지구(66만㎡ 이상)는 몫을 나눠 먼저 줍니다.
          <C s={rule("제34조")} />
        </P>
        <StackBars
          names={[
            "그 시에 사는 사람",
            "경기도에 사는 사람",
            "나머지(공고문이 정함)",
          ]}
          rows={[
            { label: "서울·인천", values: [50, 0, 50] },
            { label: "경기", values: [30, 20, 50] },
          ]}
        />
        <P>나머지 몫을 누가 받는지는 공고문에 있습니다.</P>
      </>
    ),
  },
  {
    slug: "schedule",
    quiz: {
      q: "특별공급과 일반공급 중 먼저 접수하는 것은 어느 쪽인가요?",
      options: ["특별공급", "일반공급"],
      answer: 0,
    },
    title: "공고부터 입주까지",
    body: (
      <>
        <L
          items={[
            <>
              <strong>공고</strong>: 단지 정보, 분양가, 물량, 자격이 공개됩니다.
            </>,
            <>
              <strong>특별공급 접수</strong>: 일반공급보다 먼저 받습니다.
            </>,
            <>
              <strong>1순위, 2순위 접수</strong>: 그다음에 1순위, 2순위 차례로
              받습니다.
            </>,
            <>
              <strong>당첨 발표</strong>: 청약홈에서 확인합니다.
              <C s={APPLYHOME} />
            </>,
            <>
              <strong>서류 제출과 계약</strong>: 계약금을 냅니다. 분양가의 20%
              안입니다.
              <C s={rule("제60조")} />
            </>,
            <>
              <strong>중도금</strong>: 짓는 동안 몇 번에 나눠 냅니다. 분양가의
              60% 안이고, 계약금이 10% 이하면 70% 안입니다.
              <C s={rule("제60조")} />
            </>,
            <>
              <strong>입주와 잔금</strong>: 나머지를 내고 들어갑니다.
              <C s={rule("제60조")} />
            </>,
          ]}
        />
        <ScheduleExample />
        <P>
          날짜는 공고마다 다르니 공고문의 일정표를 확인하세요. 미리 조건을 정해
          두고 알림을 받으면 공고를 놓치지 않습니다. 이 서비스가 하려는 일이
          그것입니다.
        </P>
      </>
    ),
  },
  {
    slug: "money",
    quiz: {
      q: "받을 수 있는 대출은 어떻게 정해지나요?",
      options: ["LTV와 금액 상한 중 작은 쪽", "LTV와 금액 상한 중 큰 쪽"],
      answer: 0,
    },
    title: "필요한 내 돈",
    body: (
      <>
        <P>
          중도금과 잔금을 대출로 낸다면, 결국 필요한 내 돈은 대략 이렇습니다.
        </P>
        <p className="mt-[0.5rlh] font-bold">
          필요한 내 돈 = 분양가 − 받을 수 있는 대출
        </p>
        <MoneyCalc />
        <P>
          받을 수 있는 대출은 집값의 몇 %(LTV)와 금액 상한 중 작은 쪽입니다.
          생애 처음 사는 집이면 LTV 70%,
          <C s={LTV_FIRST} /> 규제지역 15억 이하 집은 상한 6억 같은 식입니다.
          <C s={LTV_CAP} /> 대출 규제는 자주 바뀌어서 이 서비스는 돈으로 공고를
          거르지 않습니다.
        </P>
        <P>
          취득세, 발코니 확장, 옵션, 이사 비용은 따로 듭니다. 그리고 계약금은
          계약할 때 내야 하니 당장 쓸 현금이 따로 있어야 합니다.
        </P>
      </>
    ),
  },
  {
    slug: "leftover",
    quiz: {
      q: "무순위 청약에 필요한 것은 무엇인가요?",
      options: ["청약통장 1순위", "무주택", "가점 60점 이상"],
      answer: 1,
    },
    title: "무순위와 임의공급",
    body: (
      <>
        <P>
          특별공급과 일반공급이 끝나도 집이 남을 때가 있습니다. 당첨됐는데
          자격이 안 돼 취소되거나(부적격), 계약을 포기한 집입니다.
        </P>
        <L
          items={[
            <>
              <strong>무순위(잔여세대)</strong>: 통장도 순위도 없이 추첨으로
              다시 팝니다.
              <C s={rule("제19조")} /> 흔히 "줍줍"이라고 부릅니다. 무주택이어야
              하고, 지역 조건은 공고문이 정합니다.
              <C s={rule("제26조")} />
              <C s={NO_RANK_2025} />
            </>,
            <>
              <strong>임의공급</strong>: 그래도 남은 걸 짓는 회사가 선착순이나
              자체 추첨으로 팝니다.
              <C s={rule("제26조")} />
              <C s={rule("제28조")} />
            </>,
          ]}
        />
      </>
    ),
  },
  {
    slug: "after",
    quiz: {
      q: "당첨된 뒤 계약을 포기하면 당첨 이력은 어떻게 되나요?",
      options: ["사라집니다", "남습니다"],
      answer: 1,
    },
    title: "당첨 뒤 제한",
    body: (
      <>
        <L
          items={[
            <>
              <strong>재당첨 제한</strong>: 당첨되면 몇 년 동안 다른 청약에
              당첨될 수 없습니다. 투기과열지구는 10년입니다. 계약을 포기해도
              당첨 이력은 남습니다.
              <C s={rule("제54조")} />
              <C s={WIN_LIMIT_GUIDE} />
            </>,
            <>
              <strong>부적격 당첨</strong>: 자격을 잘못 알고 넣어 당첨되면
              취소되고, 한동안 청약을 못 합니다.
              <C s={rule("제58조")} /> 넣기 전에 공고문의 자격을 꼭 확인하세요.
            </>,
            <>
              <strong>전매 제한</strong>: 일정 기간 분양권이나 집을 팔 수
              없습니다.
              <C s={housingAct("제64조", "전매행위 제한")} />
            </>,
            <>
              <strong>실거주 의무</strong>: 분양가상한제(분양가를 정해진 상한
              안에서만 받게 하는 제도) 단지는 직접 들어가 살아야 하는 기간이
              있습니다.
              <C s={housingAct("제57조", "주택의 분양가격 제한")} />
              <C s={housingAct("제57조의2", "거주의무")} />
            </>,
          ]}
        />
        <P>그래서 아무 데나 넣지 않고, 정말 살 곳에만 넣는 게 좋습니다.</P>
      </>
    ),
  },
  {
    slug: "where",
    quiz: {
      q: "한 공고의 규칙 원본은 무엇인가요?",
      options: ["청약홈 공지사항", "입주자모집공고문", "이 서비스의 설명"],
      answer: 1,
    },
    title: "공고 보는 곳",
    body: (
      <>
        <P>
          청약 공고는 <strong>청약홈</strong>(applyhome.co.kr)에 올라오고 접수도
          거기서 합니다.
          <C s={APPLYHOME} />
          <C s={rule("제50조")} /> 무순위도 법이 정한 횟수까지는 청약홈으로
          받습니다.
          <C s={rule("제19조")} />
        </P>
        <P>
          LH 같은 공공기관은 남은 집을 직접 팔 수 있어서, LH가 직접 파는
          잔여세대는 <strong>LH 청약플러스</strong>에 따로 올라옵니다.
          <C s={rule("제50조")} />
          <C s={LH_PLUS} />
        </P>
        <P>
          공고마다 <strong>입주자모집공고문</strong>이 있고, 그 문서가 그 공고의
          규칙 원본입니다.
          <C s={rule("제21조")} /> 이 서비스의 설명과 판정은 공고문을 읽기 전에
          감을 잡는 용도입니다.
        </P>
        <P>
          이 서비스는 청약홈의 공고와, LH 잔여세대를 싣는 마이홈(myhome.go.kr)의
          공고를 매시간 모아 보여 줍니다.
        </P>
      </>
    ),
  },
  {
    slug: "use",
    title: "청약 알리미 쓰는 법",
    body: (
      <>
        <L
          items={[
            <>
              <a href="/settings">개인화</a>에서 지역, 가구, 통장, 소득을
              넣습니다. 모르는 건 비워 둬도 됩니다.
            </>,
            <>
              <a href="/">공고</a>에서 후보를 봅니다. 후보는 고른 지역 안에서
              자산 기준에 걸리지 않는 공고입니다.
            </>,
            "공고를 누르면 누가 어떤 공급에 넣을 수 있는지, 넣으면 어느 소득 구간에 드는지 나옵니다.",
            "지도 링크로 위치와 출퇴근 길을 보고, 공고문으로 자격을 확인한 뒤 청약홈에서 접수합니다.",
            "넣은 답은 이 브라우저에만 저장됩니다. 다른 브라우저에서 쓰려면 개인화 화면에서 내보내고 가져옵니다.",
          ]}
        />
        <P>
          규칙은 자주 바뀝니다. 이 설명은 2026년 10월 기준이고, 공고문이 언제나
          정답입니다.
        </P>
      </>
    ),
  },
];

// /guide 는 목차, /guide/<slug> 는 그 쪽. 없는 쪽이면 목차로. 쪽 맨 위의 "목록"(개인화 질문의 "뒤로"와 같은 자리)이 목차로 간다.
/** 고른 쪽들을 가이드 순서대로. 공고 상세의 "관련 가이드"가 쓴다. */
export const guidePages = (slugs: string[]) =>
  PAGES.filter((p) => slugs.includes(p.slug)).map(({ slug, title }) => ({
    slug,
    title,
  }));

export function Guide({ slug }: { slug?: string }) {
  const i = PAGES.findIndex((p) => p.slug === slug);
  const page = PAGES[i];
  return page ? <GuidePage page={page} i={i} /> : <Contents />;
}

// 쪽 위치: 한 칸이면 "민영 · 일반공급", 민영·공공 두 칸에 걸치면 "특별공급"처럼 열 이름만.

function GuidePage({ page, i }: { page: Page; i: number }) {
  const sources = collectSources(page.body);
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  return (
    <article>
      <a href="/guide" className="inline-flex items-center gap-1">
        <ArrowLeft {...ic} />
        목록
      </a>
      <div className="mt-[1rlh]">
        <Progress at={i + 1} of={PAGES.length} label="가이드 진행" />
      </div>
      <h1 className="mt-[1rlh]">{page.title}</h1>
      <div className="mt-[1rlh]">{page.body}</div>
      {page.quiz && <Quiz key={page.slug} quiz={page.quiz} />}
      {sources.length > 0 && (
        <section
          className="text-muted-foreground mt-[2rlh] text-base"
          aria-label="출처"
        >
          <p>출처</p>
          <ul className="list">
            {sources.map((s) => (
              <li key={s.href + s.label}>
                <a href={s.href} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <nav
        className="mt-[2rlh] flex flex-wrap justify-between gap-x-8 gap-y-[0.5rlh] border-t pt-[0.5rlh]"
        aria-label="앞뒤 페이지"
      >
        {prev ? (
          <a
            href={`/guide/${prev.slug}`}
            className="inline-flex items-center gap-1"
          >
            <ArrowLeft {...ic} />
            {prev.title}
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a
            href={`/guide/${next.slug}`}
            className="inline-flex items-center gap-1 font-bold"
          >
            다음: {next.title}
            <ArrowRight {...ic} />
          </a>
        ) : (
          <a href="/settings" className="font-bold">
            개인화하러 가기
          </a>
        )}
      </nav>
    </article>
  );
}

// 목차의 구역. 각 구역은 start 쪽부터 다음 구역 앞까지다. 특별공급·일반공급은 지도(SupplyMap)의 두 열이라
// 넓은 화면에선 나란히 둔다. 민영·공공은 대부분 한 쪽 안에서 함께 다뤄 구역으로 나누지 않는다.
const PARTS = [
  { start: "what", title: "기초" },
  { start: "newlywed", title: "특별공급" },
  { start: "regulated", title: "일반공급" },
  { start: "schedule", title: "청약 신청" },
];
const GROUPS = PARTS.map((part, k) => {
  const from = PAGES.findIndex((p) => p.slug === part.start);
  const next = PARTS[k + 1];
  const to = next
    ? PAGES.findIndex((p) => p.slug === next.start)
    : PAGES.length;
  if (from < 0 || to < 0)
    throw new Error(`목차 구역의 쪽이 없음: ${part.start}`);
  return { title: part.title, from, pages: PAGES.slice(from, to) };
});

function Contents() {
  const section = (g: (typeof GROUPS)[number]) => (
    <section key={g.title} className="mt-[2rlh]">
      <h2 className="mb-[0.5rlh]">{g.title}</h2>
      <ol className="space-y-[0.25rlh]">
        {g.pages.map((p, i) => (
          <li key={p.slug} className="flex gap-3">
            <span className="meta w-[2ch] shrink-0 text-right">
              {g.from + i + 1}
            </span>
            <a href={`/guide/${p.slug}`}>{p.title}</a>
          </li>
        ))}
      </ol>
    </section>
  );
  return (
    <>
      <h1>가이드</h1>
      {GROUPS.slice(0, 1).map(section)}
      <div className="grid gap-x-8 sm:grid-cols-2">
        {GROUPS.slice(1, 3).map(section)}
      </div>
      {GROUPS.slice(3).map(section)}
    </>
  );
}
