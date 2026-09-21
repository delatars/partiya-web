/* Единственная публичная дверь модуля «Оформление партии и заказ образца». */

export { demoAdvanceOrder, demoMarkOrderPaid, installOrderMocks } from "./api/mocks";
export { OrderDemoConsole } from "./components/OrderDemoConsole";
export {
  parseCheckoutSearch,
  parseSampleSearch,
  type CheckoutSearch,
  type SampleSearch,
} from "./lib/search-params";
export { CheckoutPage, type CheckoutPageProps } from "./pages/CheckoutPage";
export { OrderPaymentPage, type OrderPaymentPageProps } from "./pages/OrderPaymentPage";
export { SampleOrderPage, type SampleOrderPageProps } from "./pages/SampleOrderPage";
