import {
  Box,
  Button,
  EmptyState,
  PageHeader,
  ProgressBar,
  Rating,
  Skeleton,
  TabBar,
  TabBarItem,
  Textarea,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getApiService, SELLER_KEYS, sellerFeedbackOptions } from "@/shared/api";
import { formatDateTime } from "@/shared/lib/dates";
import { formatRating } from "@/shared/lib/format";

/* Макет: экран `seller-feedback` — отзывы и вопросы.

   Ответ на вопрос публичный: его увидят все посетители карточки. Поэтому под полем
   стоят шаблоны — они приходят с сервера, а не зашиты в браузер: набор меняется без
   релиза фронта. */

type Tab = "unanswered" | "questions" | "reviews";

export function SellerFeedbackPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(sellerFeedbackOptions());
  const [tab, setTab] = useState<Tab>("unanswered");
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const answer = useMutation({
    mutationFn: (input: { id: number; text: string }) =>
      getApiService().answerSellerQuestion(input.id, { text: input.text }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.feedback() }),
  });
  const reply = useMutation({
    mutationFn: (input: { id: number; text: string }) =>
      getApiService().replySellerReview(input.id, { text: input.text }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.feedback() }),
  });

  if (isPending || !data) {
    return (
      <>
        <PageHeader title="Отзывы и вопросы" subtitle="Среднее время ответа видно на витрине." />
        <Skeleton className="h-64" />
      </>
    );
  }

  const questions =
    tab === "unanswered" ? data.questions.filter((item) => item.answer === null) : data.questions;
  const maxCount = Math.max(1, ...data.distribution.map((row) => row.count));

  return (
    <>
      <PageHeader
        title="Отзывы и вопросы"
        subtitle={`Среднее время ответа — ${String(data.respondsInMinutes)} минут. Показывается на витрине завода.`}
      />

      <TabBar label="Отзывы и вопросы" className="mb-3">
        <TabBarItem
          asChild
          active={tab === "unanswered"}
          count={data.unansweredQuestions || undefined}
        >
          <button type="button" onClick={() => setTab("unanswered")}>
            Вопросы без ответа
          </button>
        </TabBarItem>
        <TabBarItem asChild active={tab === "questions"} count={data.questions.length}>
          <button type="button" onClick={() => setTab("questions")}>
            Все вопросы
          </button>
        </TabBarItem>
        <TabBarItem asChild active={tab === "reviews"} count={data.reviewCount}>
          <button type="button" onClick={() => setTab("reviews")}>
            Отзывы
          </button>
        </TabBarItem>
      </TabBar>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-2.5">
          {tab === "reviews" ? (
            data.reviews.length === 0 ? (
              <Box>
                <EmptyState title="Отзывов пока нет" description="Первый придёт после приёмки." />
              </Box>
            ) : (
              data.reviews.map((review) => (
                <Box key={review.id}>
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-[13.5px]">{review.author}</b>
                    <Rating value={review.rating} />
                  </div>
                  <div className="text-muted text-[12.5px]">{review.when}</div>
                  <p className="mt-1.5 text-[13.5px]">{review.text}</p>
                  {review.reply === null ? (
                    <div className="mt-2">
                      <Textarea
                        rows={2}
                        aria-label={`Ответ на отзыв ${String(review.id)}`}
                        placeholder="Публичный ответ — его увидят все посетители витрины"
                        value={drafts[review.id] ?? ""}
                        onChange={(event) => {
                          setDrafts((current) => ({
                            ...current,
                            [review.id]: event.target.value,
                          }));
                        }}
                      />
                      <div className="mt-1.5 flex justify-end">
                        <Button
                          size="sm"
                          variant="cta"
                          disabled={reply.isPending}
                          onClick={() =>
                            reply.mutate({ id: review.id, text: drafts[review.id] ?? "" })
                          }
                        >
                          Ответить публично
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-subtle rounded-control mt-2 px-2.5 py-2 text-[13px]">
                      <b>Вы:</b> {review.reply.text}
                    </div>
                  )}
                </Box>
              ))
            )
          ) : questions.length === 0 ? (
            <Box>
              <EmptyState
                title="Вопросов без ответа нет"
                description="Скорость ответа видна на витрине — держите её."
              />
            </Box>
          ) : (
            questions.map((question) => (
              <Box key={question.id}>
                <div className="flex items-start justify-between gap-2">
                  <b className="text-[13.5px]">{question.text}</b>
                  <span className="text-muted flex-none text-[12.5px]">
                    {formatDateTime(question.askedAt)}
                  </span>
                </div>
                <div className="text-muted text-[12.5px]">
                  к предложению «{question.offerTitle}»
                </div>
                {question.answer === null ? (
                  <div className="mt-2">
                    <Textarea
                      rows={2}
                      aria-label={`Ответ на вопрос ${String(question.id)}`}
                      placeholder="Ответ увидят все посетители карточки. Контакты до оплаты заказа скрываются."
                      value={drafts[question.id] ?? ""}
                      onChange={(event) => {
                        setDrafts((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }));
                      }}
                    />
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-muted text-[12.5px]">
                        Шаблоны:{" "}
                        {data.templates.map((template, index) => (
                          <span key={template.key}>
                            {index > 0 ? " · " : null}
                            <button
                              type="button"
                              className="text-action hover:underline"
                              onClick={() => {
                                setDrafts((current) => ({
                                  ...current,
                                  [question.id]: template.text,
                                }));
                              }}
                            >
                              {template.title}
                            </button>
                          </span>
                        ))}
                      </span>
                      <Button
                        size="sm"
                        variant="cta"
                        disabled={answer.isPending}
                        onClick={() =>
                          answer.mutate({ id: question.id, text: drafts[question.id] ?? "" })
                        }
                      >
                        Ответить
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-subtle rounded-control mt-2 px-2.5 py-2 text-[13px]">
                    <b>Вы:</b> {question.answer.text}
                  </div>
                )}
              </Box>
            ))
          )}
          {answer.error ? <p className="text-danger text-[13px]">{answer.error.message}</p> : null}
        </div>

        <aside>
          <Box>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold">Рейтинг</h3>
              <span className="price text-[22px]">{formatRating(data.rating)}</span>
            </div>
            <div className="mt-2 grid gap-1">
              {data.distribution.map((row) => (
                <div
                  key={row.rating}
                  className="grid grid-cols-[2rem_1fr_2.5rem] items-center gap-2 text-[12.5px]"
                >
                  <span>{row.rating}★</span>
                  <ProgressBar
                    label={`Оценок ${String(row.rating)}`}
                    value={Math.round((row.count / maxCount) * 100)}
                  />
                  <span className="num text-muted text-right">{row.count}</span>
                </div>
              ))}
            </div>
            <p className="text-muted mt-2 text-[12.5px]">Всего отзывов: {data.reviewCount}</p>
          </Box>
        </aside>
      </div>
    </>
  );
}
