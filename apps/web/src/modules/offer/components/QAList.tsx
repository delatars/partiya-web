import { zodResolver } from "@hookform/resolvers/zod";
import type { OfferQuestion, OfferQuestionList } from "@partiya/api-contracts";
import { Alert, Box, Button, EmptyState, Field, Skeleton, Textarea } from "@partiya/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getApiService, isApiError, OFFER_KEYS } from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/dates";
import { useSession } from "@/shared/lib/session";
import { AppLink } from "@/shared/ui";

/* Макет: .qa — «Вопросы технологу»: вопрос жирным, ответ фабрики с левой чертой.
   Читают все, спрашивают только вошедшие: анонимный вопрос некуда привязать и некому
   показать ответ, поэтому аноним видит кнопку входа с возвратом на эту же страницу. */

const questionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(10, "Опишите вопрос подробнее — технологу нужно понять, о чём речь")
    .max(600, "Не длиннее 600 символов"),
});

type QuestionForm = z.infer<typeof questionSchema>;

export type QAListProps = {
  offerId: number;
  questions: readonly OfferQuestion[];
  pending?: boolean;
};

export function QAList({ offerId, questions, pending }: QAListProps) {
  return (
    <div>
      {pending ? (
        <div aria-hidden="true" className="flex flex-col gap-3">
          {[0, 1].map((index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          title="Вопросов пока не было"
          description="Спросите про материал, сроки или размерную сетку — технолог отвечает в среднем за час."
        />
      ) : (
        questions.map((question) => (
          <article
            key={question.id}
            className="border-border border-b border-dashed py-2.5 text-[13.5px]"
          >
            <b className="block">{question.text}</b>
            {question.answer ? (
              <div className="border-border text-muted mt-1 border-l-2 pl-3">
                {question.answer.author}: {question.answer.text}
              </div>
            ) : (
              <div className="text-muted mt-1 text-xs">
                Ждём ответа технолога · вопрос от {formatIsoDate(question.askedAt)}
              </div>
            )}
          </article>
        ))
      )}

      <AskQuestion offerId={offerId} />
    </div>
  );
}

function AskQuestion({ offerId }: { offerId: number }) {
  const session = useSession();
  const queryClient = useQueryClient();
  const href = useRouterState({ select: (state) => state.location.href });

  const form = useForm<QuestionForm>({
    resolver: zodResolver(questionSchema),
    defaultValues: { text: "" },
  });

  const ask = useMutation({
    mutationFn: (text: string) => getApiService().askOfferQuestion(offerId, { text }),
    onSuccess: (question) => {
      // вопрос уже есть на экране: дописываем его в кэш, а не перечитываем список
      queryClient.setQueryData<OfferQuestionList>(OFFER_KEYS.questions(offerId), (previous) =>
        previous
          ? { items: [...previous.items, question], total: previous.total + 1 }
          : { items: [question], total: 1 },
      );
      form.reset();
    },
  });

  if (session.isPending) return null;

  if (!session.isAuthenticated) {
    return (
      <Box padding="sm" className="bg-subtle mt-3.5 flex flex-wrap items-center gap-3">
        <span className="text-[13.5px]">
          Вопрос технологу можно задать после входа — ответ придёт в уведомления.
        </span>
        <Button asChild variant="cta" size="sm" className="ms-auto">
          <AppLink to="/login" search={{ redirect: href }}>
            Войти и спросить
          </AppLink>
        </Button>
      </Box>
    );
  }

  return (
    <form
      className="mt-3.5 flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit((values) => ask.mutate(values.text))(event);
      }}
    >
      <Field
        label="Ваш вопрос технологу"
        error={form.formState.errors.text?.message}
        hint={ask.isSuccess ? "Вопрос отправлен — технолог ответит в карточке" : undefined}
      >
        <Textarea
          placeholder="Например: успеете отгрузить 2 000 шт до 20 октября?"
          {...form.register("text")}
        />
      </Field>

      {ask.isError ? (
        <Alert kind="danger">
          {isApiError(ask.error) ? ask.error.message : "Вопрос не отправился. Попробуйте ещё раз."}
        </Alert>
      ) : null}

      <Button type="submit" variant="cta" disabled={ask.isPending} className="self-start">
        {ask.isPending ? "Отправляем…" : "Отправить вопрос"}
      </Button>
    </form>
  );
}
