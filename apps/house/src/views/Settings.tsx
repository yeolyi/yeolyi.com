import { DEFAULT_SETTINGS, type Settings } from "@shared/types.ts";
import Button from "@yeolyi/ui/Button";
import { uniq } from "es-toolkit";
import { ArrowLeft } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Progress } from "../components/Progress.tsx";
import {
  exportSettings,
  parseSettings,
  useClearSettings,
  useSaveSettings,
} from "../data.ts";
import { type Step, stepsFor } from "../settings/steps.tsx";
import { go, ic } from "../util.ts";

// 설정은 GOV.UK 식으로: /settings 는 답을 모아 보는 요약(바꾸기 링크), /settings/<질문> 은 한 페이지에 질문 하나.
// 처음엔 질문을 차례로 넘기고(계산 가정은 건너뜀), 요약에서 들어온 질문은 저장하면 요약으로 돌아간다.

export const isFresh = (s: Settings) =>
  JSON.stringify(s) === JSON.stringify(DEFAULT_SETTINGS);

export function SettingsView({
  settings,
  stepId,
  query,
}: {
  settings: Settings;
  stepId?: string;
  query: URLSearchParams;
}) {
  if (stepId)
    return (
      <Question
        key={stepId}
        settings={settings}
        stepId={stepId}
        fromSummary={query.get("then") === "summary"}
        back={query.get("back") ?? undefined}
      />
    );
  return <Summary settings={settings} />;
}

function Question({
  settings,
  stepId,
  fromSummary,
  back,
}: {
  settings: Settings;
  stepId: string;
  fromSummary: boolean;
  /** 다른 화면(공고 상세)에서 질문 하나만 고치러 왔으면 그 경로. 저장하면 거기로 돌아간다. */
  back?: string;
}) {
  const save = useSaveSettings();
  const [d, setD] = useState(settings);
  const [error, setError] = useState<string>();
  const inputId = useId();
  const steps = stepsFor(d);
  const walk = steps.filter((s) => !s.assumption);
  const step = steps.find((s) => s.id === stepId);
  useEffect(() => {
    document.getElementById(inputId)?.focus({ preventScroll: true });
  }, [inputId]);
  if (!step)
    return (
      <p>
        없는 질문입니다. <a href="/settings">개인화</a>
      </p>
    );
  const i = walk.indexOf(step);
  const returnTo = back?.startsWith("/") ? back.slice(1) : undefined;
  const alone = fromSummary || step.assumption || !!returnTo;
  const prevStep = alone ? undefined : walk[i - 1];
  const nextStep = alone ? undefined : walk[i + 1];
  const prev = returnTo ?? (prevStep ? `settings/${prevStep.id}` : "settings");
  const next = returnTo ?? (nextStep ? `settings/${nextStep.id}` : "settings");

  const submit = async () => {
    const problem = step.check?.(d);
    if (problem) return setError(problem);
    await save.mutateAsync(d);
    go(next);
  };
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <a href={`/${prev}`} className="inline-flex items-center gap-1">
        <ArrowLeft {...ic} />
        뒤로
      </a>
      {!alone && (
        <div className="mt-[1rlh]">
          <Progress at={i + 1} of={walk.length} label="개인화 진행" />
        </div>
      )}
      <h1 className="mt-[1rlh]">
        <label htmlFor={inputId}>{step.question}</label>
      </h1>
      {step.hint && (
        <p className="text-muted-foreground mt-[0.5rlh]">{step.hint}</p>
      )}
      {error && (
        <p role="alert" className="mt-[0.5rlh] font-bold">
          {error}
        </p>
      )}
      <div className="mt-[1rlh]">
        {step.input({
          d,
          set: (nd) => {
            setD(nd);
            setError(undefined);
          },
          inputId,
        })}
      </div>
      <div className="mt-[1.5rlh] flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {next === "settings" ? "저장" : "저장 후 계속"}
        </Button>
        {save.error && (
          <span className="font-bold">
            저장하지 못했습니다: {save.error.message}
          </span>
        )}
      </div>
    </form>
  );
}

function Summary({ settings }: { settings: Settings }) {
  const save = useSaveSettings();
  const [note, setNote] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const clear = useClearSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const steps = stepsFor(settings);
  const groups = uniq(steps.map((s) => s.group));
  return (
    <>
      <h1>개인화</h1>
      <p className="mt-[0.5rlh]">
        답을 넣으면 공고마다 넣을 수 있는지, 넣으면 어느 소득 구간에 드는지 알려
        드립니다. 답은 이 브라우저에만 저장됩니다.
      </p>
      {/* 처음(답한 게 없음)엔 차례로 답하기만, 답한 뒤엔 요약에서 하나씩 바꾸기가 주인공이다. 두 일을 같은 무게로 한 화면에 두지 않는다. */}
      {isFresh(settings) ? (
        <div className="mt-[1rlh]">
          <Button
            variant="primary"
            onClick={() => go(`settings/${steps[0].id}`)}
          >
            시작하기
          </Button>
          <div className="mt-[0.5rlh]">
            <p className="text-muted-foreground text-base">
              질문이 {steps.filter((s) => !s.assumption).length}개쯤 됩니다.
              모르는 건 비워 두고 넘어가도 됩니다.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-[0.5rlh]">
            <a href={`/settings/${steps[0].id}`}>처음부터 다시 답하기</a>
          </p>
          {groups.map((g) => (
            <section key={g} className="mt-[2rlh]">
              <h2 className="mb-[0.5rlh]">{g}</h2>
              {g === "계산 가정" && (
                <div className="mb-[0.5rlh]">
                  <p className="text-muted-foreground text-base">
                    사람마다 다르지 않은 계산의 전제입니다. 보통은 그대로
                    둡니다.
                  </p>
                </div>
              )}
              <dl className="border-t">
                {steps
                  .filter((s) => s.group === g)
                  .map((s) => (
                    <Row key={s.id} step={s} settings={settings} />
                  ))}
              </dl>
            </section>
          ))}
        </>
      )}

      <section className="mt-[2rlh]">
        <h2 className="mb-[0.5rlh]">다른 브라우저로 옮기기</h2>
        <p>
          다른 브라우저나 기기에서 쓰려면 여기서 파일로 내보내고, 그곳의
          개인화에서 가져오세요.
        </p>
        <div className="mt-[0.5rlh] flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([exportSettings(settings)], {
                  type: "application/json",
                }),
              );
              const a = Object.assign(document.createElement("a"), {
                href: url,
                download: "청약알리미-개인화.json",
              });
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            내보내기
          </Button>
          <Button onClick={() => fileRef.current?.click()}>가져오기</Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const next = parseSettings(await file.text());
              if (!next)
                return setNote(
                  "개인화 파일이 아닙니다. 이 화면에서 내보낸 파일을 고르세요.",
                );
              await save.mutateAsync(next);
              setNote("가져왔습니다.");
            }}
          />
          {!confirming && (
            <Button
              onClick={() => {
                setNote(undefined);
                setConfirming(true);
              }}
            >
              이 브라우저에서 지우기
            </Button>
          )}
        </div>
        {/* 되돌릴 수 없으니 그 자리에서 한 번 묻는다(브라우저 confirm 창 대신). */}
        {confirming && (
          <div
            className="border-foreground mt-[0.5rlh] border-l-2 pl-4"
            role="alert"
          >
            <p className="font-bold">
              넣은 답이 모두 사라지고 되돌릴 수 없습니다. 나중에 쓰려면 먼저
              내보내 두세요.
            </p>
            <div className="mt-[0.5rlh] flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  await clear.mutateAsync();
                  setConfirming(false);
                  setNote("이 브라우저에서 지웠습니다.");
                }}
              >
                지우기
              </Button>
              <Button onClick={() => setConfirming(false)}>취소</Button>
            </div>
          </div>
        )}
        {note && (
          <output className="mt-[0.5rlh] block font-bold">{note}</output>
        )}
      </section>
    </>
  );
}

/** 요약 한 줄: 짧은 이름, 답, 바꾸기(GOV.UK summary list). */
function Row({ step, settings }: { step: Step; settings: Settings }) {
  const answer = step.answer(settings);
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 border-b py-[0.25rlh]">
      <dt className="w-40 shrink-0 font-bold">{step.label}</dt>
      <dd className="min-w-0 flex-1">
        {answer || <span className="text-muted-foreground">비어 있음</span>}
      </dd>
      <dd>
        <a href={`/settings/${step.id}?then=summary`}>
          바꾸기<span className="sr-only"> {step.label}</span>
        </a>
      </dd>
    </div>
  );
}
