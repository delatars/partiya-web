import { installAuthMocks } from "@/modules/auth";
import { installCatalogMocks } from "@/modules/catalog";
import { installOrderMocks } from "@/modules/checkout";
import { installFactoryMocks } from "@/modules/factories";
import { installOfferMocks } from "@/modules/offer";
import { decorateApiService } from "@/shared/api";

/* Единственное место, где перечислены мок-домены.
   Новый домен: импортировать его install*Mocks из index.ts модуля и дописать в список.

   Порядок значим для заказов: их мок спрашивает «кто вошёл» у внутреннего сервиса,
   поэтому мок входа должен быть установлен раньше. */
const INSTALLERS = [
  installAuthMocks,
  installCatalogMocks,
  installOfferMocks,
  installFactoryMocks,
  installOrderMocks,
];

export function installMocks(): void {
  for (const install of INSTALLERS) decorateApiService(install);
}
