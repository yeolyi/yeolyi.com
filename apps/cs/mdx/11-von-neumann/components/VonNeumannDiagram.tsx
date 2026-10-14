function ArrowRight() {
  return (
    <div className="flex shrink-0 items-center">
      <div className="bg-foreground h-[2px] w-4 sm:w-8" />
      <div className="border-l-foreground border-y-[5px] border-l-[6px] border-y-transparent sm:border-y-[6px] sm:border-l-[8px]" />
    </div>
  );
}

function ArrowDown() {
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="bg-foreground h-4 w-[2px]" />
      <div className="border-t-foreground border-x-[6px] border-t-[8px] border-x-transparent" />
    </div>
  );
}

function ArrowUp() {
  return (
    <div className="flex shrink-0 flex-col items-center">
      <div className="border-b-foreground border-x-[6px] border-b-[8px] border-x-transparent" />
      <div className="bg-foreground h-4 w-[2px]" />
    </div>
  );
}

export function VonNeumannDiagram() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="border-2 px-2 py-3 text-center sm:px-5 sm:py-4">
          입력 장치
        </div>

        <ArrowRight />

        <div className="flex flex-col items-center gap-2 border-2 px-3 pt-2 pb-4 sm:gap-3 sm:px-6 sm:pt-3 sm:pb-5">
          <span>CPU</span>
          <div className="w-full border px-3 py-2 text-center sm:px-8 sm:py-3">
            제어 장치
          </div>
          <div className="w-full border px-3 py-2 text-center sm:px-8 sm:py-3">
            ALU
          </div>
        </div>

        <ArrowRight />

        <div className="border-2 px-2 py-3 text-center sm:px-5 sm:py-4">
          출력 장치
        </div>
      </div>

      <div className="flex gap-4">
        <ArrowDown />
        <ArrowUp />
      </div>

      <div className="border-2 px-6 py-2 text-center sm:px-12 sm:py-3">
        메모리
      </div>
    </div>
  );
}
