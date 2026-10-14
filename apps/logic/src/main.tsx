import { StrictMode } from "react";
import { startTracking } from "@yeolyi/track";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles.css";

startTracking("logic");

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
