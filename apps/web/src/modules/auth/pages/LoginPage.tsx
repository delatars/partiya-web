import type { Me } from "@partiya/api-contracts";
import { getConfig } from "@partiya/shared";
import { Alert } from "@partiya/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { postLoginPath } from "@/shared/lib/guards";
import { putSession, useSwitchOrg } from "@/shared/lib/session";
import { AppLink, parseHref, useAppNavigate } from "@/shared/ui";

import { LoginFlow } from "../components/LoginFlow";
import { OrgPicker } from "../components/OrgPicker";
import { toFormErrors } from "../lib/api-errors";

/* Макет: login → login-otp. После кода — выбор организации, если их больше одной. */

export function LoginPage({ redirect }: { redirect?: string }) {
  const navigate = useAppNavigate();
  const queryClient = useQueryClient();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const switchOrg = useSwitchOrg();

  const go = (session: Me) => {
    const { to, search } = parseHref(postLoginPath(session, redirect));
    navigate({ to, search, replace: true });
  };

  const authenticated = (session: Me) => {
    putSession(queryClient, session);
    // одна компания или её нет — выбирать нечего, дальше решает postLoginPath
    if (session.organizations.length > 1) {
      setMe(session);
      return;
    }
    go(session);
  };

  if (me !== null) {
    return (
      <>
        <h1 className="font-heading text-2xl leading-tight font-bold">С возвращением</h1>
        <p className="text-muted mt-1.5">
          {me.user.name ?? me.user.phone ?? me.user.email ?? "Вы вошли"} — выберите, от чьего имени
          работать. Организацию можно сменить в кабинете в любой момент.
        </p>
        {error !== undefined && (
          <Alert kind="danger" className="mt-3" title="Не получилось переключиться">
            {error}
          </Alert>
        )}
        <OrgPicker
          organizations={me.organizations}
          activeOrgId={me.activeOrgId}
          disabled={switchOrg.isPending}
          onPick={(orgId) => {
            if (orgId === me.activeOrgId) {
              go(me);
              return;
            }
            switchOrg.mutate(orgId, {
              onSuccess: go,
              onError: (failure) => {
                setError(toFormErrors(failure).message);
              },
            });
          }}
        />
      </>
    );
  }

  return (
    <LoginFlow
      demo={getConfig().useMocks}
      onAuthenticated={authenticated}
      footer={
        <p className="text-muted mt-3.5 text-center text-[12.5px]">
          Нет аккаунта?{" "}
          <AppLink to="/register" className="text-action hover:underline">
            Зарегистрировать компанию
          </AppLink>{" "}
          ·{" "}
          <AppLink to="/for-factories" className="text-action hover:underline">
            Я завод
          </AppLink>
        </p>
      }
    />
  );
}
