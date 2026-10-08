/* Макет «Лента» · admin. Экраны регистрируются через screen(id, группа, название, url, render). */

/* Бэк-офис оператора — отдельное приложение apps/admin, своя оболочка. */
const ADM_NAV=[['admin-home','Обзор'],['admin-factories','Заводы и аудит',3],['admin-offers','Модерация предложений',7],['admin-disputes','Споры',2],['admin-finance','Финансы и сверка',1],['admin-taxonomy','Категории и атрибуты'],['admin-ranking','Ранжирование и промо']];
const admin=(active,body)=>`<div class="adm"><aside class="adm-side"><a class="logo" href="#admin-home"><i></i>Партия<span>бэк-офис</span></a>${ADM_NAV.map(([id,l,c])=>`<a class="${id===active?'on':''}" href="#${id}">${l}${c?`<span class="c">${c}</span>`:''}</a>`).join('')}<div class="adm-user">Оператор · Н. Белова<br><span>смена до 19:00</span></div></aside><main class="adm-main">${body}</main></div>`;

function adminHome(){
  return admin('admin-home',`
  ${pageH('Обзор','Сегодня, 20 сентября · очереди и то, что горит')}
  <div class="kpis">${kpi('GMV · сентябрь','71,4 млн ₽','+22 % к августу','')}${kpi('В эскроу','48,2 млн ₽','по 214 заказам')}${kpi('Комиссия · сентябрь','4,9 млн ₽')}${kpi('Заказов в работе','214','12 просрочено','warn')}</div>
  <div class="cols2">
    <div class="box"><h3>Очереди</h3><table class="tb" style="margin-top:6px"><tbody>${[['Модерация предложений','7','старейшее — 5 ч','admin-offers'],['Заявки заводов','3','1 ждёт выезда аудитора','admin-factories'],['Споры','2','1 — решение сегодня','admin-disputes'],['Несопоставленные платежи','1','63 000 ₽, без номера заказа','admin-finance'],['Жалобы на обход платформы','4','контакты в вопросах','admin-offers']].map(r=>`<tr><td class="t">${r[0]}</td><td class="r"><b class="num">${r[1]}</b></td><td class="s">${r[2]}</td><td class="r"><a class="btn sm" href="#${r[3]}">Открыть</a></td></tr>`).join('')}</tbody></table></div>
    <div class="box"><h3>Бизнес-алерты</h3>${alertBox('danger','Webhook банка не обработан 14 мин','Платёж по заказу № 4830 — деньги пришли, заказ не перешёл в «ожидает подтверждения».','<button class="btn sm">Повторить</button>')}${alertBox('warn','Завод «Меридиан» не подтвердил 2 заказа подряд','Автоматическое понижение в выдаче включено. Связаться с менеджером завода.')}${alertBox('warn','12 заказов просрочили плановую дату','Из них 9 — «Контроль качества» дольше 3 дней.')}</div>
  </div>
  <div class="box" style="margin-top:12px"><h3>Сделки по этапам</h3><div class="funnel wide">${[['Ожидают оплаты',31,14],['Ждут подтверждения завода',18,8],['Макет / сырьё',42,20],['Производство',96,45],['Контроль качества',27,13],['Приёмка',21,10],['Спор',2,2]].map(r=>`<div><span>${r[0]}</span><div class="bar"><i style="width:${r[2]*2}%"></i></div><b class="num">${r[1]}</b></div>`).join('')}</div></div>`);
}
screen('admin-home','admin','Обзор оператора','admin.partiya.ru/',adminHome,{bodyClass:'adm-body'});

function adminFactories(){
  const f=[['ООО «Северный шов»','Вологда','Заявка','new','ждёт проверки документов','сегодня'],['ООО «Трикотаж-М»','Чебоксары','Документы ок','work','назначить выезд аудитора','18 сен'],['ИП Гусев','Иваново','Выезд 23 сен','work','аудитор: Петров','15 сен'],['ООО «Волна»','Иваново','Аудит пройден','ok','до 12.06.2027','—'],['ООО «Меридиан»','Тверь','Без аудита','done','2 отклонённых заказа подряд','—']];
  return admin('admin-factories',`
  ${pageH('Заводы и аудит','38 активных · 3 в очереди на подключение')}
  ${tabbar(['Очередь · 3','Активные · 38','Приостановленные · 2','Истекает аудит · 4'])}
  <div class="cols-side">
    <div class="box"><table class="tb"><thead><tr><th>Завод</th><th>Этап</th><th>Что дальше</th><th>Заявка</th><th></th></tr></thead><tbody>${f.map((r,i)=>`<tr class="${i===1?'hot':''}"><td><div class="t">${r[0]}</div><div class="s">${r[1]}</div></td><td>${tag(r[2],r[3])}</td><td class="s">${r[4]}</td><td class="s">${r[5]}</td><td><button class="btn sm">Открыть</button></td></tr>`).join('')}</tbody></table></div>
    <aside class="box"><h3>ООО «Трикотаж-М»</h3><div class="muted small">ИНН 2130000000 · Чебоксары · заявка 18 сен</div><h4 style="margin:12px 0 6px">Чек-лист аудита</h4><ol class="todo"><li class="done">ЕГРЮЛ: действующее, без массового адреса</li><li class="done">Нет исполнительных производств</li><li class="done">Договор аренды цеха</li><li class="now">Выезд аудитора — назначить</li><li>Оборудование и штат</li><li>Контрольные образцы</li></ol>${fld('Аудитор','Петров А.',{select:['Петров А.','Ильина М.'],wide:true})}${fld('Дата выезда','25.09.2026',{wide:true})}<button class="btn cta wide" style="margin-top:8px">Назначить выезд</button><button class="btn ghost wide" style="margin-top:6px">Отклонить заявку…</button></aside>
  </div>`);
}
screen('admin-factories','admin','Заводы и аудит','admin.partiya.ru/factories',adminFactories,{bodyClass:'adm-body'});

function adminOffers(){
  return admin('admin-offers',`
  ${pageH('Модерация предложений','7 в очереди · SLA 1 рабочий день')}
  ${tabbar(['Новые и правки · 7','Жалобы · 4','Автофлаги · 2'])}
  <div class="cols-side">
    <div class="box"><table class="tb"><thead><tr><th>Предложение</th><th>Завод</th><th>Тип</th><th>Флаги</th><th>В очереди</th></tr></thead><tbody>${[['Футболки оверсайз 240 г/м²','Волна','Новое','—','5 ч'],['Свитшоты 320 г/м²','Ткань+','Правка v3 → v4','фото с чужим логотипом','3 ч'],['Худи детские 280 г/м²','Кама','Новое','цена −48 % от медианы','2 ч'],['Шоперы 38×42','Пошив37','Правка v2 → v3','—','1 ч']].map((r,i)=>`<tr class="${i===1?'hot':''}"><td class="t">${r[0]}</td><td>${r[1]}</td><td class="s">${r[2]}</td><td>${r[3]==='—'?'<span class="muted">—</span>':tag(r[3],'work')}</td><td class="s">${r[4]}</td></tr>`).join('')}</tbody></table></div>
    <aside class="box"><h3>Свитшоты 320 г/м² · v3 → v4</h3><div class="muted small">«Ткань+», Кострома</div><h4 style="margin:12px 0 6px">Что изменилось</h4><table class="tb diff"><tbody><tr><td>Название</td><td><del>Свитшоты футер 2-нитка</del><ins>Свитшоты 320 г/м² с начёсом</ins></td></tr><tr><td>Плотность</td><td><del>280</del><ins>320</ins></td></tr><tr><td>Фото 2</td><td><ins>новое</ins> ${tag('логотип бренда','work')}</td></tr></tbody></table><div class="gal4" style="margin:10px 0">${ph('B','')}${ph('B','⚠ лого')}</div>${fld('Комментарий заводу','Замените фото 2: на изделии логотип стороннего бренда.',{area:2,wide:true})}<div class="row" style="margin-top:8px"><button class="btn cta">Вернуть на доработку</button><button class="btn">Опубликовать</button></div></aside>
  </div>`);
}
screen('admin-offers','admin','Модерация предложений','admin.partiya.ru/offers',adminOffers,{bodyClass:'adm-body'});

function adminDisputes(){
  return admin('admin-disputes',`
  ${crumbs(['Споры','admin-disputes'],'№ 4812')}
  ${pageH('Спор по заказу № 4812','ООО «Кора» ↔ ООО «Волна» · открыт 03.10 · решение до 08.10 · эскроу 183 400 ₽ заблокирован')}
  <div class="cols-side wide-side">
    <div>
      <div class="box"><h3>Позиции сторон</h3><div class="cols2" style="margin-top:8px"><div class="side-pos"><b>Заказчик</b><p>Размер L соответствует M по ширине: 52 см вместо 56. Затронуто 120 из 1 000. Требует допечатку.</p><div class="strip" style="display:flex;gap:4px">${ph('A','замер').replace('class="ph A"','class="ph A" style="width:80px;height:60px;border-radius:4px"')}${ph('A','замер').replace('class="ph A"','class="ph A" style="width:80px;height:60px;border-radius:4px"')}</div></div><div class="side-pos"><b>Фабрика</b><p>Признаёт: при раскрое чёрной партии взято лекало другого заказа. Готова допечатать 120 шт за 6 раб. дней.</p>${tag('Претензия признана','ok')}</div></div></div>
      <div class="box" style="margin-top:12px"><h3>Доказательная база</h3><table class="tb" style="margin-top:6px"><tbody>${[['Спецификация 4812-С','L: ширина 56 см ±1','подтверждает заказчика'],['Отчёт КК фабрики 29.09','выборка 50 шт — размеры «соответствуют»','замеры не приложены'],['Журнал заказа','раскрой чёрной партии 16.09, оператор Иванов','—'],['Чат','технолог 03.10 15:42 признал ошибку лекала','подтверждает заказчика']].map(r=>`<tr><td class="t">${r[0]}</td><td>${r[1]}</td><td class="s">${r[2]}</td><td class="r"><button class="btn sm">Открыть</button></td></tr>`).join('')}</tbody></table></div>
    </div>
    <aside class="box"><h3>Решение</h3><div class="pay on" style="margin-top:8px"><input type="radio" name="d" checked><div><b>Допечатка за счёт фабрики</b><div class="muted small">Эскроу заблокирован до приёмки допечатки. Срок: 6 раб. дней.</div></div></div><div class="pay"><input type="radio" name="d"><div><b>Частичный возврат</b></div></div><div class="pay"><input type="radio" name="d"><div><b>Полный возврат</b></div></div><div class="pay"><input type="radio" name="d"><div><b>Отклонить претензию</b></div></div>
      <h4 style="margin:12px 0 6px">Распределение эскроу</h4><dl class="kv" style="grid-template-columns:1fr auto"><dt>Заказчику</dt><dd class="num">0 ₽</dd><dt>Фабрике после допечатки</dt><dd class="num">168 728 ₽</dd><dt>Комиссия</dt><dd class="num">14 672 ₽</dd></dl>
      ${fld('Обоснование (увидят обе стороны)','Несоответствие спецификации подтверждено замерами и признано фабрикой. Допечатка 120 шт размера L до 14.10.',{area:3,wide:true})}<button class="btn cta wide" style="margin-top:8px">Вынести решение</button><p class="muted small" style="margin:8px 0 0">Решение записывается в журнал заказа и влияет на рейтинг фабрики.</p></aside>
  </div>`);
}
screen('admin-disputes','admin','Спор: решение оператора','admin.partiya.ru/disputes/4812',adminDisputes,{bodyClass:'adm-body'});

function adminFinance(){
  return admin('admin-finance',`
  ${pageH('Финансы и сверка','Ledger ↔ выписка банка-партнёра · последняя сверка сегодня 06:00','<button class="btn">Запустить сверку</button>')}
  <div class="kpis">${kpi('Эскроу по ledger','48 214 300 ₽')}${kpi('Остаток номинального счёта','48 277 300 ₽')}${kpi('Расхождение','63 000 ₽','1 несопоставленный платёж','warn')}${kpi('К выплате сегодня','1 284 600 ₽','9 заводам')}</div>
  <div class="cols2">
    <div class="box"><h3>Несопоставленные поступления</h3><table class="tb" style="margin-top:6px"><thead><tr><th>Дата</th><th>Плательщик</th><th>Назначение</th><th class="r">Сумма</th><th></th></tr></thead><tbody><tr class="hot"><td class="s">19.09</td><td>ООО «Кора»</td><td class="s">«Оплата по счёту за футболки»</td><td class="r num">63 000 ₽</td><td><button class="btn cta sm">Привязать к № 4744</button></td></tr></tbody></table><p class="muted small" style="margin:8px 0 0">Подсказка: у ООО «Кора» один неоплаченный счёт на ту же сумму — № 4744-СЧ.</p></div>
    <div class="box"><h3>Очередь выплат</h3><table class="tb" style="margin-top:6px"><tbody>${[['Кама, Казань','3 заказа','412 300 ₽','ok'],['Волна, Иваново','№ 4771','132 480 ₽','ok'],['Пошив37, Иваново','№ 4790','—','УПД не подписан заказчиком']].map(r=>`<tr><td class="t">${r[0]}</td><td class="s">${r[1]}</td><td class="r num">${r[2]}</td><td>${r[3]==='ok'?tag('готово','ok'):tag(r[3],'work')}</td></tr>`).join('')}</tbody></table><button class="btn cta" style="margin-top:10px">Отправить в банк · 8 выплат</button></div>
  </div>
  <div class="box" style="margin-top:12px"><h3>Ручные операции</h3><p class="muted small" style="margin:4px 0 0">Любая ручная проводка требует комментария и второго оператора. Все действия — в аудит-логе.</p></div>`);
}
screen('admin-finance','admin','Финансы и сверка','admin.partiya.ru/finance',adminFinance,{bodyClass:'adm-body'});

function adminTaxonomy(){
  const a=[['Материал','список','фасет · форма SKU · характеристики','да'],['Плотность, г/м²','число','фасет-диапазон · характеристики','да'],['Крой','мультивыбор','форма SKU · конструктор заказа','да'],['Размеры','мультивыбор','конструктор заказа (сетка)','да'],['Нанесение','мультивыбор','фасет · конструктор заказа · влияет на цену','нет'],['Цвета ткани','мультивыбор + свой Pantone','конструктор заказа','да']];
  return admin('admin-taxonomy',`
  ${pageH('Категории и атрибуты','Схема атрибутов определяет форму SKU у завода, фильтры каталога и конструктор заказа.')}
  <div class="cols-side rev">
    <aside class="box"><h3>Дерево</h3><ul class="tree"><li class="open"><b>Текстиль</b> <span class="muted small">214</span><ul><li class="on">Футболки <span class="muted small">98</span></li><li>Худи и свитшоты <span class="muted small">61</span></li><li>Поло <span class="muted small">22</span></li><li>Сумки и шоперы <span class="muted small">33</span></li></ul></li><li><b>Упаковка</b> <span class="muted small">167</span></li></ul><button class="btn wide sm" style="margin-top:8px">+ Категория</button></aside>
    <div class="box"><div class="row between"><h2>Текстиль › Футболки</h2><button class="btn sm">+ Атрибут</button></div><div class="fgrid" style="margin:10px 0">${fld('Коэффициент мощности по умолчанию','1,0')}${fld('Единица','шт')}</div>
      <table class="tb"><thead><tr><th>Атрибут</th><th>Тип</th><th>Где используется</th><th>Обязателен</th><th></th></tr></thead><tbody>${a.map(r=>`<tr><td class="t">${r[0]}</td><td class="s">${r[1]}</td><td class="s">${r[2]}</td><td>${r[3]}</td><td><button class="btn sm">Изменить</button></td></tr>`).join('')}</tbody></table>
      ${alertBox('info','Изменение схемы не трогает опубликованные версии','Заводы увидят новое поле при следующей правке предложения.')}</div>
  </div>`);
}
screen('admin-taxonomy','admin','Категории и атрибуты','admin.partiya.ru/taxonomy',adminTaxonomy,{bodyClass:'adm-body'});

function adminRanking(){
  const w=[['Заказы за 90 дней',30],['Конверсия просмотр → заказ',20],['Рейтинг (байесовский)',20],['Свободная мощность',15],['Аудит платформы',10],['Скорость ответа',5]];
  return admin('admin-ranking',`
  ${pageH('Ранжирование и промо','Формула сортировки «Популярные». Должна быть объяснима заводу.')}
  <div class="cols2">
    <div class="box"><h3>Веса · сумма 100</h3><div class="funnel" style="margin-top:8px">${w.map(r=>`<div><span>${r[0]}</span><div class="bar"><i style="width:${r[1]*3}%"></i></div><input class="inp sm num" value="${r[1]}" style="width:54px"></div>`).join('')}</div><h4 style="margin:14px 0 6px">Штрафы</h4><dl class="kv" style="grid-template-columns:1fr auto"><dt>Отклонённый / неподтверждённый заказ</dt><dd>−8 на 30 дней</dd><dt>Просрочка отгрузки</dt><dd>−5 на 30 дней</dd><dt>Проигранный спор</dt><dd>−12 на 90 дней</dd><dt>План мощности не обновлён</dt><dd>скрыть из выдачи</dd></dl><div class="row" style="margin-top:12px"><button class="btn cta">Применить</button><button class="btn">Предпросмотр выдачи</button></div></div>
    <div><div class="box"><h3>Бейджи</h3><table class="tb" style="margin-top:6px"><tbody><tr><td>${tag('Хит','hot')}</td><td class="s">верхние 10 % по скору в категории · пересчёт раз в сутки</td></tr><tr><td>${tag('−15 % мощность','disc')}</td><td class="s">завод включил скидку на недозагруз, неделя &lt; 30 %</td></tr><tr><td>${tag('аудит','ok')}</td><td class="s">действующий аудит платформы</td></tr></tbody></table></div>
      <div class="box" style="margin-top:12px"><div class="row between"><h3>Промокоды</h3><button class="btn sm">+ Промокод</button></div><table class="tb" style="margin-top:6px"><thead><tr><th>Код</th><th>Скидка</th><th>Условие</th><th class="r">Использован</th></tr></thead><tbody><tr><td class="t num">FIRST5</td><td>5 %</td><td class="s">первый заказ, до 15 000 ₽, за счёт платформы</td><td class="r num">214</td></tr><tr><td class="t num">IVANOVO</td><td>3 %</td><td class="s">фабрики Иваново, до 31.10</td><td class="r num">37</td></tr></tbody></table></div></div>
  </div>`);
}
screen('admin-ranking','admin','Ранжирование и промо','admin.partiya.ru/ranking',adminRanking,{bodyClass:'adm-body'});
