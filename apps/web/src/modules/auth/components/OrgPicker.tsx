import type { Organization } from "@partiya/api-contracts";
import { cn } from "@partiya/ui";

import { orgInitials } from "@/shared/lib/session";

/* Макет login-otp: «Выберите организацию» — список .org под полем кода.
   Показывается только когда компаний больше одной: выбирать из одной нечего. */

const KIND_TITLE = { customer: "Заказчик", factory: "Завод" } as const;

export interface OrgPickerProps {
  organizations: readonly Organization[];
  activeOrgId: string | null;
  onPick: (orgId: string) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
}

export function OrgPicker({
  organizations,
  activeOrgId,
  onPick,
  disabled = false,
  title = "Выберите организацию",
  description,
}: OrgPickerProps) {
  // список показывается только когда компаний больше одной — дательный всегда «компаниям»
  const hint = description ?? `Ваш аккаунт привязан к ${String(organizations.length)} компаниям`;

  return (
    <div className="mt-4.5">
      <h2 className="font-heading text-base font-bold">{title}</h2>
      <p className="text-muted mt-0.5 mb-2 text-[12.5px]">{hint}</p>
      <div className="grid gap-1.5">
        {organizations.map((org) => (
          <button
            key={org.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              onPick(org.id);
            }}
            className={cn(
              "border-border rounded-control flex items-center gap-2.5 border px-3 py-2.5 text-left transition-colors disabled:opacity-45",
              org.id === activeOrgId
                ? "border-action bg-action-soft"
                : "hover:border-border-strong",
            )}
          >
            <span
              aria-hidden="true"
              className="bg-header font-heading grid size-8.5 flex-none place-items-center rounded-full text-[13px] font-bold text-white"
            >
              {orgInitials(org.name)}
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate">{org.name}</b>
              <span className="text-muted block text-[12.5px]">
                {KIND_TITLE[org.kind]} · {org.roleTitle.toLowerCase()}
              </span>
            </span>
            <span aria-hidden="true" className="text-muted">
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
