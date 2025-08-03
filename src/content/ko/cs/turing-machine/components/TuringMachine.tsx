import { Forward, Pause, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ControlUnit } from "@/content/ko/cs/turing-machine/components/ControlUnit";
import { Tape } from "@/content/ko/cs/turing-machine/components/Tape";
import {
  type TapeSymbol,
  TuringMachineProvider,
} from "@/content/ko/cs/turing-machine/hooks/turingMachineStore";
import { useTuringMachine } from "@/content/ko/cs/turing-machine/hooks/useTuringMachine";
import { useTranslations } from "@/i18n/utils";

const TuringMachineContent = ({
  initialTape,
  initialHeadIdx,
  rulesCsv: initialRulesCsv,
  editable,
  lang,
}: {
  initialTape: TapeSymbol[];
  initialHeadIdx: number;
  rulesCsv: string;
  editable?: boolean;
  lang: string;
}) => {
  const t = useTranslations(lang)("TuringMachine");
  const [isEditing, setIsEditing] = useState(false);
  const [rulesCsv, setRulesCsv] = useState(initialRulesCsv);
  const {
    tape,
    headIdx,
    state,
    isRunning,
    step,
    reset,
    play,
    pause,
    rules,
    isHalted,
  } = useTuringMachine(initialTape, initialHeadIdx, rulesCsv);

  const onRulesCsvChange = (newCsv: string) => {
    setRulesCsv(newCsv);
    setIsEditing(false);
  };

  const currentSymbol = tape[headIdx] || "_";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardAction className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="icon"
            onClick={() => reset()}
            disabled={isRunning || isEditing}
          >
            <RotateCcw />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={step}
            disabled={isRunning || isHalted || isEditing}
          >
            <Forward />
          </Button>

          {isRunning ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={pause}
              disabled={isHalted || isEditing}
            >
              <Pause />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              onClick={play}
              disabled={isRunning || isHalted || isEditing}
            >
              <Play />
            </Button>
          )}
        </CardAction>
      </CardHeader>

      <CardContent>
        <Tape tape={tape} head={headIdx} currentState={state} lang={lang} />
        <ControlUnit
          rules={rules}
          currentState={state}
          currentSymbol={currentSymbol}
          editable={editable}
          rulesCsv={rulesCsv}
          onRulesCsvChange={onRulesCsvChange}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          lang={lang}
        />
      </CardContent>
    </Card>
  );
};

export default function TuringMachine({
  initialTape,
  initialHeadIdx,
  rulesCsv,
  editable,
  lang,
}: {
  initialTape: TapeSymbol[];
  initialHeadIdx: number;
  rulesCsv: string;
  editable?: boolean;
  lang: string;
}) {
  return (
    <TuringMachineProvider>
      <TuringMachineContent
        initialTape={initialTape}
        initialHeadIdx={initialHeadIdx}
        rulesCsv={rulesCsv}
        editable={editable}
        lang={lang}
      />
    </TuringMachineProvider>
  );
}
