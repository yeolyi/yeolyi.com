import { useEffect, useState } from "react";
import { AuthGate } from "./Auth";
import { Editor } from "./editor/Editor";
import { FramePage } from "./Frame";
import { Home } from "./Home";
import { RenderLocal } from "./Render";

const listeners = new Set<() => void>();

export function navigate(path: string) {
  history.pushState(null, "", path);
  for (const l of listeners) l();
}

function usePath() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const update = () => setPath(location.pathname);
    listeners.add(update);
    window.addEventListener("popstate", update);
    return () => {
      listeners.delete(update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  return path;
}

export function App() {
  const parts = usePath().split("/").filter(Boolean).map(decodeURIComponent);
  // Claude 가 로컬 사본(decks/)을 JPEG 으로 확인할 때 쓰는 dev 전용 화면. 로그인 없이 파일만 읽는다.
  if (import.meta.env.DEV && parts[0] === "render-local" && parts[1])
    return <RenderLocal folder={parts[1]} />;
  // 프레임 씌우기는 로그인 없이 쓴다(그림은 브라우저 안에서만 만든다).
  if (parts[0] === "frame") return <FramePage />;
  return (
    <AuthGate>
      {parts[0] === "d" && parts[1] ? (
        <Editor key={parts[1]} slug={parts[1]} />
      ) : (
        <Home />
      )}
    </AuthGate>
  );
}
