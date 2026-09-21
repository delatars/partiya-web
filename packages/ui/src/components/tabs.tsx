import { createContext, useContext } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "../lib/utils";

/* Макет: .tabs (вкладки карточки, padding 10/16) и .tabbar (разделы кабинета, gap 16).
   Отличие только в отбивке — подчёркивание активной вкладки одинаковое. */

type TabsVariant = "line" | "bar";

const TabsVariantContext = createContext<TabsVariant>("line");

export type TabsProps = TabsPrimitive.TabsProps & { variant?: TabsVariant };

export function Tabs({ variant = "line", ...props }: TabsProps) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.Root {...props} />
    </TabsVariantContext.Provider>
  );
}

export type TabsListProps = TabsPrimitive.TabsListProps;

export function TabsList({ className, ...props }: TabsListProps) {
  const variant = useContext(TabsVariantContext);

  return (
    <TabsPrimitive.List
      className={cn(
        "border-border flex overflow-x-auto border-b whitespace-nowrap",
        variant === "bar" && "gap-4",
        className,
      )}
      {...props}
    />
  );
}

export type TabsTriggerProps = TabsPrimitive.TabsTriggerProps;

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  const variant = useContext(TabsVariantContext);

  return (
    <TabsPrimitive.Trigger
      className={cn(
        "text-muted data-[state=active]:text-text data-[state=active]:border-action -mb-px border-b-2 border-transparent py-2.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        variant === "bar" ? "px-0.5" : "px-4",
        className,
      )}
      {...props}
    />
  );
}

export type TabsContentProps = TabsPrimitive.TabsContentProps;

export function TabsContent({ className, ...props }: TabsContentProps) {
  return <TabsPrimitive.Content className={cn("outline-none", className)} {...props} />;
}
