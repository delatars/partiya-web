import { createFileRoute, notFound } from "@tanstack/react-router";

import { OfferPage, parseOfferSearch } from "@/modules/offer";
import { offerDetailOptions } from "@/shared/api";

/* /offer/$offerId — карточка предложения. Состояние калькулятора (объём, опции,
   доставка, вкладка) целиком лежит в типизированных search-params: ссылкой на расчёт
   можно поделиться, а перезагрузка его не теряет. */
export const Route = createFileRoute("/_public/offer/$offerId")({
  validateSearch: (input: Record<string, unknown>) => parseOfferSearch(input),
  loader: ({ context, params }) => {
    const offerId = Number.parseInt(params.offerId, 10);
    // «/offer/худи» — это не 404 от сервера, а битый адрес: до сети идти незачем
    if (!Number.isInteger(offerId) || offerId <= 0) throw notFound();

    /* Запрос стартует вместе с навигацией, но результата здесь не ждём: 404 и ошибку
       сети показывает сама страница (внутри шапки, с кнопкой «в каталог»), а брошенная
       из loader ошибка ушла бы в общий errorComponent и потеряла бы этот контекст. */
    void context.queryClient.prefetchQuery(offerDetailOptions(offerId));
  },
  component: OfferRoute,
});

function OfferRoute() {
  const { offerId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <OfferPage
      offerId={Number.parseInt(offerId, 10)}
      search={search}
      // replace: крутилка объёма не должна забивать историю браузера
      onChange={(next) => void navigate({ search: next, replace: true })}
    />
  );
}
