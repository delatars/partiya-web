/* Макет «Лента» · сделка. Экраны регистрируются через screen(id, группа, название, url, render). */

function checkout(){
  const c=D.checkout;
  return header()+`<main class="wrap">
  <div class="crumbs"><a href="#offer">‹ Вернуться к предложению</a></div>
  <h1 style="margin-bottom:12px">Оформление партии</h1>
  <div class="co-layout">
    <div>
      <div class="acc done"><div class="h"><i>✓</i><h3>Параметры партии</h3><span class="sum">1 000 шт · белый 600 / чёрный 400 · S–XL · шелкография 2 цв.</span><a class="edit" href="#checkout">Изменить</a></div></div>
      <div class="acc done"><div class="h"><i>✓</i><h3>Макет печати</h3><span class="sum">${c.artwork.file} · на проверке у технолога</span><a class="edit" href="#checkout">Заменить</a></div></div>
      <div class="acc on"><div class="h"><i>3</i><h3>Доставка</h3></div><div class="c">
        <div class="pay on"><input type="radio" name="d" checked><div><b>До склада WB, Коледино · 9 400 ₽</b><div class="muted small">Фабрика маркирует «Честный знак» и оформляет поставку. Приёмка на складе 2–3 октября.</div></div></div>
        <div class="pay"><input type="radio" name="d"><div><b>До склада Ozon, Хоругвино · 9 900 ₽</b></div></div>
        <div class="pay"><input type="radio" name="d"><div><b>Самовывоз из Иваново · 0 ₽</b><div class="muted small">после приёмки на фабрике</div></div></div>
      </div></div>
      <div class="acc"><div class="h"><i>4</i><h3>Оплата</h3></div><div class="c">
        <div class="pay on"><input type="radio" name="p" checked><div><b>Эскроу 100 %</b><div class="muted small">Сумма резервируется платформой, фабрика получает после вашей приёмки.</div></div></div>
        <div class="pay"><input type="radio" name="p"><div><b>Эскроу 50 / 50</b><div class="muted small">Половина при запуске, половина после приёмки. Для фабрик с рейтингом 4,7+.</div></div></div>
        <div class="prm"><span class="k">Плательщик</span><select id="pay"><option>ООО «Кора» · ИНН 7701234567</option><option>Добавить юрлицо</option></select></div>
        <div class="muted small">${c.legal} — подписание по ЭДО.</div>
      </div></div>
    </div>
    <aside class="box total-box">
      <div class="row" style="gap:10px;margin-bottom:12px">${ph('A','',' ').replace('class="ph A"','class="ph A" style="width:56px;height:56px;border-radius:6px;flex:none"')}<div><b>${c.offerTitle}</b><div class="muted small">«${c.factory}» · 1 000 шт</div></div></div>
      ${c.lines.map(l=>`<div class="l"><span>${l[0]}</span><span class="num">${rub(l[1])}</span></div>`).join('')}
      <div class="l" style="color:var(--violet)"><span>Скидка за повтор</span><span>—</span></div>
      <div class="t"><span>Итого</span><span class="price num">${rub(c.total)}</span></div>
      <div class="muted small">Срок ${c.leadDays} раб. дней · отгрузка ~2 октября</div>
      <div class="promo"><input id="promo" placeholder="Промокод"><button class="btn">OK</button></div>
      <a class="btn cta lg wide" style="margin-top:12px" href="#checkout-pay">Оплатить в эскроу</a>
      <div class="escrow"><i></i>${c.escrowNote}. Спор решает платформа по спецификации и фотоотчётам.</div>
    </aside>
  </div></main>`;
}
screen('checkout','deal','Оформление партии','/order/new?offer=2231',checkout);

function tracking(){
  const o=D.order;
  return header()+`<main class="wrap">
  <div class="crumbs"><a href="#customer">Мои заказы</a> › Заказ № ${o.id}</div>
  <div class="tr-top"><div><div class="row" style="gap:8px"><h1>Заказ № ${o.id}</h1>${tag('В производстве')}</div><div class="muted" style="margin-top:4px">${o.title} · «${o.factory}» · отгрузка <b style="color:var(--ink)">${o.shipDate}</b> (через ${o.daysLeft} раб. дней) · эскроу ${rub(o.escrow.amount)}</div>
    <div class="pipe">${o.steps.map(s=>`<div class="${s.state}"><i></i>${s.name}${s.pct?' '+s.pct+' %':''}<div class="muted small">${s.date}</div></div>`).join('')}</div></div>
    <div class="row" style="flex-direction:column;align-items:stretch"><a class="btn cta" href="#checkout">Повторить партию −9 %</a><a class="btn ghost" href="#acceptance">Приёмка</a><a class="btn ghost" href="#dispute">Открыть спор</a></div></div>
  <div class="tr-layout">
    <div class="box feed">
      <div class="row between"><h2>Ход производства · ${o.steps[2].pct} %</h2><span class="muted small">обновлено сегодня 16:10</span></div>
      <div style="margin:10px 0 6px">${o.progress.map(p=>`<div class="prog"><span>${p.name}</span><div class="bar"><i style="width:${p.done/p.total*100}%"></i></div><span class="num muted small" style="text-align:right">${p.note?p.note:num(p.done)+' / '+num(p.total)}</span></div>`).join('')}</div>
      <div class="day">Сегодня, 21 сентября</div>
      <div class="ev"><span class="t">16:10</span><div><b>Фотоотчёт: готовые изделия, чёрные</b><div class="s">4 фото · технолог «Волна»</div><div class="strip">${ph('C')}${ph('C')}${ph('A')}${ph('B')}</div></div></div>
      <div class="ev"><span class="t">09:15</span><div><b>Отшито 650 / 1 000</b><div class="s">1-я линия, план на неделю выполняется</div></div></div>
      <div class="day">19 сентября</div>
      <div class="ev"><span class="t">13:15</span><div><b>Цветопроба согласована</b><div class="s">печать стартует 26.09 · сообщение в чате</div></div></div>
      <div class="ev"><span class="t">12:30</span><div><b>Контроль плотности: 182 г/м²</b><div class="s">в допуске ±5 %</div><div class="strip">${ph('A')}</div></div></div>
      <div class="day">15 сентября</div>
      <div class="ev"><span class="t">09:40</span><div><b>Старт производства</b><div class="s">раскроено 1 000 / 1 000, партия белая</div><div class="strip">${ph('A')}${ph('A')}</div></div></div>
      <div class="day">10–12 сентября</div>
      <div class="ev"><span class="t">12.09</span><div><b>Сырьё закуплено</b><div class="s">кулирка 180 г/м², 420 кг</div></div></div>
      <div class="ev"><span class="t">10.09</span><div><b>Оплата зарезервирована в эскроу · 183 400 ₽</b><div class="s">оферта и спецификация подписаны по ЭДО</div></div></div>
    </div>
    <aside>
      <div class="box" style="margin-bottom:12px"><h3>Чат с технологом</h3><div style="margin-top:10px">${o.chat.map(m=>`<div class="msg ${m.who==='Вы'?'me':''}"><div class="m">${m.who} · ${m.when}</div>${m.text}</div>`).join('')}</div><div class="row" style="margin-top:8px"><input id="cm" placeholder="Сообщение…" style="flex:1;border:1px solid var(--line-2);border-radius:6px;padding:8px;font:inherit"><button class="btn cta">→</button></div></div>
      <div class="box" style="margin-bottom:12px"><h3>Документы</h3><div class="docs" style="margin-top:6px">${o.docs.map(d=>`<a href="#tracking"><span>${d}</span><span>Скачать</span></a>`).join('')}</div></div>
      <div class="box"><h3>Эскроу · ${rub(o.escrow.amount)}</h3><p class="muted small" style="margin:6px 0 0">${o.escrow.state}. Выплата фабрике после приёмки или автоматически через 5 раб. дней после отгрузки.</p></div>
    </aside>
  </div></main>`;
}
screen('tracking','deal','Трекинг заказа','/account/orders/4812',tracking);

/* ---------------- Счёт выставлен, ждём оплату ---------------- */
function checkoutPay(){
  const c=D.checkout;
  return headerSlim('<a class="link-w" href="#customer">Мои заказы</a>')+`<main class="wrap narrow">
  <div class="done-h"><i class="ok-ic"></i><h1>Заказ № 4812 оформлен. Оплатите счёт до 12 сентября</h1><p class="muted">Мощность фабрики зарезервирована за вами на 48 часов. После поступления денег в эскроу заказ уйдёт фабрике на подтверждение.</p></div>
  <div class="pipe" style="margin:18px 0">${['Оформлен|сегодня 14:20','Оплата в эскроу|ждём поступления','Подтверждение фабрики|до 18:00 след. раб. дня','Производство|18 раб. дней'].map((s,i)=>`<div class="${i===0?'done':i===1?'active':''}"><i></i>${s.split('|')[0]}<div class="muted small">${s.split('|')[1]}</div></div>`).join('')}</div>
  <div class="cols2">
    <div class="box"><div class="row between"><h2>Счёт № 4812-СЧ</h2><span class="tag work">ожидает оплаты</span></div>
      <dl class="kv" style="margin-top:12px"><dt>Получатель</dt><dd>ООО «Партия» · номинальный счёт</dd><dt>ИНН / КПП</dt><dd class="num">7700000000 / 770001001</dd><dt>Банк</dt><dd>банк-партнёр платформы</dd><dt>Расчётный счёт</dt><dd class="num">40702 810 0 0000 0004812</dd><dt>Назначение</dt><dd>Оплата по заказу № 4812, спецификация 4812-С. Без НДС</dd><dt>Сумма</dt><dd><b class="price num" style="font-size:20px">${rub(c.total)}</b></dd></dl>
      <div class="row" style="margin-top:14px"><button class="btn cta">Скачать счёт PDF</button><button class="btn">Отправить бухгалтеру</button><button class="btn ghost">Скопировать реквизиты</button></div>
      ${alertBox('info','Платёжка идёт от нескольких часов до 1 рабочего дня','Мы сопоставим поступление по номеру заказа в назначении платежа и сразу уведомим вас и фабрику.')}
    </div>
    <div>
      <div class="box"><h3>Документы к подписанию</h3><div class="docs" style="margin-top:6px"><a href="#documents"><span>Договор-оферта № 4812</span><span>Подписать по ЭДО</span></a><a href="#documents"><span>Спецификация 4812-С</span><span>Подписать по ЭДО</span></a><a href="#documents"><span>Счёт 4812-СЧ</span><span>Скачать</span></a></div></div>
      <div class="box" style="margin-top:12px"><h3>Что дальше</h3><ol class="todo"><li class="done">Параметры и макет переданы фабрике</li><li class="now">Оплата счёта → деньги в эскроу</li><li>Фабрика подтверждает заказ (или отклоняет — деньги вернутся)</li><li>Технолог согласует макет и цветопробу</li></ol></div>
      <div class="escrow" style="margin-top:12px"><i></i>Если фабрика не подтвердит заказ до дедлайна, резерв снимется и деньги вернутся на ваш счёт автоматически.</div>
    </div>
  </div>
  <div style="text-align:center;margin-top:18px"><a class="btn lg" href="#tracking">Перейти к заказу</a></div>
  </main>`;
}
screen('checkout-pay','deal','Счёт и ожидание оплаты','/order/4812/payment',checkoutPay);

/* ---------------- Заказ образца ---------------- */
function sample(){
  return header({noCat:true})+`<main class="wrap">
  ${crumbs(['Каталог','catalog'],['Футболки 180 г/м² под СТМ','offer'],'Заказ образца')}
  <h1 style="margin-bottom:12px">Заказ образца</h1>
  <div class="co-layout">
    <div>
      <div class="box"><h2>Что пришлёт фабрика</h2><p class="muted" style="margin:4px 0 12px">Образец шьётся из той же ткани и на той же линии, что и партия. Печать — по вашему макету или тестовая.</p>
        <div class="fgrid">${fld('Количество','2 шт',{select:['1 шт','2 шт','3 шт']})}${fld('Размеры','M, L')}${fld('Цвет ткани','белый',{select:['белый','чёрный','графит','14 базовых…']})}${fld('Печать','Шелкография 2 цв.',{select:['Шелкография 2 цв.','DTF','Без печати']})}</div>
        <div class="upload" style="margin-top:10px"><div class="fic">PDF</div><div style="flex:1"><b>logo_front.pdf</b> <span class="muted small">· 1,2 МБ</span><div class="muted small">Необязательно. Без макета фабрика нанесёт тестовый принт.</div></div><button class="btn sm">Заменить</button></div></div>
      <div class="box" style="margin-top:10px"><h2>Куда доставить</h2><div class="pay on" style="margin-top:10px"><input type="radio" name="sd" checked><div><b>СДЭК до пункта выдачи · 420 ₽</b><div class="muted small">Москва, ул. Лесная, 9 · 2–3 дня после отгрузки</div></div></div><div class="pay"><input type="radio" name="sd"><div><b>Курьером до двери · 780 ₽</b></div></div>
        <div class="fgrid" style="margin-top:4px">${fld('Получатель','Анна Кораблёва')}${fld('Телефон','+7 916 000-12-34')}</div></div>
      <div class="box" style="margin-top:10px"><h2>Комментарий технологу</h2>${fld('','Важна посадка оверсайз и плотность — сравниваем с текущим поставщиком.',{area:3,wide:true})}</div>
    </div>
    <aside class="box total-box">
      <div class="row" style="gap:10px;margin-bottom:12px"><div class="ph A" style="width:56px;height:56px;border-radius:6px;flex:none"></div><div><b>Образец · Футболка 180 г/м²</b><div class="muted small">«Волна», Иваново</div></div></div>
      <div class="l"><span>Образец × 2</span><span class="num">1 500 ₽</span></div><div class="l"><span>Тестовая печать</span><span class="num">0 ₽</span></div><div class="l"><span>Доставка СДЭК</span><span class="num">420 ₽</span></div>
      <div class="t"><span>Итого</span><span class="price num">1 920 ₽</span></div>
      <div class="muted small">Изготовление 5 раб. дней + доставка 2–3 дня</div>
      <a class="btn cta lg wide" style="margin-top:12px" href="#samples">Оплатить картой</a><button class="btn wide" style="margin-top:6px">Выставить счёт на юрлицо</button>
      <div class="escrow"><i></i><span><b>1 500 ₽ зачтутся</b> в первую партию у этой фабрики в течение 60 дней.</span></div>
    </aside>
  </div></main>`;
}
screen('sample','deal','Заказ образца','/sample/new?offer=2231',sample);

/* ---------------- Приёмка ---------------- */
function acceptance(){
  const o=D.order;
  return header({noCat:true})+`<main class="wrap">
  ${crumbs(['Мои заказы','customer'],['Заказ № 4812','tracking'],'Приёмка')}
  <div class="tr-top"><div><div class="row" style="gap:8px"><h1>Приёмка партии · № ${o.id}</h1>${tag('Ожидает приёмки','qc')}</div><div class="muted" style="margin-top:4px">${o.title} · доставлено на склад WB 2 октября · <b style="color:var(--hot)">осталось 3 рабочих дня</b> — затем партия будет принята автоматически</div>
    <div class="pipe">${['Оплачен','Сырьё закуплено','Производство','Контроль качества','Отгрузка','Приёмка'].map((s,i)=>`<div class="${i<5?'done':'active'}"><i></i>${s}</div>`).join('')}</div></div>
    <div class="row" style="flex-direction:column;align-items:stretch"><button class="btn cta lg">Принять партию</button><a class="btn ghost" href="#dispute">Есть претензия</a></div></div>
  <div class="tr-layout">
    <div>
      <div class="box"><h2>Проверьте по спецификации</h2><p class="muted small" style="margin:4px 0 10px">Отметки необязательны, но сохранятся в журнале заказа.</p>
        <table class="tb chk"><thead><tr><th>Параметр</th><th>По спецификации</th><th>Отчёт КК фабрики</th><th>У вас</th></tr></thead><tbody>
        ${[['Количество','1 000 шт','1 000 шт · акт склада WB 998 принято, 2 брак упаковки'],['Цвета','белый 600 · чёрный 400','600 / 400'],['Размерная сетка','S 200 · M 300 · L 300 · XL 200','соответствует'],['Плотность ткани','180 г/м² ±5 %','182 г/м²'],['Печать','шелкография 2 цв., грудь 25×30','цветопроба согласована 19.09'],['Маркировка','«Честный знак», вшивная бирка','нанесена, коды переданы']].map((r,i)=>`<tr><td class="t">${r[0]}</td><td>${r[1]}</td><td class="s">${r[2]}</td><td><span class="seg"><a class="${i!==0?'on':''}">ок</a><a class="${i===0?'warn':''}">замечание</a></span></td></tr>`).join('')}
        </tbody></table></div>
      <div class="box" style="margin-top:12px"><h2>Отчёт контроля качества</h2><div class="strip" style="display:flex;gap:6px;margin-top:10px">${['C','A','A','B','D'].map(t=>`<div class="ph ${t}" style="width:120px;height:90px;border-radius:6px"></div>`).join('')}</div><p class="muted small" style="margin:8px 0 0">Выборка 5 % (50 шт): брак 0, замечаний 1 — нитки на 2 изделиях, устранено. Технолог «Волна», 29.09.</p></div>
    </div>
    <aside>
      <div class="box"><h3>Эскроу · ${rub(o.escrow.amount)}</h3><p class="muted small" style="margin:6px 0 0">После приёмки фабрика получит 168 728 ₽, комиссия платформы 14 672 ₽.</p></div>
      <div class="box" id="review" style="margin-top:12px"><h3>Отзыв о фабрике</h3><div class="stars">★★★★★</div>${fld('','Вторая партия — плотность держат, отгрузили на 2 дня раньше.',{area:3,wide:true})}<div class="chips" style="margin:8px 0 0"><span class="chip on">В срок</span><span class="chip on">Качество печати</span><span class="chip">Связь с технологом</span><span class="chip">Упаковка</span></div><a class="btn cta wide" style="margin-top:10px" href="#customer">Принять и опубликовать отзыв</a></div>
      <div class="box" style="margin-top:12px"><h3>Повторить партию −9 %</h3><p class="muted small" style="margin:6px 0 10px">Та же спецификация, 152 ₽/шт вместо 168 ₽.</p><a class="btn wide" href="#checkout">Повторить 1 000 шт</a></div>
    </aside>
  </div></main>`;
}
screen('acceptance','deal','Приёмка и отзыв','/account/orders/4812/acceptance',acceptance);

/* ---------------- Спор ---------------- */
function dispute(){
  const o=D.order;
  return header({noCat:true})+`<main class="wrap">
  ${crumbs(['Мои заказы','customer'],['Заказ № 4812','tracking'],'Спор')}
  <div class="tr-top"><div><div class="row" style="gap:8px"><h1>Спор по заказу № ${o.id}</h1>${tag('На рассмотрении','work')}</div><div class="muted" style="margin-top:4px">Открыт 3 октября · выплата фабрике заблокирована · решение оператора — до 8 октября</div>
    <div class="pipe">${['Претензия|03.10','Ответ фабрики|до 05.10','Решение платформы|до 08.10','Исполнение|возврат / выплата'].map((s,i)=>`<div class="${i===0?'done':i===1?'active':''}"><i></i>${s.split('|')[0]}<div class="muted small">${s.split('|')[1]}</div></div>`).join('')}</div></div>
    <div class="row" style="flex-direction:column;align-items:stretch"><button class="btn ghost">Отозвать претензию</button></div></div>
  <div class="tr-layout">
    <div>
      <div class="box"><h2>Ваша претензия</h2>
        <div class="fgrid" style="margin-top:10px">${fld('Причина','Несоответствие размерной сетки',{select:['Несоответствие размерной сетки','Брак изделий','Брак печати','Недовложение','Срыв срока']})}${fld('Затронуто изделий','120 из 1 000')}</div>
        ${fld('Описание','Размер L фактически соответствует M по ширине (52 см вместо 56 см по спецификации). Замеры 10 изделий приложены.',{area:3,wide:true})}
        <div class="strip" style="display:flex;gap:6px;margin:10px 0">${['A','A','B'].map(t=>`<div class="ph ${t}" style="width:110px;height:84px;border-radius:6px">замер</div>`).join('')}<div class="dropzone sm">+ фото</div></div>
        <h3 style="margin-top:14px">Чего вы хотите</h3>
        <div class="pay on" style="margin-top:8px"><input type="radio" name="dr" checked><div><b>Допечатка 120 шт за счёт фабрики</b><div class="muted small">Эскроу остаётся заблокированным до приёмки допечатки.</div></div></div>
        <div class="pay"><input type="radio" name="dr"><div><b>Частичный возврат · 20 160 ₽</b><div class="muted small">120 шт × 168 ₽. Остальное выплачивается фабрике.</div></div></div>
        <div class="pay"><input type="radio" name="dr"><div><b>Полный возврат и возврат партии</b></div></div></div>
      <div class="box" style="margin-top:12px"><h2>Переписка по спору</h2><div style="margin-top:10px"><div class="msg me"><div class="m">Вы · 03.10 11:20</div>Открыта претензия: несоответствие размерной сетки, 120 шт.</div><div class="msg"><div class="m">Технолог «Волна» · 03.10 15:42</div>Проверили лекала — при раскрое чёрной партии L взяли лекало предыдущего заказа. Признаём, готовы допечатать 120 шт за 6 рабочих дней.</div><div class="msg sys"><div class="m">Оператор платформы · 03.10 16:05</div>Фабрика признала претензию. Ждём вашего подтверждения варианта «допечатка».</div></div><div class="row" style="margin-top:8px"><input id="dm" placeholder="Сообщение…" class="inp" style="flex:1"><button class="btn cta">→</button></div></div>
    </div>
    <aside>
      <div class="box"><h3>Что видит оператор</h3><p class="muted small" style="margin:6px 0 8px">Решение принимается по документам, а не по словам.</p><div class="docs"><a href="#documents"><span>Спецификация 4812-С</span><span>PDF</span></a><a href="#tracking"><span>Журнал заказа · 23 события</span><span>Открыть</span></a><a href="#tracking"><span>Фотоотчёты · 11 фото</span><span>Открыть</span></a><a href="#tracking"><span>Чат с технологом</span><span>Открыть</span></a><a href="#acceptance"><span>Отчёт КК фабрики</span><span>Открыть</span></a></div></div>
      <div class="box" style="margin-top:12px"><h3>Эскроу · ${rub(o.escrow.amount)}</h3><p class="small" style="margin:6px 0 0;color:var(--hot)">Заблокировано до решения спора</p></div>
      ${alertBox('info','Арбитраж платформы','Если вы не договоритесь с фабрикой до 5 октября, решение примет оператор. Оно обязательно для обеих сторон по оферте.')}
    </aside>
  </div></main>`;
}
screen('dispute','deal','Спор по заказу','/account/orders/4812/dispute',dispute);
