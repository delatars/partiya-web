import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { routeTree } from "@/routeTree.gen";
import { isApiError } from "@/shared/api";

// export: main.tsx засевает этот кэш из SEO-слепка до первого рендера (app/initial-data.ts)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      // 4xx повтором не лечится: битый фильтр или нет прав — ответ не изменится
      retry: (failureCount, error) =>
        isApiError(error) && error.status >= 400 && error.status < 500 ? false : failureCount < 2,
    },
    // неидемпотентные мутации вторым заходом затирают результат первого
    mutations: { retry: false },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
