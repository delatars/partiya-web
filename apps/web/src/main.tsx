import { loadConfig } from "@partiya/shared";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App, queryClient } from "@/app/App";
import { seedQueryCache } from "@/app/initial-data";
import { installMocks } from "@/app/mocks";
import "@/styles/index.css";

// loadConfig → (observability → auth) → render
const root = document.getElementById("root");
if (!root) throw new Error("#root не найден");

const config = await loadConfig();

// Моки — декораторами поверх реального сервиса, по домену (app/mocks.ts)
if (config.useMocks) installMocks();

// Слепок от axum принёс в window.__INITIAL__ те же данные, которыми он нарисован
// (ARCHITECTURE.md, 7.4). Засеваем кэш ДО первого рендера: иначе loader маршрута
// сходит за ними в сеть ещё раз. Без слепка вызов ничего не делает.
seedQueryCache(queryClient);

// createRoot, не hydrateRoot: SEO-слепок от axum внутри #root заменяется целиком (ARCHITECTURE.md, 7.4)
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
