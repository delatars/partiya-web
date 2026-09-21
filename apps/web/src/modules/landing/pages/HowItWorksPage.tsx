import { Box, Button } from "@partiya/ui";

import { AppLink } from "@/shared/ui";

/* Макет: экран how — «Как устроена сделка на «Партии»». Шесть шагов, схема эскроу
   и частые вопросы. Страница статическая: ничего, кроме текста, здесь нет. */

const STEPS: [string, string][] = [
  [
    "Найдите продукт",
    "Поиск по «что произвести», а не по заводу. В выдаче сразу цена за штуку, MOQ, срок и свободная мощность.",
  ],
  [
    "Соберите партию",
    "Конструктор из параметров, заданных фабрикой: нельзя заказать то, что завод не умеет. Макет проверяет технолог.",
  ],
  [
    "Оплатите в эскроу",
    "Счёт от платформы. Деньги резервируются и уходят фабрике только после вашей приёмки. Оферта и спецификация — автоматически.",
  ],
  [
    "Следите за производством",
    "Этапы, проценты, фотоотчёты, чат с технологом. Вся история привязана к заказу.",
  ],
  [
    "Примите партию",
    "5 рабочих дней на проверку. Претензия — спор решает платформа по спецификации и фотоотчётам.",
  ],
  [
    "Повторите в один клик",
    "Спецификация сохранена. Повторная партия у той же фабрики — со скидкой 9 %.",
  ],
];

const FLOW: { title: string; note: string; highlight?: boolean; separator: string }[] = [
  { title: "Вы", note: "оплата по счёту", separator: "→" },
  { title: "Эскроу", note: "резерв до приёмки", highlight: true, separator: "→" },
  { title: "Фабрика", note: "92 % после приёмки", separator: "+" },
  { title: "Платформа", note: "комиссия 8 %", separator: "" },
];

const FAQ: [string, string][] = [
  [
    "Что если фабрика сорвёт срок?",
    "Каждый день просрочки фиксируется в журнале заказа. Вы можете открыть спор; до его решения выплата фабрике заблокирована.",
  ],
  [
    "Можно заказать образец?",
    "Да, если фабрика его предлагает: от 1 500 ₽, 5 рабочих дней. Стоимость образца зачитывается в первую партию.",
  ],
  [
    "Кто отвечает за качество?",
    "Фабрика — по спецификации. Платформа — за то, чтобы деньги не ушли до приёмки, и за арбитраж.",
  ],
  [
    "Какие документы я получу?",
    "Договор-оферта, спецификация, счёт, УПД и акт приёмки. Подписание по ЭДО.",
  ],
];

export function HowItWorksPage() {
  return (
    <div className="max-w-narrow mx-auto w-full">
      <header className="px-4 pt-9 pb-5.5 text-center">
        <h1 className="font-heading mx-auto max-w-[24ch] text-[30px] leading-[1.15] font-bold">
          Как устроена сделка на «Партии»
        </h1>
        <p className="text-muted mx-auto mt-2 max-w-[62ch] text-[15px]">
          От поиска до повторной партии — шесть шагов, ни одного звонка и предоплаты незнакомому
          заводу.
        </p>
      </header>

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

      <Box padding="lg" className="mt-3 grid items-center gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <h2 className="font-heading text-lg font-bold">Эскроу: куда идут деньги</h2>
          <p className="text-muted mt-1.5">
            Платформа не держит деньги у себя — расчёты идут через банк-партнёр.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FLOW.map((step) => (
            <div key={step.title} className="flex items-center gap-2">
              <div
                className={
                  step.highlight
                    ? "border-success bg-success-soft rounded-control border px-3.5 py-2.5 text-center"
                    : "border-border-strong rounded-control border px-3.5 py-2.5 text-center"
                }
              >
                <b className="block">{step.title}</b>
                <span className="text-muted text-xs">{step.note}</span>
              </div>
              {step.separator ? (
                <span aria-hidden="true" className="text-muted">
                  {step.separator}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </Box>

      <h2 className="font-heading mt-6 mb-2.5 text-lg font-bold">Частые вопросы</h2>
      {FAQ.map(([question, answer], index) => (
        <details
          key={question}
          open={index === 0}
          className="bg-surface rounded-card mb-2 px-4.5 py-3.5"
        >
          <summary className="cursor-pointer font-medium">{question}</summary>
          <p className="text-muted mt-2">{answer}</p>
        </details>
      ))}

      <div className="my-5.5 flex flex-wrap justify-center gap-2.5">
        <Button asChild variant="cta" size="lg">
          <AppLink to="/catalog">Перейти в каталог</AppLink>
        </Button>
        <Button asChild size="lg">
          <AppLink to="/register">Зарегистрировать компанию</AppLink>
        </Button>
      </div>
    </div>
  );
}
