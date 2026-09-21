import { useEffect, useState } from "react";

import { useListsStore } from "@/shared/stores/lists-store";

/* Лоток сравнения прилип к низу экрана, и всё, что прилипает туда же (панель расчёта
   на карточке), должно встать НАД ним. Высоту лотка угадывать нельзя: на узком экране
   он переносится на две строки, а число позиций меняет ширину содержимого. Поэтому
   меряем — ResizeObserver, а не константа. */

/** CSS-класс, по которому лоток находится на странице. Ставится в CompareTrayBar. */
export const COMPARE_TRAY_CLASS = "compare-tray";

/** Сколько пикселей снизу занимает лоток сравнения. 0 — лотка нет. */
export function useCompareTrayOffset(): number {
  const open = useListsStore((state) => state.compare.length > 0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!open) {
      setOffset(0);
      return;
    }
    const tray = document.querySelector<HTMLElement>(`.${COMPARE_TRAY_CLASS}`);
    if (!tray) return;

    const observer = new ResizeObserver(() => setOffset(tray.offsetHeight));
    observer.observe(tray);
    setOffset(tray.offsetHeight);
    return () => observer.disconnect();
  }, [open]);

  return offset;
}
