import { actions } from "astro:actions";
import Button from "@yeolyi/ui/Button";
import { useState } from "react";

export function LoginButton() {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await actions.auth.login({ redirectTo });
    if (error || !data) {
      setLoading(false);
      alert(error?.message ?? "로그인에 실패했습니다.");
      return;
    }
    window.location.href = data.url;
  };

  return (
    <Button onClick={onClick} disabled={loading}>
      {loading ? "이동 중…" : "GitHub로 로그인"}
    </Button>
  );
}

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    await actions.auth.logout();
    window.location.reload();
  };

  return (
    <Button onClick={onClick} disabled={loading}>
      {loading ? "로그아웃 중…" : "로그아웃"}
    </Button>
  );
}
