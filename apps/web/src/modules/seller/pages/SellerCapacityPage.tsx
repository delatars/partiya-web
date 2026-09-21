import type { CapacityCell, CapacityCellInput } from "@partiya/api-contracts";
import {
  Alert,
  Box,
  Button,
  Field,
  Input,
  KpiTile,
  PageHeader,
  Skeleton,
  Toggle,
  cn,
} from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { capacityPlanOptions, getApiService, isApiError, SELLER_KEYS } from "@/shared/api";
import { freePctOf, freeUnitsOf, loadPctOf } from "@/shared/lib/capacity";
import { formatNumber } from "@/shared/lib/format";

/* Макет: экран `seller-capacity` — план по линиям и неделям.

   «Свободно %» пересчитывается под рукой теми же функциями, что и на сервере
   (`shared/lib/capacity.ts`): завод правит план и внеплатформенную загрузку прямо в
   сетке, и ждать сохранения, чтобы увидеть результат, незачем. Сохранение всё равно
   пересчитает всё заново — последнее слово за сервером.

   Отрицательного «свободно» не бывает: перебор показывается красной ячейкой, а не
   минусом, — иначе завод бы не заметил, что продал больше, чем может. */

interface CellDraft {
  unitsTotal: string;
  externalUnits: string;
}

function keyOf(lineId: string, weekStart: string): string {
  return `${lineId}:${weekStart}`;
}

export function SellerCapacityPage() {
  const queryClient = useQueryClient();
  const { data: plan, isPending } = useQuery(capacityPlanOptions());
  const [drafts, setDrafts] = useState<Record<string, CellDraft>>({});
  const [coefficients, setCoefficients] = useState<Record<string, string>>({});
  const [rule, setRule] = useState<{ enabled: boolean; thresholdPct: string; percent: string }>({
    enabled: true,
    thresholdPct: "30",
    percent: "15",
  });

  useEffect(() => {
    if (!plan) return;
    const next: Record<string, CellDraft> = {};
    for (const cell of plan.cells) {
      next[keyOf(cell.lineId, cell.weekStart)] = {
        unitsTotal: cell.planned ? String(cell.unitsTotal) : "",
        externalUnits: String(cell.externalUnits),
      };
    }
    setDrafts(next);
    setCoefficients(
      Object.fromEntries(
        plan.itemCoefficients.map((item) => [item.key, String(item.unitsPerItem)]),
      ),
    );
    setRule({
      enabled: plan.underloadDiscount.enabled,
      thresholdPct: String(plan.underloadDiscount.thresholdPct),
      percent: String(plan.underloadDiscount.percent),
    });
  }, [plan]);

  const save = useMutation({
    mutationFn: () => {
      const cells: CapacityCellInput[] = (plan?.cells ?? [])
        .filter((cell) => !plan?.weeks.find((week) => week.weekStart === cell.weekStart)?.past)
        .map((cell) => {
          const draft = drafts[keyOf(cell.lineId, cell.weekStart)];
          return {
            lineId: cell.lineId,
            weekStart: cell.weekStart,
            unitsTotal: numberOf(draft?.unitsTotal ?? "", 0),
            externalUnits: numberOf(draft?.externalUnits ?? "", 0),
          };
        });
      return getApiService().updateCapacityPlan({
        cells,
        itemCoefficients: Object.entries(coefficients).map(([key, value]) => ({
          key,
          unitsPerItem: numberOf(value, 1),
        })),
        underloadDiscount: {
          enabled: rule.enabled,
          thresholdPct: numberOf(rule.thresholdPct, 30),
          percent: numberOf(rule.percent, 15),
        },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.all }),
  });

  const copy = useMutation({
    mutationFn: () => {
      const first = plan?.weeks[0]?.weekStart;
      const target = plan?.weeks[4]?.weekStart;
      if (first === undefined || target === undefined)
        throw new Error("Нет горизонта для копирования");
      return getApiService().copyCapacityPlan({
        fromWeekStart: first,
        toWeekStart: target,
        weeks: 4,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SELLER_KEYS.all }),
  });

  if (isPending || !plan) {
    return (
      <>
        <PageHeader title="Мощность" subtitle="План по линиям и неделям" />
        <Skeleton className="h-64" />
      </>
    );
  }

  const summary = plan.summary;

  /** Ячейка с учётом правок, ещё не отправленных на сервер. */
  function preview(cell: CapacityCell) {
    const draft = drafts[keyOf(cell.lineId, cell.weekStart)];
    const unitsTotal = numberOf(draft?.unitsTotal ?? "", 0);
    const externalUnits = numberOf(draft?.externalUnits ?? "", 0);
    const base = {
      unitsTotal,
      externalUnits,
      hardUnits: cell.hardUnits,
      softUnits: cell.softUnits,
      planned: unitsTotal > 0,
    };
    return {
      ...base,
      freeUnits: freeUnitsOf(base),
      freePct: freePctOf(base),
      loadPct: loadPctOf(base),
      overbooked: base.planned && cell.hardUnits + cell.softUnits + externalUnits > unitsTotal,
    };
  }

  return (
    <>
      <PageHeader
        title="Мощность"
        subtitle="Платформа продаёт только свободный остаток и не даст принять заказов сверх плана."
        actions={
          <>
            <Button disabled={copy.isPending} onClick={() => copy.mutate()}>
              Скопировать 4 недели вперёд
            </Button>
            <Button variant="cta" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Сохраняем…" : "Сохранить план"}
            </Button>
          </>
        }
      />

      {plan.warning === null ? null : (
        <Alert kind="warn" className="mb-3" title={plan.warning.title}>
          {plan.warning.text}
        </Alert>
      )}
      {save.isError ? (
        <Alert kind="danger" className="mb-3" title="План не сохранён">
          {isApiError(save.error) ? save.error.message : "Проверьте значения в сетке"}
        </Alert>
      ) : null}

      <div className="mb-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label={`Загрузка · ${summary.month}`}
          value={`${String(summary.loadPct)} %`}
          delta={`${formatNumber(summary.soldUnits)} из ${formatNumber(summary.totalUnits)} ${summary.unit}`}
        />
        <KpiTile
          label="Свободно на горизонте"
          value={formatNumber(summary.freeUnits)}
          delta="продаётся в каталоге"
        />
        <KpiTile
          label="Вне платформы"
          value={`${String(summary.externalPct)} %`}
          delta="свои клиенты"
        />
        <KpiTile
          label="Недозагруз"
          value={`${String(summary.underloadWeeks)} нед.`}
          delta={
            rule.enabled
              ? `ниже ${rule.thresholdPct} % — включена скидка −${rule.percent} %`
              : "скидка выключена"
          }
          deltaTone={summary.underloadWeeks > 0 ? "warn" : "muted"}
        />
      </div>

      <Box>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-base font-bold">План по линиям и неделям</h2>
          <div className="text-muted flex flex-wrap gap-3 text-[12px]">
            <span className="flex items-center gap-1">
              <i className="bg-action inline-block size-2.5 rounded-[2px]" aria-hidden="true" />
              продано через платформу
            </span>
            <span className="flex items-center gap-1">
              <i className="bg-warning inline-block size-2.5 rounded-[2px]" aria-hidden="true" />
              занято вне платформы
            </span>
            <span className="flex items-center gap-1">
              <i
                className="bg-border-strong inline-block size-2.5 rounded-[2px]"
                aria-hidden="true"
              />
              свободно
            </span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="text-muted border-border border-b px-2 py-2 text-left text-[11.5px] font-medium tracking-[0.03em] uppercase"
                >
                  Линия
                </th>
                {plan.weeks.map((week) => (
                  <th
                    key={week.weekStart}
                    scope="col"
                    className="text-muted border-border border-b px-1.5 py-2 text-center text-[11.5px] font-medium"
                  >
                    {week.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.lines.map((line) => (
                <tr key={line.id} className="border-border border-b align-top last:border-0">
                  <th scope="row" className="px-2 py-2 text-left text-[13px] font-medium">
                    {line.title}
                    <div className="text-muted text-[11.5px]">
                      план по умолчанию {formatNumber(line.defaultUnitsPerWeek)}
                    </div>
                  </th>
                  {plan.weeks.map((week) => {
                    const cell = plan.cells.find(
                      (item) => item.lineId === line.id && item.weekStart === week.weekStart,
                    );
                    if (!cell) return <td key={week.weekStart} />;
                    const view = preview(cell);
                    const key = keyOf(line.id, week.weekStart);
                    const draft = drafts[key];
                    const soldPct =
                      view.unitsTotal > 0
                        ? Math.min(
                            100,
                            Math.round(((cell.hardUnits + cell.softUnits) / view.unitsTotal) * 100),
                          )
                        : 0;
                    const extPct =
                      view.unitsTotal > 0
                        ? Math.min(
                            100 - soldPct,
                            Math.round((view.externalUnits / view.unitsTotal) * 100),
                          )
                        : 0;

                    return (
                      <td key={week.weekStart} className="px-1 py-1.5 align-top">
                        <div
                          className={cn(
                            "rounded-control border-border grid gap-1 border p-1.5 text-center",
                            view.overbooked && "border-danger bg-danger-soft",
                            !view.overbooked &&
                              view.planned &&
                              (view.loadPct ?? 100) < numberOf(rule.thresholdPct, 30) &&
                              rule.enabled &&
                              "border-warning bg-warning-soft",
                            !view.planned && "bg-subtle",
                          )}
                        >
                          <div
                            className="bg-border-strong/50 relative mx-auto h-8 w-6 overflow-hidden rounded-[3px]"
                            aria-hidden="true"
                          >
                            <span
                              className="bg-action absolute bottom-0 left-0 w-full"
                              style={{ height: `${String(soldPct)}%` }}
                            />
                            <span
                              className="bg-warning absolute left-0 w-full"
                              style={{
                                height: `${String(extPct)}%`,
                                bottom: `${String(soldPct)}%`,
                              }}
                            />
                          </div>
                          <b className="num text-[12.5px]">
                            {view.planned ? `${String(view.freePct ?? 0)} %` : "нет плана"}
                          </b>
                          <Input
                            size="sm"
                            numeric
                            inputMode="numeric"
                            disabled={week.past}
                            aria-label={`План ${line.title}, ${week.label}`}
                            placeholder="план"
                            value={draft?.unitsTotal ?? ""}
                            onChange={(event) => {
                              setDrafts((current) => ({
                                ...current,
                                [key]: {
                                  unitsTotal: event.target.value,
                                  externalUnits: current[key]?.externalUnits ?? "0",
                                },
                              }));
                            }}
                          />
                          <Input
                            size="sm"
                            numeric
                            inputMode="numeric"
                            disabled={week.past}
                            aria-label={`Вне платформы ${line.title}, ${week.label}`}
                            placeholder="вне платформы"
                            value={draft?.externalUnits ?? ""}
                            onChange={(event) => {
                              setDrafts((current) => ({
                                ...current,
                                [key]: {
                                  unitsTotal: current[key]?.unitsTotal ?? "",
                                  externalUnits: event.target.value,
                                },
                              }));
                            }}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
        <Box>
          <h3 className="font-heading text-base font-bold">Коэффициенты изделий</h3>
          <p className="text-muted mt-1 text-[12.5px]">
            Сколько условных единиц «съедает» одно изделие. Худи шьётся дольше футболки — платформа
            учтёт это при резерве.
          </p>
          <table className="mt-2 w-full border-collapse text-[13.5px]">
            <tbody>
              {plan.itemCoefficients.map((item) => (
                <tr key={item.key} className="border-border border-b last:border-0">
                  <td className="py-1.5">{item.title}</td>
                  <td className="w-24 py-1.5 text-right">
                    <Input
                      size="sm"
                      numeric
                      inputMode="decimal"
                      aria-label={`Коэффициент: ${item.title}`}
                      value={coefficients[item.key] ?? ""}
                      onChange={(event) => {
                        setCoefficients((current) => ({
                          ...current,
                          [item.key]: event.target.value,
                        }));
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        <Box>
          <h3 className="font-heading text-base font-bold">Скидка на недозагруз</h3>
          <Toggle
            className="mt-2"
            rowClassName="my-2"
            checked={rule.enabled}
            onCheckedChange={(next) => setRule((current) => ({ ...current, enabled: next }))}
            label="Включена"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Порог загрузки недели, %">
              <Input
                numeric
                inputMode="numeric"
                value={rule.thresholdPct}
                onChange={(event) =>
                  setRule((current) => ({ ...current, thresholdPct: event.target.value }))
                }
              />
            </Field>
            <Field label="Скидка, %">
              <Input
                numeric
                inputMode="numeric"
                value={rule.percent}
                onChange={(event) =>
                  setRule((current) => ({ ...current, percent: event.target.value }))
                }
              />
            </Field>
          </div>
          <p className="text-muted mt-2 text-[12.5px]">
            Предложения получат бейдж «−{rule.percent} % мощность» и поднимутся в «Популярных».{" "}
            {plan.underloadDiscount.note ?? "Сейчас недозагруженных недель нет."}
          </p>

          <h3 className="font-heading mt-4 text-base font-bold">Резервы</h3>
          {plan.reservations.length === 0 ? (
            <p className="text-muted mt-1.5 text-[13px]">Резервов на горизонте нет.</p>
          ) : (
            <ul className="mt-1.5 grid gap-1.5 text-[13px]">
              {plan.reservations.map((reservation) => (
                <li
                  key={`${String(reservation.orderId)}:${reservation.weekStart}`}
                  className="border-border flex items-start gap-2 border-b pb-1.5 last:border-0"
                >
                  <span className="text-muted w-10 flex-none text-[11.5px] uppercase">
                    {reservation.kind}
                  </span>
                  <span className="min-w-0">
                    <b className="num">
                      {reservation.title} · {formatNumber(reservation.units)} усл. ед.
                    </b>
                    {reservation.note === null ? null : (
                      <span className="text-muted block text-[12.5px]">{reservation.note}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Box>
      </div>
    </>
  );
}

function numberOf(raw: string, fallback: number): number {
  const cleaned = raw.replace(/[\s\u00a0]/gu, "").replace(",", ".");
  if (cleaned.length === 0) return fallback;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : fallback;
}
