import type { OfferDetail } from "@partiya/api-contracts";

import { formatRub } from "@/shared/lib/format";

/* Макет: table.spec — характеристики и опции одной таблицей, разделители пунктиром. */

export function SpecTable({ offer }: { offer: OfferDetail }) {
  return (
    <table className="w-full border-collapse text-[13.5px]">
      <caption className="sr-only">Характеристики и опции предложения</caption>
      <tbody>
        {offer.specs.map((row) => (
          <tr key={row.name}>
            <th
              scope="row"
              className="border-border text-muted w-[200px] border-b border-dashed py-2 pr-3 text-left align-top font-normal"
            >
              {row.name}
            </th>
            <td className="border-border border-b border-dashed py-2 align-top">{row.value}</td>
          </tr>
        ))}

        {offer.options.map((option) => (
          <tr key={option.id}>
            <th
              scope="row"
              className="border-border text-muted w-[200px] border-b border-dashed py-2 pr-3 text-left align-top font-normal"
            >
              {option.title}
            </th>
            <td className="border-border border-b border-dashed py-2 align-top">
              <span className="num">{formatRub(option.price)}</span>{" "}
              <span className="text-muted">
                {option.note ?? (option.unit === "per_item" ? "за шт" : "за партию")}
              </span>
            </td>
          </tr>
        ))}

        {offer.delivery.map((option) => (
          <tr key={option.id}>
            <th
              scope="row"
              className="border-border text-muted w-[200px] border-b border-dashed py-2 pr-3 text-left align-top font-normal"
            >
              {option.title}
            </th>
            <td className="border-border border-b border-dashed py-2 align-top">
              <span className="num">{formatRub(option.price)}</span>{" "}
              {option.note ? <span className="text-muted">{option.note}</span> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
