import type { Order, Quote, UpdateOrderDraftBody } from "@partiya/api-contracts";
import { Alert, Box, Button, Skeleton } from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  draftForQuoteOptions,
  getApiService,
  isApiError,
  offerDetailOptions,
  ORDER_KEYS,
  orderOptions,
  QUOTE_KEYS,
  quoteOptions,
} from "@/shared/api";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { buildQuoteRequest } from "@/shared/lib/quote";
import { useSession } from "@/shared/lib/session";
import { AppLink, ErrorPage, useAppNavigate } from "@/shared/ui";

import { DeliveryStep } from "../components/DeliveryStep";
import { ParamsStep } from "../components/ParamsStep";
import { PayerStep } from "../components/PayerStep";
import { PaymentStep } from "../components/PaymentStep";
import type { SaveState } from "../components/SaveBadge";
import { StepAccordionItem } from "../components/StepAccordion";
import { TotalBox } from "../components/TotalBox";
import type { CheckoutSearch } from "../lib/search-params";
import { selectedOptionIds } from "../lib/search-params";
import {
  CHECKOUT_STEPS,
  firstIncompleteStep,
  nextStepAfter,
  nextStepLabel,
  STEP_TITLES,
  stepOfField,
  stepStates,
  type CheckoutStep,
  type LocalCheckoutState,
} from "../lib/steps";
import { useArtworkQueue } from "../lib/use-artwork-queue";
import { readOfferAccepted, writeOfferAccepted } from "../lib/use-debounced";

/* Макет: экран `checkout` — «Оформление партии».

   Как устроен экран. Черновик живёт на сервере (ARCHITECTURE.md, 7.6), а весь ввод,
   который влияет на ЦЕНУ (объём, опции, доставка, промокод), живёт в URL. Отсюда
   единственная цепочка для денег:

     URL → `POST /quotes` → `quoteId` → `PATCH /orders/{id}`

   Своей арифметики у экрана нет ни в одном месте — он показывает то, что посчитал
   сервер. Всё остальное (цвета, размеры, адрес, реквизиты) — обычные поля с
   автосохранением: PATCH с задержкой и надписью «Сохранено».

   Возврат на страницу продолжает начатое: номер черновика попадает в адрес сразу после
   создания, поэтому закрытая посреди шага вкладка ничего не теряет. */

export interface CheckoutPageProps {
  search: CheckoutSearch;
  onSearchChange: (next: CheckoutSearch) => void;
}

export function CheckoutPage({ search, onSearchChange }: CheckoutPageProps) {
  const navigate = useAppNavigate();
  const queryClient = useQueryClient();
  const session = useSession();

  const [openStep, setOpenStep] = useState<CheckoutStep | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [promoError, setPromoError] = useState<string | undefined>(undefined);
  const [expired, setExpired] = useState(false);
  const stepOpened = useRef(false);
  // ключ идемпотентности живёт до успешной отправки: повтор после сбоя сети не заведёт
  // второй заказ, а новое оформление получит новый ключ
  const submitKey = useRef(newIdempotencyKey());

  /* ---------------------------------------------------------- черновик и оффер */

  const draftId = search.draft;
  const orderQuery = useQuery({ ...orderOptions(draftId ?? 0), enabled: draftId !== undefined });
  const knownOffer = search.offer ?? orderQuery.data?.offer.id;

  const offerQuery = useQuery({
    ...offerDetailOptions(knownOffer ?? 0),
    enabled: knownOffer !== undefined,
  });
  const offer = offerQuery.data;
  const order = orderQuery.data;

  /* ---------------------------------------------------------- котировка */

  const qty = search.qty ?? order?.params.qty;
  const optionIds = useMemo(
    () =>
      search.options === undefined ? (order?.params.optionIds ?? []) : selectedOptionIds(search),
    [search, order?.params.optionIds],
  );
  const deliveryId = search.delivery ?? order?.delivery?.optionId;
  const promo = search.promo ?? order?.promo?.code;
  const repeat = search.repeat ?? order?.repeat ?? false;

  const quoteRequest = useMemo(
    () =>
      offer
        ? buildQuoteRequest(offer, {
            qty: qty ?? offer.moq,
            optionIds,
            deliveryId,
            repeat,
            promo,
          })
        : undefined,
    [offer, qty, optionIds, deliveryId, repeat, promo],
  );

  const quoteQuery = useQuery(
    quoteOptions(quoteRequest ?? { offerId: 0, qty: 0, optionIds: [] }, quoteRequest !== undefined),
  );
  const quote: Quote | undefined = quoteQuery.data;
  const quoteId = quote?.id;

  // черновика ещё нет — создаём его из свежей котировки и кладём номер в адрес
  const createQuery = useQuery({
    ...draftForQuoteOptions(quoteId),
    enabled: draftId === undefined && quoteId !== undefined,
  });

  useEffect(() => {
    const created = createQuery.data;
    if (draftId === undefined && created) {
      onSearchChange({ ...search, draft: created.id });
      queryClient.setQueryData(ORDER_KEYS.detail(created.id), created);
    }
    // onSearchChange и search меняются каждый рендер — следим только за появлением черновика
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createQuery.data, draftId]);

  const current = order ?? createQuery.data;

  /* ---------------------------------------------------------- мутации */

  const patch = useMutation({
    mutationFn: (body: UpdateOrderDraftBody) => {
      if (!current) throw new Error("Черновик ещё не создан");
      return getApiService().updateOrderDraft(current.id, body);
    },
    onMutate: () => {
      setSaveState("saving");
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(ORDER_KEYS.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      setSaveState("saved");
      setSubmitError(undefined);
    },
    onError: (error) => {
      setSaveState("error");
      if (isApiError(error) && error.problem?.type?.endsWith("quote-expired") === true) {
        setExpired(true);
      }
    },
  });

  const onPatch = useCallback(
    (body: UpdateOrderDraftBody) => {
      patch.mutate(body);
    },
    [patch],
  );

  // новая котировка — новая цена заказа: привязываем её к черновику одним местом
  useEffect(() => {
    if (!current || !quoteId || current.status !== "draft") return;
    if (current.quoteId === quoteId) return;
    patch.mutate({ quoteId });
    // мутация нестабильна между рендерами — следим за самим фактом смены котировки
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId, current?.id, current?.quoteId, current?.status]);

  const artwork = useArtworkQueue(current?.id, {
    onUploaded: (updated) => {
      queryClient.setQueryData(ORDER_KEYS.detail(updated.id), updated);
    },
  });

  const submit = useMutation({
    mutationFn: () => {
      if (!current) throw new Error("Черновик ещё не создан");
      return getApiService().submitOrder(current.id, submitKey.current);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(ORDER_KEYS.detail(result.order.id), result.order);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      submitKey.current = newIdempotencyKey();
      navigate({ to: `/order/${String(result.order.id)}/pay`, replace: true });
    },
    onError: (error) => {
      if (!isApiError(error)) {
        setSubmitError("Не получилось оформить заказ. Попробуйте ещё раз — черновик сохранён.");
        return;
      }
      if (error.problem?.type?.endsWith("quote-expired") === true) {
        setExpired(true);
        setSubmitError(undefined);
        return;
      }
      const fields = error.fieldErrors;
      const firstField = fields ? Object.keys(fields)[0] : undefined;
      if (firstField !== undefined) {
        setOpenStep(stepOfField(firstField));
        setSubmitError(fields?.[firstField]?.[0] ?? error.message);
        return;
      }
      setSubmitError(error.message);
    },
  });

  /* ---------------------------------------------------------- состояние шагов */

  const local: LocalCheckoutState = useMemo(() => ({ offerAccepted: accepted }), [accepted]);

  const currentId = current?.id;

  // принятая оферта переживает перезагрузку только в браузере — сервер её не хранит
  useEffect(() => {
    if (currentId !== undefined) setAccepted(readOfferAccepted(currentId));
  }, [currentId]);

  const onAcceptedChange = useCallback(
    (next: boolean) => {
      setAccepted(next);
      if (currentId !== undefined) writeOfferAccepted(currentId, next);
    },
    [currentId],
  );

  // на экран приходят на первый незаполненный шаг, а не на первый по порядку
  useEffect(() => {
    if (!current || stepOpened.current) return;
    stepOpened.current = true;
    setOpenStep(firstIncompleteStep(current, { offerAccepted: readOfferAccepted(current.id) }));
  }, [current]);

  // котировка истекает, пока страница открыта: проверяем по часам, а не по событию
  useEffect(() => {
    const validUntil = current?.quoteValidUntil;
    if (validUntil === null || validUntil === undefined) return;
    const check = () => {
      setExpired(Date.parse(validUntil) <= Date.now());
    };
    check();
    const timer = setInterval(check, 30_000);
    return () => {
      clearInterval(timer);
    };
  }, [current?.quoteValidUntil]);

  /* ---------------------------------------------------------- действия */

  const recalculate = useCallback(() => {
    setExpired(false);
    void queryClient.invalidateQueries({ queryKey: QUOTE_KEYS.all });
  }, [queryClient]);

  const applyPromo = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (trimmed.length === 0 || !offer) return;
      setPromoError(undefined);
      const request = buildQuoteRequest(offer, {
        qty: qty ?? offer.moq,
        optionIds,
        deliveryId,
        repeat,
        promo: trimmed,
      });
      // проверяем код отдельным расчётом: 422 должен остаться в поле, а не обнулить итог
      void queryClient
        .fetchQuery(quoteOptions(request))
        .then(() => {
          onSearchChange({ ...search, promo: trimmed });
        })
        .catch((error: unknown) => {
          setPromoError(
            isApiError(error) ? (error.problem?.detail ?? error.message) : "Промокод не подошёл",
          );
        });
    },
    [offer, qty, optionIds, deliveryId, repeat, queryClient, onSearchChange, search],
  );

  /* ---------------------------------------------------------- отрисовка */

  /* Ни оффера, ни черновика в адресе: `/order/new` сам по себе оформлять нечего.
     Без этой ветки экран висел бы на скелетоне вечно — ждать было бы нечего. */
  if (search.offer === undefined && draftId === undefined) {
    return (
      <ErrorPage
        code="400"
        title="Не выбрано предложение"
        description="Откройте карточку предложения и нажмите «Оформить партию» — расчёт перенесётся сюда."
        actions={
          <Button asChild variant="cta">
            <AppLink to="/catalog">В каталог</AppLink>
          </Button>
        }
      />
    );
  }

  if (offerQuery.isError || orderQuery.isError) {
    const error = offerQuery.error ?? orderQuery.error;
    const notFound = isApiError(error) && error.status === 404;
    return (
      <ErrorPage
        code={notFound ? "404" : "500"}
        title={notFound ? "Оформление не найдено" : "Не удалось открыть оформление"}
        description={
          notFound
            ? "Возможно, черновик удалён или предложение снято с публикации."
            : "Попробуйте обновить страницу — черновик сохранён на сервере."
        }
        correlationId={isApiError(error) ? error.correlationId : undefined}
        actions={
          <Button asChild variant="cta">
            <AppLink to="/catalog">В каталог</AppLink>
          </Button>
        }
      />
    );
  }

  if (!current || !offer || !quote) return <CheckoutSkeleton />;

  if (current.status !== "draft") {
    return (
      <Box className="my-3">
        <h1 className="font-heading text-xl font-bold">Заказ № {current.id} уже оформлен</h1>
        <p className="text-muted mt-1.5">
          Черновик превратился в заказ — менять его теперь можно только через фабрику.
        </p>
        <div className="mt-3 flex gap-2">
          <Button asChild variant="cta">
            <AppLink to={`/order/${String(current.id)}/pay`}>К счёту</AppLink>
          </Button>
          <Button asChild>
            <AppLink to="/account/orders">Мои заказы</AppLink>
          </Button>
        </div>
      </Box>
    );
  }

  const states = stepStates(current, local, openStep);
  const blocking = firstIncompleteStep(current, local);
  const customerOrgs = session.organizations.filter((org) => org.kind === "customer");

  const open = (step: CheckoutStep) => {
    setOpenStep((prev) => (prev === step ? null : step));
  };
  const nextOf = (step: CheckoutStep) => nextStepAfter(step, current, local);
  const advance = (step: CheckoutStep) => {
    setOpenStep(nextOf(step));
  };

  return (
    <div className="pb-6">
      <p className="py-2 text-[13px]">
        <AppLink to={`/offer/${String(offer.id)}`} className="text-action">
          ‹ Вернуться к предложению
        </AppLink>
      </p>
      <h1 className="font-heading mb-3 text-2xl font-bold">Оформление партии</h1>

      {submitError !== undefined && (
        <Alert kind="danger" className="mb-2.5" title="Оформление не закончено">
          {submitError}
        </Alert>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <div>
          <StepAccordionItem
            index={1}
            title={STEP_TITLES.params}
            state={states.params}
            summary={paramsSummary(current)}
            onOpen={() => {
              open("params");
            }}
          >
            <ParamsStep
              order={current}
              offer={offer}
              qty={current.params.qty}
              optionIds={optionIds}
              saveState={saveState}
              localArtwork={artwork.local}
              artworkBusy={artwork.busy}
              onPatch={onPatch}
              onQtyChange={(next) => {
                onSearchChange({ ...search, qty: next });
              }}
              onToggleOption={(id, on) => {
                const next = on
                  ? [...new Set([...optionIds, id])]
                  : optionIds.filter((item) => item !== id);
                onSearchChange({
                  ...search,
                  options: next.length > 0 ? next.join(",") : undefined,
                });
              }}
              onAddArtwork={artwork.add}
              onRemoveArtwork={artwork.remove}
              onDismissLocalArtwork={artwork.dismiss}
              onDone={() => {
                advance("params");
              }}
              nextLabel={nextStepLabel(nextOf("params"))}
            />
          </StepAccordionItem>

          <StepAccordionItem
            index={2}
            title={STEP_TITLES.delivery}
            state={states.delivery}
            summary={deliverySummary(current)}
            onOpen={() => {
              open("delivery");
            }}
          >
            <DeliveryStep
              order={current}
              offer={offer}
              selectedId={current.delivery?.optionId ?? deliveryId}
              saveState={saveState}
              onPatch={onPatch}
              onOptionChange={(optionId) => {
                onSearchChange({ ...search, delivery: optionId });
              }}
              onDone={() => {
                advance("delivery");
              }}
              nextLabel={nextStepLabel(nextOf("delivery"))}
            />
          </StepAccordionItem>

          <StepAccordionItem
            index={3}
            title={STEP_TITLES.payer}
            state={states.payer}
            summary={payerSummary(current)}
            onOpen={() => {
              open("payer");
            }}
          >
            <PayerStep
              order={current}
              organizations={customerOrgs}
              accepted={accepted}
              saveState={saveState}
              onPatch={onPatch}
              onAcceptedChange={onAcceptedChange}
              onDone={() => {
                advance("payer");
              }}
              nextLabel={nextStepLabel(nextOf("payer"))}
            />
          </StepAccordionItem>

          <StepAccordionItem
            index={4}
            title={STEP_TITLES.payment}
            state={states.payment}
            summary={paymentSummary(current)}
            onOpen={() => {
              open("payment");
            }}
          >
            <PaymentStep order={current} saveState={saveState} onPatch={onPatch} />
          </StepAccordionItem>
        </div>

        <TotalBox
          order={current}
          quote={quote}
          recalculating={quoteQuery.isFetching || patch.isPending}
          promo={promo}
          promoError={promoError}
          promoPending={false}
          onApplyPromo={applyPromo}
          onClearPromo={() => {
            setPromoError(undefined);
            onSearchChange({ ...search, promo: undefined });
          }}
          expired={expired}
          onRecalculate={recalculate}
          submitLabel="Оплатить в эскроу"
          submitDisabled={blocking !== null}
          submitPending={submit.isPending}
          onSubmit={() => {
            setSubmitError(undefined);
            submit.mutate();
          }}
          blockedReason={blocking === null ? undefined : `Заполните шаг «${STEP_TITLES[blocking]}»`}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ сводки шагов */

function paramsSummary(order: Order): string {
  const colors = order.params.colors
    .map((line) => `${line.color} ${formatNumber(line.qty)}`)
    .join(" / ");
  const sizes = order.params.sizes.map((line) => line.size);
  const range = sizes.length > 1 ? `${sizes[0] ?? ""}–${sizes[sizes.length - 1] ?? ""}` : sizes[0];
  const files = order.artwork.filter((file) => file.status !== "failed").length;
  return [
    `${formatNumber(order.params.qty)} шт`,
    colors,
    range,
    order.params.print ?? undefined,
    files > 0 ? `макет: ${String(files)}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

function deliverySummary(order: Order): string {
  if (!order.delivery) return "не выбрана";
  const parts = [`${order.delivery.title} · ${formatRub(order.delivery.price)}`];
  if (order.delivery.address !== null) parts.push(order.delivery.address);
  return parts.join(" · ");
}

function payerSummary(order: Order): string {
  if (!order.payer) return "не выбран";
  return `${order.payer.name} · ИНН ${order.payer.inn}`;
}

function paymentSummary(order: Order): string {
  const option = order.paymentOptions.find((item) => item.method === order.paymentMethod);
  return option?.title ?? "не выбран";
}

/* ------------------------------------------------------------------ вспомогательное */

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `idem-${String(Date.now())}-${Math.random().toString(36).slice(2)}`;
}

function CheckoutSkeleton() {
  return (
    <div className="py-6">
      <Skeleton className="mb-3 h-8 w-64" />
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-2.5">
          {CHECKOUT_STEPS.map((step) => (
            <Skeleton key={step} className="h-14 w-full rounded-[10px]" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-[10px]" />
      </div>
    </div>
  );
}
