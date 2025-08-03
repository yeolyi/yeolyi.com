import clsx from "clsx";
import type {
  State,
  TapeSymbol,
} from "@/content/ko/cs/turing-machine/hooks/turingMachineStore";
import { useTranslations } from "@/i18n/utils";

export const Tape = ({
  tape,
  head,
  currentState,
  lang,
}: {
  tape: TapeSymbol[];
  head: number;
  currentState: State;
  lang: string;
}) => {
  const t = useTranslations(lang)("TuringMachine").Tape;
  return (
    <div>
      <p className="text-md mb-2 font-semibold">{t.title}</p>
      <div className="relative flex flex-wrap">
        {tape.map((cell, idx) => (
          <div
            key={idx}
            className={clsx(
              "relative mb-6 flex h-12 w-12 shrink-0 items-center justify-center border border-stone-700 font-mono text-xl",
              {
                "bg-stone-400 text-black":
                  idx === head && currentState !== "q_halt",
                "bg-green-500 text-black":
                  idx === head && currentState === "q_halt",
              },
            )}
          >
            {cell}
            {idx === head && (
              <p className="absolute -bottom-0 translate-y-full text-sm text-white">
                {t.head}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
