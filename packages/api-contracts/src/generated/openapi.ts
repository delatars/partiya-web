/* НЕ ПРАВИТЬ РУКАМИ.
 * Типы путей, операций и схем OpenAPI.
 * Источник: openapi.json бэкенда partiya-api (ARCHITECTURE.md, 8.5).
 * Обновить: pnpm --filter @partiya/api-contracts generate
 */

export interface paths {
    "/api/v1/admin/disputes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Очередь споров оператора
         * @description Оператор платформы — тот, кто перечислен в `PLATFORM_OPERATORS` (Q-110). Политика взята из `payments`: заводить вторую и разойтись с бэк-офисом денег — худшее, что здесь можно сделать.
         */
        get: operations["listDisputes"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/disputes/{orderId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Карточка спора в бэк-офисе
         * @description Идентификатор в пути — НОМЕР ЗАКАЗА: им спор назван и в очереди, и в переписке, и в ссылке на сам заказ. Карточка собирает позиции сторон, доказательства, ветку `dispute` чата, журнал заказа и варианты решения с уже посчитанным распределением эскроу.
         */
        get: operations["getDisputeForOperator"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/disputes/{orderId}/resolve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Решение оператора по спору
         * @description Переход автомата `ResolveDispute` и проводки — в ОДНОЙ транзакции: «деньги вернули, а заказ в споре» невозможно по построению.
         *
         *     Исход задаёт сторону: `rejected` и `rework` — в пользу фабрики (эскроу распределяется), `partial_refund` и `full_refund` — в пользу заказчика (возврат, остаток уходит фабрике за вычетом комиссии с её доли). Противоречие между `resolution` и `inFavorOf` — 422, а не попытка угадать, какой из двух денежных исходов настоящий.
         */
        post: operations["resolveDispute"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/factories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Заводы и заявки на подключение */
        get: operations["adminListFactories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/factories/{orgId}/audit-visit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Назначить выезд аудитора */
        post: operations["adminScheduleAuditVisit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/factories/{orgId}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Решение по заводу
         * @description Решение и запись в аудит-лог — одной транзакцией (раздел 9). Отказ и приостановка требуют обоснования: его видит завод.
         */
        post: operations["adminFactoryDecision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/finance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Финансы и сверка
         * @description Агрегат поверх `payments`: сверка ledger, очередь ожидающих оплаты счетов и начисленные выплаты. Остаток номинального счёта по выписке банка вводится руками (Q-10) — интеграции с банком нет, и `null` честнее выдуманного числа.
         */
        get: operations["adminFinance"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/offers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Очередь модерации предложений
         * @description Жалобы (`complaints`) сегодня всегда пусты: механизма жалоб на предложение ещё нет. Вкладка `autoflags` — те же версии очереди, у которых сработало автоправило (демпинг по цене).
         */
        get: operations["adminListOffers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/offers/{id}/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Опубликовать версию или вернуть на доработку
         * @description `approve` публикует версию: она становится текущей, и предложение попадает в выдачу. `reject` требует комментария — его увидит завод.
         *
         *     Решение и аудит-лог пишутся одной транзакцией.
         */
        post: operations["adminOfferDecision"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/orders/{id}/delivered": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Отметить партию доставленной
         * @description Команда `Delivered` автомата: `shipped → acceptance` (5.2). Webhook-а логистики нет и выдумывать его формат нельзя (Q-229), поэтому доставку отмечает оператор площадки. В той же транзакции открывается окно приёмки и ставится таймер авто-завершения (5 рабочих дней).
         */
        post: operations["markOrderDelivered"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Обзор бэк-офиса
         * @description KPI и очереди одним запросом: они обязаны сходиться между собой, а пять запросов дали бы пять моментов времени.
         */
        get: operations["adminOverview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/payments/deals/{id}/payout-confirmed": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Подтвердить выплату со счёта площадки
         * @description Списывает со сделки всё, что по ней причитается: заводу (`factory_payable`) и заказчику (`refund_payable`, если было решение по спору). Обе половины проводятся одной записью журнала — платёжным днём оператор отправляет оба перевода разом.
         *
         *     `Idempotency-Key` обязателен. Если по сделке нечего выплачивать — 409.
         */
        post: operations["confirmDealPayout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/payments/reconciliation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Сверка ledger
         * @description Остатки по счетам плюс два контрольных числа: сумма всех проводок (`journalTotal`, обязана быть нулём) и количество записей, не сходящихся к нулю (`unbalancedEntries`, обязано быть нулём).
         *
         *     `nominalExpected` — сколько обязано лежать на номинальном счёте по данным ledger. Сравнение с выпиской банка-партнёра делается руками: банк не выбран (вопрос Q-10), автоматической загрузки выписки нет.
         */
        get: operations["getLedgerReconciliation"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/payments/tranches": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Очередь счетов оператора
         * @description Счета в заданном статусе, ближайший срок первым. По умолчанию — ждущие оплаты: это и есть «Несопоставленные поступления» наоборот, вид со стороны площадки.
         *
         *     Доступ — только оператору платформы (см. порт `OperatorPolicy`).
         */
        get: operations["listAdminTranches"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/payments/tranches/{id}/confirm-funds": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Подтвердить поступление денег по счёту
         * @description Ручной провайдер расчётов: оператор видит платёжное поручение в выписке банка и подтверждает его здесь. Проводка — `customer_funds → escrow_hold`.
         *
         *     Заголовок `Idempotency-Key` обязателен: повтор с тем же ключом вернёт сохранённый ответ и **не** проведёт деньги второй раз. Тот же ключ с другим телом — 409.
         *
         *     Сумма должна совпасть с суммой счёта: частичная оплата — продуктовый вопрос, а не техника (422 `payments/amount_mismatch`).
         */
        post: operations["confirmTrancheFunds"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/ranking": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Веса ранжирования, штрафы и бейджи
         * @description Формула: `popularity_score = Σ вес × нормированный фактор / 100`. Сумма весов обязана быть 100 — иначе «вес 35 %» перестаёт что-либо значить.
         *
         *     Промокоды принадлежат модулю котировок и сюда пока не приходят.
         */
        get: operations["adminRanking"];
        /**
         * Применить веса ранжирования
         * @description Пересчитывает `popularity_score` всех опубликованных предложений в той же транзакции: экран «Популярные» обязан совпасть с весами сразу, а не через сутки.
         */
        put: operations["adminUpdateRanking"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/ranking/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Предпросмотр выдачи с новыми весами
         * @description Ничего не сохраняет: оператор двигает вес и сразу видит, что поменяется местами.
         */
        post: operations["adminRankingPreview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/taxonomy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Дерево категорий и схема атрибутов
         * @description Схема категории — это данные, а не код: набор полей формы SKU меняется без миграций (5.1).
         */
        get: operations["adminTaxonomy"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/admin/taxonomy/categories/{path}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Правка схемы категории
         * @description Схема переписывается целиком: форма присылает готовый список, и выводить из данных, что оператор удалил, — значит гадать.
         */
        put: operations["adminUpdateTaxonomyCategory"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/code": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Выслать одноразовый код входа
         * @description Ответ не зависит от того, есть ли такой пользователь: иначе форма входа превращается в справочник «кто уже на площадке».
         */
        post: operations["requestLoginCode"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Завершить текущий сеанс
         * @description Аноним получает `401`, а не молчаливый успех: иначе по ответу не отличить «вышел» от «не был внутри».
         */
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/verify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Проверить код и открыть сессию
         * @description При успехе ставит куку `partiya_session` (HttpOnly, SameSite=Lax) и отдаёт то же тело, что `GET /me`. Первый успешный вход заводит пользователя: отдельной регистрации человека нет.
         */
        post: operations["verifyLoginCode"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/catalog/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Дерево категорий
         * @description Слаги, заголовки, счётчик опубликованных офферов в ветке и цена «от». Из него собираются меню категорий, плитки главной и крошки каталога.
         */
        get: operations["catalogCategories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/catalog/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Поиск по каталогу офферов
         * @description Выдача витрины: офферы, фасеты со счётчиками и общее число совпадений. Значения фасетов передаются повторяющимся ключом: `?region=cfo&region=pfo&trust=audit`. Счётчики считаются «с исключением собственного фасета» — выбор ЦФО не обнуляет соседние округа.
         */
        get: operations["catalogSearch"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Документы и ЭДО
         * @description Документы формируются автоматически из заказа, поэтому создавать их снаружи нельзя: в API нет ни одного POST, который заводит документ.
         *
         *     ⚠ PDF пока не генерируется (модуль `documents` — отдельный шаг), поэтому `url` у всех документов `null`, а состояние честно называется `generating`. Счёт при этом живёт своей парой `awaiting_payment`/`paid`: про деньги сервер знает точно.
         */
        get: operations["listDocuments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/documents/{id}/sign": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Отправить документ на подпись в ЭДО
         * @description Подпись ставится в интерфейсе оператора ЭДО, а не внутри платформы (8.4). Оператор не подключён, поэтому маршрут честно отвечает 409 `/problems/documents/edo-not-connected`, а не делает вид, что подписал.
         */
        post: operations["signDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/factories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Список заводов
         * @description Фильтры по названию, городу, специализации и аудиту; фасеты «Город» и «Специализация» со счётчиками «с исключением собственного фасета». Порядок: аудит вперёд, дальше по рейтингу, при равенстве — по номеру.
         */
        get: operations["listFactories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/factories/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Витрина завода
         * @description Профиль производства, аудит, загрузка по неделям и его опубликованные предложения — одним плоским объектом.
         */
        get: operations["getFactory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Профиль, организации и активная роль */
        get: operations["getMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/active-org": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Сменить активную организацию сеанса
         * @description Членство проверяется на сервере. Чужая организация и несуществующая снаружи неотличимы — обе дают `403`, иначе id перебираются.
         */
        post: operations["switchActiveOrg"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/counters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Счётчики шапки и сайдбара
         * @description Одним объектом, а не пятью запросами: их считает одна выборка, и разъехаться между собой они не должны. Те же цифры приходят кадром `counters` в `GET /me/stream`.
         */
        get: operations["getUserCounters"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/edo": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Подключение организации к оператору ЭДО
         * @description Оператор ЭДО не подключён (интеграции нет), поэтому ответ честно говорит `connected: false`. Врать здесь нельзя: по этому полю экран решает, показывать ли кнопку подписи.
         */
        get: operations["getEdoConnection"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/escrow": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Раздел «Эскроу и счета» одним запросом
         * @description Одним, а не пятью: цифры KPI обязаны сходиться с таблицами, а пять независимых запросов рано или поздно покажут сумму от одного момента и список от другого (контракт, `EscrowOverview`).
         */
        get: operations["getEscrowOverview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/notification-settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Куда присылать уведомления
         * @description ⚠ Хранятся ТОЛЬКО настройки: отправки в email, Telegram и SMS нет. Половина интеграции хуже честного её отсутствия, поэтому `telegramConnected` всегда `false`, а не «почти подключено».
         */
        get: operations["getNotificationSettings"];
        /**
         * Изменить каналы доставки
         * @description Присылаются только изменённые темы и только изменённые каналы: полный документ затирал бы настройки, добавленные на сервере.
         */
        put: operations["updateNotificationSettings"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Свои сеансы на всех устройствах */
        get: operations["listSessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Завершить свой сеанс */
        delete: operations["revokeSession"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Пользовательский канал (SSE)
         * @description `text/event-stream`. Кадры:
         *
         *     * `notification` — новый пункт ленты (`NotificationItem`);
         *     * `counters` — счётчики шапки (`UserCounters`) целиком;
         *     * `ping` — раз в 25 секунд, держит соединение через прокси.
         *
         *     Будильник приходит из `LISTEN/NOTIFY` (канал `partiya_user_events`, payload — организация), а полезная нагрузка перечитывается из базы: уведомление может потеряться на обрыве и продублироваться, а перечитанные счётчики — нет.
         */
        get: operations["streamUserEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Лента уведомлений
         * @description Уведомление — доставленная копия события, а не само событие: журнал заказа виден обеим сторонам и хранится вечно, а лента адресная и прочитывается. Адресат — организация, прочитанность — у каждого своя.
         */
        get: operations["listNotifications"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/notifications/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Отметить уведомления прочитанными
         * @description Либо перечисленные, либо все: `all` и `ids` вместе не передаются. Пустое тело — 422 `/problems/notifications/nothing-to-read`, а не молчаливое «ничего не сделал».
         */
        post: operations["markNotificationsRead"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/offers/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Карточка оффера
         * @description Активная версия оффера: ступени цены, опции, образец, характеристики и карточка завода-продавца. Отзывы и вопросы приедут в фазе 2 — пока отдаются только счётчики (`reviewsCount`, `questionsCount`): пустой список соврал бы, что их нет.
         */
        get: operations["getOffer"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/offers/{id}/questions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Вопросы к предложению
         * @description Минимальная схема Q&A: карточка показывает счётчик `questionsCount` с самого начала, и до сих пор этот маршрут отвечал 404. Модерация вопросов и жалобы — отдельный шаг (модуль `ugc`).
         */
        get: operations["listOfferQuestions"];
        put?: never;
        /** Задать вопрос заводу */
        post: operations["askOfferQuestion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/offers/{id}/reviews": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Отзывы о заводе предложения
         * @description Отзывы платформы относятся к заводу, а не к SKU: партия шьётся заводом, и разбивать оценку по артикулам было бы вымыслом. Карточка показывает отзывы её завода.
         */
        get: operations["listOfferReviews"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/offers/{id}/sample-options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Справочник формы образца
         * @description Значения приходят с сервера, а не зашиты в браузер: набор цветов и видов печати задаёт фабрика, и релиз фронта для нового цвета выпускать незачем.
         *
         *     Цена образца — за ЗАКАЗ (1–3 шт), а не за штуку: иначе итог 1 920 ₽ из макета не сходится (Q-175). Печать входит в стоимость.
         */
        get: operations["getSampleOptions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/offers/{id}/similar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Похожие предложения
         * @description Та же категория, ближайшие по цене и минимальной партии, без самого оффера (ARCHITECTURE.md, 6). Со-просмотры появятся с модулем `analytics`.
         */
        get: operations["getSimilarOffers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/openapi.json": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Спецификация OpenAPI этого API
         * @description Из неё генерируются типы фронта (`@partiya/api-contracts`). Ровно тот же документ лежит в репозитории как `docs/openapi.json`.
         */
        get: operations["openapiSpec"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Заказы кабинета заказчика
         * @description `bucket`, `customerStage` и `progressPct` считает сервер из одного `status` — так выполняется тезис «статусы стандартизованы» (ARCHITECTURE.md, 5.2). Раскладывать статусы по вкладкам на фронте нельзя: две проекции разойдутся.
         */
        get: operations["listOrders"];
        put?: never;
        /**
         * Черновик заказа из котировки
         * @description В заказ идёт только `quoteId` — всё остальное сервер достаёт из сохранённой котировки (ARCHITECTURE.md, 5.5).
         *
         *     **201** — заведён новый черновик, **200** — продолжен начатый по тому же предложению с обновлённой котировкой (Q-184). Второго черновика на пару «организация + предложение» не бывает: это стережёт частичный UNIQUE в схеме.
         *
         *     Сервер сразу предзаполняет разбивку по цветам и размерам под объём, доставку из котировки, плательщика из активной организации и варианты оплаты (схема 50/50 доступна фабрикам с рейтингом 4,7+).
         */
        post: operations["createOrderDraft"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Заказ заказчика
         * @description Чужой заказ неотличим от несуществующего: 404, а не 403 — иначе по ответам можно перебрать номера и узнать, кто с кем работает (Q-195).
         */
        get: operations["getOrder"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Обновить черновик
         * @description Отсутствующий ключ — «не трогать», явный `null` — «очистить».
         *
         *     Объём, опции, вариант доставки и промокод меняются ТОЛЬКО через новую котировку (`POST /quotes` → `quoteId` сюда): иначе у денег появляется второй источник правды.
         *
         *     Коды отказа: `/problems/orders/not-draft`, `/problems/orders/quote-offer-mismatch`, `/problems/orders/quote-expired`, `/problems/orders/draft-incomplete` (с разбором по полям в `errors`).
         */
        patch: operations["updateOrderDraft"];
        trace?: never;
    };
    "/api/v1/orders/{id}/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Принять партию
         * @description Требует `Idempotency-Key`: приёмка освобождает деньги. В той же транзакции эскроу распределяется — заводу 92 %, платформе 8 % (ARCHITECTURE.md, 5.4).
         *
         *     Приёмка «с замечаниями» — всё равно приёмка: замечания уходят в журнал, а претензия, блокирующая деньги, это спор.
         */
        post: operations["acceptOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/artwork": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ссылка на загрузку макета
         * @description Файл уходит в хранилище напрямую, минуя API. Ссылка одноразовая и короткоживущая, ключ объекта непредсказуем: макет печати — интеллектуальная собственность заказчика (ARCHITECTURE.md, 9 и 13).
         *
         *     Лимиты приходят в ответе (`limits`) — зашивать мегабайты в браузер нельзя.
         */
        post: operations["requestArtworkUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/artwork/{fileId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Убрать файл макета
         * @description Идемпотентно: удаление уже удалённого файла — успех.
         */
        delete: operations["deleteArtwork"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/artwork/{fileId}/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Подтвердить загрузку макета
         * @description Сервер проверяет хранилище, а не верит браузеру: «загрузил» без объекта — это несостоявшаяся загрузка, и засчитывать её как приложенный макет нельзя.
         */
        post: operations["completeArtworkUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/artwork/approve": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Согласовать макет и цветопробу
         * @description Команда `ApproveArtwork` автомата: `artwork_review → materials` (5.2). Подаёт только заказчик (Q-02).
         */
        post: operations["approveArtwork"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/dispute": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Претензия по заказу */
        get: operations["getDispute"];
        put?: never;
        /**
         * Открыть претензию
         * @description Требует `Idempotency-Key`: запрос блокирует деньги.
         *
         *     Открыть спор можно только из `in_production` и `acceptance` (диаграмма 5.2). Пока спор открыт, заказ стоит в статусе `dispute`, и выплата фабрике невозможна: ребра «dispute → completed» без решения оператора в автомате нет.
         *
         *     Сумму требования считает сервер по `affectedQty` и цене за штуку из снимка котировки — число из браузера здесь не принимается (Q-204).
         *
         *     Коды отказа: 409 `/problems/disputes/not-allowed`, `/problems/disputes/already-open`, `/problems/disputes/window-closed`; 422 `/problems/disputes/invalid` с разбором по полям.
         */
        post: operations["openDispute"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/dispute-options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Из чего собирается форма претензии
         * @description Причины и варианты требований приходят с сервера, а не зашиты в браузер: суммы частичного возврата считает он же (Q-204), и релиз фронта ради нового варианта не нужен.
         */
        get: operations["getDisputeOptions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/dispute/evidence": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ссылка на загрузку доказательства
         * @description Файлы уходят в хранилище presigned-ссылкой, как макет печати (8.2). Доказательства носят обе стороны, поэтому маршрут открыт и заводу.
         */
        post: operations["requestDisputeEvidenceUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/dispute/withdraw": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Отозвать претензию
         * @description Заказ возвращается туда, откуда ушёл в спор, и выплата снова становится возможной. Прямого ребра «dispute → acceptance» в автомате нет, поэтому статус восстанавливается явно, а факт фиксируется событием журнала — историю это не переписывает.
         *
         *     409 `/problems/disputes/already-resolved` — решение уже принято.
         */
        post: operations["withdrawDispute"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/escrow": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Эскроу-сделка заказа
         * @description Адаптер поверх фасада `payments` в форме, которую ждёт экран (`payments.ts::EscrowDeal`). Суммы берутся из ledger, а не считаются здесь заново: второго места, где считаются деньги, в системе нет.
         *
         *     404 `/problems/payments/deal-not-found` — деньги не поступили.
         */
        get: operations["getOrderEscrow"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Журнал заказа
         * @description Append-only лента, из которой считаются трекинг, прогресс, чат и доказательства в споре (ARCHITECTURE.md, D7).
         *
         *     Без `after` отдаётся ХВОСТ журнала: экран открывается на свежем, а не на первом дне. `seq` монотонен и служит одновременно курсором (`?after=`) и `Last-Event-ID` канала SSE. Последовательность общая для всех заказов, поэтому внутри одного заказа номера идут с пропусками (Q-221) — контракт этого не запрещает: курсор работает по строгому «больше».
         *
         *     Коды отказа: 404 `/problems/tracking/order-not-found`, 409 `/problems/tracking/not-started`, 422 `/problems/tracking/bad-cursor`.
         */
        get: operations["getOrderEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Чат заказа
         * @description Чат привязан к заказу, а не к людям: переписка — доказательство в споре, и жить она обязана ровно столько же, сколько заказ.
         *
         *     `seq` у сообщения — тот же номер, что у событий ленты: чат и лента упорядочены одной шкалой и не спорят о порядке. Признак «своё» (`own`) считает сервер по активной организации, поэтому завод и заказчик видят одну переписку зеркально.
         */
        get: operations["getOrderMessages"];
        put?: never;
        /**
         * Написать в чат заказа
         * @description Требует `Idempotency-Key`: повторная отправка после обрыва сети не должна класть в чат два одинаковых сообщения.
         *
         *     Сообщение попадает в журнал заказа событием `message` с тем же `seq`, поэтому оно сразу видно и в ленте, и в канале SSE. Завод пишет теми же эндпоинтами под своей организацией.
         *
         *     Коды отказа: 422 `/problems/messages/empty`, 409 `/problems/messages/order-closed`, `/problems/messages/no-dispute`.
         */
        post: operations["sendOrderMessage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/messages/attachments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ссылка на загрузку вложения
         * @description Форма та же, что у макета печати: одна реализация хранилища на все загрузки (ARCHITECTURE.md, 8.2). Через API файлы не ходят.
         *
         *     Коды отказа несут префикс своего домена: 413 `/problems/messages/attachment-too-large`, 415 `/problems/messages/attachment-unsupported-type`.
         */
        post: operations["requestMessageAttachmentUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/messages/read": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Отметить переписку прочитанной
         * @description Курсором, а не списком id (Q-205): экран, открытый на сутки, прислал бы сотню идентификаторов. Курсор — на пару «заказ + организация», поэтому у заказчика и у завода счётчики свои и не мешают друг другу. Назад курсор не ходит: отставшая вкладка не воскресит бейдж.
         */
        post: operations["markOrderMessagesRead"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/repeat": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Повторить партию
         * @description Новый черновик по спецификации прошлой партии. Черновик создаёт сервер, а не браузер: скидку за повтор считает движок котировок, и собрать такой заказ ссылкой значило бы дать браузеру решать, положена ли скидка (Q-123).
         */
        post: operations["repeatOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Канал заказа (SSE)
         * @description `text/event-stream`. Кадр события:
         *
         *     ```text
         *     event: order_event
         *     id: 42
         *     data: {"seq":42,"orderId":4813,"type":"progress",…}
         *     ```
         *
         *     `id` — `seq` события; браузер вернёт его заголовком `Last-Event-ID` при переподключении, и сервер дочитает пропущенное из журнала. `data` — одна строка JSON, ровно `OrderEvent` из `GET /orders/{id}/events`: отдельного «облегчённого» представления нет намеренно.
         *
         *     Кадр `ping` без `id` приходит раз в 20 секунд: он держит соединение через прокси и не сдвигает курсор.
         *
         *     Права проверяются при подключении; чужой заказ — 404.
         */
        get: operations["streamOrderEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orders/{id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Оформить заказ и получить счёт
         * @description Требует `Idempotency-Key`. Повтор с тем же ключом возвращает первый ответ, а не заводит вторую сделку; другой ключ на уже оформленном заказе — 409 `/problems/orders/not-draft`.
         *
         *     В одной транзакции: проверка полноты → переход `draft → awaiting_payment` → открытие эскроу-сделки в `payments` → документы → журнал → outbox. Таймер оплаты ставит `payments` вместе со счётом.
         */
        post: operations["submitOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orgs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Зарегистрировать организацию
         * @description Создатель становится владельцем (`owner`). KYB пока не делается: `verificationStatus` у новой организации всегда `pending`.
         */
        post: operations["createOrg"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/orgs/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Карточка организации
         * @description Не участнику — `403`, а не `404`: иначе по разнице ответов можно выяснить, существует ли компания с таким id.
         */
        get: operations["getOrg"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payments/deals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Эскроу и счета заказчика
         * @description Лента сделок активной организации как плательщика — экран «Эскроу и счета». Пагинация курсорная: `nextCursor` предыдущей страницы кладётся в `cursor`.
         *
         *     Нужно право «видеть эскроу и счета» (владелец, закупщик, бухгалтер, наблюдатель).
         */
        get: operations["listEscrowDeals"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/payments/deals/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Сделка: счета, реквизиты, история операций
         * @description Доступна обеим сторонам — плательщику и получателю. Чужая сделка отдаёт 404, а не 403: по ответу нельзя узнать, существует ли она.
         *
         *     `paymentInstructions` заполняются только по неоплаченным счетам; `history` — проводки ledger, сумма каждой записи равна нулю.
         */
        get: operations["getEscrowDeal"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/quotes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Котировка партии
         * @description Сервер авторитетен: браузер присылает только выбор покупателя (объём, опции, доставка), а цены и проценты скидок подставляет бэкенд (ARCHITECTURE.md, 5.5).
         *
         *     Повторный запрос с тем же входом в пределах срока действия возвращает **ту же** котировку, а не новую: расчёт идемпотентен по хэшу входа.
         *
         *     Скидка за повтор применяется только вошедшему покупателю — у анонима истории заказов нет, и верить флагу из браузера нельзя.
         *
         *     Промокод проверяется по справочнику площадки: неизвестный, просроченный или исчерпанный код даёт 422 `/problems/quote/unknown_promo`, а не тихий расчёт без скидки.
         *
         *     Без `DATABASE_URL` расчёт отдаётся с `id: null`: посчитать можно, сохранить негде.
         */
        post: operations["createQuote"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/quotes/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Сохранённая котировка
         * @description Котировка неизменяема: её содержимое не меняется после выдачи, даже если оффер подорожал. Истёкшая котировка остаётся читаемой — по ней видно, что и когда предлагали, — но `validUntil` уже в прошлом.
         */
        get: operations["getQuote"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/samples": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Образцы кабинета */
        get: operations["listSamples"];
        put?: never;
        /**
         * Заказать образец
         * @description Требует `Idempotency-Key`.
         *
         *     **Оплата не проводится.** По Q-176 образец идёт мимо эскроу, а приём карты требует платёжного провайдера, которого ещё нет: сервер записывает выбранный способ и ставит статус (`card` → `paid`, `invoice` → `awaiting_payment`). Ни одной проводки в ledger образец не делает.
         */
        post: operations["createSample"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/samples/artwork": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ссылка на загрузку макета образца
         * @description Форма та же, что у макета партии: одна реализация хранилища на оба случая. Заказа ещё нет, поэтому файл живёт без привязки к нему и связывается при `POST /samples`.
         */
        post: operations["requestSampleArtworkUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/analytics/funnel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Воронка кабинета завода
         * @description Считается из того, что платформа действительно знает: котировки по предложениям завода, оформленные и оплаченные заказы. Показы в выдаче и просмотры карточек — нули: их никто не пишет, модуля аналитики нет. Выдуманные числа были бы хуже нулей — на них начали бы принимать решения.
         */
        get: operations["getSellerFunnel"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Аудит завода */
        get: operations["getSellerAudit"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/audit/request": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Заявка на аудит
         * @description Заявка двигает этап завода в очередь бэк-офиса: оператор назначит выезд аудитора.
         */
        post: operations["requestSellerAudit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/capacity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * План мощности завода
         * @description План по неделям, резервы платформы, коэффициенты изделий и правило скидки на недозагруз — весь экран одним запросом (ARCHITECTURE.md, 5.3).
         *
         *     «Свободно» считает сервер: браузер не вычитает резервы сам, иначе «свободно 38 %» в каталоге и в кабинете разошлись бы.
         */
        get: operations["getCapacityPlan"];
        /**
         * Сохранить план мощности
         * @description План недели нельзя опустить ниже уже занятого: резервы платформы продавать назад нечем (422 `capacity/below-reserved`, `errors` по ключу `line:week`). Неделя в прошлом не правится вовсе (409 `capacity/week-in-past`).
         */
        put: operations["updateCapacityPlan"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/capacity/copy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Скопировать план на другие недели
         * @description Копируется только план; резервы платформы не переносятся — они принадлежат заказам, а не сетке. Внеплатформенная загрузка копируется по требованию (`withExternal`).
         */
        post: operations["copyCapacityPlan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Сводка кабинета завода
         * @description KPI одним запросом: загрузка мощностей, деньги, воронка, список «нужно сделать сегодня» и счётчики заказов — они обязаны сходиться между собой.
         *
         *     Показов и просмотров в воронке нет: их никто не пишет, и нули честнее выдуманных чисел.
         */
        get: operations["getSellerDashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/feedback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Отзывы и вопросы завода
         * @description Отзывы приходят вместе с приёмкой (`orders.order_reviews`), вопросы — с карточки предложения. Среднее время ответа сегодня считать нечем: отметок «прочитано» у вопросов нет, и поле отдаётся нулём.
         */
        get: operations["getSellerFeedback"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/feedback/questions/{id}/answer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Ответить на вопрос к предложению */
        post: operations["answerSellerQuestion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/feedback/reviews/{id}/reply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Публичный ответ на отзыв
         * @description Отзыв адресуется публичным номером заказа: один заказ — один отзыв (`orders.order_reviews.order_id` — первичный ключ).
         */
        post: operations["replySellerReview"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/finance/payouts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Выплаты заводу
         * @description Таблица «Выплаты» кабинета завода: сумма заказа, комиссия и к выплате. Комиссия считается той же функцией домена, что и проводки ledger, — расхождение на округлении невозможно.
         */
        get: operations["listSellerPayouts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/finance/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Итоги: в эскроу, к выплате, выплачено, комиссия
         * @description Все четыре числа считаются по проводкам ledger, а не хранятся отдельно (ARCHITECTURE.md, 5.4: «баланс не хранится — считается»).
         */
        get: operations["getSellerFinanceSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/offers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Предложения завода
         * @description Все SKU завода: черновики, на модерации, опубликованные и скрытые. Метрики показов и просмотров сегодня нулевые — их никто не пишет (модуля аналитики нет), и выдумывать их нельзя.
         */
        get: operations["listSellerOffers"];
        put?: never;
        /**
         * Завести предложение
         * @description Создаётся черновик: версии у него ещё нет вовсе. Версия появится на `submit` — и сразу неизменяемым снимком (5.1).
         */
        post: operations["createSellerOffer"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/offers/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Сохранить черновик предложения
         * @description Форма шлёт только изменённое. Валидация — та же, что у движка котировок (`pricing::validate_offer`), но с разбором по путям полей: `tiers.1.unitPrice` — чтобы ошибка подсветилась в своей строке.
         */
        patch: operations["saveSellerOffer"];
        trace?: never;
    };
    "/api/v1/seller/offers/{id}/editor": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Редактор предложения
         * @description У опубликованного SKU черновик восстанавливается из текущей версии: завод правит то, что видит покупатель, а не пустую форму.
         */
        get: operations["getSellerOfferEditor"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/offers/{id}/listing": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Показывать предложение в выдаче
         * @description Скрытое предложение остаётся опубликованным: по прямой ссылке его видно, в поиске — нет.
         */
        post: operations["setSellerOfferListed"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/offers/{id}/submit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Отправить версию на модерацию
         * @description Значимые поля (название, фото, характеристики, категория) уходят оператору; правка только цены и сроков публикуется сразу — новой версией, а не правкой старой.
         *
         *     Опубликованное предложение остаётся в выдаче со старой версией до решения оператора (5.1).
         */
        post: operations["submitSellerOffer"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/offers/new": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Пустой редактор нового предложения
         * @description Форму SKU собирает схема категории, а не редактор: завод не сможет выбрать того, чего в схеме нет (5.1).
         */
        get: operations["newSellerOfferEditor"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/onboarding": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Черновик мастера подключения
         * @description Мастер длинный, его бросают и возвращаются через день — черновик живёт на сервере, а не в `sessionStorage` (Q-111).
         */
        get: operations["getFactoryOnboarding"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Сохранить шаг мастера подключения
         * @description Первое сохранение заводит запись завода (`factory.factories`) для организации-завода: с этого момента она может завести SKU и попасть в каталог после модерации и аудита.
         */
        patch: operations["saveFactoryOnboarding"];
        trace?: never;
    };
    "/api/v1/seller/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Очередь заказов завода
         * @description Черновики и неоплаченные заказы завод не видит вовсе: до денег заказа для него не существует. Счётчики вкладок (`summary`) считаются по всей выдаче, а не по странице.
         *
         *     Ступень `shipped` — пятая (Q-01): отгружённый заказ иначе исчез бы из всех вкладок, хотя деньги за него ещё не выплачены.
         */
        get: operations["listSellerOrders"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/orders/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Заказ глазами завода
         * @description Это не `Order` заказчика: реквизитов плательщика, промокода и платёжных инструкций здесь нет — заводу они не принадлежат. Комиссия и выплата приходят готовыми числами из тех же функций, что кладут проводки в ledger.
         */
        get: operations["getSellerOrder"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/orders/{id}/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Подтвердить заказ
         * @description `awaiting_confirmation → confirmed` (5.2). Мягкий резерв мощности становится жёстким в той же транзакции.
         *
         *     Истёкший дедлайн даёт 409 `seller/confirm-deadline-passed`: заказ уже отменён платформой, и подтверждать нечего.
         */
        post: operations["confirmSellerOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/orders/{id}/decline": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Отклонить заказ
         * @description `awaiting_confirmation → declined`, и сразу же полный возврат денег заказчику через `payments` — в той же транзакции. Резерв мощности снимается там же.
         */
        post: operations["declineSellerOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/orders/{id}/dispute/reply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ответ фабрики на претензию
         * @description `opened → factory_replied`. Ответ попадает в журнал заказа, поэтому заказчик видит его в ленте и в канале SSE без перезагрузки.
         */
        post: operations["replyToDispute"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/orders/{id}/photo-report": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Фотоотчёт с производства
         * @description Событие `photo_report` уходит в журнал заказа и тем же `seq` — в канал SSE: у заказчика снимки появляются без перезагрузки страницы.
         *
         *     В журнале лежат только идентификаторы снимков: журнал неизменяем, а ссылка на файл обязана быть короткоживущей.
         */
        post: operations["reportPhotos"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/orders/{id}/photo-report/upload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Ссылка на загрузку снимка фотоотчёта
         * @description Снимок уходит в хранилище напрямую, минуя API — та же presigned-схема, что у макета печати (ARCHITECTURE.md, 8.2). Ссылка одноразовая, ключ объекта непредсказуем: фотоотчёт с производства виден только сторонам заказа.
         *
         *     Снимок попадает в ленту не сразу: сперва загрузка, потом `POST /seller/orders/{id}/photo-report` со списком `fileId`.
         */
        post: operations["requestPhotoUpload"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/orders/{id}/progress": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Отчёт о выработке
         * @description Строка прогресса уходит в журнал заказа — оттуда её читают и лента трекинга, и колонка готовности в кабинете. Прогресс больше объёма партии либо отрицательный даёт 422 `seller/invalid-progress` с разбором по полям.
         */
        post: operations["reportSellerProgress"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/orders/{id}/stage": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Шаг производства
         * @description Переходы автомата, которые подаёт завод: `start_artwork_review`, `materials_purchased`, `start_quality_control`, `ship`. Какой переход из какого статуса возможен, решает домен — недопустимый даёт 409 `seller/transition-not-allowed`, а не тихий no-op.
         *
         *     Какие команды доступны прямо сейчас, говорит `availableCommands` карточки: список собирается из того же автомата.
         */
        post: operations["advanceSellerStage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Профиль завода */
        get: operations["getSellerProfile"];
        /**
         * Сохранить профиль завода
         * @description Правка витрины завода. Рейтинг, число заказов и аудит сюда не приходят: это факты платформы, а не поля формы.
         */
        put: operations["updateSellerProfile"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/samples": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Заявки на образцы
         * @description Образцы, заказанные у этого завода. Конверсия «получил образец → оформил партию» считается по заказам того же заказчика у того же завода после доставки образца.
         */
        get: operations["listSellerSamples"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/seller/samples/{id}/{command}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Взять образец в работу, отгрузить или отклонить
         * @description Команды `accept`, `ship`, `decline`. Трек-номер образца платформа пока не хранит (отдельной таблицы доставки нет) — он уходит в комментарий образца, и `trackingNumber` в выдаче остаётся `null`.
         */
        post: operations["advanceSellerSample"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/uploads/{token}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Скачать файл по подписанной ссылке
         * @description Ссылка короткоживущая и выдаётся только участникам заказа: макет печати — интеллектуальная собственность заказчика (ARCHITECTURE.md, 13).
         */
        get: operations["getUpload"];
        /**
         * Приёмник файлов dev-хранилища
         * @description Временный маршрут dev-хранилища: он заменяет presigned PUT в S3, пока банк... точнее, пока клиент S3 не подключён и не проверен. Право на запись даёт одноразовый подписанный токен из ответа `POST /orders/{id}/artwork`, а не сессия.
         */
        put: operations["putUpload"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Проба живости
         * @description Маршрут вне `/api/v1`: его опрашивает оркестратор, а не фронт.
         */
        get: operations["healthz"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** @description Строка чек-листа приёмки. */
        AcceptanceCheck: {
            /** @description Значение по спецификации: «1 000 шт». */
            expected: string;
            /** @description Код строки: `qty`, `colors`, `sizes`, `print`, `marking`. */
            id: string;
            /** @description Что сообщил контроль качества; `null` — отчёта нет. */
            reported?: string | null;
            title: string;
        };
        /** @description Окно приёмки — поле `Order.acceptance`. */
        AcceptanceWindow: {
            /** @description Когда партия будет принята автоматически (5 рабочих дней, ARCHITECTURE.md 5.2). */
            autoAcceptAt: string;
            checks: components["schemas"]["AcceptanceCheck"][];
            /** @description Можно ли ещё открыть спор — совпадает с окном приёмки. */
            disputeAllowed: boolean;
            openedAt: string;
            photoIds: string[];
            qualityNote?: string | null;
            /** Format: int32 */
            workingDaysLeft: number;
        };
        /** @description Тело `POST /orders/{id}/accept`. */
        AcceptOrderBody: {
            /** @description Отметки по строкам чек-листа: код строки → `ok` | `issue`. */
            marks?: Record<string, never>;
            /** @description Текст замечаний — уходит в журнал заказа. */
            note?: string | null;
            /** @description Отзыв о фабрике; приём отзывов — модуль `ugc`, пока только в журнал. */
            review?: Record<string, never>;
        };
        /**
         * @description Вид счёта ledger.
         * @enum {string}
         */
        AccountKindName: "customer_funds" | "escrow_hold" | "factory_payable" | "platform_fee" | "refund_payable" | "payout_settled";
        AdminAlert: {
            actionHref: string | null;
            actionLabel: string | null;
            id: string;
            /** @description `info` | `warn` | `danger`. */
            kind: components["schemas"]["AdminAlertKind"];
            text: string | null;
            title: string;
        };
        /**
         * @description Важность алерта.
         * @enum {string}
         */
        AdminAlertKind: "info" | "warn" | "danger";
        AdminAuditCheck: {
            key: string;
            /** @description `done` | `now` | `todo`. */
            state: components["schemas"]["AdminAuditCheckState"];
            title: string;
        };
        /**
         * @description Состояние пункта чек-листа аудита.
         * @enum {string}
         */
        AdminAuditCheckState: "done" | "now" | "todo";
        /** @description Карточка спора в бэк-офисе. */
        AdminDisputeCard: {
            /** Format: int32 */
            affectedQty: number | null;
            customerName: string;
            decision: null | components["schemas"]["DisputeDecision"];
            decisionDueAt: string | null;
            disputeId: string;
            /** Format: int64 */
            escrowAmount: number;
            /** @description Журнал заказа: оператор обязан видеть его рядом со спором. */
            events: components["schemas"]["OrderEvent"][];
            evidence: components["schemas"]["AdminDisputeEvidenceRow"][];
            factoryName: string;
            /** @description Переписка сторон — ветка `dispute` чата заказа. */
            messages: components["schemas"]["OrderMessage"][];
            openedAt: string;
            options: components["schemas"]["AdminDisputeResolutionOption"][];
            /** Format: int32 */
            orderId: number;
            orderTitle: string;
            parties: components["schemas"]["AdminDisputeParty"][];
            reasonTitle: string;
            status: components["schemas"]["DisputeStatusName"];
            /** Format: int32 */
            totalQty: number;
        };
        /** @description Счётчики вкладок очереди. */
        AdminDisputeCounts: {
            /** Format: int64 */
            dueToday: number;
            /** Format: int64 */
            open: number;
            /** Format: int64 */
            resolved: number;
        };
        /** @description Строка доказательной базы. */
        AdminDisputeEvidenceRow: {
            /** @description Что в документе: подпись заказчика к файлу, тип и размер. */
            fact: string;
            href: string | null;
            key: string;
            title: string;
            /**
             * @description Вывод оператора. Всегда `null`: разбор доказательств платформа не автоматизирует
             *     (Q-319) — вывод оператор пишет в мотивировке решения.
             */
            verdict: string | null;
        };
        /** @description Очередь споров целиком. */
        AdminDisputeList: {
            counts: components["schemas"]["AdminDisputeCounts"];
            items: components["schemas"]["AdminDisputeRow"][];
            selected: null | components["schemas"]["AdminDisputeCard"];
            /** Format: int64 */
            total: number;
        };
        /** @description Позиция стороны — колонка блока «Позиции сторон». */
        AdminDisputeParty: {
            /** @description Бейдж над колонкой; `null` — бейджа нет. */
            badge: string | null;
            evidence: components["schemas"]["DisputeEvidence"][];
            side: components["schemas"]["DisputeSideName"];
            text: string;
            /** @description «Заказчик», «Фабрика». */
            title: string;
        };
        /** @description Вариант решения с посчитанным распределением эскроу. */
        AdminDisputeResolutionOption: {
            available: boolean;
            /** Format: int64 */
            customerAmount: number;
            description: string | null;
            /** Format: int64 */
            factoryAmount: number;
            /**
             * Format: int64
             * @description Комиссия платформы при таком исходе — только с доли фабрики (Q-194).
             */
            fee: number;
            resolution: components["schemas"]["DisputeResolutionName"];
            title: string;
            unavailableReason: string | null;
        };
        /** @description Строка очереди споров. */
        AdminDisputeRow: {
            decisionDueAt: string | null;
            disputeId: string;
            /** Format: int64 */
            escrowAmount: number;
            openedAt: string;
            /** Format: int32 */
            orderId: number;
            /** @description «ООО «Кора» ↔ ООО «Волна»». */
            parties: string;
            reasonTitle: string;
            status: components["schemas"]["DisputeStatusName"];
            /** @description Решение сегодня — строка горит. */
            urgent: boolean;
        };
        AdminFactoryCard: {
            appliedAt: string | null;
            auditorName: string | null;
            auditors: string[];
            checks: components["schemas"]["AdminAuditCheck"][];
            city: string;
            /** Format: int32 */
            declinedInRow: number;
            inn: string;
            name: string;
            orgId: string;
            stage: components["schemas"]["AdminFactoryStageName"];
            visitAt: string | null;
        };
        AdminFactoryCounts: {
            /** Format: int64 */
            active: number;
            /** Format: int64 */
            auditExpiring: number;
            /** Format: int64 */
            queue: number;
            /** Format: int64 */
            suspended: number;
        };
        AdminFactoryDecisionBody: {
            comment: string;
            /** @description `approve` | `reject` | `suspend` | `resume`. */
            decision: string;
        };
        AdminFactoryList: {
            counts: components["schemas"]["AdminFactoryCounts"];
            items: components["schemas"]["AdminFactoryRow"][];
            selected: null | components["schemas"]["AdminFactoryCard"];
            /** Format: int64 */
            total: number;
        };
        AdminFactoryRow: {
            appliedAt: string | null;
            auditValidUntil: string | null;
            city: string;
            inn: string;
            name: string;
            nextStep: string | null;
            orgId: string;
            stage: components["schemas"]["AdminFactoryStageName"];
            urgent: boolean;
        };
        /**
         * @description Стадия заявки завода в бэк-офисе.
         * @enum {string}
         */
        AdminFactoryStageName: "application" | "documents_ok" | "visit_scheduled" | "passed" | "no_audit" | "rejected" | "suspended";
        AdminFinanceOverview: {
            /** Format: int64 */
            discrepancy: number;
            lastCheckedAt: string | null;
            /** Format: int64 */
            nominalActual: number | null;
            payouts: components["schemas"]["AdminPayoutRow"][];
            /** Format: int64 */
            payoutTodayFactories: number;
            /** Format: int64 */
            payoutTodayTotal: number;
            reconciliation: Record<string, never>;
            tranches: Record<string, never>[];
        };
        /**
         * @description Тон плашки-заглушки изображения.
         * @enum {string}
         */
        AdminImageTone: "a" | "b" | "c" | "d";
        AdminOfferCard: {
            changes: components["schemas"]["AdminOfferChange"][];
            factoryCity: string;
            factoryName: string;
            /** Format: int32 */
            fromVersion: number | null;
            images: components["schemas"]["AdminOfferImage"][];
            kind: components["schemas"]["AdminOfferKindName"];
            /** Format: int32 */
            offerId: number;
            suggestedComment: string | null;
            title: string;
            /** Format: int32 */
            toVersion: number;
        };
        AdminOfferChange: {
            after: string | null;
            before: string | null;
            field: string;
            flag?: string | null;
            label: string;
        };
        AdminOfferCounts: {
            /** Format: int64 */
            autoflags: number;
            /** Format: int64 */
            complaints: number;
            /** Format: int64 */
            queue: number;
        };
        AdminOfferDecisionBody: {
            comment: string;
            /** @description `approve` | `reject`. */
            decision: string;
        };
        AdminOfferImage: {
            flag?: string | null;
            id: string;
            label: string;
            tone: components["schemas"]["AdminImageTone"];
        };
        /**
         * @description Вид заявки на модерацию SKU.
         * @enum {string}
         */
        AdminOfferKindName: "new" | "update";
        AdminOfferList: {
            counts: components["schemas"]["AdminOfferCounts"];
            items: components["schemas"]["AdminOfferRow"][];
            selected: null | components["schemas"]["AdminOfferCard"];
            slaNote: string;
            /** Format: int64 */
            total: number;
        };
        AdminOfferRow: {
            factoryName: string;
            factoryOrgId: string;
            flags: string[];
            /** @description `new` | `update`. */
            kind: components["schemas"]["AdminOfferKindName"];
            kindNote: string;
            /** Format: int32 */
            offerId: number;
            queuedAt: string;
            title: string;
            urgent: boolean;
            waiting: string;
        };
        AdminOverview: {
            alerts: components["schemas"]["AdminAlert"][];
            /** Format: int64 */
            escrowOrders: number;
            /** Format: int64 */
            escrowTotal: number;
            /** Format: int64 */
            feeMonth: number;
            /** Format: int64 */
            gmvDeltaPct: number | null;
            /** Format: int64 */
            gmvMonth: number;
            /** Format: int64 */
            ordersInWork: number;
            /** Format: int64 */
            ordersOverdue: number;
            queues: components["schemas"]["AdminQueueRow"][];
            stages: components["schemas"]["AdminStageRow"][];
            todayNote: string;
        };
        AdminPayoutRow: {
            /** Format: int64 */
            amount: number;
            blocker: string | null;
            dealId: string;
            /** Format: int64 */
            dealNo: number;
            factoryName: string;
            /** Format: int32 */
            orderId: number | null;
            ready: boolean;
            status: string;
            subtitle: string;
        };
        AdminQueueRow: {
            /** Format: int64 */
            count: number;
            href: string;
            key: string;
            note: string | null;
            title: string;
        };
        AdminRanking: {
            appliedAt: string | null;
            badges: components["schemas"]["RankingBadge"][];
            penalties: components["schemas"]["RankingPenalty"][];
            promos: Record<string, never>[];
            weights: components["schemas"]["RankingWeight"][];
        };
        AdminStageRow: {
            /** Format: int64 */
            count: number;
            key: string;
            /** Format: int64 */
            pct: number;
            title: string;
        };
        AdminTaxonomy: {
            selected: null | components["schemas"]["TaxonomyCategory"];
            tree: components["schemas"]["TaxonomyNode"][];
        };
        /** @description Строка очереди оператора: счёт, который ждёт денег. */
        AdminTrancheRow: {
            /**
             * Format: int64
             * @example 6300000
             */
            amount: number;
            /** Format: uuid */
            dealId: string;
            /** Format: int64 */
            dealNo: number;
            /** Format: date-time */
            dueAt: string;
            /** @description Срок оплаты уже прошёл. */
            overdue: boolean;
            /** Format: uuid */
            payeeOrgId: string;
            /** Format: uuid */
            payerOrgId: string;
            reference: string;
            status: components["schemas"]["TrancheStatusName"];
            /** Format: uuid */
            trancheId: string;
            /** Format: int32 */
            trancheNo: number;
        };
        /** @description Страница очереди. */
        AdminTranchesPage: {
            items: components["schemas"]["AdminTrancheRow"][];
            nextCursor: string | null;
        };
        /** @description Тело `POST /seller/orders/{id}/stage` — шаг производства по автомату. */
        AdvanceStageBody: {
            /**
             * @description Команда автомата: `start_artwork_review`, `materials_purchased`,
             *     `start_quality_control`, `ship`.
             */
            command: string;
        };
        /** @description Ограничения загрузки макета — их задаёт сервер. */
        ArtworkLimits: {
            contentTypes: string[];
            /** Format: int32 */
            maxFiles: number;
            /**
             * Format: int64
             * @description Максимальный размер одного файла, байты.
             */
            maxSize: number;
        };
        /**
         * @description Состояние файла макета печати.
         * @enum {string}
         */
        ArtworkStatusName: "uploading" | "review" | "approved" | "rejected" | "failed";
        /**
         * @description HTTP-метод загрузки макета.
         * @enum {string}
         */
        ArtworkUploadMethod: "PUT" | "POST";
        /** @description `POST /orders/{id}/artwork` — запрос ссылки на загрузку. */
        ArtworkUploadRequest: {
            contentType: string;
            fileName: string;
            /**
             * Format: int64
             * @description Размер, байты.
             */
            size: number;
        };
        /** @description Ответ на запрос загрузки. */
        ArtworkUploadResponse: {
            expiresAt: string;
            fileId: string;
            /** @description Заголовки, которые обязаны уйти вместе с телом. */
            headers: Record<string, never>;
            limits: components["schemas"]["ArtworkLimits"];
            /** @description Метод для `uploadUrl`. */
            method: components["schemas"]["ArtworkUploadMethod"];
            /** @description Куда браузер кладёт файл. Одноразовая ссылка с ограниченным сроком. */
            uploadUrl: string;
        };
        AskQuestionBody: {
            text: string;
        };
        /**
         * @description HTTP-метод загрузки вложения.
         * @enum {string}
         */
        AttachmentUploadMethod: "PUT" | "POST";
        /**
         * @description Состояние пункта чек-листа аудита.
         * @enum {string}
         */
        AuditCheckStateName: "ok" | "work" | "todo";
        /** @description Ячейка «линия × неделя». */
        CapacityCell: {
            /** Format: int64 */
            externalUnits: number;
            /**
             * Format: int32
             * @description Свободно, % от плана; при `planned = false` — `null`.
             */
            freePct: number | null;
            /** Format: int64 */
            freeUnits: number;
            /** Format: int64 */
            hardUnits: number;
            lineId: string;
            overbooked: boolean;
            /** @description Заполнен ли план на эту неделю. `false` при `unitsTotal = 0` — «плана нет». */
            planned: boolean;
            /** Format: int64 */
            softUnits: number;
            underloaded: boolean;
            /** Format: int64 */
            unitsTotal: number;
            weekStart: string;
        };
        /** @description Правка одной ячейки. Резервы не передаются: их ставит платформа, а не завод. */
        CapacityCellInput: {
            /** Format: int64 */
            externalUnits: number;
            lineId: string;
            /** Format: int64 */
            unitsTotal: number;
            weekStart: string;
        };
        CapacityCoefficientInput: {
            key: string;
            /**
             * Format: float
             * @description Дробное число: 2.4. В хранилище уходит в сотых.
             */
            unitsPerItem: number;
        };
        /** @description Коэффициент изделия: сколько условных единиц «съедает» одна штука. */
        CapacityItemCoefficient: {
            key: string;
            /** @description Коэффициент задан категорией и заводом не меняется. */
            locked: boolean;
            title: string;
            /**
             * Format: float
             * @description Дробное число: 2.4 означает «худи съедает 2,4 условных единицы».
             */
            unitsPerItem: number;
        };
        /** @description Производственная линия завода. */
        CapacityLine: {
            /**
             * Format: int64
             * @description План по умолчанию на неделю, условных единиц.
             */
            defaultUnitsPerWeek: number;
            id: string;
            title: string;
        };
        CapacityLineInput: {
            /** Format: int64 */
            defaultUnitsPerWeek?: number | null;
            id: string;
            title?: string | null;
        };
        /** @description `GET /seller/capacity` — весь экран одним запросом. */
        CapacityPlan: {
            cells: components["schemas"]["CapacityCell"][];
            from: string;
            itemCoefficients: components["schemas"]["CapacityItemCoefficient"][];
            lines: components["schemas"]["CapacityLine"][];
            reservations: components["schemas"]["CapacityReservation"][];
            summary: components["schemas"]["CapacitySummary"];
            to: string;
            underloadDiscount: components["schemas"]["UnderloadDiscountRule"];
            warning: null | components["schemas"]["CapacityWarning"];
            weeks: components["schemas"]["CapacityWeek"][];
        };
        /** @description Резерв мощности под заказ. */
        CapacityReservation: {
            /** @description Когда истекает мягкий резерв; у жёсткого `null`. */
            expiresAt: string | null;
            /** @description `soft` | `hard`. */
            kind: components["schemas"]["ReservationKindName"];
            note: string | null;
            /** Format: int32 */
            orderId: number;
            /** @description «№ 4799 · Футболки 3 000 шт». */
            title: string;
            /** Format: int64 */
            units: number;
            /**
             * Format: int32
             * @description Сколько недель занимает резерв.
             */
            weeks: number;
            weekStart: string;
        };
        /** @description Плитки экрана «Мощность». */
        CapacitySummary: {
            /** Format: int32 */
            externalPct: number;
            /** Format: int64 */
            freeUnits: number;
            /** Format: int32 */
            loadPct: number;
            month: string;
            /** Format: int64 */
            soldUnits: number;
            /** Format: int64 */
            totalUnits: number;
            /** Format: int32 */
            underloadWeeks: number;
            /** @description Единица измерения: «усл. ед.». */
            unit: string;
            /** Format: int32 */
            unplannedWeeks: number;
        };
        /** @description Предупреждение над сеткой. */
        CapacityWarning: {
            text: string;
            title: string;
        };
        /** @description Колонка сетки. */
        CapacityWeek: {
            /** @description «29 сен–5 окт» — подпись колонки. */
            label: string;
            /** @description Неделя уже прошла: редактировать её нельзя. */
            past: boolean;
            /** @description Понедельник недели, ISO `YYYY-MM-DD`. */
            weekStart: string;
        };
        /** @description Страница выдачи каталога. */
        CatalogSearchResult: {
            category: null | components["schemas"]["CategoryRef"];
            facets: components["schemas"]["Facet"][];
            items: components["schemas"]["OfferSummary"][];
            /**
             * Format: int32
             * @description Отданная страница. Может отличаться от запрошенной: за пределами выдачи
             *     номер прижимается к последней странице.
             */
            page: number;
            /** Format: int32 */
            pageCount: number;
            /** Format: int32 */
            perPage: number;
            /**
             * Format: int64
             * @description Сколько офферов нашлось всего, а не на этой странице.
             * @example 30
             */
            total: number;
        };
        /**
         * @description Порядок выдачи каталога — допустимые значения query-параметра `sort`.
         * @enum {string}
         */
        CatalogSort: "popular" | "price_asc" | "lead_asc" | "rating_desc" | "free_capacity_desc";
        /** @description Узел дерева категорий. */
        Category: {
            children: components["schemas"]["Category"][];
            /**
             * Format: int32
             * @description Сколько опубликованных офферов в ветке, включая потомков.
             */
            offersCount: number;
            /** @description Путь от корня: `["tekstil", "futbolki"]`. */
            path: string[];
            /**
             * Format: int64
             * @description Самая низкая цена за штуку в ветке, копейки; `null` — офферов нет.
             */
            priceFrom: number | null;
            slug: string;
            title: string;
        };
        CategoryAttributeDef: {
            key: string;
            /** @description `select` | `multiselect` | `number` | `text`. */
            kind: string;
            label: string;
            options?: string[] | null;
            required: boolean;
            unit: string | null;
            usedIn?: string[] | null;
        };
        /** @description Категория с заголовком. */
        CategoryRef: {
            path: string[];
            title: string;
        };
        CategorySchema: {
            attributes: components["schemas"]["CategoryAttributeDef"][];
            /**
             * Format: float
             * @description Сколько условных единиц мощности «съедает» одно изделие по умолчанию.
             */
            defaultCapacityUnitsPerItem: number;
            path: string[];
            title: string;
            unit: string;
        };
        /** @description Дерево категорий. */
        CategoryTree: {
            items: components["schemas"]["Category"][];
        };
        /**
         * @description Канал доставки кода входа.
         * @enum {string}
         */
        ChannelName: "email" | "sms";
        /**
         * @description Код принят к отправке. Ответ одинаков и для нового человека, и для известного:
         *     иначе форма входа превращается в справочник «кто уже на площадке».
         */
        CodeRequested: {
            /** @description Куда ушёл код — фронт этим подписывает экран ввода. */
            channel: components["schemas"]["ChannelName"];
            /**
             * Format: int32
             * @description Сколько цифр ждать в поле ввода.
             * @example 6
             */
            codeLength: number;
            /**
             * Format: int64
             * @description Сколько секунд живёт код.
             * @example 300
             */
            expiresIn: number;
            /**
             * Format: int64
             * @description Через сколько секунд доступна повторная отправка (таймер «0:42»).
             * @example 60
             */
            resendAfter: number;
            /**
             * @description Замаскированный адресат: `+7 916 ···-12-34`.
             * @example +7 916 ···-12-34
             */
            sentTo: string;
        };
        /** @description Тело `POST /admin/payments/tranches/{id}/confirm-funds`. */
        ConfirmFundsRequest: {
            /**
             * Format: int64
             * @description Сколько поступило, копейки. Без поля — ровно сумма счёта.
             *     Другая сумма отвергается: частичная оплата — продуктовый вопрос, а не техника.
             * @example 18340000
             */
            amount?: number | null;
            /**
             * @description Номер платёжного поручения из выписки.
             * @example ПП № 417 от 21.09.2026
             */
            externalRef?: string | null;
        };
        /** @description `POST /seller/capacity/copy` — «Скопировать сентябрь → октябрь». */
        CopyCapacityRequest: {
            fromWeekStart: string;
            toWeekStart: string;
            /** Format: int32 */
            weeks: number;
            withExternal?: boolean | null;
        };
        /**
         * @description `POST /orders` — создать черновик из котировки.
         *
         *     Тело состоит из одного поля намеренно: всё остальное (оффер, объём, опции,
         *     доставка, цены, срок) сервер достаёт из сохранённой котировки. Прислать их ещё
         *     раз — значит завести второй источник правды.
         */
        CreateOrderDraftBody: {
            /** @description Идентификатор сохранённой котировки. */
            quoteId: string;
        };
        /** @description Заявка на регистрацию организации (экран `register`). */
        CreateOrgRequest: {
            /**
             * @description 10 или 12 цифр; контрольная сумма проверяется.
             * @example 7707083893
             */
            inn: string;
            /** @description `customer` — «заказывать производство», `factory` — «принимать заказы». */
            kind: components["schemas"]["OrgKindName"];
            /** @example 770101001 */
            kpp?: string | null;
            /** @example ООО «Кора» */
            name: string;
        };
        /** @description Тело `POST /samples`. */
        CreateSampleBody: {
            /** @description Макет необязателен: без него фабрика нанесёт тестовый принт. */
            artworkFileId?: string | null;
            comment?: string | null;
            delivery: components["schemas"]["SampleDeliveryInput"];
            /** Format: int32 */
            offerId: number;
            params: components["schemas"]["SampleParams"];
            /** @description `card` | `invoice`. Через эскроу образец не идёт (Q-176). */
            payment: string;
        };
        /**
         * @description Укрупнённая лента заказчика.
         * @enum {string}
         */
        CustomerStage: "paid" | "materials" | "production" | "quality_control" | "shipped";
        /**
         * @description Статус сделки.
         * @enum {string}
         */
        DealStatusName: "awaiting_funds" | "partially_funded" | "funded" | "released" | "refunded" | "partially_refunded" | "cancelled";
        /** @description Тело `POST /seller/orders/{id}/decline`. */
        DeclineOrderBody: {
            reason?: string | null;
        };
        /** @description Вариант доставки партии. */
        DeliveryOption: {
            /**
             * Format: int32
             * @description Дней на доставку сверх срока производства.
             */
            days: number | null;
            /**
             * @description Код варианта: `wb`, `address`, `pickup`. Уходит в `POST /quotes`.
             * @example wb
             */
            id: string;
            note: string | null;
            /**
             * Format: int64
             * @example 940000
             */
            price: number;
            /** @description Текст, который попадёт в строку котировки. */
            title: string;
        };
        /** @description Претензия целиком. */
        Dispute: {
            /**
             * Format: int32
             * @description Сколько изделий затронуто; `null` — претензия ко всей партии.
             */
            affectedQty?: number | null;
            decision?: null | components["schemas"]["DisputeDecision"];
            decisionDueAt?: string | null;
            description: string;
            /** Format: int64 */
            escrowAmount: number;
            /** @description Заблокирована ли выплата фабрике. */
            escrowBlocked: boolean;
            evidence: components["schemas"]["DisputeEvidence"][];
            factoryReplyDueAt?: string | null;
            id: string;
            /**
             * Format: int64
             * @description Сколько сообщений в ветке `dispute`.
             */
            messageCount: number;
            openedAt: string;
            openedBy: components["schemas"]["DisputeActor"];
            /** Format: int32 */
            orderId: number;
            reason: components["schemas"]["DisputeReasonName"];
            /** @description Название причины по-русски — справочник у сервера. */
            reasonTitle: string;
            remedy: components["schemas"]["DisputeRemedyKindName"];
            /**
             * Format: int64
             * @description Сумма требования на момент открытия; `null` у переделки.
             */
            remedyAmount?: number | null;
            /** @description `opened` | `factory_replied` | `operator_review` | `resolved` | `withdrawn`. */
            status: components["schemas"]["DisputeStatusName"];
            /** Format: int32 */
            totalQty: number;
        };
        /** @description Автор действия по спору. */
        DisputeActor: {
            kind: components["schemas"]["DisputeActorKind"];
            name: string;
            orgId?: string | null;
        };
        /**
         * @description Кто совершил действие по спору.
         * @enum {string}
         */
        DisputeActorKind: "customer" | "factory" | "operator" | "system";
        /** @description Решение оператора. */
        DisputeDecision: {
            /**
             * Format: int64
             * @description Сумма возврата заказчику; у переделки и отказа `null`.
             */
            amount?: number | null;
            /** @description Мотивировка оператора — она видна обеим сторонам. */
            comment: string;
            decidedAt: string;
            decidedBy: components["schemas"]["DisputeActor"];
            /** @description В чью пользу — `customer` | `factory`. */
            inFavorOf: components["schemas"]["DisputeSideName"];
            /** @description `rework` | `partial_refund` | `full_refund` | `rejected`. */
            resolution: components["schemas"]["DisputeResolutionName"];
        };
        /** @description Доказательство по претензии. */
        DisputeEvidence: {
            caption?: string | null;
            contentType: string;
            fileName: string;
            id: string;
            /** Format: int64 */
            size: number;
            uploadedAt: string;
            /** @description Кто приложил: доказательства носят обе стороны. */
            uploadedBy: components["schemas"]["DisputeActor"];
            /** @description Ссылка на файл; `null`, пока не долетел до хранилища. */
            url?: string | null;
        };
        /** @description `POST /orders/{id}/dispute/evidence`. */
        DisputeEvidenceUploadRequest: {
            contentType: string;
            fileName: string;
            /** Format: int64 */
            size: number;
        };
        /** @description Ответ на запрос загрузки доказательства. */
        DisputeEvidenceUploadResponse: {
            expiresAt: string;
            fileId: string;
            headers: Record<string, never>;
            limits: Record<string, never>;
            method: components["schemas"]["EvidenceUploadMethod"];
            uploadUrl: string;
        };
        /** @description `GET /orders/{id}/dispute-options`. */
        DisputeOptions: {
            /** @description Ограничения загрузки доказательств. */
            evidence: Record<string, never>;
            /** @description До какого момента можно открыть спор; `null` — бессрочно. */
            openUntil?: string | null;
            reasons: components["schemas"]["DisputeReasonOption"][];
            remedies: components["schemas"]["DisputeRemedyOption"][];
            /**
             * Format: int32
             * @description Всего изделий в партии.
             */
            totalQty: number;
            /**
             * Format: int64
             * @description Цена за штуку: по ней экран показывает сумму частичного возврата.
             */
            unitPrice: number;
        };
        /**
         * @description Причина претензии.
         * @enum {string}
         */
        DisputeReasonName: "size_mismatch" | "defects" | "print_defects" | "shortfall" | "deadline" | "other";
        /** @description Причина претензии в справочнике. */
        DisputeReasonOption: {
            title: string;
            value: components["schemas"]["DisputeReasonName"];
        };
        /**
         * @description Вид требования по претензии.
         * @enum {string}
         */
        DisputeRemedyKindName: "rework" | "partial_refund" | "full_refund";
        /** @description Вариант требования с посчитанной суммой. */
        DisputeRemedyOption: {
            /**
             * Format: int64
             * @description Сумма возврата; у переделки `null`.
             */
            amount?: number | null;
            available: boolean;
            description?: string | null;
            kind: components["schemas"]["DisputeRemedyKindName"];
            title: string;
            unavailableReason?: string | null;
        };
        /** @description Ответ фабрики на претензию. */
        DisputeReplyBody: {
            comment: string;
        };
        /**
         * @description Исход спора.
         * @enum {string}
         */
        DisputeResolutionName: "rework" | "partial_refund" | "full_refund" | "rejected";
        /**
         * @description В чью пользу решён спор.
         * @enum {string}
         */
        DisputeSideName: "customer" | "factory";
        /**
         * @description Стадия претензии.
         * @enum {string}
         */
        DisputeStatusName: "opened" | "factory_replied" | "operator_review" | "resolved" | "withdrawn";
        /** @description Краткая ссылка на спор в теле заказа. */
        DisputeSummary: {
            decisionDueAt?: string | null;
            escrowBlocked: boolean;
            id: string;
            openedAt: string;
            reasonTitle: string;
            status: components["schemas"]["DisputeSummaryStatus"];
        };
        /**
         * @description Стадия претензии в проекции заказа.
         * @enum {string}
         */
        DisputeSummaryStatus: "opened" | "factory_replied" | "operator_review" | "resolved" | "withdrawn";
        /**
         * @description Вид документа в реестре (к видам заказа добавляется УПД).
         * @enum {string}
         */
        DocumentKindName: "offer_contract" | "specification" | "invoice" | "act" | "upd";
        /** @description `GET /documents`. */
        DocumentList: {
            /**
             * Format: int64
             * @description Сколько документов ждёт подписи заказчика.
             */
            awaitingSignature: number;
            items: components["schemas"]["DocumentSummary"][];
            page?: null | components["schemas"]["PageInfo"];
            /** Format: int64 */
            total: number;
        };
        /**
         * @description Состояние подписи документа в ЭДО.
         * @enum {string}
         */
        DocumentSignatureName: "none" | "edo_pending" | "edo_signed";
        /**
         * @description Состояние документа.
         * @enum {string}
         */
        DocumentStateName: "generating" | "awaiting_customer" | "awaiting_factory" | "signed" | "awaiting_payment" | "paid" | "cancelled";
        /** @description Строка раздела «Документы и ЭДО». */
        DocumentSummary: {
            /** Format: int64 */
            amount?: number | null;
            createdAt: string;
            id: string;
            kind: components["schemas"]["DocumentKindName"];
            /** @description Номер без названия: «4812-С», «4790-У». */
            number: string;
            /** Format: int32 */
            orderId: number;
            orderTitle?: string | null;
            signature: components["schemas"]["DocumentSignatureName"];
            signedAt?: string | null;
            /**
             * @description `generating` | `awaiting_customer` | `awaiting_factory` | `signed` |
             *     `awaiting_payment` | `paid` | `cancelled`.
             */
            state: components["schemas"]["DocumentStateName"];
            title: string;
            url?: string | null;
        };
        /** @description `GET /me/edo` — подключение организации к оператору ЭДО. */
        EdoConnection: {
            connected: boolean;
            connectedAt?: string | null;
            operator?: string | null;
            participantId?: string | null;
        };
        /**
         * @description Вид операции в журнале.
         * @enum {string}
         */
        EntryKindName: "funds_held" | "released" | "refunded" | "payout_settled";
        /** @description Сделка по одному заказу — `GET /orders/{id}/escrow`. */
        EscrowDeal: {
            /** Format: int64 */
            amount: number;
            autoReleaseAt?: string | null;
            blockedByDisputeId?: string | null;
            /** Format: int64 */
            factoryPayout: number;
            /** Format: int64 */
            heldAmount: number;
            id: string;
            method: components["schemas"]["EscrowMethodName"];
            /** Format: int32 */
            orderId: number;
            /**
             * Format: int64
             * @description Комиссия платформы — её удерживают при выплате.
             */
            platformFee: number;
            /** Format: int64 */
            refundedAmount: number;
            /** Format: int64 */
            releasedAmount: number;
            status: components["schemas"]["EscrowDealStatusName"];
            tranches: components["schemas"]["EscrowTranche"][];
        };
        /** @description Сделка со всем, что нужно экрану «Эскроу и счета». */
        EscrowDealDetail: components["schemas"]["PaymentsDeal"] & {
            /** @description История операций по сделке. */
            history: components["schemas"]["LedgerEntry"][];
            /** @description Счета к оплате: только по тем траншам, где ещё ждут денег. */
            paymentInstructions: components["schemas"]["PaymentInstruction"][];
        };
        /** @description Активный резерв — строка таблицы «Активные резервы». */
        EscrowDealRow: {
            /** Format: int64 */
            amount: number;
            dealId: string;
            factory: string;
            /** Format: int32 */
            orderId: number;
            orderTitle: string;
            releaseNote?: string | null;
            /** @description Русское название текущего этапа заказа. */
            stageTitle: string;
            status: components["schemas"]["EscrowDealStatusName"];
        };
        /** @description Страница ленты сделок. */
        EscrowDealsPage: {
            items: components["schemas"]["PaymentsDeal"][];
            /** @description Курсор следующей страницы; `null` — дальше ничего нет. */
            nextCursor: string | null;
        };
        /**
         * @description Состояние эскроу по заказу.
         * @enum {string}
         */
        EscrowDealStatusName: "awaiting_funds" | "held" | "partially_released" | "released" | "refunded" | "blocked";
        /**
         * @description Схема оплаты сделки.
         * @enum {string}
         */
        EscrowMethodName: "escrow_full" | "escrow_split_50_50";
        /** @description Строка истории операций раздела «Эскроу и счета». */
        EscrowOperation: {
            /**
             * Format: int64
             * @description Сумма, всегда неотрицательная: направление задаёт `kind`.
             */
            amount: number;
            at: string;
            id: string;
            /** @description `hold` | `release` | `refund` | `invoice` | `fee`. */
            kind: components["schemas"]["EscrowOperationKindName"];
            /** Format: int32 */
            orderId?: number | null;
            subtitle?: string | null;
            title: string;
        };
        /**
         * @description Вид проводки в ленте эскроу.
         * @enum {string}
         */
        EscrowOperationKindName: "hold" | "release" | "refund" | "invoice" | "fee";
        /** @description `GET /me/escrow` — весь раздел одним запросом. */
        EscrowOverview: {
            /** Format: int64 */
            awaitingInvoices: number;
            /** Format: int64 */
            awaitingTotal: number;
            deals: components["schemas"]["EscrowDealRow"][];
            /** Format: int64 */
            heldOrders: number;
            /** Format: int64 */
            heldTotal: number;
            invoices: components["schemas"]["InvoiceSummary"][];
            operations: components["schemas"]["EscrowOperation"][];
            /** Format: int64 */
            paidOutTotal: number;
            /** Format: int64 */
            refundedTotal: number;
        };
        /** @description Карточка эскроу в шапке заказа. */
        EscrowSummary: {
            /** Format: int64 */
            amount: number;
            autoReleaseAt?: string | null;
            dealId: string;
            /** Format: int64 */
            heldAmount: number;
            method: components["schemas"]["EscrowMethodName"];
            /** @description Готовая строка состояния: «зарезервировано платформой». */
            note: string;
            /** @description `awaiting_funds` | `held` | `partially_released` | `released` | `refunded` | `blocked`. */
            status: components["schemas"]["EscrowDealStatusName"];
        };
        /** @description Транш сделки. */
        EscrowTranche: {
            /** Format: int64 */
            amount: number;
            dueAt?: string | null;
            heldAt?: string | null;
            id: string;
            /**
             * Format: int32
             * @description Порядковый номер, с 1.
             */
            index: number;
            releasedAt?: string | null;
            status: components["schemas"]["EscrowTrancheStatusName"];
            title: string;
        };
        /**
         * @description Состояние транша.
         * @enum {string}
         */
        EscrowTrancheStatusName: "awaiting_funds" | "held" | "released" | "refunded";
        /**
         * @description HTTP-метод загрузки доказательства.
         * @enum {string}
         */
        EvidenceUploadMethod: "PUT" | "POST";
        /** @description Группа фильтров слева от выдачи. */
        Facet: {
            /**
             * @description Ключ группы: `moq`, `region`, `lead`, `trust`, `material` в каталоге и
             *     `city` / `spec` в списке заводов. Он же — имя query-параметра, которым
             *     группа выбирается.
             */
            key: string;
            kind: components["schemas"]["FacetKind"];
            label: string;
            options: components["schemas"]["FacetOption"][];
        };
        /**
         * @description Как рисовать группу фильтров.
         * @enum {string}
         */
        FacetKind: "checkbox" | "radio";
        /** @description Значение фильтра с числом совпадений. */
        FacetOption: {
            /**
             * Format: int32
             * @description Счётчик «с исключением собственного фасета»: выбор ЦФО не обнуляет соседние округа.
             */
            count: number;
            label: string;
            selected: boolean;
            value: string;
        };
        /** @description Аудит завода: чек-лист и срок действия. */
        FactoryAudit: {
            checks: components["schemas"]["FactoryAuditCheck"][];
            /**
             * Format: date
             * @description До какой даты действителен аудит. Обязательна: блок аудита без срока
             *     действия ничего не сообщает, поэтому без даты он не собирается вовсе.
             */
            validUntil: string;
        };
        /** @description Пункт чек-листа аудита платформы. */
        FactoryAuditCheck: {
            label: string;
            passed: boolean;
        };
        /** @description Завод в карточке оффера: выдача плюс доверительные факты. */
        FactoryBrief: {
            /**
             * Format: date
             * @description Дата последнего аудита; `null` — аудита не было.
             */
            auditedAt: string | null;
            city: string;
            /**
             * Format: int32
             * @description Заказов, выполненных через платформу.
             */
            completedOrders: number;
            /**
             * Format: int32
             * @example 17
             */
            id: number;
            name: string;
            /**
             * Format: double
             * @example 4.8
             */
            rating: number;
            region: components["schemas"]["FactoryRegion"];
            /** Format: int32 */
            reviews: number;
            /**
             * Format: int32
             * @description Год начала производства.
             */
            since: number | null;
            /** @description Подпись специализации: «Швейное производство». */
            specialization: string | null;
        };
        /** @description Загрузка одной недели. */
        FactoryCapacityWeek: {
            /** @description Подпись столбика: «1–7 сен». */
            label: string;
            /** Format: int32 */
            loadPct: number;
        };
        /**
         * @description Витрина завода — плоская, как её ждёт фронт: профиль, цифры, аудит, загрузка
         *     и предложения в одном объекте.
         */
        FactoryDetail: {
            about: string | null;
            audit: null | components["schemas"]["FactoryAudit"];
            /** Format: date */
            auditedAt: string | null;
            /**
             * Format: int32
             * @description Мощность, единиц в месяц.
             */
            capacityPerMonth: number;
            capacityWeeks: components["schemas"]["FactoryCapacityWeek"][];
            city: string;
            /** Format: int32 */
            completedOrders: number;
            /**
             * Format: int32
             * @description Сколько споров открывали по заказам завода. Данных нет — это 0, а не «неизвестно»:
             *     карточка печатает число без проверки (контракт `FactoryDetail.disputes`).
             */
            disputes: number;
            /** @description Подпись к числу споров: «из 87, решён в пользу заказчика». */
            disputesNote: string | null;
            /** Format: int32 */
            freeCapacityPct: number;
            /** @description Фото цеха; пока заглушки-градиенты. */
            gallery: components["schemas"]["FactoryImage"][];
            /**
             * Format: int32
             * @example 17
             */
            id: number;
            name: string;
            /** @description Опубликованные предложения завода. */
            offers: components["schemas"]["OfferSummary"][];
            /** Format: int32 */
            offersCount: number;
            /**
             * @description «с марта 2025» — строка, а не дата: её фронт печатает как есть.
             * @example с марта 2025
             */
            onPlatformSince: string | null;
            /**
             * Format: int32
             * @description Доля заказов, отгруженных в срок, %.
             */
            onTimePct: number | null;
            /**
             * Format: double
             * @example 4.8
             */
            rating: number;
            region: components["schemas"]["FactoryRegion"];
            /** Format: int32 */
            respondsInMinutes: number | null;
            /** Format: int32 */
            reviews: number;
            /** Format: int32 */
            since: number | null;
            specialization: string | null;
            specializationKey: null | components["schemas"]["SpecializationName"];
            /**
             * Format: int32
             * @description Сотрудников в штате. Неизвестное значение отдаём нулём: фронт печатает его
             *     в строке «140 сотрудников», и `null` там превратился бы в «NaN».
             */
            workers: number;
        };
        /** @description Фото цеха на витрине завода. */
        FactoryImage: {
            label: string;
            tone: components["schemas"]["OfferTone"];
            url: string | null;
        };
        /** @description Страница списка заводов. */
        FactoryListResult: {
            /** @description Фасеты «Город» и «Специализация» — тот же тип, что в каталоге. */
            facets: components["schemas"]["Facet"][];
            items: components["schemas"]["FactorySummary"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageCount: number;
            /** Format: int32 */
            perPage: number;
            /**
             * Format: int64
             * @example 10
             */
            total: number;
        };
        FactoryOnboardingDraft: {
            auditRequested: boolean;
            /** Format: int32 */
            capacityPerMonth: number | null;
            city: string | null;
            completed: boolean;
            /** @description Парк оборудования, как его перечислил мастер. Пустой список — шаг ещё не прошли. */
            equipment: string[];
            /** Format: int32 */
            firstOfferId: number | null;
            /** @description Ключ изделия → единиц мощности на изделие. */
            itemCoefficients: {
                [key: string]: number;
            };
            specialization: string | null;
            /** Format: int32 */
            step: number;
            updatedAt: string | null;
            /** Format: int32 */
            workers: number | null;
        };
        /**
         * @description Федеральный округ завода — значение фасета `region`.
         * @enum {string}
         */
        FactoryRegion: "cfo" | "szfo" | "ufo" | "pfo" | "yfo" | "skfo" | "sfo" | "dfo";
        /** @description Завод в списке `/factories`: то же, что в карточке, плюс цифры витрины. */
        FactorySummary: {
            /** Format: date */
            auditedAt: string | null;
            city: string;
            /** Format: int32 */
            completedOrders: number;
            /**
             * Format: int32
             * @description Свободная мощность в ближайшем месяце, %.
             */
            freeCapacityPct: number;
            /**
             * Format: int32
             * @example 17
             */
            id: number;
            name: string;
            /**
             * Format: int32
             * @description Сколько у завода опубликованных предложений.
             */
            offersCount: number;
            /**
             * Format: double
             * @example 4.8
             */
            rating: number;
            region: components["schemas"]["FactoryRegion"];
            /**
             * Format: int32
             * @description Среднее время ответа технолога, минуты.
             */
            respondsInMinutes: number | null;
            /** Format: int32 */
            reviews: number;
            /** Format: int32 */
            since: number | null;
            specialization: string | null;
            specializationKey: null | components["schemas"]["SpecializationName"];
        };
        /**
         * @description Тон плашки-заглушки в галерее профиля.
         * @enum {string}
         */
        GalleryToneName: "a" | "b" | "c" | "d";
        /** @description Состояние сервиса: сам он и его база. */
        Health: {
            /**
             * @description `up` — база ответила, `down` — пул есть, но база недоступна,
             *     `disabled` — `DATABASE_URL` не задан.
             * @example up
             */
            db: string;
            /**
             * @description Всегда `ok`: если сервис не жив, ответа не будет вовсе.
             * @example ok
             */
            status: string;
        };
        /** @description Счёт к оплате. */
        InvoiceSummary: {
            /** Format: int64 */
            amount: number;
            dueAt: string;
            id: string;
            number: string;
            /** Format: int32 */
            orderId: number;
            title: string;
        };
        /** @description Остаток одного счёта. */
        LedgerAccountBalance: {
            /** Format: int64 */
            balance: number;
            code: string;
            kind: components["schemas"]["AccountKindName"];
            /** Format: uuid */
            orgId: string | null;
        };
        /** @description Запись журнала: одна операция с деньгами. */
        LedgerEntry: {
            /** @description Кто провёл: `system`, `orders`, `operator:<uuid>`. */
            actor: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            kind: components["schemas"]["EntryKindName"];
            /** @example Резерв в эскроу */
            kindTitle: string;
            /** @description Комментарий: основание решения, номер платёжного поручения. */
            memo: string | null;
            /** @description Проводки. Их сумма всегда ноль — это и есть двойная запись. */
            postings: components["schemas"]["LedgerPosting"][];
        };
        /** @description Остаток по виду счетов. */
        LedgerKindBalance: {
            /**
             * Format: int64
             * @example 4821430000
             */
            balance: number;
            kind: components["schemas"]["AccountKindName"];
            /** @example В эскроу */
            title: string;
        };
        /** @description Проводка в истории операций. */
        LedgerPosting: {
            /** @description Код счёта: `escrow_hold:<uuid>`, `platform_fee`… */
            account: string;
            accountKind: components["schemas"]["AccountKindName"];
            /**
             * Format: int64
             * @description Со знаком: «+» пришло на счёт, «−» ушло.
             * @example 18340000
             */
            amount: number;
        };
        /** @description Итог сверки — экран «Финансы и сверка». */
        LedgerReconciliation: {
            /** @description Счета с ненулевым остатком. */
            accounts: components["schemas"]["LedgerAccountBalance"][];
            /** @description Остатки по видам счетов. */
            byKind: components["schemas"]["LedgerKindBalance"][];
            /** @description Журнал сходится. */
            consistent: boolean;
            /**
             * Format: int64
             * @description «Эскроу по ledger».
             */
            escrowHeld: number;
            /**
             * Format: int64
             * @description Сумма всех проводок. Обязана быть нулём — это и есть контроль двойной записи.
             * @example 0
             */
            journalTotal: number;
            /**
             * Format: int64
             * @description Сколько обязано лежать на номинальном счёте: принято, но ещё не роздано.
             *     Сравнивается с выпиской банка; расхождение — работа оператору.
             */
            nominalExpected: number;
            /**
             * Format: int64
             * @description Записей, не сходящихся к нулю. Обязано быть нулём.
             * @example 0
             */
            unbalancedEntries: number;
        };
        /** @description `POST /orders/{id}/messages/read`. */
        MarkMessagesReadBody: {
            channel?: string | null;
            /** Format: int64 */
            upToSeq: number;
        };
        /** @description `POST /notifications/read`. */
        MarkNotificationsReadBody: {
            all?: boolean | null;
            ids?: string[] | null;
        };
        /** @description Ответ `/me` и `/auth/verify` — одна и та же форма, чтобы фронт разбирал их одним кодом. */
        Me: {
            /**
             * Format: uuid
             * @description `null`, пока пользователь не состоит ни в одной организации.
             */
            activeOrgId: string | null;
            activeRole: null | components["schemas"]["RoleName"];
            organizations: components["schemas"]["Org"][];
            /**
             * @description Вошедший — сотрудник площадки (Q-110). По нему фронт открывает бэк-офис;
             *     сервер всё равно проверяет право на каждом маршруте `/admin/**` отдельно.
             */
            platformOperator: boolean;
            user: components["schemas"]["User"];
        };
        /** @description `POST /orders/{id}/messages/attachments`. */
        MessageAttachmentUploadRequest: {
            contentType: string;
            fileName: string;
            /**
             * Format: int64
             * @description Размер, байты.
             */
            size: number;
        };
        /** @description Ответ на запрос загрузки вложения. */
        MessageAttachmentUploadResponse: {
            expiresAt: string;
            fileId: string;
            headers: Record<string, never>;
            limits: Record<string, never>;
            method: components["schemas"]["AttachmentUploadMethod"];
            uploadUrl: string;
        };
        /**
         * @description Кто написал сообщение.
         * @enum {string}
         */
        MessageAuthorKind: "customer" | "factory" | "operator" | "system";
        /**
         * @description Канал чата: обсуждение заказа или ветка спора.
         * @enum {string}
         */
        MessageChannelName: "order" | "dispute";
        /** @description Пункт ленты уведомлений. */
        NotificationItem: {
            createdAt: string;
            /** @description Куда ведёт клик — относительный путь приложения. */
            href?: string | null;
            id: string;
            /** Format: int32 */
            orderId?: number | null;
            /** @description `null` — не прочитано (строка подсвечивается). */
            readAt?: string | null;
            text?: string | null;
            title: string;
            /** @description `order_status` | `photo_report` | `documents` | `messages` | `disputes` | `offers`. */
            topic: components["schemas"]["NotificationTopicName"];
        };
        /** @description Лента уведомлений. */
        NotificationList: {
            /** @description По убыванию `createdAt`: лента читается сверху. */
            items: components["schemas"]["NotificationItem"][];
            /** Format: int64 */
            total: number;
            /** Format: int64 */
            unread: number;
        };
        /** @description Строка настроек: тема и включённые каналы. */
        NotificationPreference: {
            channels: Record<string, never>;
            /** @description Тему нельзя отключить целиком: переключатели заблокированы. */
            required: boolean;
            /** @description Подпись пишет сервер — справочник тем у него. */
            title: string;
            topic: components["schemas"]["NotificationTopicName"];
        };
        NotificationPreferencePatch: {
            channels: Record<string, never>;
            topic: components["schemas"]["NotificationTopicName"];
        };
        /** @description `GET /me/notification-settings`. */
        NotificationSettings: {
            email?: string | null;
            phone?: string | null;
            preferences: components["schemas"]["NotificationPreference"][];
            /** @description Подключён ли Telegram-бот. */
            telegramConnected: boolean;
            telegramConnectUrl?: string | null;
        };
        /**
         * @description Тема уведомления.
         * @enum {string}
         */
        NotificationTopicName: "order_status" | "photo_report" | "documents" | "messages" | "disputes" | "offers";
        /**
         * @description Отметка на карточке оффера.
         * @enum {string}
         */
        OfferBadge: "hit" | "underload" | "audit";
        /**
         * @description Бейдж карточки предложения.
         * @enum {string}
         */
        OfferBadgeName: "hit" | "underload" | "audit";
        /** @description Оффер целиком (экран карточки). */
        OfferDetail: {
            /** @description «5 раб. дней, выборка 5 % по ГОСТ». */
            acceptanceNote: string | null;
            /**
             * @description Артикул для строки меты: «арт. 2231». Это тот же публичный номер строкой.
             * @example 2231
             */
            article: string | null;
            badges: components["schemas"]["OfferBadge"][];
            /** @description «38 % мощности · ближайший запуск 22.09». */
            capacityNote: string | null;
            category: null | components["schemas"]["CategoryRef"];
            categoryPath: string[];
            /** @description Варианты доставки. Порядок значим: первый выбран по умолчанию (Q-121). */
            delivery: components["schemas"]["DeliveryOption"][];
            description: string | null;
            /** @description Завод-продавец. */
            factory: components["schemas"]["FactoryBrief"];
            /**
             * Format: int32
             * @description Сколько всего активных предложений у завода — «все предложения (3)».
             */
            factoryOffersCount: number;
            /** Format: int32 */
            freeCapacityPct: number;
            /**
             * Format: int32
             * @example 2231
             */
            id: number;
            /** @description Галерея. Пока — заглушки-градиенты: модуля `media` ещё нет. */
            images: components["schemas"]["OfferImage"][];
            /**
             * Format: int32
             * @description Верхняя граница срока: «14–18 рабочих дней». Версия без неё считается
             *     «срок ровно `leadDaysMin`» — вилки нет, а не «срок неизвестен».
             */
            leadDaysMax: number;
            /** Format: int32 */
            leadDaysMin: number;
            material: string | null;
            /** Format: int32 */
            moq: number;
            options: components["schemas"]["OfferOption"][];
            /**
             * Format: int64
             * @example 13500
             */
            priceFrom: number;
            /** Format: int64 */
            priceOld: number | null;
            /**
             * Format: int32
             * @description Сколько вопросов технологу уже задано. Сами вопросы — фаза 2.
             */
            questionCount: number;
            /**
             * Format: int32
             * @description Скидка за повтор партии у этой фабрики, %.
             */
            repeatDiscountPercent: number | null;
            /**
             * Format: int32
             * @description Сколько отзывов у завода. Сами отзывы — фаза 2, поэтому здесь только счётчик:
             *     пустой список соврал бы, что отзывов нет.
             */
            reviewsCount: number;
            sample: null | components["schemas"]["OfferSample"];
            sampleAvailable: boolean;
            /** @description Таблица характеристик: порядок и подписи задаёт схема атрибутов категории. */
            specs: components["schemas"]["OfferSpec"][];
            status: components["schemas"]["OfferStatus"];
            tiers: components["schemas"]["PriceTier"][];
            title: string;
            tone: null | components["schemas"]["OfferTone"];
            /**
             * Format: int32
             * @description Скидка за недозагруз, %. В котировке не применяется: она уже в ступенях (Q-122).
             */
            underloadDiscountPercent: number | null;
            /**
             * Format: date-time
             * @description Когда оффер правили в последний раз; `null` у фикстурного режима.
             */
            updatedAt: string | null;
        };
        /** @description Завод, которому принадлежит оффер. */
        OfferFactory: {
            city: string;
            /**
             * Format: int32
             * @description Публичный номер завода.
             * @example 17
             */
            id: number;
            name: string;
            /**
             * Format: double
             * @description Рейтинг 0..=5 — дробное число. Деньгами он не является, поэтому `f64` здесь уместен.
             * @example 4.8
             */
            rating: number;
            /** @description Код федерального округа — значение фасета `region`. */
            region: components["schemas"]["FactoryRegion"];
            /** Format: int32 */
            reviews: number;
        };
        /** @description Кадр галереи оффера. */
        OfferImage: {
            /**
             * @description Ключ кадра внутри оффера: `2231-1`.
             * @example 2231-1
             */
            id: string;
            /** @description Подпись по центру заглушки: «фото 1 · лицевая». */
            label: string;
            tone: components["schemas"]["OfferTone"];
            /** @description Ссылка на файл; `null`, пока фотографий нет. */
            url: string | null;
        };
        /** @description Платная опция. */
        OfferOption: {
            /**
             * @description Код опции внутри оффера: `extra-print-color`. Именно он уходит в
             *     `POST /quotes` как элемент `optionIds`.
             * @example extra-print-color
             */
            id: string;
            /**
             * Format: int32
             * @description Ниже этого объёма опцию выбрать нельзя; `null` — доступна всегда.
             */
            minQty: number | null;
            /** @description Уточнение из макета: «за партию», «за шт», «от 1 000 шт». */
            note: string | null;
            /**
             * Format: int64
             * @example 600000
             */
            price: number;
            title: string;
            unit: components["schemas"]["OfferOptionUnit"];
            /**
             * @description Подпись единицы для интерфейса: «за шт» / «за партию». Расширение сверх
             *     контракта: фронт рисует её сам, но в спецификации она объясняет `unit`.
             */
            unitLabel: string;
        };
        /**
         * @description За что берут доплату: за штуку или за всю партию.
         * @enum {string}
         */
        OfferOptionUnit: "per_item" | "per_batch";
        OfferQuestion: {
            answer: null | components["schemas"]["OfferQuestionAnswer"];
            askedAt: string;
            author: string;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            offerId: number;
            offerTitle: string;
            text: string;
        };
        OfferQuestionAnswer: {
            answeredAt: string;
            /** @description Кто ответил: «Технолог «Волна»» — на карточке подпись стоит под ответом. */
            author: string;
            text: string;
        };
        OfferQuestionList: {
            items: components["schemas"]["OfferQuestion"][];
            /** Format: int64 */
            total: number;
        };
        OfferReviewList: {
            items: components["schemas"]["SellerReview"][];
            /** Format: float */
            rating: number;
            /** Format: int64 */
            total: number;
        };
        /** @description Образец. */
        OfferSample: {
            /** Format: int32 */
            days: number;
            /**
             * Format: int64
             * @example 150000
             */
            price: number;
        };
        /** @description Строка таблицы характеристик. */
        OfferSpec: {
            /**
             * @description Ключ атрибута из схемы категории: `material`, `print`. Контракту фронта не
             *     нужен, но по нему строка находится без привязки к русскому тексту.
             */
            key: string;
            /**
             * @description Подпись строки: «Материал». Имя `name`, а не `label`, — так его ищет
             *     карточка (`offer.specs.find(row => row.name === "Материал")`).
             */
            name: string;
            value: string;
        };
        /**
         * @description Статус оффера. В выдачу и в карточку попадают только `published`.
         * @enum {string}
         */
        OfferStatus: "draft" | "moderation" | "published" | "archived";
        /** @description Карточка оффера в выдаче. */
        OfferSummary: {
            /** @description Метки карточки. */
            badges: components["schemas"]["OfferBadge"][];
            /** @description Путь категории от корня: `["tekstil", "futbolki"]`. */
            categoryPath: string[];
            factory: components["schemas"]["OfferFactory"];
            /**
             * Format: int32
             * @description Свободная мощность в пересчёте на это изделие, проценты 0..=100.
             */
            freeCapacityPct: number;
            /**
             * Format: int32
             * @description Публичный номер оффера («арт. 2231»); он же в URL карточки.
             * @example 2231
             */
            id: number;
            /**
             * Format: int32
             * @description Срок производства «от», календарных дней.
             */
            leadDaysMin: number;
            /** @description Короткое описание материала — строка под названием в режиме списка. */
            material: string | null;
            /**
             * Format: int32
             * @description Минимальная партия, штук.
             */
            moq: number;
            /**
             * Format: int64
             * @description Цена за единицу «от», в **копейках** (`13500` = 135 ₽). Дробных рублей в контракте нет.
             * @example 13500
             */
            priceFrom: number;
            /**
             * Format: int64
             * @description Цена до скидки за недозагруз; `null`, если скидки нет.
             */
            priceOld: number | null;
            sample: null | components["schemas"]["OfferSample"];
            sampleAvailable: boolean;
            /** @description Ступени цены по объёму, по возрастанию количества. */
            tiers: components["schemas"]["PriceTier"][];
            title: string;
            tone: null | components["schemas"]["OfferTone"];
        };
        /**
         * @description Градиент заглушки фотографии (`.ph` A–D макета).
         * @enum {string}
         */
        OfferTone: "a" | "b" | "c" | "d";
        /**
         * @description Тон плашки-заглушки изображения.
         * @enum {string}
         */
        OfferToneName: "a" | "b" | "c" | "d";
        /** @description `POST /orders/{id}/dispute`. */
        OpenDisputeBody: {
            /**
             * Format: int32
             * @description Сколько изделий затронуто; не указано — вся партия.
             */
            affectedQty?: number | null;
            description: string;
            /** @description `fileId` из `POST /orders/{id}/dispute/evidence`. */
            evidenceFileIds?: string[] | null;
            reason: string;
            remedy: string;
        };
        /** @description Заказ целиком — то, что показывает экран оформления и трекинга. */
        Order: {
            acceptance?: null | components["schemas"]["AcceptanceWindow"];
            /** @description Когда партия принята. */
            acceptedAt?: string | null;
            artwork: components["schemas"]["OrderArtwork"][];
            bucket: components["schemas"]["OrderBucket"];
            /** @description Дедлайн подтверждения заводом; появляется вместе с деньгами в эскроу. */
            confirmDeadlineAt?: string | null;
            createdAt: string;
            customerStage?: null | components["schemas"]["CustomerStage"];
            /** @description Когда партия доставлена. */
            deliveredAt?: string | null;
            delivery?: null | components["schemas"]["OrderDelivery"];
            dispute?: null | components["schemas"]["DisputeSummary"];
            /** @description Документы; у черновика список пуст — они формируются на `submit`. */
            documents: components["schemas"]["OrderDocument"][];
            escrow?: null | components["schemas"]["EscrowSummary"];
            /**
             * Format: int32
             * @description Публичный номер заказа: он же в URL и в счёте. UUID наружу не выходит (Q-143).
             */
            id: number;
            offer: components["schemas"]["OrderOffer"];
            paidAt?: string | null;
            params: components["schemas"]["OrderParams"];
            payer?: null | components["schemas"]["OrderPayer"];
            payment?: null | components["schemas"]["PaymentInstructions"];
            paymentMethod?: null | components["schemas"]["PaymentMethod"];
            paymentOptions: components["schemas"]["PaymentMethodOption"][];
            promo?: null | components["schemas"]["OrderPromo"];
            /**
             * @description Снимок строк котировки — он уходит в спецификацию и в эскроу.
             *     Форма — та же `Quote`, что отдаёт `POST /quotes`: снимок собирает
             *     `quote_to_json` поле в поле, поэтому в спецификации ссылаемся на неё.
             */
            quote: components["schemas"]["Quote"];
            /** @description id котировки: в заказ идёт только он (ARCHITECTURE.md, 5.5). */
            quoteId: string;
            quoteValidUntil?: string | null;
            /** @description Считать как повторную партию у той же фабрики. */
            repeat: boolean;
            /**
             * Format: int32
             * @description Скидка за повтор у этой фабрики, %.
             */
            repeatDiscountPercent?: number | null;
            /** @description Плановая отгрузка, ISO `YYYY-MM-DD`. */
            shipDate?: string | null;
            status: components["schemas"]["OrderStatus"];
            submittedAt?: string | null;
            tracking?: null | components["schemas"]["OrderTracking"];
            /**
             * Format: int64
             * @description Непрочитанных сообщений чата — бейдж на вкладке и в списке заказов.
             */
            unreadMessages: number;
            updatedAt: string;
        };
        /** @description Автор события. */
        OrderActor: {
            /** @description `customer` | `factory` | `operator` | `system`. */
            kind: components["schemas"]["OrderActorKindName"];
            /** @description Готовая подпись: «Технолог «Волна»», «Оператор платформы», «Система». */
            name: string;
            /** @description Организация автора; у системы и оператора — `null`. */
            orgId?: string | null;
        };
        /**
         * @description Кто совершил действие по заказу.
         * @enum {string}
         */
        OrderActorKindName: "customer" | "factory" | "operator" | "system";
        /** @description Состояние файла макета. */
        OrderArtwork: {
            contentType: string;
            /** @description Причина `rejected` или `failed`. */
            error?: string | null;
            fileName: string;
            /** @description Он же `fileId` из ответа на запрос загрузки. */
            id: string;
            /**
             * Format: int64
             * @description Размер, байты.
             */
            size: number;
            /** @description `uploading` | `review` | `approved` | `rejected` | `failed`. */
            status: components["schemas"]["ArtworkStatusName"];
            uploadedAt?: string | null;
            /**
             * @description Ссылка на скачивание; `null`, пока файл не долетел до хранилища.
             *     Короткоживущая и выдаётся только участникам заказа.
             */
            url?: string | null;
        };
        /**
         * @description Вкладка кабинета заказчика.
         * @enum {string}
         */
        OrderBucket: "work" | "action" | "done" | "cancelled";
        /** @description Строка разбивки по цвету: «белый 600 · чёрный 400». */
        OrderColorLine: {
            /** @description Название цвета, как его показывает фабрика. */
            color: string;
            /** Format: int32 */
            qty: number;
        };
        /** @description Доставка заказа. */
        OrderDelivery: {
            address?: string | null;
            comment?: string | null;
            kind: components["schemas"]["OrderDeliveryKind"];
            /** @description Код варианта из оффера; он же уходил в `QuoteRequest.deliveryId`. */
            optionId: string;
            /**
             * Format: int64
             * @description Стоимость из котировки — дублируется здесь, чтобы строка заказа читалась
             *     без обращения к офферу; источник правды остаётся котировка.
             */
            price: number;
            recipientName?: string | null;
            recipientPhone?: string | null;
            /** @description Название варианта, как его показал оффер. */
            title: string;
        };
        OrderDeliveryInput: {
            address?: string | null;
            comment?: string | null;
            optionId: string;
            recipientName?: string | null;
            recipientPhone?: string | null;
        };
        /**
         * @description Куда едет партия.
         * @enum {string}
         */
        OrderDeliveryKind: "marketplace_warehouse" | "address" | "pickup";
        /** @description Документ заказа. */
        OrderDocument: {
            createdAt: string;
            id: string;
            /** @description `offer_contract` | `specification` | `invoice` | `act`. */
            kind: components["schemas"]["OrderDocumentKindName"];
            /** @description `none` | `edo_pending` | `edo_signed`. */
            signature: components["schemas"]["DocumentSignatureName"];
            /** @description Название с номером: «Договор-оферта № 4813». */
            title: string;
            /**
             * @description Ссылка на скачивание (PDF). `null` — документ ещё формируется: генерация
             *     PDF это модуль `documents` (ARCHITECTURE.md, 9).
             */
            url?: string | null;
        };
        /**
         * @description Вид документа по заказу.
         * @enum {string}
         */
        OrderDocumentKindName: "offer_contract" | "specification" | "invoice" | "act";
        /**
         * @description Событие журнала в форме контракта фронта (`tracking.ts::OrderEvent`).
         *
         *     `payload` разворачивается в корень (`flatten`), поэтому `progress`, `photos`,
         *     `message`, `document`, `operation`/`amount` и `from`/`to`/`stage` оказываются
         *     там, где их ждёт экран, — без обёртки и без второго формата.
         */
        OrderEvent: Record<string, never> & {
            actor: components["schemas"]["OrderActor"];
            detail?: string | null;
            occurredAt: string;
            /** Format: int32 */
            orderId: number;
            /**
             * Format: int64
             * @description Монотонный номер: курсор ленты и `Last-Event-ID` канала.
             */
            seq: number;
            /** @description Заголовок строки ленты — его пишет сервер. */
            title: string;
            type: string;
        };
        /** @description Страница журнала. */
        OrderEventPage: {
            /** @description Есть ли события до `items[0]`. */
            hasMore: boolean;
            /** @description По возрастанию `seq`. */
            items: components["schemas"]["OrderEvent"][];
            /**
             * Format: int64
             * @description Последний `seq` журнала на момент ответа — с него подключается SSE.
             */
            lastSeq: number;
            /** Format: int64 */
            total: number;
        };
        /** @description Страница списка заказов. */
        OrderList: {
            items: components["schemas"]["OrderListItem"][];
            summary?: null | components["schemas"]["OrderListSummary"];
            /** Format: int64 */
            total: number;
        };
        /** @description Строка таблицы кабинета. */
        OrderListItem: {
            /** @description Когда истекает окно приёмки; `null` вне статуса `acceptance`. */
            acceptanceDueAt?: string | null;
            bucket: components["schemas"]["OrderBucket"];
            createdAt: string;
            customerStage?: null | components["schemas"]["CustomerStage"];
            /** @description По заказу открыт спор — строка подсвечивается. */
            disputeOpen: boolean;
            /** @description «Волна, Иваново». */
            factory: string;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            offerId: number;
            /**
             * Format: int32
             * @description Готовность партии, % — проекция статуса. У черновика 0.
             */
            progressPct: number;
            shipDate?: string | null;
            status: components["schemas"]["OrderStatus"];
            /** @description «Футболки 180 г/м², 1 000 шт». */
            title: string;
            /** Format: int64 */
            total: number;
            /**
             * Format: int64
             * @description Непрочитанных сообщений чата — бейдж в строке таблицы.
             */
            unreadMessages: number;
            updatedAt: string;
        };
        /** @description Сводка кабинета — четыре KPI над таблицей заказов. */
        OrderListSummary: {
            /** Format: int64 */
            active: number;
            /** Format: int64 */
            escrowTotal: number;
            nearestShipDate?: string | null;
            /** Format: int64 */
            repeatOrders: number;
            /** Format: int64 */
            savedOnRepeats: number;
        };
        /** @description Сообщение чата. */
        OrderMessage: {
            attachments: components["schemas"]["OrderMessageAttachment"][];
            author: components["schemas"]["OrderMessageAuthor"];
            /** @description `order` | `dispute`. */
            channel: components["schemas"]["MessageChannelName"];
            createdAt: string;
            id: string;
            /** Format: int32 */
            orderId: number;
            /** @description Своё сообщение — рисуется справа. Считает сервер. */
            own: boolean;
            /** @description Когда прочитано другой стороной (для своих) или вами (для чужих). */
            readAt?: string | null;
            /**
             * Format: int64
             * @description Номер в журнале заказа: тот же `seq`, что у событий ленты.
             */
            seq: number;
            text: string;
        };
        /** @description Вложение сообщения. */
        OrderMessageAttachment: {
            contentType: string;
            fileName: string;
            /** @description Он же `fileId` из ответа на запрос загрузки. */
            id: string;
            /**
             * Format: int64
             * @description Размер, байты.
             */
            size: number;
            /** @description Ссылка на скачивание; `null`, пока файл не долетел до хранилища. */
            url?: string | null;
        };
        /** @description Автор сообщения. */
        OrderMessageAuthor: {
            kind: components["schemas"]["MessageAuthorKind"];
            /** @description Готовая подпись: «Технолог «Волна»». */
            name: string;
            orgId?: string | null;
        };
        /** @description Ветка переписки. */
        OrderMessageList: {
            /** @description По возрастанию `seq`: чат читается сверху вниз. */
            items: components["schemas"]["OrderMessage"][];
            /** Format: int64 */
            total: number;
            /**
             * Format: int64
             * @description Непрочитанных в этой ветке.
             */
            unread: number;
        };
        /** @description Снимок оффера в заказе (D9: завод правит цены, старый заказ не меняется). */
        OrderOffer: {
            factoryCity: string;
            /** Format: int32 */
            factoryId: number;
            factoryName: string;
            /** Format: int32 */
            id: number;
            title: string;
            tone?: null | components["schemas"]["OfferToneName"];
        };
        /**
         * @description Параметры изделия — то, что уйдёт в спецификацию.
         *
         *     Инвариант, который проверяет сервер: `sum(colors.qty) == sum(sizes.qty) == qty`.
         *     Пустые разбивки допустимы только у черновика — на `submit` они обязательны.
         */
        OrderParams: {
            colors: components["schemas"]["OrderColorLine"][];
            /** @description Комментарий технологу. */
            comment?: string | null;
            /** @description Крой из характеристик оффера: «классический», «оверсайз». */
            fit?: string | null;
            /** @description Коды выбранных опций оффера в порядке выбора. */
            optionIds: string[];
            /** @description Описание нанесения: «шелкография, 2 цвета, грудь». */
            print?: string | null;
            /**
             * Format: int32
             * @description Объём партии, шт. Он же в котировке: расходиться им нельзя.
             */
            qty: number;
            sizes: components["schemas"]["OrderSizeLine"][];
        };
        /**
         * @description Плательщик — организация заказчика. Реквизиты дублируются снимком: они уйдут
         *     в счёт и договор, а карточка организации может смениться.
         */
        OrderPayer: {
            /** @description Кому отправить счёт — «Отправить бухгалтеру» на экране оплаты. */
            accountantEmail?: string | null;
            inn: string;
            kpp?: string | null;
            /** @description Юридический адрес для счёта и договора (Q-172: пока живёт на заказе). */
            legalAddress?: string | null;
            name: string;
            orgId: string;
        };
        OrderPayerInput: {
            accountantEmail?: string | null;
            legalAddress?: string | null;
            orgId: string;
        };
        /** @description Этап укрупнённой ленты `.pipe`. */
        OrderPipelineStage: {
            /** @description Фактический момент наступления этапа; `null` — ещё не наступил. */
            at?: string | null;
            /** @description Подпись под названием: «10.09», «15.09 →», «~29.09». */
            note?: string | null;
            /**
             * Format: int32
             * @description Доля заливки активного этапа, 0–100; у пройденных и будущих — `null`.
             */
            pct?: number | null;
            stage: components["schemas"]["CustomerStage"];
            /** @description `done` | `active` | `todo`. */
            state: components["schemas"]["PipelineStageState"];
            /** @description «Оплачен», «Сырьё закуплено», «Производство», «Контроль качества», «Отгрузка». */
            title: string;
        };
        /** @description Применённый промокод. Скидку считает котировка строкой `promo`. */
        OrderPromo: {
            code: string;
            /**
             * Format: int64
             * @description Сумма скидки, неотрицательная (в строке котировки она же со знаком минус).
             */
            discount: number;
            title: string;
        };
        /** @description Строка размерного ряда: «S 200 · M 300 · L 300 · XL 200». */
        OrderSizeLine: {
            /** Format: int32 */
            qty: number;
            size: string;
        };
        /** @description Строка прогресса: «Отшито 650 / 1 000». */
        OrderStageProgress: {
            /** Format: int32 */
            done: number;
            /** @description Код строки внутри заказа: `cut`, `sewn`, `print`. */
            id: string;
            /** @description Подпись вместо чисел, когда работа ещё не начата: «с 26.09». */
            note?: string | null;
            title: string;
            /** Format: int32 */
            total: number;
            updatedAt: string;
        };
        /**
         * @description Полный автомат заказа (ARCHITECTURE.md, 5.2).
         * @enum {string}
         */
        OrderStatus: "draft" | "awaiting_payment" | "awaiting_confirmation" | "confirmed" | "declined" | "artwork_review" | "materials" | "in_production" | "quality_control" | "shipped" | "acceptance" | "dispute" | "completed" | "refunded" | "cancelled";
        /** @description Сводка трекинга — поле `Order.tracking`. */
        OrderTracking: {
            /** Format: int64 */
            eventCount: number;
            /**
             * Format: int64
             * @description Последний `seq` журнала: с него подключается SSE.
             */
            lastSeq: number;
            /** Format: int64 */
            photoCount: number;
            /** @description Строки `.prog`; пусто, пока завод не отчитался. */
            progress: components["schemas"]["OrderStageProgress"][];
            /**
             * Format: int32
             * @description Готовность партии, % — та же проекция, что в колонке таблицы кабинета (Q-201).
             */
            progressPct: number;
            stages: components["schemas"]["OrderPipelineStage"][];
            /** Format: int64 */
            unreadMessages: number;
            updatedAt?: string | null;
        };
        /** @description Организация вместе с ролью текущего пользователя в ней. */
        Org: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            /**
             * @description ИНН: 10 цифр у юрлица, 12 у ИП. Проверяется контрольной суммой.
             * @example 7707083893
             */
            inn: string;
            kind: components["schemas"]["OrgKindName"];
            /** @description КПП — только у юрлиц; у ИП — `null`. */
            kpp: string | null;
            name: string;
            /** @description Роль текущего пользователя в этой организации. */
            role: components["schemas"]["RoleName"];
            /** @description Человеческое название роли для интерфейса («Владелец», «Закупщик»…). */
            roleTitle: string;
            verificationStatus: components["schemas"]["VerificationStatusName"];
        };
        /**
         * @description Вид организации: заказывает производство или принимает заказы.
         * @enum {string}
         */
        OrgKindName: "customer" | "factory";
        /** @description Постраничная выдача. */
        PageInfo: {
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            pageCount: number;
            /** Format: int32 */
            perPage: number;
        };
        /** @description Реквизиты получателя платежа. */
        PayeeRequisites: {
            account: string;
            bankName: string;
            bic: string;
            /**
             * @description `true` — реквизиты демонстрационные, платить по ним нельзя.
             *     Банк-партнёр не выбран (вопрос Q-10), в `prod` с такими не стартуем.
             */
            demo: boolean;
            inn: string;
            kpp: string;
            name: string;
        };
        /** @description Платёжные инструкции по счёту — экран «Счёт и ожидание оплаты». */
        PaymentInstruction: {
            /**
             * Format: int64
             * @example 18340000
             */
            amount: number;
            /** Format: date-time */
            dueAt: string;
            /**
             * @description Номер счёта: `4900-1-СЧ`.
             * @example 4900-1-СЧ
             */
            invoiceNo: string;
            payee: components["schemas"]["PayeeRequisites"];
            reference: string;
            /** Format: uuid */
            trancheId: string;
            /** Format: int32 */
            trancheNo: number;
        };
        /**
         * @description Платёжное поручение: B2B-оплата — это счёт и перевод, а не карта (5.4).
         *
         *     Содержимое приходит из `payments::PaymentInstruction`, а форма — фронтовая
         *     (Q-198): модуль денег нумерует счета по сделке (`4900-1-СЧ`), а экран оплаты
         *     ждёт номер по заказу. Сводит их этот тип.
         */
        PaymentInstructions: {
            /** @description Расчётный счёт получателя — номинальный счёт платформы. */
            account: string;
            /**
             * Format: int64
             * @description Итог заказа.
             */
            amount: number;
            /**
             * Format: int64
             * @description Сколько платить сейчас: у 50/50 — первый транш.
             */
            amountDue: number;
            bankName: string;
            bik: string;
            correspondentAccount: string;
            /** @description Дедлайн оплаты, RFC 3339. После него резерв мощности снимается. */
            dueAt: string;
            /** @description Номер счёта: «4813-СЧ». */
            invoiceNumber: string;
            payeeInn: string;
            payeeKpp: string;
            payeeName: string;
            /** @description Назначение платежа целиком, как его надо вписать в платёжку. */
            purpose: string;
        };
        /**
         * @description Способ оплаты (макет `checkout`, блок «Оплата»).
         * @enum {string}
         */
        PaymentMethod: "escrow_full" | "escrow_split_50_50";
        /**
         * @description Вариант оплаты, как его показывает шаг «Оплата»: тексты пишет сервер, потому что
         *     условия схемы 50/50 зависят от фабрики и меняются без релиза фронта.
         */
        PaymentMethodOption: {
            /**
             * Format: int64
             * @description Сколько платить сейчас: у `escrow_full` — весь итог, у 50/50 — первый транш.
             */
            amountDue: number;
            available: boolean;
            description: string;
            method: components["schemas"]["PaymentMethod"];
            title: string;
            /** @description Почему вариант недоступен: «рейтинг фабрики ниже 4,7». */
            unavailableReason?: string | null;
        };
        /**
         * @description Эскроу-сделка глазами модуля денег.
         *
         *     В спецификации называется `PaymentsDeal`, а не `EscrowDeal`: имя `EscrowDeal` занято
         *     срезом заказа (`orders::http::tracking_dto`, контракт фронта `payments.ts`), и две
         *     разные формы под одним именем тихо затирали друг друга в `components.schemas` —
         *     `GET /orders/{id}/escrow` был документирован чужой схемой.
         */
        PaymentsDeal: {
            /**
             * Format: int64
             * @example 18340000
             */
            amount: number;
            /** Format: date-time */
            createdAt: string;
            /** @example RUB */
            currency: string;
            /**
             * Format: int32
             * @description Комиссия платформы, зафиксированная при открытии сделки.
             * @example 8
             */
            feePercent: number;
            /**
             * Format: int64
             * @description Сколько прямо сейчас лежит в эскроу.
             * @example 18340000
             */
            heldAmount: number;
            /** Format: uuid */
            id: string;
            /**
             * Format: int64
             * @description Публичный номер сделки — он же в назначении платежа.
             * @example 4900
             */
            no: number;
            /** Format: uuid */
            payeeOrgId: string;
            /** Format: uuid */
            payerOrgId: string;
            scheme: components["schemas"]["SchemeName"];
            status: components["schemas"]["DealStatusName"];
            /** @example В эскроу */
            statusTitle: string;
            /**
             * Format: uuid
             * @description Идентификатор заказа или образца. Внешнего ключа на них нет намеренно.
             */
            subjectId: string;
            subjectKind: components["schemas"]["SubjectKindName"];
            tranches: components["schemas"]["PaymentsTranche"][];
            /** Format: date-time */
            updatedAt: string;
        };
        /** @description Счёт по сделке. */
        PaymentsTranche: {
            /**
             * Format: int64
             * @example 18340000
             */
            amount: number;
            /**
             * Format: date-time
             * @description До какого момента ждём платёжное поручение.
             */
            dueAt: string;
            /**
             * Format: date-time
             * @description Когда деньги поступили; `null` — ещё не поступили.
             */
            fundedAt: string | null;
            /** Format: uuid */
            id: string;
            /**
             * Format: int32
             * @description Номер счёта в сделке, с единицы.
             * @example 1
             */
            no: number;
            /**
             * @description Назначение платежа: по нему поступление сопоставляется со сделкой.
             * @example Оплата по сделке № 4900-1 на площадке Партия. Без НДС
             */
            reference: string;
            status: components["schemas"]["TrancheStatusName"];
            /**
             * @description Название статуса для интерфейса.
             * @example Ждёт оплаты
             */
            statusTitle: string;
        };
        /** @description Тело `POST /admin/payments/deals/{id}/payout-confirmed`. */
        PayoutConfirmedRequest: {
            /**
             * @description Номер платёжного поручения на выплату.
             * @example ПП № 512 от 23.09.2026
             */
            externalRef?: string | null;
        };
        /** @description `POST /seller/orders/{id}/photo-report` — отправить фотоотчёт. */
        PhotoReportBody: {
            caption?: string | null;
            /** @description `fileId` из ответов на запросы загрузки. */
            fileIds: string[];
        };
        /** @description `POST /seller/orders/{id}/photos` — ссылка на загрузку снимка. */
        PhotoUploadRequest: {
            contentType: string;
            fileName: string;
            /** @description Подпись под снимком: «Раскрой, партия белая». */
            label?: string | null;
            /**
             * Format: int64
             * @description Размер, байты.
             */
            size: number;
            /** @description Тон градиентной заглушки: `a` | `b` | `c` | `d`. */
            tone?: string | null;
        };
        /**
         * @description Состояние ступени ленты трекинга.
         * @enum {string}
         */
        PipelineStageState: "done" | "active" | "todo";
        /** @description Ступень цены. */
        PriceTier: {
            /** Format: int32 */
            fromQty: number;
            /**
             * Format: int64
             * @example 18200
             */
            unitPrice: number;
        };
        /** @description Тело ответа об ошибке по RFC 7807. Отдаётся с `Content-Type: application/problem+json`. */
        Problem: {
            /** @description Подробность отказа. У 500 её нет никогда — детали внутренней ошибки уходят только в лог. */
            detail?: string | null;
            /**
             * @description Ошибки по полям формы: имя поля → сообщения. Ключи совпадают с путями полей
             *     в теле запроса (`params.colors`, `delivery.address`, `payer.orgId`) — по ним
             *     экран понимает, какой шаг открыть (Q-101).
             *
             *     Пустая карта не сериализуется: у большинства ошибок полей нет, и лишний `{}`
             *     в ответе только сбивал бы с толку.
             */
            errors?: Record<string, never>;
            /**
             * Format: int32
             * @description HTTP-код ответа. Совпадает со статусом строки ответа.
             * @example 400
             */
            status: number;
            /**
             * @description Краткое человекочитаемое название ошибки (по-русски, для интерфейса).
             * @example Некорректный запрос
             */
            title: string;
            /**
             * @description Идентификатор типа ошибки: `/problems/not-found`, `/problems/bad-request`,
             *     `/problems/unauthorized`, `/problems/forbidden`, `/problems/conflict`,
             *     `/problems/unavailable`, `/problems/internal`, а для 422 — с именем правила:
             *     `/problems/quote/below_moq`.
             *
             *     `Cow`, а не `&'static str`: у 422 хвост собирается из кода правила, а у всех
             *     остальных ошибок он по-прежнему константа и ничего не аллоцирует.
             * @example /problems/bad-request
             */
            type: string;
        };
        /**
         * @description Результат котировки.
         *
         *     Инвариант: `sum(lines) == total == subtotal − discountTotal + delivery`.
         */
        Quote: {
            /**
             * Format: int64
             * @example 940000
             */
            delivery: number;
            /**
             * Format: int64
             * @description Суммарная скидка — неотрицательная (в строках она же со знаком минус).
             * @example 0
             */
            discountTotal: number;
            /**
             * Format: uuid
             * @description Идентификатор сохранённой котировки — в заказ уходит только он.
             *
             *     `null`, когда сохранить было негде: `api` поднят без `DATABASE_URL`. Расчёт
             *     при этом верный, но оформить по нему заказ нельзя — заказов без базы и не бывает.
             */
            id: string | null;
            /**
             * Format: int32
             * @description Срок производства, рабочих дней.
             * @example 18
             */
            leadDays: number;
            lines: components["schemas"]["QuoteLine"][];
            /**
             * Format: date
             * @description Дата отгрузки, `YYYY-MM-DD`. Считается по производственному календарю;
             *     переносы выходных в нём пока не учтены, поэтому это оценка (Q-125).
             * @example 2026-10-16
             */
            shipDate: string;
            /**
             * Format: int64
             * @description Стоимость товара: база + опции, до скидок и без доставки.
             * @example 17400000
             */
            subtotal: number;
            /**
             * Format: int64
             * @example 18340000
             */
            total: number;
            /**
             * Format: int64
             * @description Цена за штуку по выбранной ступени — без опций и скидок.
             * @example 16800
             */
            unitPrice: number;
            /**
             * Format: date-time
             * @description До какого момента котировка действительна, RFC 3339.
             */
            validUntil: string;
        };
        /** @description Строка котировки. */
        QuoteLine: {
            /**
             * Format: int64
             * @description Скидки приходят отрицательными.
             * @example 16800000
             */
            amount: number;
            kind: components["schemas"]["QuoteLineKind"];
            /** @description Текст для человека, как его сформировал сервер. Форматирование денег — на фронте. */
            title: string;
        };
        /**
         * @description Вид строки котировки. Порядок вариантов — порядок правил конвейера.
         * @enum {string}
         */
        QuoteLineKind: "base" | "option" | "repeat_discount" | "underload_discount" | "promo" | "delivery";
        /**
         * @description Тело `POST /quotes`.
         *
         *     Ни цен, ни процентов: считает сервер (ARCHITECTURE.md, 5.5). Браузер сообщает
         *     только выбор покупателя.
         */
        QuoteRequest: {
            /**
             * @description Код варианта доставки из оффера; пусто — самовывоз, доставка 0 ₽.
             * @example wb
             */
            deliveryId?: string | null;
            /**
             * Format: int32
             * @description Публичный номер оффера («арт. 2231»).
             * @example 2231
             */
            offerId: number;
            /**
             * @description Коды опций в порядке выбора — он же порядок строк в счёте.
             * @example [
             *       "extra-print-color"
             *     ]
             */
            optionIds?: string[];
            /**
             * @description Промокод из поля в итоге оформления. Неизвестный или неприменимый код —
             *     422 с `type = /problems/quote/unknown_promo`: экран показывает ошибку в самом
             *     поле и оставляет прежний расчёт (Q-171).
             * @example ПАРТИЯ5
             */
            promo?: string | null;
            /**
             * Format: int64
             * @description Объём партии, штук.
             * @example 1000
             */
            qty: number;
            /**
             * @description Повторная партия у той же фабрики. Процент подставляет сервер и только
             *     вошедшему покупателю: у анонима истории заказов нет (Q-123).
             */
            repeat?: boolean | null;
        };
        RankingBadge: {
            key: string;
            rule: string;
            title: string;
            /** @description `hot` | `disc` | `ok`. */
            tone: components["schemas"]["RankingBadgeTone"];
        };
        /**
         * @description Тон бейджа ранжирования.
         * @enum {string}
         */
        RankingBadgeTone: "hot" | "disc" | "ok";
        RankingPenalty: {
            effect: string;
            key: string;
            title: string;
        };
        RankingPreview: {
            /** Format: int64 */
            moved: number;
            rows: components["schemas"]["RankingPreviewRow"][];
        };
        RankingPreviewBody: {
            category?: string | null;
            weights: components["schemas"]["RankingWeightInput"][];
        };
        RankingPreviewRow: {
            factoryName: string;
            /** Format: int32 */
            offerId: number;
            /** Format: int64 */
            positionNext: number;
            /** Format: int64 */
            positionNow: number;
            /** Format: int32 */
            score: number;
            title: string;
        };
        RankingWeight: {
            key: string;
            title: string;
            /** Format: int32 */
            weight: number;
        };
        RankingWeightInput: {
            key: string;
            /** Format: int32 */
            weight: number;
        };
        /** @description Ответ `POST /orders/{id}/repeat`. */
        RepeatOrderResponse: {
            /**
             * Format: int32
             * @description Скидка за повтор, %.
             */
            discountPercent: number;
            /** @description Новый черновик: `status = "draft"`, `repeat = true`. */
            order: components["schemas"]["Order"];
            /**
             * Format: int64
             * @description На сколько дней зафиксирована цена повтора.
             */
            priceLockedDays: number;
        };
        /** @description Тело `POST /seller/orders/{id}/progress`. */
        ReportProgressBody: {
            /** Format: int32 */
            done: number;
            /** @description Код строки внутри заказа: `cut`, `sewn`, `print`. */
            stage: string;
            /** Format: int32 */
            total: number;
        };
        RequestAuditBody: {
            comment?: string | null;
        };
        /** @description Запрос одноразового кода. */
        RequestCodeRequest: {
            /**
             * @description Телефон или рабочая почта — одно поле, как в макете `login`.
             * @example +79160001234
             */
            identifier: string;
        };
        /**
         * @description Вид резерва мощности: мягкий держится до оплаты, жёсткий — после.
         * @enum {string}
         */
        ReservationKindName: "soft" | "hard";
        /** @description `POST /admin/disputes/{id}/resolve`. */
        ResolveDisputeBody: {
            /**
             * Format: int64
             * @description Сумма возврата заказчику, копейки; у переделки и отказа `null`.
             */
            amount?: number | null;
            comment: string;
            inFavorOf: string;
            resolution: string;
        };
        /**
         * @description Роль пользователя в организации.
         * @enum {string}
         */
        RoleName: "owner" | "manager" | "technologist" | "accountant" | "viewer";
        SampleCreditTerms: {
            /** Format: int64 */
            amount: number;
            /** Format: int32 */
            days: number;
        };
        SampleDeliveryInput: {
            address: string;
            optionId: string;
            recipientName: string;
            recipientPhone: string;
        };
        SampleDeliveryOption: {
            /**
             * Format: int32
             * @description Дней на доставку после отгрузки.
             */
            days: number;
            id: string;
            note?: string | null;
            /** Format: int64 */
            price: number;
            title: string;
        };
        SampleList: {
            items: components["schemas"]["SampleOrder"][];
            total: number;
        };
        /** @description `GET /offers/{id}/sample-options` — из чего собирается форма образца. */
        SampleOptions: {
            artwork: components["schemas"]["ArtworkLimits"];
            colorChoices: string[];
            credit: components["schemas"]["SampleCreditTerms"];
            delivery: components["schemas"]["SampleDeliveryOption"][];
            /** Format: int32 */
            leadDays: number;
            /** Format: int64 */
            price: number;
            printChoices: components["schemas"]["SamplePrintChoice"][];
            qtyChoices: number[];
            sizeChoices: string[];
        };
        /** @description Заказ образца. */
        SampleOrder: {
            /** @description Имя приложенного макета; `null` — печать тестовая. */
            artworkFileName?: string | null;
            createdAt: string;
            credit: Record<string, never>;
            delivery: Record<string, never>;
            /**
             * Format: int32
             * @description Публичный номер образца — своя последовательность.
             */
            id: number;
            /** Format: int32 */
            leadDays: number;
            /** @description Строки счёта образца: образец, печать, доставка. */
            lines: Record<string, never>;
            offer: components["schemas"]["OrderOffer"];
            params: Record<string, never>;
            payment: string;
            shipDate?: string | null;
            /** @description `awaiting_payment` | `paid` | `in_production` | `shipped` | `delivered` | `cancelled`. */
            status: components["schemas"]["SampleStatusName"];
            /** Format: int64 */
            total: number;
        };
        SampleParams: {
            color: string;
            /** @description Нанесение: «Шелкография 2 цв.», «DTF», «Без печати». */
            print: string;
            /**
             * Format: int32
             * @description Сколько штук: 1–3.
             */
            qty: number;
            /** @description Размеры через запятую: «M, L». */
            sizes: string;
        };
        SamplePrintChoice: {
            /** Format: int64 */
            price: number;
            value: string;
        };
        /**
         * @description Статус заказа образца.
         * @enum {string}
         */
        SampleStatusName: "awaiting_payment" | "paid" | "in_production" | "shipped" | "delivered" | "cancelled";
        SaveFactoryOnboardingBody: {
            auditRequested?: boolean | null;
            /** Format: int32 */
            capacityPerMonth?: number | null;
            city?: string | null;
            completed?: boolean | null;
            equipment?: string[] | null;
            /** Format: int32 */
            firstOfferId?: number | null;
            itemCoefficients?: {
                [key: string]: number;
            } | null;
            specialization?: string | null;
            /** Format: int32 */
            step?: number | null;
            /** Format: int32 */
            workers?: number | null;
        };
        ScheduleAuditVisitBody: {
            auditorName: string;
            /** @description Дата выезда, ISO `YYYY-MM-DD`. */
            visitAt: string;
        };
        /**
         * @description Схема оплаты сделки.
         * @enum {string}
         */
        SchemeName: "full" | "split_50_50";
        SellerAnswerBody: {
            text: string;
        };
        SellerAudit: {
            auditorName: string | null;
            checks: components["schemas"]["SellerAuditCheck"][];
            reportUrl: string | null;
            /** @description `none` | `requested` | `scheduled` | `passed` | `expiring`. */
            status: components["schemas"]["SellerAuditStatusName"];
            validUntil: string | null;
            visitAt: string | null;
            warning: null | components["schemas"]["SellerAuditWarning"];
        };
        SellerAuditCheck: {
            basis: string;
            date: string | null;
            /** Format: int32 */
            files: number;
            key: string;
            /** @description `ok` | `work` | `todo`. */
            state: components["schemas"]["AuditCheckStateName"];
            title: string;
        };
        /**
         * @description Состояние аудита завода.
         * @enum {string}
         */
        SellerAuditStatusName: "none" | "requested" | "scheduled" | "passed" | "expiring";
        SellerAuditWarning: {
            text: string;
            title: string;
        };
        SellerCategoryOption: {
            path: string[];
            title: string;
        };
        SellerDashboard: {
            capacity: components["schemas"]["SellerDashboardCapacity"];
            finance: components["schemas"]["SellerDashboardFinance"];
            funnel: components["schemas"]["SellerFunnel"];
            orders: components["schemas"]["SellerOrderSummary"];
            quality: components["schemas"]["SellerQualityRow"][];
            /** @description Позиция в «Популярных»; `null` — предложений в выдаче ещё нет. */
            ranking: Record<string, never> | null;
            todo: components["schemas"]["SellerTodoItem"][];
            urgentOrder: Record<string, never> | null;
        };
        SellerDashboardCapacity: {
            /** Format: int32 */
            loadPct: number;
            month: string;
            /** Format: int64 */
            soldUnits: number;
            /** Format: int64 */
            totalUnits: number;
            unit: string;
            weeks: components["schemas"]["SellerDashboardWeek"][];
        };
        SellerDashboardFinance: {
            /** Format: int64 */
            escrowHeld: number;
            nextPayoutAt: string | null;
            /** Format: int64 */
            paidMonth: number;
        };
        SellerDashboardWeek: {
            label: string;
            /** Format: int32 */
            loadPct: number;
        };
        SellerFeedback: {
            distribution: components["schemas"]["SellerRatingBucket"][];
            questions: components["schemas"]["SellerQuestion"][];
            /** Format: float */
            rating: number;
            /** Format: int32 */
            respondsInMinutes: number;
            /** Format: int32 */
            reviewCount: number;
            reviews: components["schemas"]["SellerReview"][];
            templates: components["schemas"]["SellerFeedbackTemplate"][];
            /** Format: int64 */
            unansweredQuestions: number;
        };
        SellerFeedbackTemplate: {
            key: string;
            text: string;
            title: string;
        };
        /** @description Плитки экрана «Финансы» у завода. */
        SellerFinanceSummary: {
            /**
             * Format: int64
             * @description «В эскроу за вас».
             * @example 73240000
             */
            escrowHeld: number;
            /**
             * Format: int32
             * @description Действующая ставка комиссии у новых сделок.
             * @example 8
             */
            feePercent: number;
            /**
             * Format: int64
             * @description «Комиссия платформы · удержано».
             * @example 5117000
             */
            feeWithheld: number;
            /**
             * Format: int64
             * @description «Выплачено» — всего со счёта площадки.
             * @example 58850000
             */
            paidTotal: number;
            /**
             * Format: int64
             * @description Начислено и ещё не выплачено.
             * @example 13248000
             */
            payable: number;
        };
        SellerFunnel: {
            /** Format: int64 */
            conversionPct: number;
            period: string;
            steps: components["schemas"]["SellerFunnelStep"][];
            views: components["schemas"]["SellerFunnelDay"][];
        };
        SellerFunnelDay: {
            day: string;
            /** Format: int64 */
            value: number;
        };
        SellerFunnelStep: {
            key: string;
            /**
             * Format: int64
             * @description Ширина полосы, 0–100.
             */
            pct: number;
            title: string;
            /** Format: int64 */
            value: number;
        };
        /** @description Строка диффа версии (схема для спецификации — сам тип живёт в `draft`). */
        SellerOfferChange: {
            after: string | null;
            before: string | null;
            field: string;
            flag?: string | null;
            label: string;
        };
        SellerOfferCounts: {
            /** Format: int64 */
            all: number;
            /** Format: int64 */
            draft: number;
            /** Format: int64 */
            hidden: number;
            /** Format: int64 */
            listed: number;
            /** Format: int64 */
            moderation: number;
        };
        SellerOfferDraft: Record<string, never> & {
            /**
             * Format: float
             * @description Коэффициент мощности из категории — поле только для чтения.
             */
            capacityUnitsPerItem: number;
            /** Format: int32 */
            id: number | null;
            status: components["schemas"]["SellerOfferStatusName"];
            updatedAt: string | null;
            /** Format: int32 */
            version: number;
        };
        SellerOfferEditor: {
            categories: components["schemas"]["SellerCategoryOption"][];
            /** Format: int64 */
            categoryMedianPrice: number | null;
            draft: components["schemas"]["SellerOfferDraft"];
            preview: components["schemas"]["SellerOfferPreview"];
            readiness: components["schemas"]["SellerOfferReadiness"][];
            schema: components["schemas"]["CategorySchema"];
            versions: components["schemas"]["SellerOfferVersion"][];
        };
        SellerOfferHint: {
            /** Format: int32 */
            offerId: number;
            text: string;
            title: string;
        };
        SellerOfferList: {
            counts: components["schemas"]["SellerOfferCounts"];
            hint: null | components["schemas"]["SellerOfferHint"];
            items: components["schemas"]["SellerOfferListItem"][];
            /** Format: int64 */
            total: number;
        };
        SellerOfferListItem: {
            badges: components["schemas"]["OfferBadgeName"][];
            /** Format: int64 */
            conversionPct: number | null;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            impressions: number;
            /** Format: int32 */
            inCompare: number;
            listed: boolean;
            /** Format: int32 */
            moq: number | null;
            /** Format: int64 */
            orders: number;
            /** Format: int64 */
            priceFrom: number | null;
            /** @description `draft` | `moderation` | `published` | `archived`. */
            status: components["schemas"]["SellerOfferStatusName"];
            title: string;
            tone: null | components["schemas"]["GalleryToneName"];
            updatedAt: string;
            /** Format: int32 */
            version: number;
            /** Format: int32 */
            views: number;
        };
        SellerOfferPreview: {
            badges: components["schemas"]["OfferBadgeName"][];
            factoryCity: string;
            factoryName: string;
            /** Format: int32 */
            freeCapacityPct: number;
            /** Format: int64 */
            leadDaysMin: number;
            /** Format: int64 */
            moq: number;
            /** Format: int64 */
            priceFrom: number;
            /** Format: float */
            rating: number;
            /** Format: int32 */
            reviews: number;
            sampleAvailable: boolean;
            tiers: components["schemas"]["SellerOfferPreviewTier"][];
            title: string;
            tone: null | components["schemas"]["GalleryToneName"];
        };
        SellerOfferPreviewTier: {
            /** Format: int64 */
            fromQty: number;
            /** Format: int64 */
            unitPrice: number;
        };
        SellerOfferReadiness: {
            key: string;
            /** @description `done` | `now` | `todo`. */
            state: string;
            title: string;
        };
        /**
         * @description Состояние предложения завода.
         * @enum {string}
         */
        SellerOfferStatusName: "draft" | "moderation" | "published" | "archived";
        SellerOfferVersion: {
            changes: components["schemas"]["SellerOfferChange"][];
            createdAt: string;
            moderationComment?: string | null;
            publishedAt: string | null;
            /** @description `draft` | `moderation` | `published` | `archived`. */
            status: components["schemas"]["SellerOfferStatusName"];
            /** Format: int32 */
            version: number;
        };
        /** @description Заказ глазами завода. */
        SellerOrder: {
            artwork: components["schemas"]["SellerOrderArtwork"][];
            /** @description Какие команды автомата завод может подать прямо сейчас. */
            availableCommands: components["schemas"]["SellerStageCommand"][];
            canConfirm: boolean;
            canDecline: boolean;
            confirmDeadlineAt: string | null;
            createdAt: string;
            customer: string;
            /** @description Город заказчика отдельной строкой. */
            customerCity: string | null;
            customerOrgId: string;
            delivery: null | components["schemas"]["OrderDelivery"];
            disputeOpen: boolean;
            documents: components["schemas"]["OrderDocument"][];
            /** Format: int32 */
            id: number;
            money: components["schemas"]["SellerOrderMoney"];
            /** Format: int32 */
            offerId: number;
            offerTitle: string;
            params: components["schemas"]["OrderParams"];
            /**
             * Format: int64
             * @description «день 6 из 18» — сколько дней идёт производство и сколько заложено.
             */
            productionDay: number | null;
            /** Format: int64 */
            productionDays: number | null;
            /** @description Строки прогресса — их же правит форма «Внести прогресс». */
            progress: components["schemas"]["OrderStageProgress"][];
            progressUpdatedAt: string | null;
            sellerStage: null | components["schemas"]["SellerStage"];
            shipDate: string | null;
            status: components["schemas"]["OrderStatus"];
            title: string;
            /** Format: int64 */
            unreadMessages: number;
            updatedAt: string;
        };
        /** @description Макет печати глазами завода: имя файла, статус проверки и короткоживущая ссылка. */
        SellerOrderArtwork: {
            fileName: string;
            id: string;
            status: components["schemas"]["ArtworkStatusName"];
            url: string | null;
        };
        SellerOrderList: {
            items: components["schemas"]["SellerOrderListItem"][];
            summary: components["schemas"]["SellerOrderSummary"];
            /** Format: int64 */
            total: number;
        };
        /** @description Строка очереди заказов завода. */
        SellerOrderListItem: {
            /**
             * Format: int64
             * @description Сколько условных единиц мощности резервирует заказ (5.3).
             */
            capacityUnits: number;
            /** @description Дедлайн подтверждения; `null` — заказ уже подтверждён или отклонён. */
            confirmDeadlineAt: string | null;
            createdAt: string;
            /** @description «ООО «Кора», Москва». */
            customer: string;
            customerOrgId: string;
            /** @description По заказу открыт спор — бейдж поверх ступени. */
            disputeOpen: boolean;
            /**
             * Format: int64
             * @description Комиссия платформы по этому заказу.
             */
            fee: number;
            /**
             * Format: int32
             * @description Публичный номер заказа — тот же, что видит заказчик.
             */
            id: number;
            /** @description Подпись из макета: «подтвердить до 18:00», «приёмка 23.09». */
            note: string | null;
            /**
             * Format: int64
             * @description Сколько получит завод.
             */
            payout: number;
            /**
             * Format: int32
             * @description Готовность партии, % — та же проекция статуса, что у заказчика.
             */
            progressPct: number;
            sellerStage: null | components["schemas"]["SellerStage"];
            shipDate: string | null;
            status: components["schemas"]["OrderStatus"];
            title: string;
            /**
             * Format: int64
             * @description Итог заказа, копейки.
             */
            total: number;
            /** Format: int64 */
            unreadMessages: number;
            updatedAt: string;
        };
        /** @description Деньги по заказу глазами завода — блок «Деньги» экрана `seller-order`. */
        SellerOrderMoney: {
            /** @description Выплата заблокирована спором. */
            blockedByDispute: boolean;
            /** Format: int64 */
            escrowAmount: number;
            /** Format: int64 */
            fee: number;
            /**
             * Format: int32
             * @description Ставка комиссии, % — её показывает строка «Комиссия 8 %».
             */
            feePercent: number;
            /** @description Готовая строка: «в течение 2 раб. дней после приёмки заказчиком». */
            note: string;
            /** Format: int64 */
            payout: number;
            payoutAt: string | null;
        };
        /** @description Счётчики вкладок и KPI сводки — по всей выдаче, а не по странице. */
        SellerOrderSummary: {
            /** Format: int64 */
            all: number;
            /**
             * Format: int64
             * @description Сколько заказов ждут подтверждения прямо сейчас.
             */
            awaitingConfirmation: number;
            /**
             * Format: int64
             * @description Сумма в эскроу «за вас».
             */
            escrowHeld: number;
            /** Format: int64 */
            inProduction: number;
            nearestConfirmDeadlineAt: string | null;
            /** Format: int64 */
            new: number;
            /** Format: int64 */
            paidOut: number;
            /**
             * Format: int64
             * @description Начислено и ещё не выплачено.
             */
            payoutPlanned: number;
            /** Format: int64 */
            qualityControl: number;
            /** Format: int64 */
            shipped: number;
        };
        /** @description Строка таблицы «Выплаты» в кабинете завода. */
        SellerPayout: {
            /**
             * Format: int64
             * @description Сумма заказа.
             * @example 14400000
             */
            amount: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            customerOrgId: string;
            /** Format: uuid */
            dealId: string;
            /**
             * Format: int64
             * @example 4900
             */
            dealNo: number;
            /**
             * Format: int64
             * @description Комиссия платформы по этой сделке.
             * @example 1152000
             */
            feeAmount: number;
            /**
             * Format: int64
             * @description К выплате заводу.
             * @example 13248000
             */
            payoutAmount: number;
            status: components["schemas"]["DealStatusName"];
            /** @example В эскроу */
            statusTitle: string;
            /** Format: uuid */
            subjectId: string;
            /** Format: date-time */
            updatedAt: string;
        };
        /** @description Страница выплат. */
        SellerPayoutsPage: {
            items: components["schemas"]["SellerPayout"][];
            nextCursor: string | null;
        };
        SellerProfile: {
            about: string | null;
            auditedAt: string | null;
            /** Format: int32 */
            capacityPerMonth: number | null;
            city: string;
            /** Format: int32 */
            completedOrders: number;
            equipment: string[];
            gallery: components["schemas"]["SellerProfileGallery"][];
            name: string;
            /** Format: int32 */
            onTimePct: number | null;
            orgId: string;
            payoutAccount: string | null;
            /** Format: float */
            rating: number;
            /** Format: int32 */
            reviews: number;
            /** Format: int32 */
            since: number | null;
            specialization: string;
            /** Format: int32 */
            workers: number | null;
        };
        SellerProfileGallery: {
            label: string;
            tone: components["schemas"]["GalleryToneName"];
        };
        SellerQualityRow: {
            label: string;
            value: string;
        };
        SellerQuestion: {
            answer: null | components["schemas"]["SellerQuestionAnswer"];
            askedAt: string;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            offerId: number;
            offerTitle: string;
            text: string;
        };
        /**
         * @description Ответ завода на вопрос. Отдельный тип от `ReplyDto`: у ответа на вопрос отметка
         *     времени называется `answeredAt` (у ответа на отзыв — `repliedAt`), так их различает
         *     контракт фронта.
         */
        SellerQuestionAnswer: {
            answeredAt: string;
            text: string;
        };
        SellerRatingBucket: {
            /** Format: int64 */
            count: number;
            /** Format: int32 */
            rating: number;
        };
        SellerReview: {
            author: string;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            orderId: number | null;
            /** Format: int32 */
            rating: number;
            reply: null | components["schemas"]["SellerReviewReply"];
            text: string;
            when: string;
        };
        SellerReviewReply: {
            repliedAt: string;
            text: string;
        };
        SellerSampleList: {
            /**
             * Format: int64
             * @description Доля получивших образец, оформивших партию, %.
             */
            conversionPct: number;
            items: components["schemas"]["SellerSampleRequest"][];
            /** Format: int64 */
            total: number;
        };
        SellerSampleRequest: {
            createdAt: string;
            creditNote: string | null;
            customer: string;
            dueNote: string | null;
            /** @description «С-218». */
            id: string;
            /** Format: int32 */
            orderId: number | null;
            /** Format: int64 */
            paid: number;
            /** @description `new` | `in_work` | `shipped` | `delivered` | `declined`. */
            status: components["schemas"]["SellerSampleStatusName"];
            title: string;
            tone: null | components["schemas"]["OfferToneName"];
            trackingNumber: string | null;
        };
        /**
         * @description Статус запроса образца в кабинете завода.
         * @enum {string}
         */
        SellerSampleStatusName: "new" | "in_work" | "shipped" | "delivered" | "declined";
        /**
         * @description Ступень заказа в кабинете завода (`SellerStage` контракта).
         * @enum {string}
         */
        SellerStage: "new" | "in_production" | "quality_control" | "shipped" | "paid_out";
        /**
         * @description Команда автомата, которую подаёт завод (`SellerStageCommand`).
         * @enum {string}
         */
        SellerStageCommand: "start_artwork_review" | "materials_purchased" | "start_quality_control" | "ship";
        SellerTodoItem: {
            href: string;
            key: string;
            note: string | null;
            title: string;
            urgent: boolean;
        };
        /** @description `POST /orders/{id}/messages`. */
        SendOrderMessageBody: {
            /** @description `fileId` из `POST /orders/{id}/messages/attachments`. */
            attachmentIds?: string[] | null;
            /** @description По умолчанию `order`. */
            channel?: string | null;
            text?: string;
        };
        /** @description Сеанс на одном устройстве. */
        Session: {
            /** Format: date-time */
            createdAt: string;
            /** @description Сеанс, из которого пришёл этот запрос. */
            current: boolean;
            /** Format: date-time */
            expiresAt: string;
            /** Format: uuid */
            id: string;
            /**
             * @description Адрес, как его показал прокси; подделывается клиентом и в проверках не участвует.
             * @example 203.0.113.7
             */
            ip: string | null;
            /** Format: date-time */
            lastSeenAt: string;
            userAgent: string | null;
        };
        /** @description Список своих сеансов. */
        SessionList: {
            items: components["schemas"]["Session"][];
        };
        SetOfferListedBody: {
            listed: boolean;
        };
        /**
         * @description Специализация завода — плоский справочник (Q-132), он же значение фасета `spec`.
         * @enum {string}
         */
        SpecializationName: "shveinoe" | "trikotazh" | "svechi" | "sumki";
        /**
         * @description Вид объекта, за который платят.
         * @enum {string}
         */
        SubjectKindName: "order" | "sample";
        /**
         * @description Ответ `POST /orders/{id}/submit`.
         *
         *     `documents` и `payment` вынесены наверх, потому что после `submit` они
         *     гарантированно есть, а в `Order` объявлены как «могут отсутствовать».
         */
        SubmitOrderResponse: {
            documents: components["schemas"]["OrderDocument"][];
            order: components["schemas"]["Order"];
            payment: components["schemas"]["PaymentInstructions"];
        };
        SubmitSellerOfferResponse: {
            changes: components["schemas"]["SellerOfferChange"][];
            offer: components["schemas"]["SellerOfferListItem"];
            slaNote: string;
        };
        /** @description Смена «плательщика» — активной организации сеанса. */
        SwitchOrgRequest: {
            /**
             * Format: uuid
             * @description Организация, в которой пользователь состоит. Чужая — `403`.
             */
            orgId: string;
        };
        TaxonomyAttributeInput: {
            key: string;
            kind: string;
            label: string;
            options?: string[] | null;
            required?: boolean;
            unit?: string | null;
            usedIn?: string[] | null;
        };
        TaxonomyCategory: {
            attributes: Record<string, never>[];
            /** Format: float */
            defaultCapacityUnitsPerItem: number;
            path: string[];
            title: string;
            unit: string;
        };
        TaxonomyNode: {
            children: Record<string, never>[];
            /** Format: int64 */
            offersCount: number;
            path: string[];
            slug: string;
            title: string;
        };
        /**
         * @description Статус счёта по сделке.
         * @enum {string}
         */
        TrancheStatusName: "awaiting_funds" | "held" | "released" | "refunded" | "cancelled";
        UnderloadDiscountInput: {
            enabled: boolean;
            /** Format: int32 */
            percent: number;
            /** Format: int32 */
            thresholdPct: number;
        };
        /** @description Правило скидки на недозагруз. */
        UnderloadDiscountRule: {
            /** @description Недели, для которых правило сейчас срабатывает. */
            activeWeeks: string[];
            enabled: boolean;
            note: string | null;
            /** Format: int32 */
            percent: number;
            /** Format: int32 */
            thresholdPct: number;
        };
        /** @description `PUT /seller/capacity`. Поля необязательны: форма шлёт изменённое. */
        UpdateCapacityRequest: {
            cells?: components["schemas"]["CapacityCellInput"][] | null;
            itemCoefficients?: components["schemas"]["CapacityCoefficientInput"][] | null;
            lines?: components["schemas"]["CapacityLineInput"][] | null;
            underloadDiscount?: null | components["schemas"]["UnderloadDiscountInput"];
        };
        /** @description `PUT /me/notification-settings`. */
        UpdateNotificationSettingsBody: {
            preferences: components["schemas"]["NotificationPreferencePatch"][];
        };
        /**
         * @description `PATCH /orders/{id}` — частичное обновление черновика.
         *
         *     Отсутствующий ключ означает «не трогать», явный `null` — «очистить». Именно поэтому
         *     необязательные поля здесь `Option<Option<T>>`: иначе эти два случая неразличимы.
         */
        UpdateOrderDraftBody: {
            delivery?: null | components["schemas"]["OrderDeliveryInput"];
            params?: null | components["schemas"]["UpdateOrderParams"];
            payer?: null | components["schemas"]["OrderPayerInput"];
            paymentMethod?: null | components["schemas"]["PaymentMethod"];
            /**
             * @description Пересчитали партию — пришла новая котировка. Объём, опции, доставка и промокод
             *     меняются ТОЛЬКО так.
             */
            quoteId?: string | null;
        };
        UpdateOrderParams: {
            colors?: components["schemas"]["OrderColorLine"][] | null;
            comment?: string | null;
            fit?: string | null;
            optionIds?: string[] | null;
            print?: string | null;
            /** Format: int32 */
            qty?: number | null;
            sizes?: components["schemas"]["OrderSizeLine"][] | null;
        };
        UpdateRankingBody: {
            weights: components["schemas"]["RankingWeightInput"][];
        };
        UpdateSellerProfileBody: {
            about?: string | null;
            city?: string | null;
            equipment?: string[] | null;
            name?: string | null;
            /** Format: int32 */
            since?: number | null;
            specialization?: string | null;
            /** Format: int32 */
            workers?: number | null;
        };
        UpdateTaxonomyCategoryBody: {
            attributes?: components["schemas"]["TaxonomyAttributeInput"][] | null;
            /** Format: float */
            defaultCapacityUnitsPerItem?: number | null;
            title?: string | null;
            unit?: string | null;
        };
        /** @description Пользователь-человек. Организации у него отдельно, см. [`OrgDto`]. */
        User: {
            /** Format: date-time */
            createdAt: string;
            email: string | null;
            /** Format: uuid */
            id: string;
            /** @description Имя, если человек его указал. */
            name: string | null;
            phone: string | null;
        };
        /** @description Счётчики шапки и сайдбара. */
        UserCounters: {
            /** Format: int64 */
            documentsAwaitingSignature: number;
            /** Format: int64 */
            openDisputes: number;
            /** Format: int64 */
            ordersAwaitingAction: number;
            /** Format: int64 */
            ordersInAcceptance: number;
            /** Format: int64 */
            unreadMessages: number;
            /** Format: int64 */
            unreadNotifications: number;
        };
        /**
         * @description Состояние проверки организации (KYB). У новой всегда `pending`.
         * @enum {string}
         */
        VerificationStatusName: "pending" | "verified" | "rejected";
        /** @description Проверка кода: тот же идентификатор и цифры из сообщения. */
        VerifyCodeRequest: {
            /**
             * @description Цифры кода; пробелы и дефисы из полей ввода можно не убирать.
             * @example 481500
             */
            code: string;
            /** @example +79160001234 */
            identifier: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    listDisputes: {
        parameters: {
            query?: {
                /** @description Номер заказа, чью карточку раскрыть справа; пусто — первый горящий спор. */
                selected?: number;
                /** @description Вкладка очереди: `open` (по умолчанию) | `resolved`. */
                tab?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Очередь */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminDisputeList"];
                };
            };
            /** @description Не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getDisputeForOperator: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                orderId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Спор */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminDisputeCard"];
                };
            };
            /** @description Не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Спора нет */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    resolveDispute: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                orderId: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ResolveDisputeBody"];
            };
        };
        responses: {
            /** @description Решение принято, деньги распределены */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminDisputeCard"];
                };
            };
            /** @description Не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Решение уже принято */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Исход и сторона противоречат друг другу */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminListFactories: {
        parameters: {
            query?: {
                /**
                 * @description Организация завода, чью карточку показать справа. Пусто — сервер выбирает
                 *     первый горящий: экран открывается не пустым. Строку выбирает клик по ней,
                 *     и выбор живёт в search-параметре URL.
                 */
                selected?: string;
                /** @description `queue` | `active` | `suspended` | `audit_expiring`. */
                tab?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Заводы */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminFactoryList"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminScheduleAuditVisit: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Организация завода */
                orgId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ScheduleAuditVisitBody"];
            };
        };
        responses: {
            /** @description Выезд назначен */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminFactoryList"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого завода */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminFactoryDecision: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Организация завода */
                orgId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdminFactoryDecisionBody"];
            };
        };
        responses: {
            /** @description Решение принято */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminFactoryList"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого завода */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Обоснование обязательно */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminFinance: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Финансы */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminFinanceOverview"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminListOffers: {
        parameters: {
            query?: {
                /** @description Публичный номер заявки, чью карточку показать справа. Пусто — первая в очереди. */
                selected?: number;
                /** @description `queue` | `complaints` | `autoflags`. */
                tab?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Очередь */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminOfferList"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminOfferDecision: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер предложения */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdminOfferDecisionBody"];
            };
        };
        responses: {
            /** @description Решение принято */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminOfferList"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Очередь пуста или версия уже обработана */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Решение уже вынесено */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Обоснование обязательно */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    markOrderDelivered: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Окно приёмки открыто */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Order"];
                };
            };
            /** @description Не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Из этого статуса переход не применим */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminOverview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Обзор */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminOverview"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    confirmDealPayout: {
        parameters: {
            query?: never;
            header: {
                /** @description Ключ идемпотентности операции */
                "Idempotency-Key": string;
            };
            path: {
                /** @description Идентификатор сделки (UUID v7) */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PayoutConfirmedRequest"];
            };
        };
        responses: {
            /** @description Выплата проведена */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentsDeal"];
                };
            };
            /** @description Нет заголовка Idempotency-Key или тело не разобрано */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нужен вход */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такой сделки */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description По сделке нечего выплачивать либо ключ занят */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getLedgerReconciliation: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Итог сверки */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LedgerReconciliation"];
                };
            };
            /** @description Нужен вход */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listAdminTranches: {
        parameters: {
            query?: {
                cursor?: string;
                /** @example 20 */
                limit?: number;
                /** @description Статус счетов. По умолчанию — ждущие оплаты. */
                status?: components["schemas"]["TrancheStatusName"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Страница очереди */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminTranchesPage"];
                };
            };
            /** @description Нужен вход */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    confirmTrancheFunds: {
        parameters: {
            query?: never;
            header: {
                /** @description Ключ идемпотентности операции */
                "Idempotency-Key": string;
            };
            path: {
                /** @description Идентификатор счёта (UUID v7) */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConfirmFundsRequest"];
            };
        };
        responses: {
            /** @description Деньги в эскроу */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentsDeal"];
                };
            };
            /** @description Нет заголовка Idempotency-Key или тело не разобрано */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нужен вход */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого счёта */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Счёт уже не ждёт оплаты либо ключ занят другим запросом */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Сумма не совпала с суммой счёта */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminRanking: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Ранжирование */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminRanking"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminUpdateRanking: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateRankingBody"];
            };
        };
        responses: {
            /** @description Веса применены */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminRanking"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Сумма весов не равна 100 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminRankingPreview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RankingPreviewBody"];
            };
        };
        responses: {
            /** @description Предпросмотр */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RankingPreview"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Сумма весов не равна 100 */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminTaxonomy: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Таксономия */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminTaxonomy"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    adminUpdateTaxonomyCategory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Путь категории через дефис: tekstil-futbolki */
                path: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTaxonomyCategoryBody"];
            };
        };
        responses: {
            /** @description Схема сохранена */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdminTaxonomy"];
                };
            };
            /** @description Вошедший — не оператор платформы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такой категории */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    requestLoginCode: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RequestCodeRequest"];
            };
        };
        responses: {
            /** @description Код принят к отправке */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CodeRequested"];
                };
            };
            /** @description Идентификатор не похож на телефон или почту */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Повторная отправка ещё недоступна */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Сеанс закрыт, кука стёрта */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Сессии нет */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    verifyLoginCode: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VerifyCodeRequest"];
            };
        };
        responses: {
            /** @description Вход выполнен; кука сессии в `Set-Cookie` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            /** @description Код неверный или устарел */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Пользователь заблокирован */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Попытки исчерпаны, нужен новый код */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    catalogCategories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Дерево категорий */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryTree"];
                };
            };
        };
    };
    catalogSearch: {
        parameters: {
            query?: {
                /**
                 * @description Путь категории через слэш: `tekstil/futbolki`. Сужает выдачу по префиксу пути.
                 * @example tekstil/futbolki
                 */
                category?: string;
                /** @description Фасет «Срок» (радио): `14`, `21`, `any`. */
                lead?: string[];
                /** @description Фасет «Материал»: `cotton`, `futer`, `pique`, `dvunitka`. */
                material?: string[];
                /** @description Фасет «Минимальная партия»: `to500`, `500to1000`, `1000to5000`. */
                moq?: string[];
                /** @description Верхняя граница минимальной партии, штуки. */
                moqMax?: number;
                /** @description Нижняя граница минимальной партии, штуки. */
                moqMin?: number;
                /**
                 * @description Номер страницы, начиная с 1. Больше последней — прижимается к последней.
                 * @example 1
                 */
                page?: number;
                /**
                 * @description Размер страницы, 1..=100; пусто — 12.
                 * @example 12
                 */
                perPage?: number;
                /**
                 * @description Верхняя граница цены за штуку, копейки.
                 * @example 60000
                 */
                priceMax?: number;
                /**
                 * @description Нижняя граница цены за штуку, копейки.
                 * @example 10000
                 */
                priceMin?: number;
                /**
                 * @description Строка поиска: подстрока без учёта регистра по названию, заводу и материалу.
                 * @example худи
                 */
                q?: string;
                /** @description Фасет «Регион фабрики»: `cfo`, `pfo`, `szfo`, `ufo`. */
                region?: string[];
                /** @description Порядок выдачи; пусто — `popular`. */
                sort?: components["schemas"]["CatalogSort"];
                /** @description Фасет «Надёжность»: `audit`, `rating`, `sample`, `free`. */
                trust?: string[];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Страница выдачи */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CatalogSearchResult"];
                };
            };
            /** @description Неизвестная сортировка, нечисловой `page`/`perPage` или выход за пределы */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listDocuments: {
        parameters: {
            query?: {
                /** @description Период по дате создания, ISO `YYYY-MM-DD`. */
                from?: string;
                kind?: string;
                /** @description Только документы одного заказа. */
                order?: number;
                page?: number;
                perPage?: number;
                /** @description Номер заказа или документа строкой. */
                q?: string;
                state?: string;
                to?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Список документов */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DocumentList"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    signDocument: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Идентификатор документа */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Документа нет или он от чужого заказа */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description ЭДО не подключён */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listFactories: {
        parameters: {
            query?: {
                /**
                 * @description Только заводы с аудитом платформы. Фронт присылает параметр, лишь когда он включён.
                 * @example true
                 */
                audit?: boolean;
                /** @description Город целиком, как он стоит в фасете: «Иваново». */
                city?: string;
                /** @example 1 */
                page?: number;
                /** @example 24 */
                perPage?: number;
                /**
                 * @description Подстрока названия завода, регистронезависимо.
                 * @example Волна
                 */
                q?: string;
                /** @description Ключ специализации из фасета `spec`. */
                specialization?: components["schemas"]["SpecializationName"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Страница списка */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FactoryListResult"];
                };
            };
            /** @description Неизвестная специализация или битые `page`/`perPage` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getFactory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description Номер завода
                 * @example 17
                 */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Завод и его офферы */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FactoryDetail"];
                };
            };
            /** @description Нет такого завода */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Профиль */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            /** @description Сессии нет */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    switchActiveOrg: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SwitchOrgRequest"];
            };
        };
        responses: {
            /** @description Профиль с новой активной организацией */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            /** @description Тело запроса не разобрано */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Сессии нет */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Пользователь не участник этой организации */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getUserCounters: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Счётчики */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserCounters"];
                };
            };
        };
    };
    getEdoConnection: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Состояние подключения */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EdoConnection"];
                };
            };
        };
    };
    getEscrowOverview: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Сводка */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EscrowOverview"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getNotificationSettings: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Настройки */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationSettings"];
                };
            };
        };
    };
    updateNotificationSettings: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateNotificationSettingsBody"];
            };
        };
        responses: {
            /** @description Настройки после правки */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationSettings"];
                };
            };
        };
    };
    listSessions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Список сеансов */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionList"];
                };
            };
            /** @description Сессии нет */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    revokeSession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Идентификатор сеанса из `GET /me/sessions` */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Сеанс завершён */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Сессии нет */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Чужой или несуществующий сеанс */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    streamUserEvents: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Поток кадров */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": unknown;
                };
            };
        };
    };
    listNotifications: {
        parameters: {
            query?: {
                page?: number;
                perPage?: number;
                topic?: string;
                /** @description Только непрочитанные. */
                unread?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Лента */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationList"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    markNotificationsRead: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MarkNotificationsReadBody"];
            };
        };
        responses: {
            /** @description Лента после отметки */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NotificationList"];
                };
            };
            /** @description Нечего отмечать */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getOffer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description Номер оффера; допускается хвост-слаг: `2231-futbolki-180`
                 * @example 2231
                 */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Оффер */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfferDetail"];
                };
            };
            /** @description Нет такого оффера или он не опубликован */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listOfferQuestions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер предложения */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Вопросы */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfferQuestionList"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    askOfferQuestion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер предложения */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AskQuestionBody"];
            };
        };
        responses: {
            /** @description Вопрос задан */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfferQuestion"];
                };
            };
            /** @description Нужен вход */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого предложения */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Пустой вопрос */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listOfferReviews: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер предложения */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Отзывы */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfferReviewList"];
                };
            };
            /** @description Нет такого предложения */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSampleOptions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер оффера */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Справочник формы */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SampleOptions"];
                };
            };
            /** @description Нет такого оффера */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description У оффера нет образца */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSimilarOffers: {
        parameters: {
            query?: {
                /**
                 * @description Сколько предложений вернуть, 1..=24; пусто — 4.
                 * @example 4
                 */
                limit?: number;
            };
            header?: never;
            path: {
                /**
                 * @description Номер оффера
                 * @example 2231
                 */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Похожие */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OfferSummary"][];
                };
            };
            /** @description Недопустимый `limit` */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого оффера */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    openapiSpec: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Документ OpenAPI 3.1 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    listOrders: {
        parameters: {
            query?: {
                /** @description Вкладка кабинета; пусто — все заказы. */
                bucket?: components["schemas"]["OrderBucket"];
                /** @description Страница, с 1. */
                page?: number;
                /** @description Размер страницы, 1..=100. */
                perPage?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Страница заказов */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderList"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createOrderDraft: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateOrderDraftBody"];
            };
        };
        responses: {
            /** @description Продолжен существующий черновик */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Order"];
                };
            };
            /** @description Новый черновик */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Order"];
                };
            };
            /** @description Котировка не найдена */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Котировка истекла (`/problems/orders/quote-expired`) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Заказ */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Order"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateOrderDraft: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateOrderDraftBody"];
            };
        };
        responses: {
            /** @description Обновлённый черновик */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Order"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Заказ уже не черновик либо котировка не подходит */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Ошибки по полям формы (`errors`) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    acceptOrder: {
        parameters: {
            query?: never;
            header: {
                /** @description Ключ идемпотентности */
                "Idempotency-Key": string;
            };
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AcceptOrderBody"];
            };
        };
        responses: {
            /** @description Партия принята */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Order"];
                };
            };
            /** @description Нет заголовка Idempotency-Key */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Принять можно только заказ в статусе `acceptance` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    requestArtworkUpload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ArtworkUploadRequest"];
            };
        };
        responses: {
            /** @description Куда и как класть файл */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArtworkUploadResponse"];
                };
            };
            /** @description Заказ не черновик либо файлов уже максимум */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Файл больше лимита */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Неподдерживаемый тип файла */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteArtwork: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Идентификатор файла */
                fileId: string;
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Файл убран */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Заказ уже не черновик */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    completeArtworkUpload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Идентификатор файла из ответа на запрос загрузки */
                fileId: string;
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Файл принят */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderArtwork"];
                };
            };
            /** @description Нет такого файла */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Ссылка истекла или файл не долетел */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    approveArtwork: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Макет согласован */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Order"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Из этого статуса переход не применим */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getDispute: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Претензия */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Dispute"];
                };
            };
            /** @description Спора нет либо заказ чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    openDispute: {
        parameters: {
            query?: never;
            header: {
                /** @description Ключ идемпотентности */
                "Idempotency-Key": string;
            };
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OpenDisputeBody"];
            };
        };
        responses: {
            /** @description Претензия открыта */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Dispute"];
                };
            };
            /** @description Нет заголовка Idempotency-Key */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Спор уже открыт либо статус не тот */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Форма заполнена не полностью */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getDisputeOptions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Справочники формы */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisputeOptions"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    requestDisputeEvidenceUpload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DisputeEvidenceUploadRequest"];
            };
        };
        responses: {
            /** @description Куда класть файл */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisputeEvidenceUploadResponse"];
                };
            };
            /** @description Файл больше лимита */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Неподдерживаемый тип */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    withdrawDispute: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Претензия отозвана */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Dispute"];
                };
            };
            /** @description Решение уже принято */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getOrderEscrow: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Сделка */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EscrowDeal"];
                };
            };
            /** @description Сделки нет */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getOrderEvents: {
        parameters: {
            query?: {
                /** @description Отдать события строго новее этого `seq`. Пусто — хвост журнала. */
                after?: number;
                /** @description Сколько событий вернуть; по умолчанию 50, максимум 200. */
                limit?: number;
                /** @description Фильтр по виду через запятую: `progress,photo_report,message`. */
                types?: string;
            };
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Страница журнала */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderEventPage"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Журнала ещё нет: заказ не оплачен */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Курсор из будущего */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getOrderMessages: {
        parameters: {
            query?: {
                /** @description Отдать сообщения новее этого `seq` — дочитывание после обрыва SSE. */
                after?: number;
                /** @description Пусто — только чат с технологом (`order`). */
                channel?: string;
                /** @description По умолчанию 100. */
                limit?: number;
            };
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Ветка переписки */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderMessageList"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    sendOrderMessage: {
        parameters: {
            query?: never;
            header: {
                /** @description Ключ идемпотентности, 8–255 символов */
                "Idempotency-Key": string;
            };
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SendOrderMessageBody"];
            };
        };
        responses: {
            /** @description Сообщение отправлено */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderMessage"];
                };
            };
            /** @description Нет заголовка Idempotency-Key */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Заказ закрыт либо ветка спора не открыта */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Пустое сообщение без вложений */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    requestMessageAttachmentUpload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MessageAttachmentUploadRequest"];
            };
        };
        responses: {
            /** @description Куда класть файл */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MessageAttachmentUploadResponse"];
                };
            };
            /** @description Файл больше лимита */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Неподдерживаемый тип */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    markOrderMessagesRead: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MarkMessagesReadBody"];
            };
        };
        responses: {
            /** @description Ветка после отметки */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrderMessageList"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    repeatOrder: {
        parameters: {
            query?: never;
            header: {
                /** @description Ключ идемпотентности */
                "Idempotency-Key": string;
            };
            path: {
                /** @description Публичный номер завершённого заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Готовый черновик повтора */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RepeatOrderResponse"];
                };
            };
            /** @description Повторить можно только завершённый заказ */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    streamOrderEvents: {
        parameters: {
            query?: {
                /** @description Запасной вход для `Last-Event-ID`: заголовок умеет не всякий клиент (curl). */
                after?: number;
            };
            header?: {
                /** @description Последний полученный `seq` */
                "Last-Event-ID"?: string | null;
            };
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Поток кадров `order_event` и `ping` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": unknown;
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Журнала ещё нет: заказ не оплачен */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Слишком много открытых каналов */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    submitOrder: {
        parameters: {
            query?: never;
            header: {
                /** @description Ключ идемпотентности, 8–255 символов */
                "Idempotency-Key": string;
            };
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Заказ оформлен, счёт выставлен */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmitOrderResponse"];
                };
            };
            /** @description Нет заголовка Idempotency-Key */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Заказ не черновик, котировка истекла либо нет мощности */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Оформление не закончено (`errors` по полям) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createOrg: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateOrgRequest"];
            };
        };
        responses: {
            /** @description Организация создана */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Org"];
                };
            };
            /** @description Неверный вид, название или ИНН */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Сессии нет */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Организация с таким ИНН и видом уже есть */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getOrg: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Идентификатор организации */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Организация и роль в ней */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Org"];
                };
            };
            /** @description Сессии нет */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Пользователь не участник этой организации */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listEscrowDeals: {
        parameters: {
            query?: {
                /** @description Курсор из `nextCursor` предыдущей страницы. */
                cursor?: string;
                /**
                 * @description Сколько записей вернуть, 1..=100.
                 * @example 20
                 */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Страница сделок */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EscrowDealsPage"];
                };
            };
            /** @description Битый курсор или организация не выбрана */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нужен вход */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Роль не даёт видеть финансы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getEscrowDeal: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Идентификатор сделки (UUID v7) */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Сделка */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EscrowDealDetail"];
                };
            };
            /** @description Нужен вход */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такой сделки либо она чужая */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createQuote: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuoteRequest"];
            };
        };
        responses: {
            /** @description Котировка */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Quote"];
                };
            };
            /** @description Нет такого оффера или он не опубликован */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Партию с такими параметрами посчитать нельзя. `type` несёт код правила: `/problems/quote/below_moq`, `/problems/quote/unknown_option`, `/problems/quote/duplicate_option`, `/problems/quote/option_requires_qty`, `/problems/quote/unknown_delivery`, `/problems/quote/unknown_promo`. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getQuote: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Идентификатор котировки (UUID v7) */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Котировка */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Quote"];
                };
            };
            /** @description Нет такой котировки */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Котировки не сохраняются: `api` поднят без базы */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listSamples: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Список образцов */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SampleList"];
                };
            };
        };
    };
    createSample: {
        parameters: {
            query?: never;
            header: {
                /** @description Ключ идемпотентности */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateSampleBody"];
            };
        };
        responses: {
            /** @description Образец заказан */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SampleOrder"];
                };
            };
            /** @description Образец этой фабрики уже в работе */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Форма заполнена не полностью (`errors`) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    requestSampleArtworkUpload: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ArtworkUploadRequest"];
            };
        };
        responses: {
            /** @description Куда и как класть файл */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArtworkUploadResponse"];
                };
            };
            /** @description Файл больше лимита */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Неподдерживаемый тип файла */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSellerFunnel: {
        parameters: {
            query?: {
                /** @description `7d` | `30d` | `90d`; пусто — 30 дней. */
                period?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Воронка */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerFunnel"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSellerAudit: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Состояние аудита */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerAudit"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    requestSellerAudit: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RequestAuditBody"];
            };
        };
        responses: {
            /** @description Заявка подана */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerAudit"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getCapacityPlan: {
        parameters: {
            query?: {
                /** @description Начало горизонта, ISO `YYYY-MM-DD`; пусто — текущая неделя. */
                from?: string;
                /** @description Конец горизонта; пусто — +8 недель. */
                to?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description План мощности */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CapacityPlan"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateCapacityPlan: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCapacityRequest"];
            };
        };
        responses: {
            /** @description План сохранён */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CapacityPlan"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Неделя в прошлом */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description План ниже занятого либо значения некорректны */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    copyCapacityPlan: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CopyCapacityRequest"];
            };
        };
        responses: {
            /** @description План скопирован */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CapacityPlan"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Неделя в прошлом */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Некорректные недели */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSellerDashboard: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Сводка */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerDashboard"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSellerFeedback: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Отзывы и вопросы */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerFeedback"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    answerSellerQuestion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Номер вопроса */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SellerAnswerBody"];
            };
        };
        responses: {
            /** @description Ответ сохранён */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerFeedback"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого вопроса или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    replySellerReview: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SellerAnswerBody"];
            };
        };
        responses: {
            /** @description Ответ сохранён */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerFeedback"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого отзыва или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listSellerPayouts: {
        parameters: {
            query?: {
                /** @description Курсор из `nextCursor` предыдущей страницы. */
                cursor?: string;
                /**
                 * @description Сколько записей вернуть, 1..=100.
                 * @example 20
                 */
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Страница выплат */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerPayoutsPage"];
                };
            };
            /** @description Битый курсор или организация не выбрана */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нужен вход */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Роль не даёт видеть финансы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSellerFinanceSummary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Итоги */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerFinanceSummary"];
                };
            };
            /** @description Нужен вход */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Роль не даёт видеть финансы */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listSellerOffers: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Предложения */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOfferList"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    createSellerOffer: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": Record<string, never>;
            };
        };
        responses: {
            /** @description Редактор нового предложения */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOfferEditor"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Предложение не проходит валидацию */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    saveSellerOffer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер предложения */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": Record<string, never>;
            };
        };
        responses: {
            /** @description Черновик сохранён */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOfferEditor"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого предложения или оно чужое */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Предложение не проходит валидацию */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSellerOfferEditor: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер предложения */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Редактор */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOfferEditor"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого предложения или оно чужое */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    setSellerOfferListed: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер предложения */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetOfferListedBody"];
            };
        };
        responses: {
            /** @description Тумблер переключён */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOfferListItem"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого предложения или оно чужое */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    submitSellerOffer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер предложения */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Версия отправлена */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmitSellerOfferResponse"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого предложения или оно чужое */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Предложение уже на модерации */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Предложение не готово к публикации */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    newSellerOfferEditor: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Редактор */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOfferEditor"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getFactoryOnboarding: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Черновик */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FactoryOnboardingDraft"];
                };
            };
            /** @description Не выбрана организация */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    saveFactoryOnboarding: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SaveFactoryOnboardingBody"];
            };
        };
        responses: {
            /** @description Черновик сохранён */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FactoryOnboardingDraft"];
                };
            };
            /** @description Не выбрана организация */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listSellerOrders: {
        parameters: {
            query?: {
                page?: number;
                perPage?: number;
                /** @description Вкладка кабинета (`new` … `paid_out`); пусто — все видимые заводу. */
                stage?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Страница заказов */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOrderList"];
                };
            };
            /** @description Неизвестная ступень */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Модулю нужен DATABASE_URL */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSellerOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Заказ */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOrder"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    confirmSellerOrder: {
        parameters: {
            query?: never;
            header: {
                /** @description Ключ идемпотентности */
                "Idempotency-Key": string;
            };
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Заказ подтверждён */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOrder"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Переход не применим либо срок истёк */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    declineSellerOrder: {
        parameters: {
            query?: never;
            header: {
                /** @description Ключ идемпотентности */
                "Idempotency-Key": string;
            };
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeclineOrderBody"];
            };
        };
        responses: {
            /** @description Заказ отклонён, возврат оформлен */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOrder"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Из этого статуса переход не применим */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    replyToDispute: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DisputeReplyBody"];
            };
        };
        responses: {
            /** @description Ответ записан */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Dispute"];
                };
            };
            /** @description Нет открытого спора или заказ чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    reportPhotos: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PhotoReportBody"];
            };
        };
        responses: {
            /** @description Отчёт записан */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOrder"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Пустой отчёт */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    requestPhotoUpload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PhotoUploadRequest"];
            };
        };
        responses: {
            /** @description Куда класть файл */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArtworkUploadResponse"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Журнала ещё нет: заказ не оплачен */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Файл больше лимита */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Неподдерживаемый тип файла */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    reportSellerProgress: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReportProgressBody"];
            };
        };
        responses: {
            /** @description Записано */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOrder"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого заказа или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Журнала ещё нет: заказ не оплачен */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Прогресс вне допустимых границ */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    advanceSellerStage: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Публичный номер заказа */
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdvanceStageBody"];
            };
        };
        responses: {
            /** @description Статус изменён */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerOrder"];
                };
            };
            /** @description Неизвестная команда */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Из этого статуса переход не применим */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSellerProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Профиль */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerProfile"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    updateSellerProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateSellerProfileBody"];
            };
        };
        responses: {
            /** @description Профиль сохранён */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerProfile"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listSellerSamples: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Образцы */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerSampleList"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    advanceSellerSample: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description accept | ship | decline */
                command: string;
                /** @description Номер образца («С-218» или просто число) */
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": Record<string, never>;
            };
        };
        responses: {
            /** @description Образцы после команды */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SellerSampleList"];
                };
            };
            /** @description Организация вошедшего — не завод */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Нет такого образца или он чужой */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Из этого статуса переход не применим */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getUpload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Подписанный токен */
                token: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Содержимое файла */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Подпись не сошлась или файла нет */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    putUpload: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Одноразовый подписанный токен */
                token: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Файл принят */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Подпись не сошлась */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Ссылка истекла */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Тело больше разрешённого */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    healthz: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Сервис жив; `db` показывает состояние базы */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
        };
    };
}
