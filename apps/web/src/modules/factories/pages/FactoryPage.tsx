import {
  Box,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  Button,
  cn,
  Placeholder,
  Rating,
  Skeleton,
  Tag,
} from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { factoryDetailOptions, isApiError } from "@/shared/api";
import { formatIsoDate } from "@/shared/lib/dates";
import { formatNumber } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { AppLink, ErrorPage, OfferCard } from "@/shared/ui";

/* Макет: экран factory-page. Шапка профиля с показателями, предложения завода,
   «О производстве» с фото цеха, отзывы; в правой колонке — аудит и загрузка по неделям. */

/** Ниже этого порога неделя считается недозагруженной — в макете такие столбцы янтарные. */
const UNDERLOAD_BELOW = 30;

export function FactoryPage({ factoryId }: { factoryId: number }) {
  const query = useQuery(factoryDetailOptions(factoryId));
  const factory = query.data;

  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404;
    return notFound ? (
      <ErrorPage
        code="404"
        title="Завод не найден"
        description="Возможно, производство ушло с платформы или ссылка устарела."
        actions={
          <Button asChild variant="cta">
            <AppLink to="/factories">Все заводы</AppLink>
          </Button>
        }
      />
    ) : (
      <ErrorPage
        code="500"
        title="Не получилось загрузить витрину завода"
        description="Проблема на нашей стороне, мы уже знаем."
        correlationId={isApiError(query.error) ? query.error.correlationId : undefined}
        actions={
          <Button variant="cta" onClick={() => void query.refetch()}>
            Повторить
          </Button>
        }
      />
    );
  }

  if (!factory) return <FactorySkeleton />;

  const offers = factory.offers ?? [];
  const firstOffer = offers[0];

  return (
    <>
      <Breadcrumbs>
        <BreadcrumbLink asChild>
          <AppLink to="/">Главная</AppLink>
        </BreadcrumbLink>
        <BreadcrumbLink asChild>
          <AppLink to="/factories">Заводы</AppLink>
        </BreadcrumbLink>
        <BreadcrumbPage>«{factory.name}»</BreadcrumbPage>
      </Breadcrumbs>

      <Box padding="lg" className="grid items-start gap-4.5 md:grid-cols-[auto_1fr_auto]">
        <span
          aria-hidden="true"
          className="bg-header font-heading grid size-18 place-items-center rounded-[16px] text-[28px] font-bold text-white"
        >
          {factory.name.slice(0, 1)}
        </span>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {factory.auditedAt ? (
              <Tag tone="ok">аудит платформы {formatIsoDate(factory.auditedAt)}</Tag>
            ) : (
              <Tag tone="done">аудит не пройден</Tag>
            )}
            {factory.respondsInMinutes === undefined ? null : (
              <Tag tone="new">отвечает за {factory.respondsInMinutes} мин</Tag>
            )}
          </div>

          <h1 className="font-heading mt-1.5 mb-0.5 text-2xl leading-[1.2] font-bold">
            {factory.specialization ?? "Производство"} «{factory.name}»
          </h1>
          <p className="text-muted">
            {factory.city}
            {factory.since === undefined ? "" : ` · производство с ${String(factory.since)} года`}
            {` · ${formatNumber(factory.workers)} ${plural(factory.workers, ["сотрудник", "сотрудника", "сотрудников"])}`}
            {factory.onPlatformSince ? ` · на платформе ${factory.onPlatformSince}` : ""}
          </p>

          <dl className="mt-3.5 flex flex-wrap gap-x-6.5 gap-y-3">
            <Stat label={`${formatNumber(factory.reviews)} отзывов`}>
              <Rating value={factory.rating} />
            </Stat>
            <Stat label="заказов выполнено">{formatNumber(factory.completedOrders ?? 0)}</Stat>
            {factory.onTimePct === undefined ? null : (
              <Stat label="отгружено в срок">{factory.onTimePct} %</Stat>
            )}
            {factory.disputes === undefined ? null : (
              <Stat label={factory.disputesNote ?? "споров"}>
                {factory.disputes} {plural(factory.disputes, ["спор", "спора", "споров"])}
              </Stat>
            )}
            <Stat label="ед./мес мощность">{formatNumber(factory.capacityPerMonth)}</Stat>
            <Stat label="свободно в сентябре">{factory.freeCapacityPct} %</Stat>
          </dl>
        </div>

        <div className="flex flex-col gap-1.5">
          {firstOffer ? (
            <Button asChild variant="cta">
              <AppLink to={`/offer/${String(firstOffer.id)}`} search={{ tab: "questions" }}>
                Задать вопрос
              </AppLink>
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <AppLink to="/catalog" search={{ q: factory.name }}>
              Все предложения
            </AppLink>
          </Button>
        </div>
      </Box>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="font-heading mb-2.5 text-lg font-bold">
            Предложения {formatNumber(offers.length)}
          </h2>
          {offers.length === 0 ? (
            <Box className="text-muted">Завод пока ничего не опубликовал.</Box>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          )}

          <h2 className="font-heading mt-5 mb-2.5 text-lg font-bold">О производстве</h2>
          <Box>
            {factory.about ? <p className="mb-2.5">{factory.about}</p> : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(factory.gallery ?? []).map((image) => (
                <Placeholder
                  key={image.label}
                  tone={image.tone}
                  radius="control"
                  label={image.label}
                  className="aspect-[4/3]"
                />
              ))}
            </div>
          </Box>

          {(factory.recentReviews ?? []).length === 0 ? null : (
            <>
              <h2 className="font-heading mt-5 mb-2.5 text-lg font-bold">
                Отзывы {formatNumber(factory.reviews)}
              </h2>
              <Box>
                {(factory.recentReviews ?? []).map((review) => (
                  <article
                    key={review.id}
                    className="border-border border-b border-dashed py-2.5 text-[13.5px] last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <b>{review.author}</b>
                      <Rating value={review.rating} meta={`· ${review.when}`} />
                    </div>
                    <p className="mt-1">{review.text}</p>
                  </article>
                ))}
              </Box>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-3">
          <Box>
            <h3 className="font-heading text-sm font-bold">Аудит платформы</h3>
            {factory.audit ? (
              <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-[13.5px]">
                {factory.audit.checks.map((check) => (
                  <div key={check.label} className="contents">
                    <dt className="text-muted">{check.label}</dt>
                    <dd className={cn("m-0", check.passed ? "text-success" : "text-muted")}>
                      {check.passed ? "✓" : "—"}
                    </dd>
                  </div>
                ))}
                <dt className="text-muted">Действителен до</dt>
                <dd className="m-0">{formatIsoDate(factory.audit.validUntil)}</dd>
              </dl>
            ) : (
              <p className="text-muted mt-2 text-[13.5px]">
                Завод ещё не проходил выездную проверку. Эскроу и арбитраж платформы работают и
                здесь, но бейджа аудита нет.
              </p>
            )}
          </Box>

          {(factory.capacityWeeks ?? []).length === 0 ? null : (
            <Box>
              <h3 className="font-heading text-sm font-bold">Загрузка по неделям</h3>
              <div className="mt-2 flex h-[70px] items-end gap-1.5">
                {(factory.capacityWeeks ?? []).map((week) => {
                  const low = week.loadPct < UNDERLOAD_BELOW;
                  return (
                    <div
                      key={week.label}
                      className="text-muted flex h-full flex-1 flex-col justify-end gap-1 text-center text-[10.5px]"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "block rounded-t-[3px] opacity-85",
                          low ? "bg-warning" : "bg-action",
                        )}
                        style={{ height: `${String(week.loadPct)}%` }}
                      />
                      <span>{week.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-muted mt-2 text-[12.5px]">
                Янтарным — недозагруз: на эти недели действует скидка −15 %.
              </p>
            </Box>
          )}
        </aside>
      </div>
    </>
  );
}

/* .fp-stats макета: крупное значение, под ним подпись. В DOM dt идёт первым —
   порядок переворачивает flex, чтобы разметка списка определений осталась корректной. */
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="font-heading m-0 text-lg font-extrabold">{children}</dd>
    </div>
  );
}

function FactorySkeleton() {
  return (
    <div aria-busy="true" aria-label="Загружаем витрину завода">
      <Box padding="lg" className="mt-3 grid gap-4.5 md:grid-cols-[auto_1fr]">
        <Skeleton className="size-18 rounded-[16px]" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-7 w-[60%]" />
          <Skeleton className="h-3.5 w-[70%]" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Box>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-72 rounded-[10px]" />
        ))}
      </div>
    </div>
  );
}
