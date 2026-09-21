import { Alert, Box, Button, DataTable, Field, Input, PageHeader, Skeleton } from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { adminTaxonomyOptions } from "@/shared/api";

/* Макет: экран `admin-taxonomy` — дерево категорий и схема атрибутов.

   Схема категории определяет форму SKU у завода, фасеты каталога и конструктор заказа
   (ARCHITECTURE.md, 5.1). Поэтому правка схемы не трогает опубликованные версии:
   заводы увидят новое поле при следующей правке предложения. */

const KIND_TITLE: Record<string, string> = {
  select: "список",
  multiselect: "мультивыбор",
  number: "число",
  text: "текст",
};

export function AdminTaxonomyPage() {
  const { data, isPending } = useQuery(adminTaxonomyOptions());
  const [selected, setSelected] = useState<string>("tekstil/futbolki");

  if (isPending || !data) {
    return (
      <>
        <PageHeader title="Категории и атрибуты" subtitle="Схема атрибутов" />
        <Skeleton className="h-64" />
      </>
    );
  }

  const category = data.selected;

  return (
    <>
      <PageHeader
        title="Категории и атрибуты"
        subtitle="Схема атрибутов определяет форму SKU у завода, фильтры каталога и конструктор заказа."
      />

      <div className="grid items-start gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Box>
          <h3 className="font-heading text-base font-bold">Дерево</h3>
          <ul className="mt-2 grid gap-1 text-[13.5px]">
            {data.tree.map((node) => (
              <li key={node.slug}>
                <div className="flex items-center justify-between font-medium">
                  <span>{node.title}</span>
                  <span className="text-muted num text-[12px]">{node.offersCount}</span>
                </div>
                {node.children.length > 0 ? (
                  <ul className="ms-3 mt-1 grid gap-0.5">
                    {node.children.map((child) => {
                      const path = child.path.join("/");
                      return (
                        <li key={child.slug}>
                          <button
                            type="button"
                            onClick={() => setSelected(path)}
                            className={`flex w-full items-center justify-between rounded px-1 py-0.5 text-start ${
                              selected === path ? "bg-action-soft text-action" : "hover:bg-subtle"
                            }`}
                          >
                            <span>{child.title}</span>
                            <span className="text-muted num text-[12px]">{child.offersCount}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-3 w-full" disabled>
            + Категория
          </Button>
        </Box>

        <Box>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold">{category?.title ?? "Категория"}</h2>
            <Button size="sm" disabled>
              + Атрибут
            </Button>
          </div>

          <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
            <Field label="Коэффициент мощности по умолчанию">
              <Input readOnly numeric value={String(category?.defaultCapacityUnitsPerItem ?? 1)} />
            </Field>
            <Field label="Единица">
              <Input readOnly value={category?.unit ?? "шт"} />
            </Field>
          </div>

          <DataTable
            className="mt-3"
            rows={category?.attributes ?? []}
            rowKey={(row) => row.key}
            scrollable
            minWidth={560}
            columns={[
              { key: "label", header: "Атрибут", cell: (row) => <b>{row.label}</b> },
              {
                key: "kind",
                header: "Тип",
                cell: (row) => (
                  <span className="text-muted text-[12.5px]">
                    {KIND_TITLE[row.kind] ?? row.kind}
                  </span>
                ),
              },
              {
                key: "usedIn",
                header: "Где используется",
                cell: (row) => (
                  <span className="text-muted text-[12.5px]">
                    {(row.usedIn ?? []).join(" · ") || "—"}
                  </span>
                ),
              },
              {
                key: "required",
                header: "Обязателен",
                cell: (row) => (row.required ? "да" : "нет"),
              },
            ]}
          />

          <Alert
            kind="info"
            className="mt-3"
            title="Изменение схемы не трогает опубликованные версии"
          >
            Заводы увидят новое поле при следующей правке предложения.
          </Alert>
        </Box>
      </div>
    </>
  );
}
