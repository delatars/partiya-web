/* Макет: .trust — четыре обещания платформы внизу главной. */

const ITEMS = [
  [
    "bg-success-soft",
    "Эскроу",
    "Оплата резервируется платформой и уходит фабрике после вашей приёмки.",
  ],
  [
    "bg-action-soft",
    "Аудит фабрик",
    "Проверяем юрлицо, цех, оборудование и образцы. Дата аудита — в карточке.",
  ],
  [
    "bg-action-soft",
    "Прозрачное производство",
    "Проценты, фотоотчёты и чат с технологом вместо «менеджер перезвонит».",
  ],
  [
    "bg-discount-soft",
    "Повтор в один клик",
    "Спецификация сохраняется. Повторная партия — со скидкой 9 %.",
  ],
];

export function TrustRow() {
  return (
    <div className="mt-6.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map(([tone, title, text]) => (
        <div key={title} className="rounded-card bg-surface flex flex-col gap-1 p-4.5 text-[13px]">
          <span aria-hidden="true" className={`mb-1.5 block size-7.5 rounded-lg ${tone ?? ""}`} />
          <b>{title}</b>
          <span className="text-muted">{text}</span>
        </div>
      ))}
    </div>
  );
}
