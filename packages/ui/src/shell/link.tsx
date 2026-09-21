import { createContext, useContext } from "react";
import type { AriaAttributes, ComponentType, MouseEventHandler, ReactNode, Ref } from "react";

/* Оболочка не знает о роутере: ссылку рисует компонент приложения.
   Приложение задаёт его один раз через ShellLinkProvider либо точечно пропом linkComponent. */

export type ShellLinkProps = {
  href: string;
  className?: string;
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  target?: string;
  rel?: string;
  title?: string;
  tabIndex?: number;
  id?: string;
  "aria-label"?: string;
  "aria-current"?: AriaAttributes["aria-current"];
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  ref?: Ref<HTMLAnchorElement>;
};

export type ShellLinkComponent = ComponentType<ShellLinkProps>;

/** Ссылка по умолчанию — обычный <a>. */
export function ShellAnchor({ href, ref, ...props }: ShellLinkProps) {
  return <a ref={ref} href={href} {...props} />;
}

const ShellLinkContext = createContext<ShellLinkComponent>(ShellAnchor);

export type ShellLinkProviderProps = {
  component: ShellLinkComponent;
  children?: ReactNode;
};

export function ShellLinkProvider({ component, children }: ShellLinkProviderProps) {
  return <ShellLinkContext.Provider value={component}>{children}</ShellLinkContext.Provider>;
}

/** Компонент ссылки: проп важнее контекста, контекст важнее <a>. */
export function useShellLink(override?: ShellLinkComponent): ShellLinkComponent {
  const fromContext = useContext(ShellLinkContext);
  return override ?? fromContext;
}

export type ShellActionProps = {
  /** Есть href — ссылка, нет — кнопка. */
  href?: string;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
  /** Текущий раздел: aria-current="page" + стили через aria-[current=page]. */
  current?: boolean;
  label?: string;
  title?: string;
  target?: string;
  rel?: string;
  id?: string;
  linkComponent?: ShellLinkComponent;
};

/** Пункт навигации оболочки: ссылка приложения или кнопка, если маршрута нет. */
export function ShellAction({
  href,
  onClick,
  className,
  children,
  current,
  label,
  title,
  target,
  rel,
  id,
  linkComponent,
}: ShellActionProps) {
  const Link = useShellLink(linkComponent);
  const ariaCurrent = current ? "page" : undefined;

  if (href !== undefined) {
    return (
      <Link
        href={href}
        id={id}
        className={className}
        onClick={onClick}
        target={target}
        rel={rel}
        title={title}
        aria-label={label}
        aria-current={ariaCurrent}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      id={id}
      className={className}
      onClick={onClick}
      title={title}
      aria-label={label}
      aria-current={ariaCurrent}
    >
      {children}
    </button>
  );
}

/** Пункт списочной навигации: меню категорий, сайдбар кабинета, иконки шапки. */
export type ShellNavItem = {
  key?: string;
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

/** Ключ для списка: явный key, иначе позиция (маршрут не годится — он повторяется). */
export function navItemKey(item: { key?: string }, index: number): string {
  return item.key ?? String(index);
}
