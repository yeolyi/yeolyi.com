import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { SITES } from "@yeolyi/ui/sites";
import { themeInitPlugin } from "@yeolyi/ui/theme-store";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { localFilesPlugin } from "./server/plugin.ts";

export default defineConfig({
	// env 는 레포 루트 .env 하나(블로그와 같은 PUBLIC_ 이름). 앱마다 따로 두면 새로 받은 사람이 앱마다 채워야 한다.
	envDir: fileURLToPath(new URL("../..", import.meta.url)),
	envPrefix: "PUBLIC_",
	plugins: [react(), tailwindcss(), themeInitPlugin(), localFilesPlugin()],
	server: {
		port: SITES.carousel.port,
		strictPort: true,
		watch: { ignored: ["**/decks/**"] },
	},
});
