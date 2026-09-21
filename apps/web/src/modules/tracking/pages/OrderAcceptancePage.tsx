import type { AcceptanceCheckMark } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  Button,
  Chip,
  cn,
  Rating,
  Skeleton,
  Tag,
  Textarea,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  getApiService,
  isApiError,
  ORDER_KEYS,
  orderEventsOptions,
  orderOptions,
} from "@/shared/api";
import { formatDateTime } from "@/shared/lib/dates";
import { formatRub } from "@/shared/lib/format";
import { orderStatusTitle, orderStatusTone } from "@/shared/lib/order-status";
import { plural } from "@/shared/lib/plural";
import { AppLink, ErrorPage, useAppNavigate } from "@/shared/ui";

import { EscrowCard } from "@/shared/ui";
import { PhotoStrip, PhotoViewer } from "@/shared/ui";
import { PipelineBar } from "@/shared/ui";

/* Макет: экран `acceptance` — «Приёмка партии · № 4812».
 *
 * Приёмка — это команда автомата, а не форма: она освобождает деньги из эскроу. Поэтому
 * чек-лист необязателен (отметки уходят в журнал), а всё, что блокирует деньги, живёт на
 * экране спора. Если человек ничего не сделает, партию примет таймер — об этом написано
 * прямо в шапке, а не мелким шрифтом.
 *
 * Отзыв о фабрике отправляется вместе с приёмкой одним запросом: два запроса подряд
 * означали бы, что при сбое второго отзыв потерян, а деньги уже ушли. */

const TAGS = ["В срок", "Качество печати", "Связь с технологом", "Упаковка"];

export function OrderAcceptancePage({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();
  const navigate = useAppNavigate();
  const orderQuery = useQuery(orderOptions(orderId));
  const eventsQuery = useQuery({
    ...orderEventsOptions(orderId),
    enabled: orderQuery.data?.paidAt != null,
  });

  const [marks, setMarks] = useState<Record<string, AcceptanceCheckMark>>({});
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [tags, setTags] = useState<string[]>(["В срок"]);
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const accept = useMutation({
    mutationFn: () =>
      getApiService().acceptOrder(
        orderId,
        {
          marks,
          note: note.trim() === "" ? null : note.trim(),
          review: review.trim() === "" ? null : { rating, text: review.trim(), tags },
        },
        `accept:${String(orderId)}`,
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(ORDER_KEYS.detail(orderId), updated);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      navigate({ to: `/account/orders/${String(orderId)}` });
    },
    onError: (cause) => {
      setError(isApiError(cause) ? cause.message : "Не получилось принять партию");
    },
  });

  if (orderQuery.isError) {
    const notFound = isApiError(orderQuery.error) && orderQuery.error.status === 404;
    return (
      <ErrorPage
        code={notFound ? "404" : "500"}
        title={notFound ? "Заказ не найден" : "Не удалось открыть приёмку"}
        actions={
          <Button asChild variant="cta">
            <AppLink to="/account/orders">Мои заказы</AppLink>
          </Button>
        }
      />
    );
  }

  const order = orderQuery.data;
  if (!order) return <Skeleton className="h-96 w-full rounded-[10px]" />;

  const acceptance = order.acceptance ?? null;
  const photos = (eventsQuery.data?.items ?? []).flatMap((event) =>
    event.type === "photo_report" ? event.photos : [],
  );
  const qcPhotos = photos.slice(-5);
  const fee = order.escrow ? Math.round(order.escrow.amount * 0.08) : 0;

  return (
    <div className="pb-6">
      <Breadcrumbs className="mb-2">
        <BreadcrumbLink asChild>
          <AppLink to="/account/orders">Мои заказы</AppLink>
        </BreadcrumbLink>
        <BreadcrumbLink asChild>
          <AppLink to={`/account/orders/${String(order.id)}`}>Заказ № {order.id}</AppLink>
        </BreadcrumbLink>
        <BreadcrumbPage>Приёмка</BreadcrumbPage>
      </Breadcrumbs>

      <div className="bg-surface rounded-card mb-3 grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">Приёмка партии · № {order.id}</h1>
            <Tag tone={orderStatusTone(order.status)}>{orderStatusTitle(order.status)}</Tag>
          </div>
          <p className="text-muted mt-1 text-[13.5px]">
            {order.offer.title}, {order.params.qty} шт
            {acceptance && (
              <>
                {" · доставлено "}
                {formatDateTime(acceptance.openedAt)} ·{" "}
                <b className="text-danger">
                  осталось {acceptance.workingDaysLeft}{" "}
                  {plural(acceptance.workingDaysLeft, [
                    "рабочий день",
                    "рабочих дня",
                    "рабочих дней",
                  ])}
                </b>{" "}
                — затем партия будет принята автоматически
              </>
            )}
          </p>
          {order.tracking && <PipelineBar className="mt-3" stages={order.tracking.stages} />}
        </div>
        <div className="flex flex-col items-stretch gap-1.5 md:min-w-52">
          <Button
            variant="cta"
            size="lg"
            disabled={acceptance === null || accept.isPending}
            onClick={() => {
              accept.mutate();
            }}
          >
            {accept.isPending ? "Принимаем…" : "Принять партию"}
          </Button>
          <Button asChild variant="ghost">
            <AppLink to={`/account/orders/${String(order.id)}/dispute`}>Есть претензия</AppLink>
          </Button>
        </div>
      </div>

      {error !== undefined && (
        <Alert kind="danger" className="mb-3" title="Приёмка не прошла">
          {error}
        </Alert>
      )}

      {acceptance === null && (
        <Alert kind="info" className="mb-3" title="Приёмка ещё не открыта">
          Окно приёмки открывается после доставки партии. Сейчас заказ в статусе «
          {orderStatusTitle(order.status).toLowerCase()}».
        </Alert>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Box>
            <h2 className="font-heading text-lg font-bold">Проверьте по спецификации</h2>
            <p className="text-muted mt-1 mb-2.5 text-[12.5px]">
              Отметки необязательны, но сохранятся в журнале заказа.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-muted border-border border-b text-left text-[12px]">
                    <th className="py-1.5 pr-2 font-medium">Параметр</th>
                    <th className="py-1.5 pr-2 font-medium">По спецификации</th>
                    <th className="py-1.5 pr-2 font-medium">Отчёт КК фабрики</th>
                    <th className="py-1.5 font-medium">У вас</th>
                  </tr>
                </thead>
                <tbody>
                  {(acceptance?.checks ?? []).map((check) => (
                    <tr key={check.id} className="border-border border-b align-top last:border-0">
                      <td className="py-2 pr-2 font-medium">{check.title}</td>
                      <td className="py-2 pr-2">{check.expected}</td>
                      <td className="text-muted py-2 pr-2 text-[12.5px]">
                        {check.reported ?? "—"}
                      </td>
                      <td className="py-2">
                        <span className="border-border-strong rounded-control inline-flex overflow-hidden border text-[12.5px]">
                          {(["ok", "issue"] as const).map((mark) => (
                            <button
                              key={mark}
                              type="button"
                              aria-pressed={marks[check.id] === mark}
                              onClick={() => {
                                setMarks((current) => ({
                                  ...current,
                                  [check.id]: current[check.id] === mark ? "ok" : mark,
                                }));
                              }}
                              className={cn(
                                "text-muted px-2.5 py-1",
                                marks[check.id] === mark &&
                                  (mark === "ok"
                                    ? "bg-success-soft text-success font-medium"
                                    : "bg-warning-soft text-warning-text font-medium"),
                              )}
                            >
                              {mark === "ok" ? "ок" : "замечание"}
                            </button>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Textarea
              className="mt-3"
              rows={2}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
              placeholder="Замечания к партии — они уйдут в журнал заказа"
              aria-label="Замечания к партии"
            />
          </Box>

          <Box>
            <h2 className="font-heading text-lg font-bold">Отчёт контроля качества</h2>
            <PhotoStrip photos={qcPhotos} onOpen={setOpenPhoto} />
            <p className="text-muted mt-2 text-[12.5px]">
              {acceptance?.qualityNote ?? "Отчёт появится после контроля качества на фабрике."}
            </p>
          </Box>
        </div>

        <div className="flex flex-col gap-3">
          {order.escrow && <EscrowCard escrow={order.escrow} />}
          {order.escrow && (
            <Box>
              <h3 className="font-heading text-base font-bold">После приёмки</h3>
              <p className="text-muted mt-1.5 text-[12.5px]">
                Фабрика получит {formatRub(order.escrow.amount - fee)}, комиссия платформы{" "}
                {formatRub(fee)}.
              </p>
            </Box>
          )}

          <Box>
            <h3 className="font-heading text-base font-bold">Отзыв о фабрике</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <Rating value={rating} />
              <span className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`Оценка ${String(value)}`}
                    aria-pressed={rating === value}
                    onClick={() => {
                      setRating(value);
                    }}
                    className={cn(
                      "size-6 rounded text-[15px]",
                      value <= rating ? "text-warning" : "text-border-strong",
                    )}
                  >
                    ★
                  </button>
                ))}
              </span>
            </div>
            <Textarea
              className="mt-2"
              rows={3}
              value={review}
              onChange={(event) => {
                setReview(event.target.value);
              }}
              placeholder="Что получилось, а что стоит улучшить"
              aria-label="Текст отзыва"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TAGS.map((tag) => (
                <Chip
                  key={tag}
                  on={tags.includes(tag)}
                  onClick={() => {
                    setTags((current) =>
                      current.includes(tag)
                        ? current.filter((item) => item !== tag)
                        : [...current, tag],
                    );
                  }}
                >
                  {tag}
                </Chip>
              ))}
            </div>
            <p className="text-muted mt-2 text-[12px]">
              Отзыв уйдёт вместе с приёмкой — отдельной кнопки нет намеренно.
            </p>
          </Box>
        </div>
      </div>

      <PhotoViewer
        photos={photos}
        openId={openPhoto}
        onClose={() => {
          setOpenPhoto(null);
        }}
      />
    </div>
  );
}
