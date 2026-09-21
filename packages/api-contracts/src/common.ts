/* Общее для всех доменов контракта. */

/** Деньги — целые копейки (ARCHITECTURE.md, 5.4). Дробных рублей в контракте нет. */
export type Kopecks = number;

/** RFC 7807 — тело ответа об ошибке, которое отдаёт axum. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  /** Ошибки по полям формы: имя поля → сообщения. */
  errors?: Record<string, string[]>;
}

/** Постраничная выдача: страницы, а не курсор — так устроен `/catalog/search`. */
export interface PageInfo {
  page: number;
  perPage: number;
  pageCount: number;
}
