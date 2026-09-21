import type { RankingPreview } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  Button,
  DataTable,
  Input,
  PageHeader,
  ProgressBar,
  Skeleton,
  Tag,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ADMIN_KEYS, adminRankingOptions, getApiService, isApiError } from "@/shared/api";
import { formatNumber } from "@/shared/lib/format";

/* Макет: экран `admin-ranking` — веса формулы «Популярные», штрафы, бейджи, промокоды.

   Сумма весов обязана быть 100: формулу нужно уметь объяснить заводу («почему я на
   третьем месте»). Проверку делает и сервер — 422, если сумма другая. */

export function AdminRankingPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(adminRankingOptions());
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<RankingPreview | null>(null);

  useEffect(() => {
    if (!data) return;
    setWeights(Object.fromEntries(data.weights.map((item) => [item.key, String(item.weight)])));
  }, [data]);

  const apply = useMutation({
    mutationFn: () =>
      getApiService().updateAdminRanking({
        weights: Object.entries(weights).map(([key, value]) => ({
          key,
          weight: Number(value) || 0,
        })),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.ranking() }),
  });

  const runPreview = useMutation({
    mutationFn: () =>
      getApiService().previewAdminRanking({
        weights: Object.entries(weights).map(([key, value]) => ({
          key,
          weight: Number(value) || 0,
        })),
      }),
    onSuccess: setPreview,
  });

  if (isPending || !data) {
    return (
      <>
        <PageHeader title="Ранжирование и промо" subtitle="Формула сортировки «Популярные»" />
        <Skeleton className="h-64" />
      </>
    );
  }

  const sum = Object.values(weights).reduce((total, value) => total + (Number(value) || 0), 0);

  return (
    <>
      <PageHeader
        title="Ранжирование и промо"
        subtitle="Формула сортировки «Популярные». Должна быть объяснима заводу."
      />

      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Box>
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base font-bold">Веса</h3>
            <span className={sum === 100 ? "text-success text-[13px]" : "text-danger text-[13px]"}>
              сумма {sum} из 100
            </span>
          </div>
          <div className="mt-2 grid gap-1.5">
            {data.weights.map((weight) => (
              <div
                key={weight.key}
                className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 text-[13px] sm:grid-cols-[minmax(9rem,1fr)_2fr_auto]"
              >
                <span>{weight.title}</span>
                <ProgressBar
                  className="order-last col-span-2 sm:order-none sm:col-span-1"
                  label={weight.title}
                  value={Number(weights[weight.key] ?? 0)}
                />
                <Input
                  size="sm"
                  numeric
                  inputMode="numeric"
                  className="w-16"
                  aria-label={`Вес: ${weight.title}`}
                  value={weights[weight.key] ?? ""}
                  onChange={(event) => {
                    setWeights((current) => ({ ...current, [weight.key]: event.target.value }));
                  }}
                />
              </div>
            ))}
          </div>

          <h4 className="mt-4 text-[13px] font-bold">Штрафы</h4>
          <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[13px]">
            {data.penalties.map((penalty) => (
              <div key={penalty.key} className="contents">
                <dt className="text-muted">{penalty.title}</dt>
                <dd className="m-0 text-right">{penalty.effect}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="cta" disabled={apply.isPending} onClick={() => apply.mutate()}>
              {apply.isPending ? "Применяем…" : "Применить"}
            </Button>
            <Button disabled={runPreview.isPending} onClick={() => runPreview.mutate()}>
              Предпросмотр выдачи
            </Button>
          </div>
          {apply.error ? (
            <Alert kind="danger" className="mt-2" title="Веса не применены">
              {isApiError(apply.error) ? apply.error.message : "Ошибка"}
            </Alert>
          ) : null}
          {data.appliedAt === null ? null : (
            <p className="text-muted mt-2 text-[12.5px]">
              Последнее применение: {new Date(data.appliedAt).toLocaleString("ru-RU")}
            </p>
          )}
        </Box>

        <div>
          <Box>
            <h3 className="font-heading text-base font-bold">Бейджи</h3>
            <table className="mt-2 w-full border-collapse text-[13px]">
              <tbody>
                {data.badges.map((badge) => (
                  <tr key={badge.key} className="border-border border-b last:border-0">
                    <td className="py-1.5 pe-2">
                      <Tag tone={badge.tone}>{badge.title}</Tag>
                    </td>
                    <td className="text-muted py-1.5 text-[12.5px]">{badge.rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          <Box className="mt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold">Промокоды</h3>
              <Button size="sm" disabled>
                + Промокод
              </Button>
            </div>
            <DataTable
              className="mt-2"
              rows={data.promos}
              rowKey={(row) => row.code}
              scrollable
              minWidth={420}
              columns={[
                { key: "code", header: "Код", cell: (row) => <b className="num">{row.code}</b> },
                { key: "percent", header: "Скидка", cell: (row) => `${String(row.percent)} %` },
                {
                  key: "condition",
                  header: "Условие",
                  cell: (row) => <span className="text-muted text-[12.5px]">{row.condition}</span>,
                },
                {
                  key: "used",
                  header: "Использован",
                  align: "right",
                  cell: (row) => <span className="num">{formatNumber(row.used)}</span>,
                },
              ]}
            />
          </Box>

          {preview === null ? null : (
            <Box className="mt-3">
              <h3 className="font-heading text-base font-bold">
                Предпросмотр выдачи · изменений: {preview.moved}
              </h3>
              <DataTable
                className="mt-2"
                rows={preview.rows}
                rowKey={(row) => row.offerId}
                scrollable
                minWidth={420}
                columns={[
                  { key: "title", header: "Предложение", cell: (row) => row.title },
                  { key: "factory", header: "Завод", cell: (row) => row.factoryName },
                  {
                    key: "move",
                    header: "Позиция",
                    align: "right",
                    cell: (row) => (
                      <span className="num">
                        {row.positionNow} → {row.positionNext}
                      </span>
                    ),
                  },
                ]}
              />
            </Box>
          )}
        </div>
      </div>
    </>
  );
}
