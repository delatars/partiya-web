/* Единственная публичная дверь модуля «Кабинет заказчика». */

export type { OrderTab } from "./api/fixtures";
export { CompanyPage, type CompanyPageProps, type CompanyTab } from "./pages/CompanyPage";
export { CustomerOrdersPage, type CustomerOrdersPageProps } from "./pages/CustomerOrdersPage";
export { DocumentsPage } from "./pages/DocumentsPage";
export { EscrowPage } from "./pages/EscrowPage";
export { FavoritesPage } from "./pages/FavoritesPage";
export { NotificationsPage } from "./pages/NotificationsPage";
export { RepeatPage } from "./pages/RepeatPage";
export { SamplesPage } from "./pages/SamplesPage";
