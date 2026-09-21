import {
  Box,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  Button,
  cn,
  Price,
  Rating,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
} from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Heart, MessageSquare } from "lucide-react";

import {
  isApiError,
  offerDetailOptions,
  offerQuestionsOptions,
  offerReviewsOptions,
  offerSimilarOptions,
  quoteOptions,
} from "@/shared/api";
import { categoryHref, resolveCategoryPath } from "@/shared/lib/categories";
import { formatNumber, formatRub, toRubles } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import {
  AppLink,
  ErrorPage,
  OfferBadges,
  useCompareTrayOffset,
  useOfferListActions,
} from "@/shared/ui";

import { BuyBox } from "../components/BuyBox";
import { Gallery } from "../components/Gallery";
import { OfferSkeleton } from "../components/OfferSkeleton";
import { QAList } from "../components/QAList";
import { ReviewList } from "../components/ReviewList";
import { SimilarRow } from "../components/SimilarRow";
import { SpecTable } from "../components/SpecTable";
import { TierLadder } from "../components/TierLadder";
import type { OfferSearch, OfferTab } from "../lib/search-params";
import { DEFAULT_OFFER_TAB, effectiveQty, toQuoteRequest, withPatch } from "../lib/search-params";

/* Макет: экран offer. Галерея, характеристики, лестница ступеней, калькулятор партии,
   вкладки и «Похожие предложения».

   Весь ввод калькулятора лежит в search-params: карточка ничего не хранит, а значит
   ссылка на расчёт открывается у другого человека ровно такой же. */

const TABS_ANCHOR = "offer-tabs";

export type OfferPageProps = {
  offerId: number;
  search: OfferSearch;
  onChange: (next: OfferSearch) => void;
};

export function OfferPage({ offerId, search, onChange }: OfferPageProps) {
  const offerQuery = useQuery(offerDetailOptions(offerId));
  const offer = offerQuery.data;

  const quoteQuery = useQuery(
    // без оффера считать нечего: ни MOQ, ни ступеней, ни кодов опций
    quoteOptions(
      offer ? toQuoteRequest(offer, search) : { offerId, qty: 0, optionIds: [] },
      offer !== undefined,
    ),
  );

  const similar = useQuery({ ...offerSimilarOptions(offerId), enabled: offer !== undefined });
  const questions = useQuery({ ...offerQuestionsOptions(offerId), enabled: offer !== undefined });
  const reviews = useQuery({ ...offerReviewsOptions(offerId), enabled: offer !== undefined });

  const actions = useOfferListActions(
    offer ?? {
      id: offerId,
      title: "",
      priceFrom: 0,
      moq: 0,
      leadDaysMin: 0,
      freeCapacityPct: 0,
      sampleAvailable: false,
      badges: [],
      factory: { id: 0, name: "", city: "", rating: 0, reviews: 0 },
    },
  );

  if (offerQuery.isError) {
    const notFound = isApiError(offerQuery.error) && offerQuery.error.status === 404;
    return notFound ? (
      <ErrorPage
        code="404"
        title="Предложение не найдено"
        description="Возможно, фабрика сняла его с публикации. Похожее почти наверняка есть в каталоге."
        actions={
          <Button asChild variant="cta">
            <AppLink to="/catalog">В каталог</AppLink>
          </Button>
        }
      />
    ) : (
      <ErrorPage
        code="500"
        title="Не получилось загрузить предложение"
        description="Проблема на нашей стороне, мы уже знаем."
        correlationId={isApiError(offerQuery.error) ? offerQuery.error.correlationId : undefined}
        actions={
          <Button variant="cta" onClick={() => void offerQuery.refetch()}>
            Повторить
          </Button>
        }
      />
    );
  }

  if (!offer) return <OfferSkeleton />;

  const chain = resolveCategoryPath(offer.categoryPath ?? []);
  const qty = effectiveQty(search, offer.moq);
  const tab: OfferTab = search.tab ?? DEFAULT_OFFER_TAB;
  const spec = (name: string) => offer.specs.find((row) => row.name === name)?.value;
  const materialSpec = spec("Материал") ?? offer.material;
  const printSpec = spec("Печать");
  const questionCount = questions.data?.total ?? offer.questionCount ?? 0;
  const reviewCount = reviews.data?.total ?? offer.factory.reviews;

  const goToQuestions = () => {
    onChange(withPatch(search, { tab: "questions" }));
    document.getElementById(TABS_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Breadcrumbs>
        <BreadcrumbLink asChild>
          <AppLink to="/catalog">Каталог</AppLink>
        </BreadcrumbLink>
        {chain.map((node, index) => (
          <BreadcrumbLink key={node.slug} asChild>
            <AppLink to={categoryHref((offer.categoryPath ?? []).slice(0, index + 1))}>
              {node.title}
            </AppLink>
          </BreadcrumbLink>
        ))}
        <BreadcrumbPage>{offer.title}</BreadcrumbPage>
      </Breadcrumbs>

      <Box padding="lg">
        <div className="grid items-start gap-5 md:grid-cols-2 lg:grid-cols-[70px_1fr_1.1fr_330px]">
          <Gallery images={offer.images} />

          <div className="min-w-0 md:col-span-2 lg:col-span-1">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <OfferBadges badges={offer.badges} className="flex flex-wrap gap-1.5" />
              {offer.sample ? <Tag tone="smp">образец {formatRub(offer.sample.price)}</Tag> : null}
            </div>

            <h1 className="font-heading mb-2 text-2xl leading-[1.2] font-bold">{offer.title}</h1>

            <div className="mb-3.5 flex flex-wrap items-center gap-3 text-[13px]">
              <Rating
                value={offer.factory.rating}
                meta={`· ${formatNumber(offer.factory.reviews)} ${plural(offer.factory.reviews, ["отзыв", "отзыва", "отзывов"])}`}
              />
              <button type="button" onClick={goToQuestions} className="text-action">
                {formatNumber(questionCount)}{" "}
                {plural(questionCount, ["вопрос", "вопроса", "вопросов"])}
              </button>
              {offer.factory.completedOrders === undefined ? null : (
                <span className="text-muted">
                  {formatNumber(offer.factory.completedOrders)}{" "}
                  {plural(offer.factory.completedOrders, ["заказ", "заказа", "заказов"])} через
                  платформу
                </span>
              )}
              <span className="text-muted">арт. {offer.article ?? offer.id}</span>
            </div>

            <h3 className="font-heading mb-1.5 text-sm font-bold">Цена за шт по объёму</h3>
            <TierLadder
              tiers={offer.tiers}
              qty={qty}
              onPick={(fromQty) => onChange(withPatch(search, { qty: fromQty }))}
            />

            <dl className="grid grid-cols-[minmax(110px,150px)_1fr] gap-x-3 gap-y-1.5 text-[13.5px]">
              <dt className="text-muted">Мин. партия</dt>
              <dd className="m-0">{formatNumber(offer.moq)} шт</dd>

              <dt className="text-muted">Срок</dt>
              <dd className="m-0">
                {offer.leadDaysMin}–{offer.leadDaysMax} раб. дней от согласования макета
              </dd>

              {materialSpec ? (
                <>
                  <dt className="text-muted">Материал</dt>
                  <dd className="m-0">{materialSpec}</dd>
                </>
              ) : null}

              {printSpec ? (
                <>
                  <dt className="text-muted">Печать</dt>
                  <dd className="m-0">{printSpec}</dd>
                </>
              ) : null}

              {offer.capacityNote ? (
                <>
                  <dt className="text-muted">Свободно в сентябре</dt>
                  <dd className="m-0">{offer.capacityNote}</dd>
                </>
              ) : null}

              {offer.acceptanceNote ? (
                <>
                  <dt className="text-muted">Приёмка</dt>
                  <dd className="m-0">{offer.acceptanceNote}</dd>
                </>
              ) : null}
            </dl>

            <div className="mt-3.5 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={actions.compared}
                disabled={actions.compareFull}
                onClick={actions.toggleCompare}
                className={cn(actions.compared && "border-action bg-action-soft text-action")}
              >
                <ArrowLeftRight aria-hidden="true" className="size-4" />
                {actions.compared ? "В сравнении" : "В сравнение"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={actions.favorite}
                onClick={actions.toggleFavorite}
                className={cn(actions.favorite && "border-danger bg-danger-soft text-danger")}
              >
                <Heart
                  aria-hidden="true"
                  className={cn("size-4", actions.favorite && "fill-current")}
                />
                {actions.favorite ? "В избранном" : "В избранное"}
              </Button>
              <Button variant="ghost" size="sm" onClick={goToQuestions}>
                <MessageSquare aria-hidden="true" className="size-4" />
                Задать вопрос
              </Button>
            </div>
          </div>

          <div id="buy-box" className="md:col-span-2 lg:col-span-1">
            <BuyBox
              offer={offer}
              search={search}
              onChange={onChange}
              quote={quoteQuery.data}
              pending={quoteQuery.isPending}
              recalculating={quoteQuery.isFetching && quoteQuery.data !== undefined}
              error={quoteQuery.error}
              onRetry={() => void quoteQuery.refetch()}
            />
          </div>
        </div>
      </Box>

      <Box id={TABS_ANCHOR} className="mt-3 scroll-mt-3">
        <Tabs
          value={tab}
          onValueChange={(next) =>
            onChange(
              withPatch(search, {
                tab: next === DEFAULT_OFFER_TAB ? undefined : (next as OfferTab),
              }),
            )
          }
        >
          <TabsList className="-mx-4 -mt-4 mb-4 px-4">
            <TabsTrigger value="specs">Характеристики</TabsTrigger>
            <TabsTrigger value="questions">Вопросы {formatNumber(questionCount)}</TabsTrigger>
            <TabsTrigger value="reviews">Отзывы {formatNumber(reviewCount)}</TabsTrigger>
          </TabsList>

          <TabsContent value="specs">
            <SpecTable offer={offer} />
          </TabsContent>

          <TabsContent value="questions">
            <QAList
              offerId={offer.id}
              questions={questions.data?.items ?? []}
              pending={questions.isPending}
            />
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewList reviews={reviews.data?.items ?? []} pending={reviews.isPending} />
          </TabsContent>
        </Tabs>
      </Box>

      <SimilarRow offers={similar.data ?? []} pending={similar.isPending} />

      {/* Ниже 900 px калькулятор уезжает вниз страницы — итог и CTA остаются под рукой */}
      <MobileBuyBar
        total={quoteQuery.data?.total}
        qty={qty}
        recalculating={quoteQuery.isFetching}
        onOpen={() =>
          document
            .getElementById("buy-box")
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      />
    </>
  );
}

function MobileBuyBar({
  total,
  qty,
  recalculating,
  onOpen,
}: {
  total: number | undefined;
  qty: number;
  recalculating: boolean;
  onOpen: () => void;
}) {
  // лоток сравнения тоже прилип к низу — панель встаёт ровно над ним, а не под ним
  const trayOffset = useCompareTrayOffset();

  if (total === undefined) return null;

  return (
    <div
      style={{ bottom: trayOffset }}
      className="bg-surface border-border shadow-tray fixed inset-x-0 z-30 border-t px-5 py-2 md:hidden"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <Price
            className={cn("text-lg transition-opacity", recalculating && "opacity-55")}
            value={toRubles(total)}
          />
          <div className="text-muted text-xs">партия {formatNumber(qty)} шт</div>
        </div>
        <Button variant="cta" className="ms-auto" onClick={onOpen}>
          К расчёту
        </Button>
      </div>
    </div>
  );
}
