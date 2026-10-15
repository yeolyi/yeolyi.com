import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { startTracking } from "@yeolyi/track";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles.css";

// 공고는 한 시간에 한 번 바뀐다. 창을 다시 볼 때마다 받을 필요는 없다.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 5 * 60_000 },
  },
});

startTracking("house");

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
