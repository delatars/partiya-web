import { Container, Logo, ShellLinkProvider, SiteHeaderSlim } from "@partiya/ui";
import type { ReactNode } from "react";

import { AppLink, RouterLink } from "@/shared/ui/router-link";

/* Макет: headerSlim() — оформление заказа и заказ образца: без меню категорий и без лотка,
   чтобы из мастера некуда было уйти случайно. */
export function CheckoutShell({
  children,
  actions,
}: {
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <ShellLinkProvider component={RouterLink}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeaderSlim
          logo={<Logo label="Партия" href="/" size="sm" />}
          actions={
            actions ?? (
              <>
                <AppLink to="/how-it-works" className="text-white/85">
                  Как это работает
                </AppLink>
                <AppLink to="/catalog" className="text-white/85">
                  Сохранить и выйти
                </AppLink>
              </>
            )
          }
        />
        <main className="flex-1 pt-3">
          <Container>{children}</Container>
        </main>
      </div>
    </ShellLinkProvider>
  );
}
