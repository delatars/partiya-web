import type { OrderDocument } from "@partiya/api-contracts";

/* Макет: .docs — список документов заказа со ссылкой действия справа. */

const ACTION: Record<OrderDocument["signature"], string> = {
  none: "Скачать",
  edo_pending: "Подписать по ЭДО",
  edo_signed: "Скачать",
};

export function DocsList({ documents }: { documents: OrderDocument[] }) {
  if (documents.length === 0) {
    return (
      <p className="text-muted mt-1.5 text-[12.5px]">
        Документы сформируются автоматически при оформлении заказа.
      </p>
    );
  }

  return (
    <div className="mt-1.5">
      {documents.map((document) => (
        <a
          key={document.id}
          href={document.url ?? "#"}
          className="border-border flex justify-between gap-3 border-b border-dashed py-[7px] text-[13px] last:border-0"
        >
          <span className="min-w-0 truncate">{document.title}</span>
          <span className="text-action flex-none">
            {document.url === null ? "готовится" : ACTION[document.signature]}
          </span>
        </a>
      ))}
    </div>
  );
}
