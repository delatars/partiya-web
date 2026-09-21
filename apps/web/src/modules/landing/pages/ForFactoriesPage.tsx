import { Box, Button, KpiTile, Tag } from "@partiya/ui";

import { AppLink } from "@/shared/ui";

/* Макет: экран for-factories — лендинг для производств. Тексты из макета, цифры условные
   (взяты из презентации); когда появится аналитика платформы, их отдаст бэк. */

const KPIS: [string, string, string][] = [
  ["Комиссия", "8 %", "только с выполненных заказов"],
  ["Выплата", "1–2 дня", "после приёмки партии"],
  ["Заказов в месяц", "≈ 340", "по платформе, сентябрь"],
  ["Средний чек", "212 000 ₽", "текстиль"],
];

const STEPS: [string, string][] = [
  [
    "Витрина вместо тендеров",
    "Не нужно отвечать на запросы и считать КП. Один раз описали SKU — платформа сама считает партию заказчику.",
  ],
  [
    "Только оплаченные заказы",
    "Заказ попадает к вам после резервирования денег. У вас — время до конца рабочего дня, чтобы подтвердить.",
  ],
  [
    "Платформа не даст перебрать",
    "Вы задаёте план мощности. Продаётся только свободный остаток; недозагруз можно продвигать скидкой.",
  ],
  [
    "Меньше переписки",
    "Макет, параметры, документы и чат — в заказе. Статусы стандартные: заказчик видит их сам.",
  ],
  ["Аудит = доверие", "Проходите проверку один раз в год — получаете бейдж и приоритет в выдаче."],
  ["Аналитика как у селлера", "Просмотры, сравнения, конверсия в заказ по каждому предложению."],
];

export function ForFactoriesPage() {
  return (
    <div className="max-w-narrow mx-auto w-full">
      <header className="px-4 pt-9 pb-5.5 text-center">
        <Tag tone="new">для производств</Tag>
        <h1 className="font-heading mx-auto mt-2 max-w-[24ch] text-[30px] leading-[1.15] font-bold">
          Продавайте свободную мощность как товар на маркетплейсе
        </h1>
        <p className="text-muted mx-auto mt-2 max-w-[62ch] text-[15px]">
          Выкладываете предложение — с ценой по объёму, MOQ и сроком. Заказы приходят оплаченными:
          деньги уже в эскроу.
        </p>
        <div className="mt-5.5 flex flex-wrap justify-center gap-2.5">
          <Button asChild variant="cta" size="lg">
            <AppLink to="/onboarding/factory">Подключить завод</AppLink>
          </Button>
          <Button asChild size="lg">
            <AppLink to="/seller">Посмотреть кабинет</AppLink>
          </Button>
        </div>
      </header>

      <div className="mb-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map(([label, value, note]) => (
          <KpiTile key={label} label={label} value={value} delta={note} />
        ))}
      </div>

      <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map(([title, text], index) => (
          <li key={title} className="list-none">
            <Box className="h-full">
              <span
                aria-hidden="true"
                className="bg-action font-heading mb-2.5 grid size-7 place-items-center rounded-full text-[13px] font-bold text-white"
              >
                {index + 1}
              </span>
              <h2 className="font-heading text-sm font-bold">{title}</h2>
              <p className="text-muted mt-1.5 text-[13.5px]">{text}</p>
            </Box>
          </li>
        ))}
      </ol>

      <div className="my-5.5 flex justify-center">
        <Button asChild variant="cta" size="lg">
          <AppLink to="/onboarding/factory">Начать подключение · 15 минут</AppLink>
        </Button>
      </div>
    </div>
  );
}
