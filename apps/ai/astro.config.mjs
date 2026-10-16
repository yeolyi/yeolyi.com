import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { SITES } from "@yeolyi/ui/sites";
import { defineConfig } from "astro/config";

// ai.yeolyi.com. AI 로 해 본 것들(프롬프트 등)을 모아 둔다. 서버 기능이 없어 정적 빌드.
export default defineConfig({
  site: "https://ai.yeolyi.com",
  server: { port: SITES.ai.port },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
