import { zodResolver } from "@hookform/resolvers/zod";
import type { CodeRequested, Me } from "@partiya/api-contracts";
import { Alert, Button, Field, Input, OtpInput } from "@partiya/ui";
import { useMutation } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { getApiService } from "@/shared/api";

import { retryAfterSeconds, toFormErrors } from "../lib/api-errors";
import { formatCountdown, useCountdown } from "../lib/countdown";
import { identifierSchema, type IdentifierForm } from "../lib/schemas";
import { DEMO_LOGINS, MOCK_CODE } from "../api/mock-backend";
import { Segmented } from "./Segmented";

/* Макет: экраны login и login-otp. Два шага одной карточки, а не два маршрута:
   адресат и таймер повторной отправки живут между шагами, и потерять их при «назад»
   в браузере было бы обиднее, чем не иметь на шаг кода отдельного URL. */

type Channel = "phone" | "email";

const CHANNEL_OPTIONS = [
  { value: "phone" as const, label: "Телефон" },
  { value: "email" as const, label: "Почта" },
];

export interface LoginFlowProps {
  /** Код принят, сессия открыта — дальше решает страница. */
  onAuthenticated: (me: Me) => void;
  /** `null` — заголовка нет: его уже дала страница, второй был бы повтором. */
  title?: ReactNode;
  description?: ReactNode;
  /** Строка под кнопкой: ссылки на регистрацию и т. п. */
  footer?: ReactNode;
  /** Подсказка про постоянный код и кнопки демо-входа. Только при useMocks. */
  demo?: boolean;
}

export function LoginFlow({
  onAuthenticated,
  title = "Вход",
  description = "По телефону или рабочей почте. Пароль не нужен — пришлём код.",
  footer,
  demo = false,
}: LoginFlowProps) {
  const [sent, setSent] = useState<{ identifier: string; requested: CodeRequested } | null>(null);

  if (sent === null) {
    return (
      <IdentifierStep
        title={title}
        description={description}
        footer={footer}
        demo={demo}
        onSent={setSent}
        onAuthenticated={onAuthenticated}
      />
    );
  }

  return (
    <CodeStep
      identifier={sent.identifier}
      requested={sent.requested}
      demo={demo}
      /* `title === null` значит, что заголовок страницы уже есть (регистрация):
         второй <h1> на экране — ошибка доступности, поэтому шаг кода опускает
         свой заголовок до <h2>. */
      ownHeading={title !== null}
      onBack={() => {
        setSent(null);
      }}
      onResent={(requested) => {
        setSent({ identifier: sent.identifier, requested });
      }}
      onAuthenticated={onAuthenticated}
    />
  );
}

// ───────────────────────────────── шаг 1: адресат ─────────────────────────────────

function IdentifierStep({
  title,
  description,
  footer,
  demo,
  onSent,
  onAuthenticated,
}: {
  title: ReactNode;
  description: ReactNode;
  footer: ReactNode;
  demo: boolean;
  onSent: (value: { identifier: string; requested: CodeRequested }) => void;
  onAuthenticated: (me: Me) => void;
}) {
  const [channel, setChannel] = useState<Channel>("phone");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const cooldown = useCountdown(cooldownUntil);

  const form = useForm<IdentifierForm>({
    resolver: zodResolver(identifierSchema),
    defaultValues: { identifier: "" },
  });

  const request = useMutation({
    mutationFn: (identifier: string) => getApiService().requestCode({ identifier }),
    onSuccess: (requested, identifier) => {
      setMessage(undefined);
      onSent({ identifier, requested });
    },
    onError: (error) => {
      const {
        fields,
        message: general,
        status,
      } = toFormErrors(error, [[/телефон|почт|укажите/iu, "identifier" as const]]);
      if (fields.identifier !== undefined) {
        form.setError("identifier", { message: fields.identifier });
        form.setFocus("identifier");
        return;
      }
      // 409 — код уже выслан минуту назад; кнопку гасим до конца интервала
      if (status === 409) setCooldownUntil(Date.now() + retryAfterSeconds(error, 60) * 1000);
      setMessage(general);
    },
  });

  const quick = useMutation({
    mutationFn: async (identifier: string) => {
      const api = getApiService();
      await api.requestCode({ identifier }).catch(() => undefined);
      return api.verifyCode({ identifier, code: MOCK_CODE });
    },
    onSuccess: onAuthenticated,
    onError: (error) => {
      setMessage(toFormErrors(error).message);
    },
  });

  const busy = request.isPending || quick.isPending;

  return (
    <>
      {title !== null && <h1 className="font-heading text-2xl leading-tight font-bold">{title}</h1>}
      {description !== null && <p className="text-muted mt-1.5">{description}</p>}

      <Segmented
        className={title === null && description === null ? "" : "mt-3.5"}
        label="Как войти"
        value={channel}
        options={CHANNEL_OPTIONS}
        onChange={(next) => {
          setChannel(next);
          form.reset({ identifier: "" });
          setMessage(undefined);
        }}
      />

      <form
        className="mt-3.5"
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit((values) => {
            request.mutate(values.identifier);
          })(event);
        }}
      >
        <Field
          label={channel === "phone" ? "Телефон" : "Рабочая почта"}
          error={form.formState.errors.identifier?.message}
          required
        >
          <Input
            {...form.register("identifier")}
            type={channel === "phone" ? "tel" : "email"}
            inputMode={channel === "phone" ? "tel" : "email"}
            autoComplete={channel === "phone" ? "tel" : "email"}
            placeholder={channel === "phone" ? "+7 916 000-12-34" : "a.korableva@kora.ru"}
            disabled={busy}
          />
        </Field>

        {message !== undefined && (
          <Alert kind="danger" className="mt-3" title="Код не отправлен">
            {message}
          </Alert>
        )}

        <Button
          type="submit"
          variant="cta"
          size="lg"
          wide
          className="mt-3.5"
          disabled={busy || cooldown > 0}
        >
          {cooldown > 0 ? `Получить код через ${formatCountdown(cooldown)}` : "Получить код"}
        </Button>
      </form>

      {footer}

      {demo && <DemoLogins disabled={busy} onPick={(identifier) => quick.mutate(identifier)} />}
    </>
  );
}

// ───────────────────────────────── шаг 2: код ─────────────────────────────────

function CodeStep({
  identifier,
  requested,
  demo,
  ownHeading,
  onBack,
  onResent,
  onAuthenticated,
}: {
  identifier: string;
  requested: CodeRequested;
  demo: boolean;
  /** Шаг сам себе заголовок страницы: рисует <h1>. Иначе — <h2> под чужим <h1>. */
  ownHeading: boolean;
  onBack: () => void;
  onResent: (requested: CodeRequested) => void;
  onAuthenticated: (me: Me) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  /* Ключ поля кода. Клетки radix оставлены неуправляемыми: если вернуть им `value` из
     нашего состояния, первая набранная цифра теряется — внутренний reducer успевает
     прочитать проп раньше, чем React отдаст обновление (@radix-ui 0.1.16). Сбрасываем
     поле сменой ключа — это и есть «очистить после неверного кода». */
  const [attempt, setAttempt] = useState(0);
  const [resendUntil, setResendUntil] = useState<number | null>(
    () => Date.now() + requested.resendAfter * 1000,
  );
  const resendIn = useCountdown(resendUntil);

  const clearCode = () => {
    setCode("");
    setAttempt((value) => value + 1);
  };

  const verify = useMutation({
    mutationFn: (value: string) => getApiService().verifyCode({ identifier, code: value }),
    onSuccess: onAuthenticated,
    onError: (failure) => {
      setError(toFormErrors(failure).message);
      // поле чистим: повторная отправка тех же цифр только тратит попытку
      clearCode();
    },
  });

  const resend = useMutation({
    mutationFn: () => getApiService().requestCode({ identifier }),
    onSuccess: (next) => {
      setError(undefined);
      clearCode();
      setResendUntil(Date.now() + next.resendAfter * 1000);
      onResent(next);
    },
    onError: (failure) => {
      setResendUntil(Date.now() + retryAfterSeconds(failure, requested.resendAfter) * 1000);
      setError(toFormErrors(failure).message);
    },
  });

  const submit = (value: string) => {
    if (value.length !== requested.codeLength || verify.isPending) return;
    verify.mutate(value);
  };

  return (
    <>
      <button type="button" onClick={onBack} className="text-action text-[12.5px] hover:underline">
        ‹ {requested.channel === "sms" ? "Изменить номер" : "Изменить почту"}
      </button>

      {ownHeading ? (
        <h1 className="font-heading mt-2 text-2xl leading-tight font-bold">
          {requested.channel === "sms" ? "Код из SMS" : "Код из письма"}
        </h1>
      ) : (
        <h2 className="font-heading mt-2 text-2xl leading-tight font-bold">
          {requested.channel === "sms" ? "Код из SMS" : "Код из письма"}
        </h2>
      )}
      <p className="text-muted mt-1.5">Отправили на {requested.sentTo}</p>

      <form
        className="mt-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit(code);
        }}
      >
        <Field error={error}>
          <OtpInput
            key={attempt}
            length={requested.codeLength}
            onValueChange={(next) => {
              setCode(next);
              if (error !== undefined) setError(undefined);
            }}
            autoSubmit
            onAutoSubmit={submit}
            disabled={verify.isPending}
            label={requested.channel === "sms" ? "Код из СМС" : "Код из письма"}
          />
        </Field>

        <div className="text-muted mt-2.5 text-[12.5px]">
          {resendIn > 0 ? (
            <span>Отправить повторно через {formatCountdown(resendIn)}</span>
          ) : (
            <button
              type="button"
              className="text-action hover:underline disabled:opacity-45"
              disabled={resend.isPending}
              onClick={() => {
                resend.mutate();
              }}
            >
              Отправить код повторно
            </button>
          )}
        </div>

        {demo && (
          <p className="text-muted mt-2 text-[12.5px]">
            Моки: код всегда <b className="num text-text">{MOCK_CODE}</b>.
          </p>
        )}

        <Button
          type="submit"
          variant="cta"
          size="lg"
          wide
          className="mt-3.5"
          disabled={verify.isPending || code.length !== requested.codeLength}
        >
          {verify.isPending ? "Проверяем…" : "Войти"}
        </Button>
      </form>
    </>
  );
}

// ───────────────────────────────── демо-вход ─────────────────────────────────

function DemoLogins({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (identifier: string) => void;
}) {
  return (
    <div className="border-border mt-5 border-t pt-4">
      <h2 className="text-muted text-[11px] font-bold tracking-[0.06em] uppercase">
        Демо-вход (моки)
      </h2>
      <p className="text-muted mt-1 text-[12.5px]">
        Код входа в моках всегда <b className="num text-text">{MOCK_CODE}</b>. Кнопки ниже проходят
        оба шага сразу.
      </p>
      <div className="mt-2.5 grid gap-1.5">
        {DEMO_LOGINS.map((account) => (
          <button
            key={account.identifier}
            type="button"
            disabled={disabled}
            onClick={() => {
              onPick(account.identifier);
            }}
            className="border-border rounded-control hover:border-action hover:bg-action-soft flex items-center justify-between gap-3 border px-3 py-2 text-left transition-colors disabled:opacity-45"
          >
            <span className="min-w-0">
              <b className="block text-[13.5px]">{account.title}</b>
              <span className="text-muted block truncate text-[12px]">{account.meta}</span>
            </span>
            <span className="text-muted text-[12px]">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
