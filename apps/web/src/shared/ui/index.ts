/* Доменные и каркасные компоненты приложения: их знают сразу несколько модулей,
   поэтому в packages/ui (там нет домена) им не место. */

export { AdminShell } from "./AdminShell";
export { AuthShell } from "./AuthShell";
export { CabinetShell } from "./CabinetShell";
export { CategoryGrid, type CategoryGridProps } from "./CategoryGrid";
export { categoryIcon } from "./category-icon";
export { CheckoutShell } from "./CheckoutShell";
export { COMPARE_TRAY_CLASS, useCompareTrayOffset } from "./compare-tray-offset";
export { CompareTrayBar } from "./CompareTrayBar";
export { ErrorPage, type ErrorPageProps } from "./ErrorPage";
export { OfferCard } from "./OfferCard";
export { OfferBadges } from "./offer-badges";
export { type OfferListActions, toListEntry, useOfferListActions } from "./offer-actions";
export { OfferRow } from "./OfferRow";
export { OnboardingShell } from "./OnboardingShell";
export { ChatPanel } from "./order/ChatPanel";
export { ConnectionBadge } from "./order/ConnectionBadge";
export { DocsList } from "./order/DocsList";
export { EscrowCard } from "./order/EscrowCard";
export { EventFeed } from "./order/EventFeed";
export { PhotoStrip, PhotoViewer } from "./order/PhotoStrip";
export { PipelineBar } from "./order/PipelineBar";
export { ProgressRows } from "./order/ProgressRows";
export { OrgSwitcher } from "./OrgSwitcher";
export { PublicShell, type PublicShellProps } from "./PublicShell";
export {
  AppLink,
  type AppLinkProps,
  type AppNavigateOptions,
  parseHref,
  RouterLink,
  useAppNavigate,
} from "./router-link";
export { UnderConstruction } from "./UnderConstruction";
