/* Макет «Лента» · кабинет заказчика. Экраны регистрируются через screen(id, группа, название, url, render). */

function customer(){
  const c=D.customer;
  return header({noCat:true})+`<main class="wrap" style="padding-top:12px"><div class="cab-layout">
    ${custNav('customer')}
    <section>
      <div class="kpis"><div class="kpi"><span>Активных заказов</span><b>${c.stats.active}</b></div><div class="kpi"><span>В эскроу</span><b class="num">${rub(c.stats.escrow)}</b></div><div class="kpi"><span>Ближайшая отгрузка</span><b>25 сен</b></div><div class="kpi"><span>Экономия за повторы</span><b class="num">27 300 ₽</b><span class="d">−9 % на 2 партиях</span></div></div>
      <div class="box">
        <div class="row between"><h2>Заказы</h2><a class="btn cta sm" href="#catalog">+ Новая партия</a></div>
        <div class="tabbar"><a class="on" href="#customer">Все · 14</a><a href="#customer">В работе · 3</a><a href="#customer">Ждут действия · 1</a><a href="#customer">Получены · 11</a><a href="#customer">Отменённые</a></div>
        <div class="tblw"><table class="tb"><thead><tr><th>Заказ</th><th>Фабрика</th><th>Статус</th><th>Готовность</th><th>Отгрузка</th><th class="r">Сумма</th><th></th></tr></thead><tbody>
        ${c.orders.map(o=>`<tr><td><a href="#tracking"><div class="t">№ ${o.id}</div><div class="s">${o.title}</div></a></td><td>${o.factory}</td><td>${tag(o.status)}</td><td><span class="mini"><i style="width:${o.pct}%"></i></span><span class="num small">${o.pct} %</span></td><td>${o.ship}</td><td class="r num">${rub(o.sum)}</td><td><a class="btn sm" href="#checkout">Повторить</a></td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <h2 style="margin:16px 0 10px">Повторные партии <span class="tag disc">−9 %</span></h2>
      <div class="rep">${c.repeat.map(r=>`<div class="box"><div><b>${r.title}</b><div class="muted small">${r.spec}</div><div class="small" style="margin-top:4px">было <span class="num">${r.lastPrice} ₽</span> → <b class="num" style="color:var(--violet)">${Math.round(r.lastPrice*.91)} ₽/шт</b></div></div><a class="btn cta" href="#checkout">Повторить</a></div>`).join('')}</div>
    </section>
  </div></main>`;
}
screen('customer','account','Заказы','/account/orders',customer);

/* ---------------- Повторные партии ---------------- */
function repeat(){
  const c=D.customer;
  const more=[{id:4401,title:'Шоперы с шелкографией',spec:'натуральный 2 000, 38×42, шелкография 1 цв.',lastPrice:96,f:'Пошив37, Иваново',n:3,last:'25 сен'},{id:4188,title:'Футболки оверсайз 240 г/м²',spec:'чёрный 300, S–XL, DTF-печать',lastPrice:210,f:'Кама, Казань',n:1,last:'12 июн'}];
  const all=[...c.repeat.map((r,i)=>({...r,f:['Волна, Иваново','Ткань+, Кострома'][i],n:[2,1][i],last:['14 авг','30 июл'][i]})),...more];
  return cabinet(custNav('repeat'),`
  ${pageH('Повторные партии','Сохранённые спецификации. Повтор у той же фабрики — со скидкой 9 %, цена фиксируется на 14 дней.')}
  <div class="kpis">${kpi('Сохранено спецификаций','4')}${kpi('Экономия за повторы','27 300 ₽','−9 % на 2 партиях','')}${kpi('Средний цикл повтора','41 день')}${kpi('Пора повторить','1','футболки: остаток на WB ≈ 12 дней')}</div>
  <div class="rows">${all.map((r,i)=>`<div class="rowc rep4">${ph(['A','B','D','C'][i],'')}
    <div class="rc-main"><a class="rc-t" href="#tracking">${r.title}</a><div class="muted small">${r.spec}</div><div class="fac"><b>${r.f}</b> · заказано ${r.n} раз · последняя ${r.last}</div></div>
    <div class="rc-meta"><div>Было <b class="num">${r.lastPrice} ₽</b>/шт</div><div style="color:var(--violet)">Сейчас <b class="num">${Math.round(r.lastPrice*.91)} ₽</b>/шт</div><div class="muted">свободно в октябре ${[38,22,45,61][i]} %</div></div>
    <div class="rc-act"><div class="row" style="gap:6px"><input class="inp sm num" value="${['1 000','300','2 000','300'][i]}" aria-label="объём"><span class="muted small">шт</span></div><a class="btn cta" href="#checkout">Повторить</a></div></div>`).join('')}</div>`);
}
screen('repeat','account','Повторные партии','/account/repeat',repeat);

/* ---------------- Образцы ---------------- */
function samples(){
  const s=[['С-218','Футболка 180 г/м² × 2','Волна, Иваново','В пути','work','СДЭК 1428800412 · прибудет 24 сен','1 920 ₽'],['С-197','Худи оверсайз × 1','Ткань+, Кострома','Получен','done','зачтён в заказ № 4522','2 400 ₽'],['С-164','Футболка оверсайз × 3','Кама, Казань','Получен','done','зачёт до 12 ноя','1 850 ₽']];
  return cabinet(custNav('samples'),`
  ${pageH('Образцы','Стоимость образца зачитывается в первую партию у той же фабрики в течение 60 дней.','<a class="btn cta" href="#catalog">Найти с образцом</a>')}
  <div class="box"><div class="tblw"><table class="tb"><thead><tr><th>№</th><th>Образец</th><th>Фабрика</th><th>Статус</th><th>Примечание</th><th class="r">Сумма</th><th></th></tr></thead><tbody>
  ${s.map(r=>`<tr><td class="t num">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${tag(r[3],r[4])}</td><td class="s">${r[5]}</td><td class="r num">${r[6]}</td><td><a class="btn sm ${r[3]==='Получен'?'cta':''}" href="#${r[3]==='Получен'?'checkout':'samples'}">${r[3]==='Получен'?'Заказать партию':'Отследить'}</a></td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="box" style="margin-top:12px"><h3>Оцените образец С-164</h3><p class="muted small" style="margin:4px 0 10px">Оценка видна только фабрике и помогает технологу до запуска партии.</p><div class="chips"><span class="chip on">Качество ок</span><span class="chip">Цвет не тот</span><span class="chip">Посадка</span><span class="chip">Печать</span></div></div>`);
}
screen('samples','account','Образцы','/account/samples',samples);

/* ---------------- Избранное ---------------- */
function favorites(){
  return cabinet(custNav('favorites'),`
  ${pageH('Избранное','5 предложений · 2 фабрики')}
  ${tabbar(['Предложения · 5','Фабрики · 2','Сохранённые поиски · 1'])}
  <div class="grid g4">${D.offers.slice(0,5).map(card).join('')}</div>
  <h2 style="margin:18px 0 10px">Сохранённые поиски</h2>
  <div class="box row between"><div><b>Текстиль · MOQ до 1 000 · ЦФО · с аудитом</b><div class="muted small">214 предложений · +6 за неделю · уведомлять о новых: да</div></div><a class="btn" href="#catalog">Открыть</a></div>`);
}
screen('favorites','account','Избранное','/account/favorites',favorites);

/* ---------------- Документы ---------------- */
function documents(){
  const d=[['Договор-оферта № 4812','4812','Оферта','Подписан обеими сторонами','ok','10.09'],['Спецификация 4812-С','4812','Спецификация','Подписан обеими сторонами','ok','10.09'],['Счёт 4812-СЧ','4812','Счёт','Оплачен','ok','10.09'],['УПД № 4790-У','4790','УПД','Ждёт вашей подписи','work','20.09'],['Акт приёмки № 4601-А','4601','Акт','Подписан обеими сторонами','ok','16.08'],['Спецификация 4744-С','4744','Спецификация','Ждёт подписи фабрики','new','19.09']];
  return cabinet(custNav('documents'),`
  ${pageH('Документы и ЭДО','Все документы формируются автоматически из заказа. Подписание — через оператора ЭДО.','<button class="btn">Выгрузить за период</button>')}
  ${alertBox('warn','1 документ ждёт вашей подписи','УПД № 4790-У по заказу шоперов. Без подписи фабрика не получит выплату.','<a class="btn cta sm" href="#documents">Подписать</a>')}
  <div class="row" style="margin:12px 0"><span class="chip on">Все</span><span class="chip">Ждут подписи · 1</span><span class="chip">Оферты</span><span class="chip">Спецификации</span><span class="chip">Счета</span><span class="chip">УПД и акты</span><input class="inp" placeholder="Номер заказа или документа" style="margin-left:auto;width:240px"></div>
  <div class="box"><div class="tblw"><table class="tb"><thead><tr><th>Документ</th><th>Заказ</th><th>Тип</th><th>Статус</th><th>Дата</th><th></th></tr></thead><tbody>
  ${d.map(r=>`<tr><td class="t">${r[0]}</td><td><a class="lnk" href="#tracking">№ ${r[1]}</a></td><td class="s">${r[2]}</td><td>${tag(r[3],r[4])}</td><td class="s">${r[5]}</td><td><span class="row" style="gap:4px;justify-content:flex-end">${r[4]==='work'?'<button class="btn cta sm">Подписать</button>':''}<button class="btn sm">PDF</button></span></td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="box" style="margin-top:12px"><div class="row between"><div><h3>Подключение ЭДО</h3><div class="muted small">Оператор: подключён · идентификатор 2BM-7701234567-…</div></div>${tag('Активно','ok')}</div></div>`);
}
screen('documents','account','Документы и ЭДО','/account/documents',documents);

/* ---------------- Эскроу и счета ---------------- */
function escrow(){
  const ops=[['20.09','Резерв в эскроу','№ 4790 · шоперы','−192 000 ₽','hold'],['19.09','Счёт выставлен','№ 4744 · футболки оверсайз','63 000 ₽','wait'],['16.08','Выплата фабрике после приёмки','№ 4601 · футболки','84 000 ₽','out'],['10.09','Резерв в эскроу','№ 4812 · футболки','−183 400 ₽','hold'],['02.08','Возврат по спору (частичный)','№ 4522 · худи','+12 400 ₽','in']];
  return cabinet(custNav('escrow'),`
  ${pageH('Эскроу и счета','Деньги по активным заказам хранятся на номинальном счёте банка-партнёра, а не у платформы.')}
  <div class="kpis">${kpi('В эскроу сейчас','411 900 ₽','по 3 заказам')}${kpi('Ждут оплаты','63 000 ₽','1 счёт · до 21 сен','warn')}${kpi('Выплачено фабрикам · 2026','2 184 000 ₽')}${kpi('Возвращено по спорам','12 400 ₽')}</div>
  <div class="cols-side">
    <div class="box"><h2>Активные резервы</h2><div class="tblw"><table class="tb" style="margin-top:6px"><thead><tr><th>Заказ</th><th>Фабрика</th><th>Этап</th><th>Освобождение</th><th class="r">Сумма</th></tr></thead><tbody>
      ${D.customer.orders.filter(o=>o.pct<100).map(o=>`<tr><td><a class="lnk" href="#tracking">№ ${o.id}</a><div class="s">${o.title}</div></td><td>${o.factory}</td><td>${tag(o.status)}</td><td class="s">${o.pct===0?'после подтверждения фабрики':'после приёмки · ≈ '+o.ship}</td><td class="r num t">${rub(o.sum)}</td></tr>`).join('')}</tbody></table></div>
      <h2 style="margin:18px 0 6px">История операций</h2><div class="ledger">${ops.map(r=>`<div><span class="s">${r[0]}</span><div><b>${r[1]}</b><span class="s">${r[2]}</span></div><b class="num ${r[4]}">${r[3]}</b></div>`).join('')}</div></div>
    <aside><div class="box"><h3>Счета к оплате</h3><div class="inv"><div><b>№ 4744-СЧ · 63 000 ₽</b><span class="muted small">Футболки оверсайз, «Кама» · резерв мощности до 21 сен 18:00</span></div><a class="btn cta sm" href="#checkout-pay">Реквизиты</a></div></div>
      <div class="box" style="margin-top:12px"><h3>Плательщики</h3><div class="org on" style="margin-top:8px"><i>К</i><div><b>ООО «Кора»</b><span>р/с …4471 · основной</span></div></div><a class="btn wide" style="margin-top:8px" href="#company">+ Добавить юрлицо</a></div>
      <div class="escrow" style="margin-top:12px"><i></i>Платформа не может списать деньги из эскроу без вашей приёмки или решения по спору.</div></aside>
  </div>`);
}
screen('escrow','account','Эскроу и счета','/account/escrow',escrow);

/* ---------------- Компания ---------------- */
function company(){
  const team=[['Анна Кораблёва','a.korableva@kora.ru','Владелец','активен'],['Игорь Сафин','i.safin@kora.ru','Закупщик','активен'],['Мария Лунёва','buh@kora.ru','Бухгалтер','активен'],['—','d.orlov@kora.ru','Закупщик','приглашён']];
  return cabinet(custNav('company'),`
  ${pageH('Компания','ООО «Кора» · проверена по ЕГРЮЛ 02.03.2026')}
  ${tabbar(['Реквизиты','Сотрудники · 4','Адреса доставки · 2','Безопасность'])}
  <div class="cols2">
    <div class="box"><h2>Реквизиты</h2><div class="fgrid" style="margin-top:10px">${fld('Наименование','ООО «Кора»',{ro:true})}${fld('ИНН','7701234567',{ro:true})}${fld('КПП','770101001',{ro:true})}${fld('ОГРН','1157746000000',{ro:true})}${fld('Юридический адрес','Москва, ул. Лесная, 9',{wide:true})}${fld('Банк','АО «Банк»')}${fld('БИК','044525000')}${fld('Расчётный счёт','40702 810 0 0000 0004471',{wide:true,hint:'Смена счёта вступает в силу через 24 часа, владельцу придёт уведомление'})}</div><button class="btn cta" style="margin-top:12px">Сохранить</button></div>
    <div><div class="box"><div class="row between"><h2>Сотрудники</h2><button class="btn sm">+ Пригласить</button></div><div class="tblw"><table class="tb" style="margin-top:6px"><thead><tr><th>Сотрудник</th><th>Роль</th><th>Статус</th></tr></thead><tbody>${team.map(t=>`<tr><td><div class="t">${t[0]}</div><div class="s">${t[1]}</div></td><td><select class="inp sm"><option>${t[2]}</option></select></td><td>${tag(t[3],t[3]==='активен'?'ok':'new')}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="box" style="margin-top:12px"><h3>Что может каждая роль</h3><table class="tb roles"><thead><tr><th></th><th>Владелец</th><th>Закупщик</th><th>Бухгалтер</th></tr></thead><tbody>${[['Оформлять заказы','✓','✓','—'],['Принимать партии, открывать споры','✓','✓','—'],['Подписывать документы','✓','—','✓'],['Видеть эскроу и счета','✓','✓','✓'],['Менять реквизиты и роли','✓','—','—']].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div></div>
  </div>`);
}
screen('company','account','Компания и сотрудники','/account/company',company);

/* ---------------- Уведомления ---------------- */
function notifications(){
  const n=[['Сегодня',[['16:10','Фотоотчёт по заказу № 4812','Готовые изделия, чёрные · 4 фото','tracking',1],['11:02','УПД № 4790-У ждёт подписи','Без подписи фабрика не получит выплату','documents',1],['09:15','Отшито 650 / 1 000 · заказ № 4812','','tracking',1]]],['Вчера',[['18:40','Фабрика «Кама» не подтвердила заказ № 4744','Дедлайн продлён до 21 сен 18:00. Резерв мощности сохранён.','customer',1],['13:15','Цветопроба согласована · № 4812','Печать стартует 26.09','tracking',0]]],['17 сентября',[['10:00','Новые предложения по сохранённому поиску','+6 в «Текстиль · MOQ до 1 000 · ЦФО»','catalog',0]]]];
  return cabinet(custNav('notifications'),`
  ${pageH('Уведомления','4 непрочитанных','<button class="btn">Прочитать все</button>')}
  <div class="cols-side">
    <div class="box feed">${n.map(g=>`<div class="day">${g[0]}</div>${g[1].map(e=>`<a class="ev ${e[4]?'unread':''}" href="#${e[3]}"><span class="t">${e[0]}</span><div><b>${e[1]}</b>${e[2]?`<div class="s">${e[2]}</div>`:''}</div></a>`).join('')}`).join('')}</div>
    <aside class="box"><h3>Куда присылать</h3><table class="tb roles" style="margin-top:6px"><thead><tr><th></th><th>Почта</th><th>Telegram</th><th>SMS</th></tr></thead><tbody>${[['Статусы заказа',1,1,0],['Фотоотчёты',0,1,0],['Документы на подпись',1,1,1],['Сообщения технолога',1,1,0],['Споры и возвраты',1,1,1],['Новые предложения',1,0,0]].map(r=>`<tr><td>${r[0]}</td>${r.slice(1).map(v=>`<td><span class="toggle ${v?'on':''}"></span></td>`).join('')}</tr>`).join('')}</tbody></table><a class="btn wide" style="margin-top:10px">Подключить Telegram-бота</a></aside>
  </div>`);
}
screen('notifications','account','Уведомления','/account/notifications',notifications);
