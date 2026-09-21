import type { EscrowSummary } from "@partiya/api-contracts";
import { Box, Tag } from "@partiya/ui";

import { formatDateTime } from "@/shared/lib/dates";
import { formatRub } from "@/shared/lib/format";

/* Макет: карточка «Эскроу · 183 400 ₽» в правой колонке трекинга.
   Текст состояния пишет сервер (`note`): условия выплаты зависят от схемы оплаты и спора. */

const TONE: Record<EscrowSummary["status"], "ok" | "work" | "hot" | "done"> = {
  awaiting_funds: "work",
  held: "work",
  partially_released: "work",
  released: "ok",
  refunded: "done",
  blocked: "hot",
};

export function EscrowCard({ escrow }: { escrow: EscrowSummary }) {
  return (
    <Box>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-base font-bold">Эскроу · {formatRub(escrow.amount)}</h3>
        <Tag tone={TONE[escrow.status]}>{escrow.note}</Tag>
      </div>
      <p className="text-muted mt-1.5 text-[12.5px]">
        {escrow.status === "blocked"
          ? "Выплата фабрике заблокирована до решения спора."
          : escrow.autoReleaseAt === null
            ? "Выплата фабрике — после вашей приёмки."
            : `Выплата фабрике после приёмки или автоматически ${formatDateTime(escrow.autoReleaseAt)}.`}
      </p>
      <p className="text-muted mt-1.5 text-[12.5px]">
        Платформа не может списать деньги из эскроу без вашей приёмки или решения по спору.
      </p>
    </Box>
  );
}
