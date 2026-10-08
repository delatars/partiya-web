import type { EscrowSummary, EscrowTranche, FinalPayment } from "@partiya/api-contracts";
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

/** Тон плашки второго транша (Q-401): ждём — рабочий, продлён/у оператора — горит. */
const FINAL_TONE: Record<FinalPayment["state"], "ok" | "work" | "hot" | "done"> = {
  not_issued: "done",
  awaiting: "work",
  extended: "hot",
  operator: "hot",
  paid: "ok",
  cancelled: "done",
};

const TRANCHE_STATUS: Record<EscrowTranche["status"], string> = {
  awaiting_funds: "ждёт оплаты",
  held: "в эскроу",
  released: "выплачен",
  refunded: "возвращён",
};

export function EscrowCard({
  escrow,
  tranches,
  finalPayment,
}: {
  escrow: EscrowSummary;
  /** Транши сделки 50/50 (`GET /orders/{id}/escrow`); без них карточка — одной суммой. */
  tranches?: EscrowTranche[];
  /** Второй транш 50/50 со счётом и реквизитами (Q-384, Q-401). */
  finalPayment?: FinalPayment | null;
}) {
  return (
    <Box>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-base font-bold">Эскроу · {formatRub(escrow.amount)}</h3>
        <Tag tone={TONE[escrow.status]}>{escrow.note}</Tag>
      </div>
      {tranches !== undefined && tranches.length > 1 && (
        <ul className="mt-2 grid gap-1.5 text-[13px]" aria-label="Транши">
          {tranches.map((tranche) => (
            <li key={tranche.id} className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block">{tranche.title}</span>
                <span className="text-muted block text-[12px]">
                  {tranche.status === "awaiting_funds"
                    ? tranche.dueAt === null
                      ? "счёт придёт, когда партия будет готова к отгрузке"
                      : `оплатить до ${formatDateTime(tranche.dueAt)}`
                    : TRANCHE_STATUS[tranche.status]}
                </span>
              </span>
              <b className="num flex-none">{formatRub(tranche.amount)}</b>
            </li>
          ))}
        </ul>
      )}
      {finalPayment != null && finalPayment.state !== "not_issued" && (
        <FinalPaymentBlock payment={finalPayment} />
      )}
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

/** Второй счёт 50/50: состояние словами сервера, номер как есть, реквизиты — пока ждём
    оплату (Q-384). Номер при продлении не меняется (Q-420). */
function FinalPaymentBlock({ payment }: { payment: FinalPayment }) {
  const requisites = payment.instructions;
  return (
    <section
      className="bg-subtle rounded-control mt-2.5 px-3 py-2.5 text-[13px]"
      aria-label="Второй транш"
      data-testid="final-payment"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="font-medium">
          Счёт {payment.invoiceNumber ?? "—"} · {formatRub(payment.amount)}
        </b>
        <Tag tone={FINAL_TONE[payment.state]}>{payment.note}</Tag>
      </div>
      {payment.state === "operator" && (
        <p className="text-muted mt-1 text-[12.5px]">
          Оплатить счёт ещё можно — поступление до решения оператора принимается, и партия уйдёт в
          отгрузку.
        </p>
      )}
      {requisites !== null && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12.5px]">
          <dt className="text-muted">Получатель</dt>
          <dd>{requisites.payeeName}</dd>
          <dt className="text-muted">ИНН / КПП</dt>
          <dd className="num">
            {requisites.payeeInn} / {requisites.payeeKpp}
          </dd>
          <dt className="text-muted">Банк</dt>
          <dd>
            {requisites.bankName} · БИК <span className="num">{requisites.bik}</span>
          </dd>
          <dt className="text-muted">Р/с</dt>
          <dd className="num">{requisites.account}</dd>
          <dt className="text-muted">К/с</dt>
          <dd className="num">{requisites.correspondentAccount}</dd>
          <dt className="text-muted">Назначение</dt>
          <dd>{requisites.purpose}</dd>
          <dt className="text-muted">Оплатить до</dt>
          <dd>{formatDateTime(requisites.dueAt)}</dd>
        </dl>
      )}
    </section>
  );
}
