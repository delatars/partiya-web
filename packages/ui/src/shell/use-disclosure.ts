import { useCallback, useState } from "react";

export type DisclosureOptions = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export type Disclosure = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

/** Открыт/закрыт: управляемый режим, если передан open, иначе своё состояние. */
export function useDisclosure({ open, defaultOpen = false, onOpenChange }: DisclosureOptions = {}) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const isOpen = open ?? uncontrolled;

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );

  const toggle = useCallback(() => setOpen(!isOpen), [isOpen, setOpen]);

  return { open: isOpen, setOpen, toggle } satisfies Disclosure;
}
