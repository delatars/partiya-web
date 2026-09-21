import type { ElementType, HTMLAttributes, Ref } from "react";

import { cn } from "../lib/utils";

/* Макет: .wrap (1320 px) и .wrap.narrow (1040 px), боковые отступы 20 px */
export type ContainerProps = HTMLAttributes<HTMLElement> & {
  ref?: Ref<HTMLElement>;
  as?: "div" | "main" | "section" | "header" | "footer" | "nav" | "aside" | "ul";
  width?: "page" | "narrow";
};

export function Container({
  as = "div",
  width = "page",
  className,
  ref,
  ...props
}: ContainerProps) {
  const Component = as as ElementType;
  return (
    <Component
      ref={ref}
      className={cn(
        "mx-auto w-full px-5",
        width === "page" ? "max-w-page" : "max-w-narrow",
        className,
      )}
      {...props}
    />
  );
}
