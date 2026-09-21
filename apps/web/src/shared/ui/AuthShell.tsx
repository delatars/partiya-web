import { AuthLayout, Logo, ShellLinkProvider, SiteHeaderSlim } from "@partiya/ui";
import type { ReactNode } from "react";

import { AppLink, RouterLink } from "@/shared/ui/router-link";

/* Макет: .auth-wrap — карточка входа и колонка-пояснение справа. */

const REASONS = [
  "Счета, оферта и УПД — на ваше юрлицо",
  "Оплата в эскроу по безналу",
  "Сотрудники с ролями: закупщик, бухгалтер",
  "Сравнение и избранное сохранятся из этой сессии",
];

export function AuthShell({ children, aside }: { children?: ReactNode; aside?: ReactNode }) {
  return (
    <ShellLinkProvider component={RouterLink}>
      <AuthLayout
        header={
          <SiteHeaderSlim
            logo={<Logo label="Партия" href="/" size="sm" />}
            actions={
              <AppLink to="/how-it-works" className="text-white/85 hover:text-white">
                Как это работает
              </AppLink>
            }
          />
        }
        aside={
          aside ?? (
            <>
              <h2 className="font-heading text-base font-bold">Зачем регистрировать компанию</h2>
              <ul className="mt-2 grid gap-0.5 text-[13.5px]">
                {REASONS.map((reason) => (
                  <li key={reason} className="relative py-1 ps-5.5">
                    <span aria-hidden="true" className="text-success absolute start-0 font-bold">
                      ✓
                    </span>
                    {reason}
                  </li>
                ))}
              </ul>
            </>
          )
        }
      >
        {children}
      </AuthLayout>
    </ShellLinkProvider>
  );
}
