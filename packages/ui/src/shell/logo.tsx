import type { ReactNode } from "react";

import { cn } from "../lib/utils";
import { ShellAction } from "./link";
import type { ShellLinkComponent } from "./link";

/* Макет: .logo — знак + название. Название приходит пропом, своих текстов тут нет. */
export type LogoProps = {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Свой знак вместо квадрата по умолчанию. */
  mark?: ReactNode;
  size?: "md" | "sm";
  /** aria-label, когда label не текст. */
  ariaLabel?: string;
  className?: string;
  linkComponent?: ShellLinkComponent;
};

const markClip = "polygon(0 0,100% 0,100% 45%,45% 45%,45% 100%,0 100%)";

export function Logo({
  label,
  href,
  onClick,
  mark,
  size = "md",
  ariaLabel,
  className,
  linkComponent,
}: LogoProps) {
  return (
    <ShellAction
      href={href}
      onClick={onClick}
      label={ariaLabel}
      linkComponent={linkComponent}
      className={cn(
        "font-heading flex shrink-0 items-center gap-2 font-extrabold tracking-[-0.02em]",
        size === "md" ? "text-[22px]" : "text-lg",
        className,
      )}
    >
      {mark ?? (
        <span
          aria-hidden="true"
          className={cn(
            "relative block shrink-0 rounded-md bg-white",
            size === "md" ? "size-6" : "size-5",
          )}
        >
          <span
            className="bg-header absolute inset-1.5 block"
            style={{ clipPath: markClip, WebkitClipPath: markClip }}
          />
        </span>
      )}
      {label}
    </ShellAction>
  );
}
