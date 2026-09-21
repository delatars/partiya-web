import { Button, CompareTray, CompareTrayItem, Placeholder } from "@partiya/ui";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { COMPARE_LIMIT, useListsStore } from "@/shared/stores/lists-store";
import { COMPARE_TRAY_CLASS } from "@/shared/ui/compare-tray-offset";
import { useAppNavigate } from "@/shared/ui/router-link";

/* Макет: .tray — лоток сравнения внизу публичных страниц. */
export function CompareTrayBar() {
  const items = useListsStore((state) => state.compare);
  const remove = useListsStore((state) => state.removeFromCompare);
  const clear = useListsStore((state) => state.clearCompare);
  const navigate = useAppNavigate();

  if (items.length === 0) return null;

  const left = COMPARE_LIMIT - items.length;

  return (
    <CompareTray
      className={COMPARE_TRAY_CLASS}
      ariaLabel="Лоток сравнения"
      title="Сравнение"
      count={items.length}
      hint={left > 0 ? `добавьте ещё до ${String(COMPARE_LIMIT)}` : "больше четырёх не поместится"}
      actions={
        <>
          <Button variant="cta" onClick={() => navigate({ to: "/compare" })}>
            Сравнить
          </Button>
          <Button variant="ghost" onClick={clear}>
            Очистить
          </Button>
        </>
      }
    >
      {items.map((item) => (
        <CompareTrayItem
          key={item.id}
          media={<Placeholder tone={item.tone ?? "a"} className="size-8" />}
          title={item.title}
          meta={`${formatRub(item.priceFrom)} · MOQ ${formatNumber(item.moq)}`}
          onRemove={() => remove(item.id)}
          removeLabel={`Убрать из сравнения: ${item.title}`}
        />
      ))}
    </CompareTray>
  );
}
