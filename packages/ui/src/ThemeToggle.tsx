import { Moon, Sun, SunMoon } from "lucide-react";
import { useEffect, useState } from "react";
import IconButton from "./IconButton.tsx";
import { cycleTheme, readTheme, THEME_LABEL, type Theme } from "./themeStore.ts";

const ICON = { auto: SunMoon, light: Sun, dark: Moon } as const;

// 라이트/다크 버튼. 아이콘은 지금 상태(자동·라이트·다크)를 보여 주고, 누르면 다음으로 넘긴다.
export default function ThemeToggle() {
  // 서버 렌더와 맞추려고 처음엔 auto 로 그리고, 붙은 뒤 쿠키를 읽는다.
  const [theme, setTheme] = useState<Theme>("auto");
  useEffect(() => setTheme(readTheme()), []);
  const Icon = ICON[theme];
  return (
    <IconButton aria-label={THEME_LABEL[theme]} title={THEME_LABEL[theme]} onClick={(e) => cycleTheme(theme, e.currentTarget, setTheme)}>
      <Icon aria-hidden />
    </IconButton>
  );
}
