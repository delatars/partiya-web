/* Макет «Лента» · states. Экраны регистрируются через screen(id, группа, название, url, render). */

/* ---------------- Ничего не найдено ---------------- */
function searchEmpty(){
  return header({q:'худи с капюшоном из кашемира 50 шт'})+`<main class="wrap">
  ${crumbs(['Главная','home'],['Каталог','catalog'],'Поиск')}
  <h1 style="margin-bottom:10px">По запросу «худи с капюшоном из кашемира 50 шт» ничего не найдено</h1>
  <div class="chips"><span class="chip on">MOQ до 50 ×</span><span class="chip on">кашемир ×</span><span class="chip on">ЦФО ×</span></div>
  <div class="cols-side">
    <div class="box">${empty('Под такие условия предложений нет','Чаще всего мешает минимальная партия: у 94 % фабрик MOQ на худи — от 200 штук.',`<div class="row" style="justify-content:center;flex-wrap:wrap"><a class="btn cta" href="#catalog">Убрать «MOQ до 50» · 38 предложений</a><a class="btn" href="#catalog">Убрать «кашемир» · 61</a><a class="btn ghost" href="#catalog">Сбросить все</a></div>`)}</div>
    <aside class="box"><h3>Оставить запрос</h3><p class="muted small" style="margin:4px 0 10px">Покажем его фабрикам категории. Если кто-то готов — добавит предложение, вы получите уведомление.</p>${fld('Что произвести','Худи с капюшоном, кашемир, 50 шт',{area:2,wide:true})}<button class="btn wide" style="margin-top:8px">Отправить фабрикам</button></aside>
  </div>
  <h2 style="margin:20px 0 10px">Похожее с меньшими ограничениями</h2><div class="grid g6">${D.offers.map(card).join('')}</div></main>`;
}
screen('search-empty','states','Поиск: ничего не найдено','/catalog?q=…',searchEmpty);

/* ---------------- Пустые состояния кабинетов ---------------- */
function stateEmpty(){
  return cabinet(custNav('customer'),`
  ${pageH('Пустые состояния','Каждое объясняет, что здесь появится, и ведёт к следующему действию.')}
  <div class="cols2">
    <div class="box"><div class="lbl">Заказы · новый заказчик</div>${empty('Заказов пока нет','Найдите предложение, соберите партию — и она появится здесь с трекингом производства.','<a class="btn cta" href="#catalog">Перейти в каталог</a>')}</div>
    <div class="box"><div class="lbl">Сравнение</div>${empty('Нечего сравнивать','Нажмите ⇄ на карточке предложения. Можно добавить до 4.','<a class="btn" href="#catalog">В каталог</a>')}</div>
    <div class="box"><div class="lbl">Завод · заказы</div>${empty('Заказов ещё не было','Предложения в выдаче 3 дня, 214 просмотров. Первый заказ обычно приходит на 2-й неделе.','<a class="btn" href="#seller-offers">Проверить цены</a>')}</div>
    <div class="box"><div class="lbl">Завод · нет предложений</div>${empty('Добавьте первое предложение','Без него заказчики не увидят ваш завод. Займёт около 10 минут.','<a class="btn cta" href="#seller-offer-edit">+ Новое предложение</a>')}</div>
    <div class="box"><div class="lbl">Лента трекинга до старта</div>${empty('Производство ещё не началось','Фабрика подтвердила заказ. Первое событие — согласование макета, обычно в течение 1 рабочего дня.')}</div>
    <div class="box"><div class="lbl">Фильтр без результатов в таблице</div>${empty('Нет заказов с таким статусом','','<a class="btn ghost" href="#customer">Сбросить фильтр</a>')}</div>
  </div>`);
}
screen('state-empty','states','Пустые состояния','/__states/empty',stateEmpty);

/* ---------------- Загрузка ---------------- */
function stateLoading(){
  const sk=(w,h=12)=>`<span class="skel" style="width:${w};height:${h}px"></span>`;
  return header()+`<main class="wrap">
  <div class="crumbs">${sk('260px')}</div>
  <div class="cat-layout">
    <aside class="filters">${[1,2,3].map(()=>`${sk('50%',14)}<div style="margin:10px 0 18px">${sk('100%')}${sk('80%')}${sk('90%')}</div>`).join('')}</aside>
    <section>${sk('340px',24)}<div style="margin:14px 0">${sk('420px',28)}</div>
      <div class="grid">${Array(8).fill(0).map(()=>`<div class="card"><div class="skel sq"></div><div class="b">${sk('50%',20)}${sk('90%')}${sk('70%')}${sk('60%')}<span class="skel" style="width:100%;height:34px;margin-top:8px"></span></div></div>`).join('')}</div></section>
  </div>
  <h2 style="margin:24px 0 10px">Частичная загрузка: калькулятор пересчитывает</h2>
  <div class="box" style="max-width:340px"><div class="row between"><b>Итого</b><span class="price num recalc" style="font-size:22px">183 400 ₽</span></div><div class="muted small">пересчёт…  предыдущее значение остаётся видимым</div></div>
  </main>`;
}
screen('state-loading','states','Загрузка: скелетоны','/__states/loading',stateLoading);

/* ---------------- Ошибки ---------------- */
function stateErrors(){
  return header({noCat:true})+`<main class="wrap">
  ${pageH('Ошибки','Говорим, что случилось и что делать. Без извинений и без кодов на первом плане.')}
  <div class="cols2">
    <div class="box err-page"><b class="code">404</b><h2>Такой страницы нет</h2><p class="muted">Возможно, фабрика сняла предложение или ссылка устарела.</p><div class="row" style="justify-content:center"><a class="btn cta" href="#catalog">В каталог</a><a class="btn" href="#home">На главную</a></div></div>
    <div class="box err-page"><b class="code">500</b><h2>Не получилось загрузить страницу</h2><p class="muted">Проблема на нашей стороне, мы уже знаем. Заказы и деньги в эскроу в безопасности.</p><div class="row" style="justify-content:center"><button class="btn cta">Обновить</button></div><p class="muted small">Код обращения: 7f3a-91c2</p></div>
  </div>
  <h2 style="margin:20px 0 10px">Ошибки внутри экранов</h2>
  <div class="cols2">
    <div>${alertBox('danger','Предложение изменилось, пока вы оформляли','Фабрика подняла цену ступени «от 1 000 шт»: 152 → 158 ₽. Ваша котировка действует до 10 октября — оформите по старой цене или пересчитайте.','<button class="btn sm">Оставить 152 ₽</button>')}
      ${alertBox('danger','На выбранные недели мощности уже нет','Пока вы оформляли, фабрика приняла другой заказ. Ближайшая отгрузка — 14 октября вместо 2 октября.','<button class="btn sm">Принять новый срок</button>')}
      ${alertBox('warn','Макет не прошёл проверку','Разрешение 150 dpi, нужно от 300. Загрузите другой файл или согласуйте с технологом в чате.','<button class="btn sm">Заменить файл</button>')}
      ${alertBox('warn','Нет соединения','Показываем сохранённые данные от 14:02. Прогресс обновится, когда связь вернётся.')}</div>
    <div class="box"><h3>Ошибки в форме</h3><div class="fgrid" style="margin-top:10px">${fld('Объём, шт','300',{err:1,hint:'Минимальная партия у этой фабрики — 500 шт'})}${fld('ИНН','77012345',{err:1,hint:'В ИНН юрлица 10 цифр, у ИП — 12'})}${fld('Расчётный счёт','40702 810 0 0000 0004471',{wide:true,err:1,hint:'Контрольный разряд не сходится с БИК — проверьте номер'})}</div><button class="btn cta" style="margin-top:12px" disabled>Продолжить</button>
      <h3 style="margin-top:18px">Уведомления-тосты</h3><div class="toasts"><div class="toast ok">Прогресс сохранён · заказчик уведомлён</div><div class="toast">Добавлено в сравнение · 3 из 4 <a class="lnk">Открыть</a></div><div class="toast bad">Не удалось загрузить фото — файл больше 15 МБ</div></div></div>
  </div></main>`;
}
screen('state-errors','states','Ошибки и предупреждения','/__states/errors',stateErrors);

/* ---------------- Мобильные ---------------- */
function mobile(){
  const o=D.offers, ord=D.order;
  const mh=(t)=>`<div class="m-top"><span class="m-logo"><i></i>${t||D.brand.name}</span><span class="m-ic">⌕</span><span class="m-ic">☰</span></div>`;
  const tabs=(on)=>`<div class="m-tabs">${['Каталог','Сравнение','Заказы','Кабинет'].map((x,i)=>`<span class="${i===on?'on':''}"><i></i>${x}</span>`).join('')}</div>`;
  const mcard=(x,i)=>`<div class="m-card">${ph(x.tone,'')}<div><div class="price num">${x.price} ₽ <span class="muted small" style="font-weight:400">/шт</span></div><div class="t">${x.title}</div><div class="muted small">MOQ ${num(x.moq)} · от ${x.lead} дн.</div><div class="rating small">${x.rating}</div></div></div>`;
  return headerSlim('<span class="muted-w">Мобильные экраны · 390 px</span>')+`<main class="wrap">
  ${pageH('Мобильная версия','Те же маршруты. Фильтры и калькулятор уезжают в нижние шторки, навигация — в таб-бар.')}
  <div class="phones">
    <figure><div class="phone">${mh()}<div class="m-body"><div class="m-search">Что произвести?</div><div class="m-chips"><span class="chip on">Фильтры · 4</span><span class="chip">Дешевле ▾</span><span class="chip">С аудитом</span></div><div class="m-grid">${o.slice(0,4).map(mcard).join('')}</div></div>${tabs(0)}</div><figcaption>Каталог · 2 колонки</figcaption></figure>
    <figure><div class="phone">${mh()}<div class="m-body dim"><div class="m-grid">${o.slice(0,2).map(mcard).join('')}</div></div><div class="sheet"><div class="grab"></div><div class="row between"><b>Фильтры</b><a class="lnk small">Сбросить</a></div><h4>Минимальная партия</h4><div class="range"><input value="100"><input value="1 000"></div><h4>Регион</h4><div class="chips"><span class="chip on">ЦФО</span><span class="chip">ПФО</span><span class="chip">СЗФО</span></div><h4>Надёжность</h4><label class="row between">Аудит платформы <span class="toggle on"></span></label><label class="row between">Есть образец <span class="toggle"></span></label><span class="btn cta wide lg" style="margin-top:12px">Показать 214</span></div></div><figcaption>Фильтры · нижняя шторка</figcaption></figure>
    <figure><div class="phone">${mh('‹ Назад')}<div class="m-body">${ph('A','фото 1 / 5').replace('class="ph A"','class="ph A" style="aspect-ratio:1"')}<div style="padding:12px"><div class="row" style="gap:4px"><span class="tag hot">Хит</span><span class="tag ok">аудит</span></div><b style="display:block;margin:6px 0">Футболки 180 г/м² под СТМ</b><div class="rating small">4,8 <span>· 126 · «Волна», Иваново</span></div><div class="tiers" style="margin:10px 0">${D.offerDetail.tiers.map((t,i)=>`<div class="tier ${i===1?'on':''}"><b>${t.price} ₽</b>от ${num(t.from)}</div>`).join('')}</div></div></div><div class="m-buy"><div><span class="muted small">1 000 шт</span><b class="price num">183 400 ₽</b></div><span class="btn cta">Оформить</span></div></div><figcaption>Карточка · липкая панель покупки</figcaption></figure>
    <figure><div class="phone">${mh('‹ № 4812')}<div class="m-body" style="padding:12px"><div class="row between"><b>Футболки 1 000 шт</b>${tag('В производстве')}</div><div class="muted small">отгрузка 2 окт · через 12 раб. дней</div><div class="pipe m">${ord.steps.map(s=>`<div class="${s.state}"><i></i></div>`).join('')}</div><b class="small">Производство · 65 %</b>${ord.progress.map(p=>`<div class="prog m"><span>${p.name}</span><div class="bar"><i style="width:${p.done/p.total*100}%"></i></div></div>`).join('')}<div class="day" style="margin-top:12px">Сегодня</div><div class="ev"><span class="t">16:10</span><div><b>Фотоотчёт</b><div class="strip"><div class="ph C"></div><div class="ph A"></div></div></div></div><div class="ev"><span class="t">09:15</span><div><b>Отшито 650 / 1 000</b></div></div></div>${tabs(2)}</div><figcaption>Трекинг</figcaption></figure>
    <figure><div class="phone">${mh('Завод · Волна')}<div class="m-body" style="padding:12px"><div class="alert warn" style="margin:0 0 10px"><i></i><div><b>№ 4799 · 405 000 ₽</b><div>подтвердить до 18:00</div></div></div><span class="btn cta wide">Подтвердить</span><div class="day" style="margin-top:14px">В работе</div><div class="m-row"><b>№ 4812 · Футболки 1 000</b><span class="muted small">обновите прогресс</span><div class="row" style="margin-top:6px"><span class="btn sm">650 / 1 000</span><span class="btn sm cta">📷 Фотоотчёт</span></div></div><div class="m-row"><b>№ 4771 · Шоперы 1 500</b><span class="muted small">контроль качества</span></div></div><div class="m-tabs">${['Заказы','SKU','Мощность','Ещё'].map((x,i)=>`<span class="${i===0?'on':''}"><i></i>${x}</span>`).join('')}</div></div><figcaption>Завод · мастер в цеху с телефоном</figcaption></figure>
  </div></main>`;
}
screen('mobile','states','Мобильные экраны','/__states/mobile',mobile);
