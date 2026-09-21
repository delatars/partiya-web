import type { ReactNode } from "react";

import { AppLink } from "@/shared/ui";

/* Макет: .sec-h — заголовок раздела главной и ссылка «всё →» справа. */
export function SectionHeader({
  title,
  linkLabel,
  linkTo,
}: {
  title: ReactNode;
  linkLabel: string;
  linkTo: string;
}) {
  return (
    <div className="mt-6.5 mb-2.5 flex items-baseline justify-between gap-4">
      <h2 className="font-heading text-lg font-bold">{title}</h2>
      <AppLink to={linkTo} className="text-action shrink-0 font-medium">
        {linkLabel} →
      </AppLink>
    </div>
  );
}
