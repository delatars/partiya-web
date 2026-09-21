import { Container, Logo, ShellLinkProvider, SiteHeaderSlim } from "@partiya/ui";
import type { ReactNode } from "react";

import { AppLink, RouterLink } from "@/shared/ui/router-link";

/* Макет: экран onboarding-factory — headerSlim('Сохранить и выйти') + .wrap.narrow.
   Отдельная оболочка, а не кабинет: из мастера не должно быть куда уйти случайно,
   но выйти по своей воле — можно, черновик шага сохраняется. */
export function OnboardingShell({
  children,
  exitTo = "/seller",
  exitLabel = "Сохранить и выйти",
}: {
  children?: ReactNode;
  exitTo?: string;
  exitLabel?: string;
}) {
  return (
    <ShellLinkProvider component={RouterLink}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeaderSlim
          logo={<Logo label="Партия" href="/" size="sm" />}
          actions={
            <AppLink to={exitTo} className="text-white/85 hover:text-white">
              {exitLabel}
            </AppLink>
          }
        />
        <main className="flex-1 pt-3 pb-8">
          <Container width="narrow">{children}</Container>
        </main>
      </div>
    </ShellLinkProvider>
  );
}
