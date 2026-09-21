import type { Organization } from "@partiya/api-contracts";
import { cn, Popover, PopoverContent, PopoverTrigger } from "@partiya/ui";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { orgInitials, useSwitchOrg } from "@/shared/lib/session";

/* Переключатель активной организации в шапке сайдбара кабинета.
   Показывается только когда организаций больше одной: кнопка без выбора — просто шум.
   Членство проверяет бэк (`POST /me/active-org` отвечает 403 на чужую), здесь только выбор. */

const KIND_TITLE = { customer: "Заказчик", factory: "Завод" } as const;

export function OrgSwitcher({
  organizations,
  activeOrgId,
  className,
}: {
  organizations: readonly Organization[];
  activeOrgId: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const switchOrg = useSwitchOrg();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "text-muted hover:bg-subtle rounded-control flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-[12.5px]",
          className,
        )}
        aria-label="Сменить организацию"
      >
        <span>Сменить организацию</span>
        <ChevronsUpDown aria-hidden="true" className="size-3.5 flex-none" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1">
        {organizations.map((org) => (
          <button
            key={org.id}
            type="button"
            disabled={switchOrg.isPending}
            onClick={() => {
              setOpen(false);
              if (org.id !== activeOrgId) switchOrg.mutate(org.id);
            }}
            className="rounded-control hover:bg-subtle flex w-full items-center gap-2.5 px-2 py-2 text-left disabled:opacity-45"
          >
            <span
              aria-hidden="true"
              className="bg-header font-heading grid size-7 flex-none place-items-center rounded-full text-[12px] font-bold text-white"
            >
              {orgInitials(org.name)}
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[13.5px] font-medium">{org.name}</b>
              <span className="text-muted block text-[12px]">
                {KIND_TITLE[org.kind]} · {org.roleTitle.toLowerCase()}
              </span>
            </span>
            {org.id === activeOrgId && (
              <Check aria-hidden="true" className="text-action size-4 flex-none" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
