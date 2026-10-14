import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { SITES } from "@yeolyi/ui/sites";
import { themeInitPlugin } from "@yeolyi/ui/theme-store";
import { defineConfig } from "vite";

export default defineConfig({
	// env 는 레포 루트 .env 하나(블로그와 같은 PUBLIC_ 이름). 앱마다 따로 두면 새로 받은 사람이 앱마다 채워야 한다.
	envDir: fileURLToPath(new URL("../..", import.meta.url)),
	envPrefix: "PUBLIC_",
	plugins: [react(), tailwindcss(), themeInitPlugin()],
	// 도메인 코드는 Edge Function 과 같이 쓰려고 supabase/functions/_shared 에 있다(CLI 가 functions 밖 파일을 함수에 싣지 않는다).
	resolve: { alias: { "@shared": fileURLToPath(new URL("./supabase/functions/_shared", import.meta.url)) } },
	server: { port: SITES.house.port, strictPort: true },
});
