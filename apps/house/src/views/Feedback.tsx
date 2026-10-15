import Button from "@yeolyi/ui/Button";
import Checkbox from "@yeolyi/ui/Checkbox";
import Textarea from "@yeolyi/ui/Textarea";
import { useId, useState } from "react";
import { supabase } from "../supabase.ts";

// 베타 의견. 위 단계 배너의 "의견 보내기"가 보던 주소(?from=)를 붙여 연다.
// house.feedback 에 쓰기만 한다(읽기는 막혀 있다). 개인화 답은 보내지 않는다.
const MAX = 2000;

export function Feedback({ from }: { from: string }) {
  const bodyId = useId();
  const [body, setBody] = useState("");
  const [withPage, setWithPage] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const send = async () => {
    setState("sending");
    const { error } = await supabase.from("feedback").insert({
      body: body.trim(),
      page: (withPage && from.slice(0, 200)) || null,
    });
    setState(error ? "error" : "sent");
  };

  if (state === "sent")
    return (
      <>
        <h1>감사합니다</h1>
        <p className="mt-[1rlh]">
          <a href={from || "/"}>보던 화면으로 돌아가기</a>
        </p>
      </>
    );

  return (
    <>
      <h1>의견 보내기</h1>
      <p className="mt-[0.5rlh]">
        청약 알리미는 베타 서비스입니다. 틀린 설명, 헷갈리는 화면, 있었으면 하는
        기능을 알려 주세요.
      </p>
      <form
        className="mt-[1rlh]"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) send();
        }}
      >
        <div className="flex flex-col">
          <label htmlFor={bodyId} className="leading-[1.4]">
            의견
          </label>
          <Textarea
            id={bodyId}
            rows={6}
            maxLength={MAX}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1"
          />
        </div>
        {/* 보던 화면 주소는 보낼지 고를 수 있다(기본은 안 보냄). */}
        {from && (
          <div className="mt-[0.5rlh]">
            <Checkbox checked={withPage} onCheckedChange={setWithPage}>
              보던 화면({from})도 같이 보내기
            </Checkbox>
          </div>
        )}
        {state === "error" && (
          <p role="alert" className="mt-[1rlh] font-bold">
            보내지 못했습니다. 잠시 뒤 다시 보내 주세요.
          </p>
        )}
        <div className="mt-[1rlh]">
          <Button
            type="submit"
            variant="primary"
            disabled={!body.trim() || state === "sending"}
          >
            {state === "sending" ? "보내는 중" : "보내기"}
          </Button>
        </div>
      </form>
      <p className="text-muted-foreground mt-[2rlh] text-base">
        쓴 글과 (고르면) 보던 화면 주소만 저장합니다. 개인화에 넣은 답은 보내지
        않습니다.
      </p>
    </>
  );
}
