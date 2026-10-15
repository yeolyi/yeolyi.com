import { fmtDate } from "@shared/dates.ts";
import {
  AREA_NAMES,
  emptyPerson,
  type NumericSetting,
  type Person,
  SETTINGS_LIMITS,
  type Settings,
} from "@shared/types.ts";
import DateInput, { isRealDate } from "@yeolyi/ui/DateInput";
import Input from "@yeolyi/ui/Input";
import RadioGroup from "@yeolyi/ui/RadioGroup";
import { Select } from "@yeolyi/ui/Select";
import type { ReactNode } from "react";
import { SIGUNGU } from "./sigungu.ts";

// 설정을 질문 하나씩으로 쪼갠 것(GOV.UK "한 페이지에 한 가지"). 요약 페이지와 질문 페이지가 이 목록 하나를 같이 본다.
// 질문 하나 = id · 묻는 말(페이지 제목) · 요약 줄 라벨 · 입력 · 요약에 보일 답. 입력은 초안(Settings)을 바꾸고, 저장은 페이지가 "계속"에서 한다.

export type Draft = {
  d: Settings;
  set: (d: Settings) => void;
  inputId: string;
};
export type Step = {
  id: string;
  group: string; // 요약 페이지의 묶음 제목
  label: string; // 요약 줄의 짧은 이름
  question: string; // 질문 페이지의 제목
  hint?: ReactNode;
  input: (x: Draft) => ReactNode;
  answer: (s: Settings) => string;
  /** 계산 가정. 처음 차례대로 물을 때는 건너뛰고 요약에서만 바꾼다. */
  assumption?: boolean;
  /** 넘어가기 전에 확인. 문제가 있으면 문장으로 돌려준다. */
  check?: (s: Settings) => string | undefined;
};

const PERSON_LABEL = ["나", "배우자"] as const;
const NOT_YET = "아직 안 넣음";
const won = (man: number) =>
  man >= 10000 ? `${man / 10000}억` : `${man.toLocaleString()}만 원`;
const dateText = (ymd: string) =>
  ymd ? `${ymd.slice(0, 4)}년 ${fmtDate(ymd)}` : "";
// 날짜 칸은 비워 둘 수 있지만, 넣었다면 실제 있는 날짜여야 한다.
const dateProblem = (ymd: string) =>
  ymd && !isRealDate(ymd)
    ? "실제 있는 날짜를 연도, 월, 일에 넣으세요. 예: 1995 3 12"
    : undefined;

function numberStep(
  key: NumericSetting,
  o: Omit<Step, "input" | "answer" | "check"> & {
    unit: string;
    fmt?: (v: number) => string;
  },
): Step {
  const [min, max] = SETTINGS_LIMITS[key];
  return {
    ...o,
    input: ({ d, set, inputId }) => (
      <span className="inline-flex items-center gap-2">
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          step="any"
          min={min}
          max={max}
          value={d[key] === null || Number.isNaN(d[key]) ? "" : d[key]}
          onChange={(e) => {
            const v = e.target.valueAsNumber;
            set({ ...d, [key]: Number.isNaN(v) ? null : v });
          }}
          className="min-w-[10ch]"
        />
        {o.unit}
      </span>
    ),
    // 비워 둘 수 있다(모르면 그 값으로 거르지 않는다). 넣었다면 범위 안이어야 한다.
    answer: (s) => {
      const v = s[key];
      if (v === null) return NOT_YET;
      return o.fmt ? o.fmt(v) : `${v}${o.unit}`;
    },
    check: (s) => {
      const v = s[key];
      return v !== null && (Number.isNaN(v) || v < min || v > max)
        ? `${min}에서 ${max} 사이로 넣으세요`
        : undefined;
    },
  };
}

function personSteps(i: 0 | 1): Step[] {
  const who = PERSON_LABEL[i];
  const group = i === 0 ? "나" : "배우자";
  const p = (s: Settings): Person => s.people[i] ?? emptyPerson(who);
  const setP = (d: Settings, np: Partial<Person>) =>
    d.people.map((x, j) => (j === i ? { ...x, ...np } : x));
  const date =
    (k: "birth" | "movedInAt" | "accountOpenedAt") =>
    ({ d, set, inputId }: Draft) => (
      <DateInput
        id={inputId}
        autoComplete={k === "birth" ? "bday" : undefined}
        value={p(d)[k]}
        onChange={(v) => set({ ...d, people: setP(d, { [k]: v }) })}
      />
    );
  const subject = i === 0 ? "" : "배우자가 ";
  return [
    {
      id: `p${i}-birth`,
      group,
      label: "생년월일",
      question:
        i === 0 ? "생년월일이 언제인가요?" : "배우자의 생년월일이 언제인가요?",
      hint: "민영 가점의 무주택 기간은 만 30세부터 계산합니다.",
      input: date("birth"),
      check: (s) => dateProblem(p(s).birth),
      answer: (s) => dateText(p(s).birth),
    },
    {
      id: `p${i}-home`,
      group,
      label: "사는 곳",
      question: i === 0 ? "어디에 사나요?" : "배우자는 어디에 사나요?",
      hint: "주민등록상 주소입니다. 넣을 수 있는 공고는 사는 곳의 권역(수도권처럼 묶인 시도)으로 정해지고, 공고가 난 시·군에 살면 먼저 뽑힙니다. 확인: 주민등록표 등본(정부24나 카카오톡 지갑의 전자증명서에서 발급).",
      input: ({ d, set }) => (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="시도"
            value={p(d).sido || undefined}
            placeholder="시도"
            // 시도를 바꾸면 그 안에 없는 시군구는 지운다.
            onValueChange={(v) =>
              set({
                ...d,
                people: setP(d, {
                  sido: v,
                  sigungu: SIGUNGU[v]?.includes(p(d).sigungu)
                    ? p(d).sigungu
                    : "",
                }),
              })
            }
            options={AREA_NAMES.map((a) => ({ value: a, label: a }))}
          />
          <Select
            aria-label="시군구"
            value={p(d).sigungu || undefined}
            placeholder="시군구"
            disabled={!p(d).sido}
            onValueChange={(v) =>
              set({ ...d, people: setP(d, { sigungu: v }) })
            }
            options={(SIGUNGU[p(d).sido] ?? []).map((g) => ({
              value: g,
              label: g,
            }))}
          />
        </div>
      ),
      check: (s) =>
        p(s).sido && !p(s).sigungu ? "시군구를 고르세요" : undefined,
      answer: (s) => [p(s).sido, p(s).sigungu].filter(Boolean).join(" "),
    },
    {
      id: `p${i}-moved`,
      group,
      label: "전입일",
      question: `${subject}지금 주소로 언제 전입했나요?`.trim(),
      hint: "투기과열지구는 그 지역에 2년 넘게 살아야 지역 우선을 받습니다. 확인: 주민등록표 등본의 전입일.",
      input: date("movedInAt"),
      check: (s) => dateProblem(p(s).movedInAt),
      answer: (s) => dateText(p(s).movedInAt),
    },
    {
      id: `p${i}-householder`,
      group,
      label: "세대주",
      question: i === 0 ? "세대주인가요?" : "배우자가 세대주인가요?",
      hint: "주민등록표 등본 맨 위의 사람입니다. 규제지역 1순위는 세대주만 됩니다.",
      input: ({ d, set }) => (
        <RadioGroup
          aria-label="세대주"
          value={p(d).householder ? "y" : "n"}
          onValueChange={(v) =>
            set({ ...d, people: setP(d, { householder: v === "y" }) })
          }
          options={[
            { value: "y", label: "예" },
            { value: "n", label: "아니요" },
          ]}
        />
      ),
      answer: (s) => (p(s).householder ? "예" : "아니요"),
    },
    {
      id: `p${i}-account`,
      group,
      label: "청약통장 가입일",
      question: `${subject}청약통장을 언제 만들었나요?`.trim(),
      hint: "주택청약종합저축 가입일. 통장이 없으면 비워 두세요. 확인: 청약홈이나 통장을 만든 은행에서 받는 청약통장 순위확인서.",
      input: date("accountOpenedAt"),
      check: (s) => dateProblem(p(s).accountOpenedAt),
      answer: (s) => dateText(p(s).accountOpenedAt) || "없음",
    },
    {
      id: `p${i}-count`,
      group,
      label: "납입 회차",
      question:
        i === 0
          ? "청약통장에 몇 번 넣었나요?"
          : "배우자는 청약통장에 몇 번 넣었나요?",
      hint: "공공분양은 이 횟수를 봅니다. 확인: 청약통장 순위확인서나 은행 앱의 납입 인정 회차.",
      input: ({ d, set, inputId }) => (
        <span className="inline-flex items-center gap-2">
          <Input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={0}
            value={p(d).accountCount}
            onChange={(e) =>
              set({
                ...d,
                people: setP(d, { accountCount: e.target.valueAsNumber || 0 }),
              })
            }
            className="min-w-[10ch]"
          />
          회
        </span>
      ),
      answer: (s) => `${p(s).accountCount}회`,
    },
    {
      id: `p${i}-paid`,
      group,
      label: "납입 총액",
      question:
        i === 0
          ? "청약통장에 모두 얼마를 넣었나요?"
          : "배우자는 청약통장에 모두 얼마를 넣었나요?",
      hint: "민영분양은 이 금액(예치금)을 봅니다. 확인: 청약통장 순위확인서나 은행 앱의 납입 인정 금액.",
      input: ({ d, set, inputId }) => (
        <span className="inline-flex items-center gap-2">
          <Input
            id={inputId}
            type="number"
            inputMode="numeric"
            min={0}
            value={p(d).accountPaidMan}
            onChange={(e) =>
              set({
                ...d,
                people: setP(d, {
                  accountPaidMan: e.target.valueAsNumber || 0,
                }),
              })
            }
            className="min-w-[10ch]"
          />
          만 원
        </span>
      ),
      answer: (s) => won(p(s).accountPaidMan),
    },
  ];
}

const STEPS_BEFORE_PEOPLE: [Step, ...Step[]] = [
  {
    id: "household",
    group: "가구",
    label: "함께 신청하는 사람",
    question: "누구와 함께 신청하나요?",
    hint: "배우자나 결혼할 사람이 있으면 두 사람 모두 따져 보고, 특별공급은 더 유리한 사람을 추천합니다.",
    input: ({ d, set }) => (
      <RadioGroup
        aria-label="함께 신청하는 사람"
        orientation="vertical"
        value={d.people.length > 1 ? "two" : "one"}
        onValueChange={(v) => {
          const [me = emptyPerson("나"), partner = emptyPerson("배우자")] =
            d.people;
          set({ ...d, people: v === "two" ? [me, partner] : [me] });
        }}
        options={[
          { value: "one", label: "혼자" },
          { value: "two", label: "배우자 또는 결혼할 사람과 함께" },
        ]}
      />
    ),
    answer: (s) =>
      s.people.length > 1 ? "배우자 또는 결혼할 사람과 함께" : "혼자",
  },
  {
    id: "married",
    group: "가구",
    label: "혼인신고일",
    question: "혼인신고를 했나요?",
    hint: "민영 신혼부부 특별공급은 혼인신고를 해야 넣을 수 있고, 공공은 결혼할 사이(예비신혼)도 됩니다. 확인: 혼인관계증명서(정부24나 카카오톡 지갑의 전자증명서에서 발급).",
    input: ({ d, set, inputId }) => (
      <div className="space-y-[0.5rlh]">
        <RadioGroup
          aria-label="혼인신고"
          orientation="vertical"
          value={d.marriedAt ? "y" : "n"}
          onValueChange={(v) =>
            set({
              ...d,
              marriedAt:
                v === "y"
                  ? d.marriedAt || new Date().toISOString().slice(0, 10)
                  : "",
            })
          }
          options={[
            { value: "y", label: "예" },
            { value: "n", label: "아니요" },
          ]}
        />
        {d.marriedAt && (
          <div className="border-foreground border-l-2 pl-4">
            <label htmlFor={inputId} className="block">
              신고한 날
            </label>
            <DateInput
              id={inputId}
              aria-label="신고한 날"
              value={d.marriedAt}
              onChange={(v) => set({ ...d, marriedAt: v })}
              className="mt-1"
            />
          </div>
        )}
      </div>
    ),
    answer: (s) => (s.marriedAt ? dateText(s.marriedAt) : "아직 안 함"),
    check: (s) => dateProblem(s.marriedAt),
  },
  numberStep("children", {
    id: "children",
    group: "가구",
    label: "자녀",
    question: "혼인 중에 낳거나 임신·입양한 자녀가 몇 명인가요?",
    hint: "신혼부부 특별공급은 자녀가 있으면 1순위입니다. 없으면 0.",
    unit: "명",
  }),
];

const STEPS_AFTER_PEOPLE: Step[] = [
  numberStep("totalAssetsEok", {
    id: "assets",
    group: "소득과 자산",
    label: "총자산",
    question: "가구의 총자산은 얼마인가요?",
    hint: "부동산 + 자동차 + 금융자산 + 전세보증금 − 부채. 공공 나눔형·선택형·토지임대부·신혼희망타운은 3.62억 이하만 넣을 수 있습니다. 모르면 비워 두세요. 확인: 부동산은 공시가격, 자동차는 보험개발원 차량기준가액.",
    unit: "억",
  }),
  numberStep("incomeMan", {
    id: "income",
    group: "소득과 자산",
    label: "월소득",
    question: "가구의 한 달 소득은 세전으로 얼마인가요?",
    hint: "함께 신청하는 사람 모두의 건강보험 보수월액을 더한 것(확인: 국민건강보험공단 홈페이지의 보험료조회 → 직장보험료 조회). 특별공급은 이 소득으로 구간을 나눕니다. 모르면 비워 두세요. 부모님 등 다른 가구원이 함께 살면 공고문의 소득 기준표로 확인하세요.",
    unit: "만 원",
    fmt: (v) => won(v),
  }),
];

/** 둘이 함께 신청할 때만 묻는다. 혼자면 외벌이다. */
const DUAL_INCOME_STEP: Step = {
  id: "dualincome",
  group: "소득과 자산",
  label: "맞벌이",
  question: "두 사람 모두 소득이 있나요?",
  hint: "근로소득이나 사업소득이 둘 다 있으면 맞벌이입니다. 특별공급 소득 구간의 경계가 달라집니다.",
  input: ({ d, set }) => (
    <RadioGroup
      aria-label="맞벌이"
      value={d.dualIncome === null ? "" : d.dualIncome ? "y" : "n"}
      onValueChange={(v) => set({ ...d, dualIncome: v === "y" })}
      options={[
        { value: "y", label: "예, 맞벌이" },
        { value: "n", label: "아니요, 한 명만" },
      ]}
    />
  ),
  answer: (s) =>
    s.dualIncome === null ? NOT_YET : s.dualIncome ? "맞벌이" : "외벌이",
};

/** 지금 설정에 맞는 질문 목록. 혼자면 배우자 질문과 맞벌이 질문이 빠진다. */
export const stepsFor = (s: Settings): [Step, ...Step[]] => [
  ...STEPS_BEFORE_PEOPLE,
  ...personSteps(0),
  ...(s.people.length > 1 ? personSteps(1) : []),
  ...STEPS_AFTER_PEOPLE.flatMap((st) =>
    st.id === "income" && s.people.length > 1 ? [st, DUAL_INCOME_STEP] : [st],
  ),
];
