import type {
  CapacityPlan,
  CapacityQuery,
  CopyCapacityBody,
  UpdateCapacityBody,
} from "@partiya/api-contracts";

/** Домен «Мощность» — крейт `capacity` (ARCHITECTURE.md, 5.3, 8.4).
 *
 * Чтение и запись одного и того же плана: `GET` отдаёт сетку целиком вместе с
 * резервами и посчитанным «свободно», `PUT` принимает только то, что завод правит
 * руками (план недели, внеплатформенная загрузка, коэффициенты, правило скидки).
 * Резервы через запись не проходят — их ставит платформа при оплате и подтверждении. */
export interface CapacityApi {
  /** `GET /seller/capacity?from&to` → 200. Организация не завод — 403. */
  getCapacityPlan(query?: CapacityQuery, signal?: AbortSignal): Promise<CapacityPlan>;

  /** `PUT /seller/capacity` → 200 с пересчитанным планом.
      План ниже уже занятого — 422 `capacity/below-reserved`, неделя в прошлом — 409. */
  updateCapacityPlan(body: UpdateCapacityBody): Promise<CapacityPlan>;

  /** `POST /seller/capacity/copy` → 200. «Скопировать сентябрь → октябрь». */
  copyCapacityPlan(body: CopyCapacityBody): Promise<CapacityPlan>;
}
