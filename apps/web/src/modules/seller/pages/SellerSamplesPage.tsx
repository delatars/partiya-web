import {
  Box,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Placeholder,
  Skeleton,
  Tag,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getApiService, SELLER_KEYS, sellerSampleListOptions } from "@/shared/api";
import { formatRub } from "@/shared/lib/format";
import { AppLink } from "@/shared/ui";

import { SAMPLE_STATUS_TITLE, SAMPLE_STATUS_TONE } from "../lib/view";

/* Макет: экран `seller-samples` — запросы образцов.

   Образец — самый короткий путь к первому заказу, поэтому у строки ровно одно
   следующее действие: принять, отметить отправку с трек-номером или открыть выросший
   из образца заказ. */

export function SellerSamplesPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(sellerSampleListOptions());
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.samples() });

  const accept = useMutation({
    mutationFn: (id: string) => getApiService().acceptSellerSample(id),
    onSuccess: invalidate,
  });
  const ship = useMutation({
    mutationFn: (input: { id: string; trackingNumber: string }) =>
      getApiService().shipSellerSample(input.id, { trackingNumber: input.trackingNumber }),
    onSuccess: invalidate,
  });
  const decline = useMutation({
    mutationFn: (id: string) => getApiService().declineSellerSample(id, { reason: null }),
    onSuccess: invalidate,
  });

  return (
    <>
      <PageHeader
        title="Запросы образцов"
        subtitle={
          data
            ? `Образец — самый короткий путь к первому заказу: ${String(data.conversionPct)} % получивших образец оформляют партию.`
            : "Образец — самый короткий путь к первому заказу."
        }
      />

      {isPending ? (
        <Skeleton className="h-48" />
      ) : (data?.items.length ?? 0) === 0 ? (
        <Box>
          <EmptyState
            title="Запросов образцов пока нет"
            description="Включите образец в предложении — заказчики начнут пробовать."
            action={
              <Button asChild variant="cta">
                <AppLink to="/seller/offers">К предложениям</AppLink>
              </Button>
            }
          />
        </Box>
      ) : (
        <div className="grid gap-2.5">
          {(data?.items ?? []).map((sample) => (
            <Box key={sample.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Placeholder
                  tone={sample.tone ?? "a"}
                  radius="control"
                  className="h-16 w-20 flex-none"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <b className="num">{sample.id}</b>
                    <Tag tone={SAMPLE_STATUS_TONE[sample.status]}>
                      {SAMPLE_STATUS_TITLE[sample.status]}
                    </Tag>
                    {sample.dueNote === null ? null : (
                      <span className="text-muted text-[12.5px]">{sample.dueNote}</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[13.5px]">{sample.title}</div>
                  <div className="text-muted text-[12.5px]">{sample.customer}</div>
                  {sample.trackingNumber === null ? null : (
                    <div className="text-muted num mt-0.5 text-[12.5px]">
                      трек {sample.trackingNumber}
                    </div>
                  )}
                </div>
                <div className="sm:text-right">
                  <div className="text-[13.5px]">
                    Оплачено <b className="num">{formatRub(sample.paid)}</b>
                  </div>
                  {sample.creditNote === null ? null : (
                    <div className="text-muted text-[12.5px]">{sample.creditNote}</div>
                  )}
                </div>
                <div className="flex flex-none flex-col gap-1.5 sm:w-52">
                  {sample.status === "new" ? (
                    <>
                      <Button
                        variant="cta"
                        disabled={accept.isPending}
                        onClick={() => accept.mutate(sample.id)}
                      >
                        Принять
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={decline.isPending}
                        onClick={() => decline.mutate(sample.id)}
                      >
                        Отклонить
                      </Button>
                    </>
                  ) : null}
                  {sample.status === "in_work" ? (
                    <>
                      <Input
                        size="sm"
                        aria-label={`Трек-номер для ${sample.id}`}
                        placeholder="Трек-номер СДЭК"
                        value={tracking[sample.id] ?? ""}
                        onChange={(event) => {
                          setTracking((current) => ({
                            ...current,
                            [sample.id]: event.target.value,
                          }));
                        }}
                      />
                      <Button
                        variant="cta"
                        disabled={ship.isPending}
                        onClick={() =>
                          ship.mutate({
                            id: sample.id,
                            trackingNumber: tracking[sample.id] ?? "",
                          })
                        }
                      >
                        Отметить отправку
                      </Button>
                    </>
                  ) : null}
                  {sample.orderId === null ? null : (
                    <Button asChild>
                      <AppLink to={`/seller/orders/${String(sample.orderId)}`}>К заказу</AppLink>
                    </Button>
                  )}
                </div>
              </div>
            </Box>
          ))}
        </div>
      )}
      {ship.error ? <p className="text-danger mt-2 text-[13px]">{ship.error.message}</p> : null}
    </>
  );
}
