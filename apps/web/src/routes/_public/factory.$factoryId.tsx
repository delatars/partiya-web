import { createFileRoute, notFound } from "@tanstack/react-router";

import { FactoryPage } from "@/modules/factories";
import { factoryDetailOptions } from "@/shared/api";

/* /factory/$factoryId — витрина завода: профиль, аудит, показатели, мощность,
   предложения и отзывы. */
export const Route = createFileRoute("/_public/factory/$factoryId")({
  loader: ({ context, params }) => {
    const factoryId = Number.parseInt(params.factoryId, 10);
    if (!Number.isInteger(factoryId) || factoryId <= 0) throw notFound();
    // 404 и сетевую ошибку показывает страница — здесь только прогрев кэша
    void context.queryClient.prefetchQuery(factoryDetailOptions(factoryId));
  },
  component: FactoryRoute,
});

function FactoryRoute() {
  const { factoryId } = Route.useParams();
  return <FactoryPage factoryId={Number.parseInt(factoryId, 10)} />;
}
