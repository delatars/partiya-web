import { Box } from "@partiya/ui";
import type { ReactNode } from "react";

/* Макет: .err-page с экрана state-errors — крупный код, что случилось и что делать. */
export type ErrorPageProps = {
  code: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Код обращения из correlation-id: с ним поддержка находит запрос в логах. */
  correlationId?: string;
};

export function ErrorPage({ code, title, description, actions, correlationId }: ErrorPageProps) {
  return (
    <Box className="mx-auto my-3 max-w-[640px] px-6 py-10 text-center">
      <b className="font-heading text-border-strong block text-[64px] leading-none font-extrabold tracking-[-0.04em]">
        {code}
      </b>
      <h1 className="font-heading mt-3 text-lg font-bold">{title}</h1>
      {description ? (
        <p className="text-muted mx-auto mt-2 mb-4 max-w-[48ch]">{description}</p>
      ) : null}
      {actions ? <div className="flex flex-wrap justify-center gap-2.5">{actions}</div> : null}
      {correlationId ? (
        <p className="text-muted mt-4 text-[12.5px]">Код обращения: {correlationId}</p>
      ) : null}
    </Box>
  );
}
