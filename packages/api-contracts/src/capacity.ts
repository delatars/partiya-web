/* Домен «Мощность» — крейт `capacity` (ARCHITECTURE.md, 5.3):

     GET /seller/capacity?from&to     → план, резервы, коэффициенты, правило скидки
     PUT /seller/capacity             → сохранение плана и внеплатформенной загрузки

   Модель из 5.3 целиком:

   * `CapacityPlan(factory, line, week_start, units_total)` — план в УСЛОВНЫХ ЕДИНИЦАХ,
     а не в штуках: футболка и худи «съедают» мощность по-разному.
   * `OfferVersion.capacity_units_per_item` — коэффициент изделия (футболка 1,0, худи 2,4).
   * `CapacityReservation(order, week, units, kind: soft|hard)` — soft при оплате (живёт
     до дедлайна подтверждения), hard после подтверждения заводом.
   * Свободно = `unitsTotal − Σ hard − Σ soft(не истёкшие) − внеплатформенная загрузка`.

   Числа считает сервер: браузер не вычитает резервы сам — иначе «свободно 38 %» в
   каталоге и в кабинете разошлись бы. Отсюда `freeUnits`/`freePct` в ячейке.

   Недели адресуются понедельником: `weekStart` — ISO `YYYY-MM-DD`. */

/** Производственная линия завода. На старте линия одна, поле заложено сразу (5.3). */
export interface CapacityLine {
  id: string;
  /** «Линия 1 · футболки, поло». */
  title: string;
  /** План по умолчанию на неделю, условных единиц — подставляется в пустые недели. */
  defaultUnitsPerWeek: number;
}

/** Колонка сетки. */
export interface CapacityWeek {
  /** Понедельник недели, ISO `YYYY-MM-DD`. */
  weekStart: string;
  /** «29–5 окт» — подпись колонки, её собирает сервер по производственному календарю. */
  label: string;
  /** Неделя уже прошла: редактировать её нельзя. */
  past: boolean;
}

/** Ячейка «линия × неделя».
 *
 * `unitsTotal = 0` при `planned = false` означает «плана нет»: предложения завода
 * выпадут из выдачи, потому что платформа не знает, есть ли место (5.3). Это НЕ то же
 * самое, что явный ноль — отсюда отдельный признак. */
export interface CapacityCell {
  lineId: string;
  weekStart: string;
  /** План недели, условных единиц. */
  unitsTotal: number;
  /** Заполнен ли план на эту неделю. */
  planned: boolean;
  /** Жёсткие резервы подтверждённых заказов. */
  hardUnits: number;
  /** Мягкие резервы оплаченных, но не подтверждённых заказов. */
  softUnits: number;
  /** Загрузка вне платформы — её вводит завод сам. */
  externalUnits: number;
  /** Свободно = unitsTotal − hard − soft − external; не может быть отрицательным. */
  freeUnits: number;
  /** Свободно, % от плана; при `planned = false` — `null`. */
  freePct: number | null;
  /** Неделя недозагружена: загрузка ниже порога правила скидки. */
  underloaded: boolean;
  /** План перебран: резервы и внеплатформенная загрузка больше плана. Сервер такого
      не допускает при резерве, но завод может уменьшить план задним числом. */
  overbooked: boolean;
}

/** Резерв мощности под заказ (5.3). */
export interface CapacityReservation {
  orderId: number;
  /** «№ 4799 · Футболки 3 000 шт». */
  title: string;
  weekStart: string;
  /** Сколько недель занимает резерв. */
  weeks: number;
  units: number;
  kind: "soft" | "hard";
  /** Когда истекает мягкий резерв; у жёсткого `null`. */
  expiresAt: string | null;
  /** Готовая подпись: «ждёт вашего подтверждения до 18:00», «15–28 сен». */
  note: string | null;
}

/** Коэффициент изделия: сколько условных единиц «съедает» одна штука. */
export interface CapacityItemCoefficient {
  key: string;
  /** «Футболка», «Худи / свитшот». */
  title: string;
  unitsPerItem: number;
  /** Коэффициент задан категорией и заводом не меняется. */
  locked?: boolean;
}

/** Правило скидки на недозагруз: `underload_discount(week_range, threshold, percent)`. */
export interface UnderloadDiscountRule {
  enabled: boolean;
  /** Порог загрузки недели, % — ниже него включается скидка. */
  thresholdPct: number;
  /** Размер скидки, %. */
  percent: number;
  /** Недели, для которых правило сейчас срабатывает (`weekStart`). Считает сервер. */
  activeWeeks: string[];
  /** Готовая подпись: «Сейчас действует для недель 29 сен – 12 окт». */
  note: string | null;
}

/** Плитки экрана «Мощность». */
export interface CapacitySummary {
  /** «сентябрь». */
  month: string;
  /** Загрузка месяца, %. */
  loadPct: number;
  /** Продано через платформу, условных единиц. */
  soldUnits: number;
  /** План месяца. */
  totalUnits: number;
  /** Свободно до конца месяца. */
  freeUnits: number;
  /** Доля внеплатформенной загрузки, %. */
  externalPct: number;
  /** Сколько недель недозагружено. */
  underloadWeeks: number;
  /** Сколько недель горизонта осталось без плана. */
  unplannedWeeks: number;
  /** Единица измерения: «усл. ед.». */
  unit: string;
}

/** `GET /seller/capacity?from&to` — весь экран одним запросом. */
export interface CapacityPlan {
  /** Начало и конец горизонта, ISO `YYYY-MM-DD`. */
  from: string;
  to: string;
  lines: CapacityLine[];
  weeks: CapacityWeek[];
  cells: CapacityCell[];
  reservations: CapacityReservation[];
  itemCoefficients: CapacityItemCoefficient[];
  underloadDiscount: UnderloadDiscountRule;
  summary: CapacitySummary;
  /** Предупреждение над сеткой: «План на октябрь заполнен на 2 недели из 4». */
  warning: { title: string; text: string } | null;
}

export interface CapacityQuery {
  /** Начало горизонта, ISO `YYYY-MM-DD`; пусто — текущая неделя. */
  from?: string;
  /** Конец горизонта; пусто — +8 недель. */
  to?: string;
}

/** Правка одной ячейки. Резервы не передаются: их ставит платформа, а не завод. */
export interface CapacityCellInput {
  lineId: string;
  weekStart: string;
  unitsTotal: number;
  externalUnits: number;
}

/** `PUT /seller/capacity` — сохранить план. Поля необязательны: форма шлёт изменённое. */
export interface UpdateCapacityBody {
  cells?: CapacityCellInput[];
  itemCoefficients?: { key: string; unitsPerItem: number }[];
  underloadDiscount?: Pick<UnderloadDiscountRule, "enabled" | "thresholdPct" | "percent">;
  /** Переименование линии и план по умолчанию. */
  lines?: { id: string; title?: string; defaultUnitsPerWeek?: number }[];
}

/** `POST /seller/capacity/copy` — «Скопировать сентябрь → октябрь». */
export interface CopyCapacityBody {
  /** Откуда и куда, ISO `YYYY-MM-DD` — понедельники первых недель диапазонов. */
  fromWeekStart: string;
  toWeekStart: string;
  /** Сколько недель копировать. */
  weeks: number;
  /** Копировать ли внеплатформенную загрузку; по умолчанию — нет. */
  withExternal?: boolean;
}

/** Коды problem+json домена «Мощность». */
export type CapacityProblemType =
  /** 422 · план недели меньше уже занятого (резервы + внеплатформенная загрузка). */
  | "https://partiya.ru/problems/capacity/below-reserved"
  /** 422 · отрицательные единицы или коэффициент ≤ 0. */
  | "https://partiya.ru/problems/capacity/invalid"
  /** 409 · неделя в прошлом: план задним числом не правится. */
  | "https://partiya.ru/problems/capacity/week-in-past";
