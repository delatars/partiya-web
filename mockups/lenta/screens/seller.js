/* Макет «Лента» · кабинет завода. Экраны регистрируются через screen(id, группа, название, url, render). */

function factory(){
  const f=D.factory,cp=f.capacity;
  const sales=[{d:'пн',v:62},{d:'вт',v:80},{d:'ср',v:45},{d:'чт',v:92},{d:'пт',v:70},{d:'сб',v:20},{d:'вс',v:12}];
  return header({noCat:true})+`<main class="wrap" style="padding-top:12px"><div class="cab-layout">
    ${sellerNav('factory')}
    <section>
      <div class="kpis"><div class="kpi"><span>Загрузка · ${cp.month}</span><b>${cp.pct} %</b><span class="d">${num(cp.sold)} из ${num(cp.total)} ${cp.unit}</span></div><div class="kpi"><span>Просмотры за 7 дней</span><b class="num">2 870</b><span class="d">+18 % к прошлой неделе</span></div><div class="kpi"><span>В эскроу за вас</span><b class="num">${rub(f.finance.escrowHeld)}</b></div><div class="kpi"><span>Выплачено за месяц</span><b class="num">${rub(f.finance.paidMonth)}</b><span class="d">следующая ${f.finance.nextPayout}</span></div></div>
      <div class="cols2" style="margin-bottom:12px">
        <div class="box"><div class="row between"><h3>Просмотры → заказы, 7 дней</h3><span class="muted small">конверсия 0,9 %</span></div><div class="sales">${sales.map(s=>`<div class="${s.v<25?'low':''}"><i style="height:${s.v}%"></i>${s.d}</div>`).join('')}</div></div>
        <div class="box"><div class="row between"><h3>Свободная мощность</h3><span class="tag disc">−15 % на недозагруз</span></div><p class="muted small" style="margin:6px 0 10px">Платформа продаёт свободный остаток — ${num(cp.total-cp.sold)} ${cp.unit} до конца месяца. Недозагруженные недели помечены оранжевым и продвигаются со скидкой.</p><div class="sales" style="height:60px">${f.capacityWeeks.map(w=>`<div class="${w.pct<30?'low':''}"><i style="height:${w.pct}%"></i>${w.w}</div>`).join('')}</div></div>
      </div>
      <div class="box" style="margin-bottom:12px">
        <div class="row between"><h2>Заказы</h2><span class="muted small">1 ждёт подтверждения до 18:00</span></div>
        <div class="tabbar"><a class="on" href="#factory">Все · 4</a><a href="#factory">Новые · 1</a><a href="#factory">В производстве · 1</a><a href="#factory">КК · 1</a><a href="#factory">Выплачено · 1</a></div>
        <div class="tblw"><table class="tb"><thead><tr><th>Заказ</th><th>Заказчик</th><th>Статус</th><th>Примечание</th><th class="r">Сумма</th><th></th></tr></thead><tbody>
        ${f.incoming.map(o=>`<tr class="${o.status==='Новый'?'hot':''}"><td><div class="t">№ ${o.id}</div><div class="s">${o.title}</div></td><td>${o.client}</td><td>${tag(o.status)}</td><td class="s">${o.note}</td><td class="r num">${rub(o.sum)}</td><td>${o.status==='Новый'?`<span class="row" style="gap:4px"><button class="btn cta sm">Подтвердить</button><button class="btn sm">Отклонить</button></span>`:`<a class="btn sm" href="#seller-order">Открыть</a>`}</td></tr>`).join('')}
        </tbody></table></div>
      </div>
      <div class="box">
        <div class="row between"><h2>Предложения-SKU</h2><a class="btn cta sm" href="#seller-offer-edit">+ Новое предложение</a></div>
        <div class="tblw"><table class="tb" style="margin-top:8px"><thead><tr><th>Предложение</th><th class="r">Цена от</th><th class="r">MOQ</th><th class="r">Просмотры</th><th class="r">В сравнении</th><th class="r">Заказов</th><th>В выдаче</th><th></th></tr></thead><tbody>
        ${f.skus.map(s=>`<tr><td class="t">${s.title}</td><td class="r num">${s.price} ₽</td><td class="r num">${num(s.moq)}</td><td class="r num">${num(s.views)}</td><td class="r num">${Math.round(s.views*.06)}</td><td class="r num">${s.orders}</td><td><span class="toggle ${s.active?'on':''}"></span></td><td><a class="btn sm" href="#seller-offer-edit">Изменить</a></td></tr>`).join('')}
        </tbody></table></div>
      </div>
    </section>
  </div></main>`;
}
screen('factory','seller','Заказы завода','/seller/orders',factory);

/* ---------------- Сводка ---------------- */
function sellerHome(){
  const f=D.factory,cp=f.capacity;
  return cabinet(sellerNav('seller-home'),`
  ${pageH('Сводка','«'+f.name+'», '+f.city+' · '+cp.month,'<a class="btn cta" href="#seller-offer-edit">+ Новое предложение</a>')}
  ${alertBox('warn','Новый заказ № 4799 · 405 000 ₽ — подтвердите до 18:00','ИП Сафонов, Казань · футболки 3 000 шт. Деньги уже в эскроу. Без подтверждения заказ отменится, а рейтинг в выдаче снизится.','<a class="btn cta sm" href="#factory">Открыть</a>')}
  <div class="kpis" style="margin-top:12px">${kpi('Загрузка · '+cp.month,cp.pct+' %',num(cp.sold)+' из '+num(cp.total)+' ед.')}${kpi('В эскроу за вас',rub(f.finance.escrowHeld),'по 3 заказам')}${kpi('Выплачено за месяц',rub(f.finance.paidMonth),'следующая '+f.finance.nextPayout)}${kpi('Позиция в «Популярных»','№ 3','в категории «Футболки» · +2 за неделю')}</div>
  <div class="cols2">
    <div class="box"><h3>Нужно сделать сегодня</h3><ol class="todo" style="margin-top:8px"><li class="now"><a href="#factory">Подтвердить заказ № 4799</a> <span class="muted small">до 18:00</span></li><li class="now"><a href="#seller-order">Внести прогресс по № 4812</a> <span class="muted small">последнее обновление вчера</span></li><li><a href="#seller-samples">Отправить образец С-218</a> <span class="muted small">срок завтра</span></li><li><a href="#seller-feedback">Ответить на 2 вопроса</a> <span class="muted small">влияет на «отвечает за…»</span></li><li><a href="#seller-capacity">Заполнить план на октябрь</a> <span class="muted small">без плана предложения выпадут из выдачи 1 окт</span></li></ol></div>
    <div class="box"><div class="row between"><h3>Воронка · 30 дней</h3><a class="lnk small" href="#seller-offers">по предложениям →</a></div><div class="funnel">${[['Показы в выдаче','41 200',100],['Просмотры карточек','2 870',62],['Добавили в сравнение','172',34],['Рассчитали партию','96',22],['Оформили заказ','17',9]].map(r=>`<div><span>${r[0]}</span><div class="bar"><i style="width:${r[2]}%"></i></div><b class="num">${r[1]}</b></div>`).join('')}</div></div>
  </div>
  <div class="cols2" style="margin-top:12px">
    <div class="box"><div class="row between"><h3>Загрузка по неделям</h3><a class="lnk small" href="#seller-capacity">Мощность →</a></div><div class="sales" style="height:90px">${f.capacityWeeks.map(w=>`<div class="${w.pct<30?'low':''}"><i style="height:${w.pct}%"></i>${w.w}</div>`).join('')}</div></div>
    <div class="box"><h3>Качество работы</h3><dl class="kv" style="grid-template-columns:1fr auto;margin-top:8px"><dt>Отгружено в срок</dt><dd><b>97 %</b></dd><dt>Подтверждение заказов</dt><dd><b>100 %</b> · в среднем 2 ч</dd><dt>Ответ на вопросы</dt><dd><b>40 мин</b></dd><dt>Споры</dt><dd>1 из 87</dd><dt>Аудит действует до</dt><dd>12.06.2027</dd></dl></div>
  </div>`);
}
screen('seller-home','seller','Сводка','/seller',sellerHome);
SCREENS.splice(SCREENS.findIndex(x=>x.id==='factory'),0,SCREENS.pop()); // сводка — перед заказами

/* ---------------- Заказ у завода: прогресс и фотоотчёт ---------------- */
function sellerOrder(){
  const o=D.order;
  return cabinet(sellerNav('factory'),`
  ${crumbs(['Заказы','factory'],'№ 4812')}
  <div class="tr-top" style="margin-top:0"><div><div class="row" style="gap:8px"><h1>№ ${o.id} · Футболки 1 000 шт</h1>${tag('В производстве')}</div><div class="muted" style="margin-top:4px">ООО «Кора», Москва · отгрузка до <b style="color:var(--ink)">2 октября</b> · день 6 из 18 · к выплате 168 728 ₽</div>
    <div class="pipe">${o.steps.map(s=>`<div class="${s.state}"><i></i>${s.name}${s.pct?' '+s.pct+' %':''}</div>`).join('')}</div></div>
    <div class="row" style="flex-direction:column;align-items:stretch"><button class="btn cta">Перевести в «Контроль качества»</button><button class="btn ghost">Сообщить о задержке</button></div></div>
  <div class="tr-layout">
    <div>
      <div class="box"><h2>Внести прогресс</h2><p class="muted small" style="margin:4px 0 10px">Заказчик увидит это в ленте сразу. Обновляйте хотя бы раз в 2 рабочих дня — это влияет на рейтинг.</p>
        ${o.progress.map(p=>`<div class="prog edit"><span>${p.name}</span><div class="bar"><i style="width:${p.done/p.total*100}%"></i></div><span class="row" style="gap:4px;justify-content:flex-end"><input class="inp sm num" value="${p.done}" aria-label="${p.name}"><span class="muted small">/ ${num(p.total)}</span></span></div>`).join('')}
        <div class="row between" style="margin-top:10px"><span class="muted small">Последнее обновление: вчера 17:40 · Семёнова О.</span><button class="btn cta">Сохранить прогресс</button></div></div>
      <div class="box" style="margin-top:12px"><h2>Фотоотчёт</h2><div class="dropzone"><b>Перетащите фото или нажмите</b><span class="muted small">JPG, PNG до 15 МБ · с телефона — через Telegram-бота завода</span></div>
        <div class="strip" style="display:flex;gap:6px;margin:10px 0">${['C','C','A'].map(t=>`<div class="ph ${t}" style="width:110px;height:84px;border-radius:6px"></div>`).join('')}</div>
        ${fld('Подпись','Готовые изделия, чёрные. Принт после 26.09',{wide:true})}<button class="btn cta" style="margin-top:8px">Опубликовать в ленте заказа</button></div>
      <div class="box" style="margin-top:12px"><h2>Спецификация</h2><dl class="kv" style="margin-top:8px">${D.checkout.params.map(p=>`<dt>${p[0]}</dt><dd>${p[1]}</dd>`).join('')}<dt>Макет</dt><dd><a class="lnk" href="#seller-order">logo_front.pdf</a> · цветопроба согласована 19.09</dd><dt>Доставка</dt><dd>до склада WB, Коледино · маркировка «Честный знак»</dd></dl></div>
    </div>
    <aside>
      <div class="box"><h3>Чат с заказчиком</h3><div style="margin-top:10px">${o.chat.map(m=>`<div class="msg ${m.who!=='Вы'?'me':''}"><div class="m">${m.who==='Вы'?'ООО «Кора»':'Вы · технолог'} · ${m.when}</div>${m.text}</div>`).join('')}</div><div class="row" style="margin-top:8px"><input id="sm" class="inp" placeholder="Сообщение…" style="flex:1"><button class="btn cta">→</button></div></div>
      <div class="box" style="margin-top:12px"><h3>Деньги</h3><dl class="kv" style="grid-template-columns:1fr auto;margin-top:8px"><dt>В эскроу</dt><dd class="num">183 400 ₽</dd><dt>Комиссия 8 %</dt><dd class="num">−14 672 ₽</dd><dt><b>К выплате</b></dt><dd class="num"><b>168 728 ₽</b></dd></dl><p class="muted small" style="margin:8px 0 0">Выплата — в течение 2 раб. дней после приёмки заказчиком.</p></div>
      <div class="box" style="margin-top:12px"><h3>Журнал</h3><div class="ledger sm"><div><span class="s">19.09</span><div><b>Цветопроба согласована</b></div></div><div><span class="s">15.09</span><div><b>Старт производства</b></div></div><div><span class="s">12.09</span><div><b>Сырьё закуплено</b></div></div><div><span class="s">11.09</span><div><b>Заказ подтверждён</b><span class="s">Семёнова О. · через 1 ч 40 мин</span></div></div></div></div>
    </aside>
  </div>`);
}
screen('seller-order','seller','Заказ: прогресс и фотоотчёт','/seller/orders/4812',sellerOrder);

/* ---------------- Предложения ---------------- */
function sellerOffers(){
  const s=[...D.factory.skus,{id:2310,title:'Футболки оверсайз 240 г/м²',price:198,moq:300,views:0,orders:0,active:false,st:'На модерации'},{id:2311,title:'Свитшоты 320 г/м² с начёсом',price:0,moq:0,views:0,orders:0,active:false,st:'Черновик'}];
  return cabinet(sellerNav('seller-offers'),`
  ${pageH('Предложения','Выкладка как на маркетплейсе: цена по объёму, MOQ, срок, фото. Изменение цены создаёт новую версию — старые заказы не затрагиваются.','<a class="btn cta" href="#seller-offer-edit">+ Новое предложение</a>')}
  ${tabbar(['Все · 5','В выдаче · 2','Скрытые · 1','На модерации · 1','Черновики · 1'])}
  <div class="box"><div class="tblw"><table class="tb"><thead><tr><th>Предложение</th><th>Статус</th><th class="r">Цена от</th><th class="r">MOQ</th><th class="r">Показы</th><th class="r">Просмотры</th><th class="r">В сравн.</th><th class="r">Заказов</th><th class="r">Конверсия</th><th>В выдаче</th><th></th></tr></thead><tbody>
  ${s.map((x,i)=>`<tr><td><div class="row" style="gap:8px">${ph(['A','A','B','A','B'][i]).replace('class="ph','style="width:36px;height:36px;border-radius:4px;flex:none" class="ph')}<div><div class="t">${x.title}</div><div class="s">арт. ${x.id} · версия ${[4,2,1,1,1][i]}</div></div></div></td><td>${x.st?tag(x.st,x.st==='Черновик'?'done':'new'):x.active?tag('В выдаче','ok'):tag('Скрыто','done')}</td><td class="r num">${x.price?x.price+' ₽':'—'}</td><td class="r num">${x.moq?num(x.moq):'—'}</td><td class="r num">${num(x.views*14)}</td><td class="r num">${num(x.views)}</td><td class="r num">${Math.round(x.views*.06)}</td><td class="r num">${x.orders}</td><td class="r num">${x.views?(x.orders/x.views*100).toFixed(1).replace('.',',')+' %':'—'}</td><td><span class="toggle ${x.active?'on':''}"></span></td><td><a class="btn sm" href="#seller-offer-edit">Изменить</a></td></tr>`).join('')}
  </tbody></table></div></div>
  ${alertBox('info','«Лонгсливы 200 г/м²»: 420 просмотров, 0 заказов','Цена от 240 ₽ выше медианы категории (205 ₽) на 17 %. MOQ 500 — у конкурентов 300.','<a class="btn sm" href="#seller-offer-edit">Изменить условия</a>')}`);
}
screen('seller-offers','seller','Предложения (SKU)','/seller/offers',sellerOffers);

/* ---------------- Редактор предложения ---------------- */
function sellerOfferEdit(){
  const o=D.offerDetail;
  return cabinet(sellerNav('seller-offers'),`
  ${crumbs(['Предложения','seller-offers'],'Футболки 180 г/м² под СТМ')}
  ${pageH('Редактирование предложения','арт. 2231 · версия 4 опубликована 09.09 · правки создадут версию 5','<button class="btn">Предпросмотр</button><button class="btn ghost">Сохранить черновик</button><a class="btn cta" href="#seller-offers">Отправить на модерацию</a>')}
  <div class="cols-side">
    <div>
      <div class="box"><h2>1 · Категория и название</h2><div class="fgrid" style="margin-top:10px">${fld('Категория','Текстиль › Футболки',{select:['Текстиль › Футболки','Текстиль › Худи','Текстиль › Поло'],req:true})}${fld('Коэффициент мощности','1,0',{hint:'усл. ед. на изделие · из раздела «Мощность»',ro:true})}${fld('Название в выдаче',o.title,{wide:true,req:true,hint:'62 символа из 80 · начинайте с типа изделия'})}</div></div>
      <div class="box" style="margin-top:10px"><h2>2 · Фото</h2><div class="gal4" style="margin-top:10px">${ph('A','главное')}${ph('A','шов')}${ph('C','бирка')}<div class="dropzone sm">+ фото</div></div><p class="muted small" style="margin:8px 0 0">От 3 фото. Реальные изделия вашего производства, без логотипов клиентов.</p></div>
      <div class="box" style="margin-top:10px"><h2>3 · Характеристики</h2><p class="muted small" style="margin:4px 0 10px">Поля заданы категорией. Из них собираются фильтры каталога и конструктор заказа — заказчик не сможет выбрать то, чего здесь нет.</p>
        <div class="fgrid">${fld('Материал','Кулирная гладь, хлопок 100 %',{select:['Кулирная гладь, хлопок 100 %','Кулирка с лайкрой','Пике'],req:true})}${fld('Плотность, г/м²','180',{req:true})}
        <div class="fld wide"><label>Крой <i>*</i></label><div class="chips"><span class="chip on">классический</span><span class="chip on">оверсайз</span><span class="chip on">женский приталенный</span><span class="chip">детский</span></div></div>
        <div class="fld wide"><label>Размеры <i>*</i></label><div class="chips">${['XS','S','M','L','XL','2XL','3XL'].map(x=>`<span class="chip on">${x}</span>`).join('')}<span class="chip">4XL</span><span class="chip">5XL</span></div></div>
        <div class="fld wide"><label>Нанесение</label><div class="chips"><span class="chip on">шелкография до 6 цв.</span><span class="chip on">DTF</span><span class="chip on">вышивка</span><span class="chip">сублимация</span><span class="chip">без нанесения</span></div></div>
        ${fld('Цвета ткани в наличии','14 базовых')}${fld('Свой Pantone','от 1 000 шт')}</div></div>
      <div class="box" style="margin-top:10px"><h2>4 · Цена по объёму</h2><table class="tb" style="margin-top:8px"><thead><tr><th>От, шт</th><th>Цена за шт, ₽</th><th class="r">Партия</th><th class="r">Вы получите (−8 %)</th><th></th></tr></thead><tbody>${o.tiers.map(t=>`<tr><td><input class="inp sm num" value="${num(t.from)}"></td><td><input class="inp sm num" value="${t.price}"></td><td class="r num s">${rub(t.from*t.price)}</td><td class="r num">${rub(Math.round(t.from*t.price*.92))}</td><td><a class="lnk small">убрать</a></td></tr>`).join('')}</tbody></table><button class="btn sm" style="margin-top:8px">+ Ступень</button>
        <p class="muted small" style="margin:10px 0 0">Первая ступень = MOQ. Медиана категории при 1 000 шт — 172 ₽, ваша цена 168 ₽.</p></div>
      <div class="box" style="margin-top:10px"><h2>5 · Опции и сроки</h2><table class="tb" style="margin-top:8px"><thead><tr><th>Опция</th><th>Цена, ₽</th><th>Считается</th></tr></thead><tbody>${o.options.map(x=>`<tr><td><input class="inp sm" value="${x.name}" style="width:100%"></td><td><input class="inp sm num" value="${num(x.price)}"></td><td><select class="inp sm"><option>${x.unit}</option></select></td></tr>`).join('')}</tbody></table>
        <div class="fgrid" style="margin-top:12px">${fld('Срок производства, раб. дней','14–18',{req:true})}${fld('+ дней на каждую 1 000 шт сверх первой','3')}</div>
        <label class="row" style="margin-top:10px"><span class="toggle on"></span> Предлагать образец · <input class="inp sm num" value="1 500" style="width:80px"> ₽ · <input class="inp sm num" value="5" style="width:50px"> дней</label></div>
    </div>
    <aside>
      <div class="box"><h3>Как увидит заказчик</h3><div style="margin-top:10px;max-width:260px">${card(D.offers[0],0)}</div></div>
      <div class="box" style="margin-top:12px"><h3>Готовность</h3><ol class="todo" style="margin-top:8px"><li class="done">Категория и название</li><li class="done">Фото — 3 из 3</li><li class="done">Характеристики</li><li class="done">Цены</li><li class="now">Срок: уточните прибавку за объём</li></ol></div>
      ${alertBox('info','Модерация','Правки цены и сроков публикуются сразу. Название, фото и характеристики — после проверки, до 1 раб. дня.')}
    </aside>
  </div>`);
}
screen('seller-offer-edit','seller','Редактор предложения','/seller/offers/2231/edit',sellerOfferEdit);

/* ---------------- Запросы образцов ---------------- */
function sellerSamples(){
  const s=[['С-218','Футболка 180 г/м² × 2 · M, L · белый · тестовая печать','ООО «Кора», Москва','Изготовить до 21 сен','work','1 500 ₽'],['С-221','Поло пике × 1 · L · графит · вышивка по макету','ИП Лебедева, Иваново','Новый','new','1 800 ₽'],['С-197','Футболка 180 г/м² × 1','«ЭкоДом», Тверь','Доставлен → заказ № 4771','done','1 500 ₽']];
  return cabinet(sellerNav('seller-samples'),`
  ${pageH('Запросы образцов','Образец — самый короткий путь к первому заказу: 61 % получивших образец оформляют партию.')}
  <div class="rows">${s.map((r,i)=>`<div class="rowc rep4">${ph(['A','A','A'][i],'')}<div class="rc-main"><div class="row" style="gap:6px"><b class="num">${r[0]}</b>${tag(r[3],r[4])}</div><div class="rc-t">${r[1]}</div><div class="fac"><b>${r[2]}</b></div></div><div class="rc-meta"><div>Оплачено <b class="num">${r[5]}</b></div><div class="muted">зачтётся в партию</div></div><div class="rc-act">${r[4]==='new'?'<button class="btn cta">Принять</button><button class="btn ghost sm">Отклонить</button>':r[4]==='work'?'<button class="btn cta">Отметить отправку</button><span class="muted small">трек-номер СДЭК</span>':'<a class="btn" href="#seller-order">К заказу</a>'}</div></div>`).join('')}</div>`);
}
screen('seller-samples','seller','Запросы образцов','/seller/samples',sellerSamples);

/* ---------------- Мощность ---------------- */
function sellerCapacity(){
  const wk=['1–7 сен','8–14 сен','15–21 сен','22–28 сен','29–5 окт','6–12 окт','13–19 окт','20–26 окт'];
  const lines=[['Линия 1 · футболки, поло',8000,[85,80,68,51,22,10,0,0],[10,10,10,10,10,10,10,10]],['Линия 2 · худи, свитшоты',2000,[80,60,45,20,8,0,0,0],[20,20,20,20,0,0,0,0]]];
  return cabinet(sellerNav('seller-capacity'),`
  ${pageH('Мощность','Платформа продаёт только свободный остаток и не даст принять заказов сверх плана.','<button class="btn">Скопировать сентябрь → октябрь</button><button class="btn cta">Сохранить план</button>')}
  ${alertBox('warn','План на октябрь заполнен на 2 недели из 4','С 13 октября предложения выпадут из выдачи: платформа не знает, есть ли у вас место.','<a class="btn sm" href="#seller-capacity">Заполнить</a>')}
  <div class="kpis" style="margin-top:12px">${kpi('Загрузка · сентябрь','62 %','24 800 из 40 000 усл. ед.')}${kpi('Свободно до конца месяца','15 200','продаётся в каталоге')}${kpi('Вне платформы','12 %','свои клиенты')}${kpi('Недозагруз','2 недели','ниже 30 % — включена скидка −15 %','warn')}</div>
  <div class="box"><div class="row between"><h2>План по линиям и неделям</h2><div class="legend"><span><i class="l-sold"></i>продано через платформу</span><span><i class="l-ext"></i>занято вне платформы</span><span><i class="l-free"></i>свободно</span><span><i class="l-low"></i>недозагруз</span></div></div>
    <div class="capw"><table class="cap"><thead><tr><th>Линия</th><th class="r">План/нед</th>${wk.map(w=>`<th>${w}</th>`).join('')}</tr></thead><tbody>
    ${lines.map(l=>`<tr><td class="t">${l[0]}</td><td class="r"><input class="inp sm num" value="${num(l[1])}"></td>${l[2].map((p,i)=>{const ext=l[3][i],free=100-p-ext;return `<td><div class="capcell ${p+ext<30?'low':''} ${i>5?'nop':''}">${i>5?'<span class="muted small">нет плана</span>':`<div class="stk"><i class="l-sold" style="height:${p}%"></i><i class="l-ext" style="height:${ext}%"></i></div><b class="num">${free} %</b><span class="muted small">своб.</span>`}</div></td>`}).join('')}</tr>`).join('')}
    </tbody></table></div></div>
  <div class="cols2" style="margin-top:12px">
    <div class="box"><h3>Коэффициенты изделий</h3><p class="muted small" style="margin:4px 0 8px">Сколько условных единиц «съедает» одно изделие. Худи шьётся дольше футболки — платформа учтёт это при резерве.</p><table class="tb"><tbody>${[['Футболка','1,0'],['Поло','1,4'],['Лонгслив','1,2'],['Худи / свитшот','2,4'],['Шопер','0,6']].map(r=>`<tr><td>${r[0]}</td><td class="r"><input class="inp sm num" value="${r[1]}"></td></tr>`).join('')}</tbody></table></div>
    <div class="box"><h3>Скидка на недозагруз</h3><label class="row" style="margin:8px 0"><span class="toggle on"></span> Включена</label><div class="fgrid">${fld('Порог загрузки недели','30 %')}${fld('Скидка','15 %')}</div><p class="muted small" style="margin:8px 0 0">Предложения получат бейдж «−15 % мощность» и поднимутся в «Популярных». Сейчас действует для недель 29 сен – 12 окт.</p>
      <h3 style="margin-top:16px">Резервы</h3><div class="ledger sm"><div><span class="s">soft</span><div><b>№ 4799 · 3 000 усл. ед.</b><span class="s">ждёт вашего подтверждения до 18:00</span></div></div><div><span class="s">hard</span><div><b>№ 4812 · 1 000 усл. ед.</b><span class="s">15–28 сен</span></div></div></div></div>
  </div>`);
}
screen('seller-capacity','seller','Мощность','/seller/capacity',sellerCapacity);

/* ---------------- Финансы ---------------- */
function sellerFinance(){
  const f=D.factory.finance;
  const p=[['23.09','№ 4771 · Шоперы 1 500 шт','«ЭкоДом», Тверь','144 000 ₽','−11 520 ₽','132 480 ₽','Запланирована','new'],['16.09','№ 4756 · Футболки 500 шт','ИП Лебедева','94 500 ₽','−7 560 ₽','86 940 ₽','Выплачено','ok'],['09.09','№ 4730 · Поло 300 шт','ООО «Ритм»','126 000 ₽','−10 080 ₽','115 920 ₽','Выплачено','ok'],['02.09','№ 4701 · Футболки 2 000 шт','ИП Сафонов','304 000 ₽','−24 320 ₽','279 680 ₽','Выплачено','ok']];
  return cabinet(sellerNav('seller-finance'),`
  ${pageH('Финансы','Выплата — в течение 2 рабочих дней после приёмки партии заказчиком.','<button class="btn">Акт сверки</button><button class="btn">Выгрузить в 1С</button>')}
  <div class="kpis">${kpi('В эскроу за вас',rub(f.escrowHeld),'по 3 заказам')}${kpi('Ближайшая выплата','132 480 ₽',f.nextPayout+' · № 4771')}${kpi('Выплачено за сентябрь',rub(f.paidMonth))}${kpi('Комиссия платформы',f.fee+' %','удержано в сентябре 51 170 ₽')}</div>
  <div class="cols-side">
    <div class="box"><h2>Выплаты</h2>${tabbar(['Все','Запланированы · 1','Выплачены','Заблокированы спором · 0'])}<div class="tblw"><table class="tb"><thead><tr><th>Дата</th><th>Заказ</th><th class="r">Сумма заказа</th><th class="r">Комиссия</th><th class="r">К выплате</th><th>Статус</th><th></th></tr></thead><tbody>
      ${p.map(r=>`<tr><td class="s">${r[0]}</td><td><div class="t">${r[1]}</div><div class="s">${r[2]}</div></td><td class="r num">${r[3]}</td><td class="r num s">${r[4]}</td><td class="r num t">${r[5]}</td><td>${tag(r[6],r[7])}</td><td><button class="btn sm">УПД</button></td></tr>`).join('')}</tbody></table></div></div>
    <aside><div class="box"><h3>В эскроу по заказам</h3><div class="ledger sm" style="margin-top:6px"><div><div><b>№ 4799 · 405 000 ₽</b><span class="s">ждёт вашего подтверждения</span></div></div><div><div><b>№ 4812 · 183 400 ₽</b><span class="s">производство · приёмка ≈ 7 окт</span></div></div><div><div><b>№ 4771 · 144 000 ₽</b><span class="s">принят · выплата 23.09</span></div></div></div></div>
      <div class="box" style="margin-top:12px"><h3>Счёт для выплат</h3><p style="margin:8px 0 0">ООО «Волна» · р/с …8820<br><span class="muted small">Смена реквизитов — с задержкой 24 ч и подтверждением владельца</span></p><a class="btn wide" style="margin-top:8px" href="#company">Реквизиты</a></div></aside>
  </div>`);
}
screen('seller-finance','seller','Финансы и выплаты','/seller/finance',sellerFinance);

/* ---------------- Отзывы и вопросы ---------------- */
function sellerFeedback(){
  const q=[['Можно свой Pantone на 500 шт?','Футболки 180 г/м²','2 ч назад',''],['Делаете ли вшивную бирку с составом на двух языках?','Поло пике 210 г/м²','вчера',''],['Усадка после стирки?','Футболки 180 г/м²','12 сен','До 3 % по длине, ткань предварительно декатирована.']];
  return cabinet(sellerNav('seller-feedback'),`
  ${pageH('Отзывы и вопросы','Среднее время ответа — 40 минут. Показывается на витрине завода.')}
  ${tabbar(['Вопросы без ответа · 2','Все вопросы · 14','Отзывы · 126'])}
  <div class="cols-side">
    <div>${q.map(x=>`<div class="box qcard"><div class="row between"><b>${x[0]}</b><span class="muted small">${x[2]}</span></div><div class="muted small">к предложению «${x[1]}»</div>${x[3]?`<div class="qa"><div class="a">Вы: ${x[3]}</div></div>`:`<textarea class="inp" rows="2" placeholder="Ответ увидят все посетители карточки. Контакты до оплаты заказа скрываются."></textarea><div class="row between" style="margin-top:6px"><span class="muted small">Шаблоны: <a class="lnk">сроки</a> · <a class="lnk">Pantone</a> · <a class="lnk">образец</a></span><button class="btn cta sm">Ответить</button></div>`}</div>`).join('')}</div>
    <aside class="box"><h3>Рейтинг <span class="rating">4,8</span></h3><div class="rdist">${[[5,102],[4,19],[3,4],[2,1],[1,0]].map(r=>`<div><span>${r[0]}★</span><div class="bar"><i style="width:${r[1]/126*100}%"></i></div><span class="num muted">${r[1]}</span></div>`).join('')}</div><h3 style="margin-top:14px">Последний отзыв</h3><div class="qa" style="border:0"><b>ИП Лебедева · ★★★★</b><div style="margin-top:4px">На 500 шт был перекос по размерной сетке, фабрика допечатала за свой счёт.</div><a class="lnk small">Ответить публично</a></div></aside>
  </div>`);
}
screen('seller-feedback','seller','Отзывы и вопросы','/seller/feedback',sellerFeedback);

/* ---------------- Аудит и документы ---------------- */
function sellerAudit(){
  const c=[['Юрлицо и реквизиты','Выписка ЕГРЮЛ, карточка предприятия','ok','12.06.2026'],['Право на помещение','Договор аренды цеха до 2029 г.','ok','12.06.2026'],['Выезд аудитора в цех','Фото- и видеофиксация, 140 рабочих мест','ok','10.06.2026'],['Оборудование','Перечень: 86 швейных машин, 2 карусели шелкографии, DTF','ok','10.06.2026'],['Контрольные образцы','3 изделия, лабораторная проверка плотности и усадки','ok','12.06.2026'],['Сертификат соответствия ТР ТС 017/2011','Истекает через 40 дней','work','до 30.10.2026']];
  return cabinet(sellerNav('seller-audit'),`
  ${pageH('Аудит и документы','Бейдж «аудит» даёт приоритет в выдаче и фильтр «только с аудитом» — им пользуются 64 % заказчиков.')}
  <div class="box fp-head"><div class="fp-logo ok">✓</div><div><div class="row" style="gap:6px">${tag('Аудит пройден','ok')}</div><h2 style="margin-top:4px">Действует до 12 июня 2027</h2><div class="muted">Следующая проверка — плановая, выезд по согласованию. Напомним за 30 дней.</div></div><div class="fp-act"><button class="btn">Отчёт аудитора PDF</button></div></div>
  ${alertBox('warn','Сертификат ТР ТС истекает 30 октября','Загрузите новый — иначе предложения детской одежды будут скрыты.','<button class="btn sm">Загрузить</button>')}
  <div class="box" style="margin-top:12px"><div class="tblw"><table class="tb"><thead><tr><th>Пункт проверки</th><th>Основание</th><th>Статус</th><th>Дата</th><th></th></tr></thead><tbody>${c.map(r=>`<tr><td class="t">${r[0]}</td><td class="s">${r[1]}</td><td>${tag(r[2]==='ok'?'Подтверждено':'Требует внимания',r[2])}</td><td class="s">${r[3]}</td><td><button class="btn sm">Файлы</button></td></tr>`).join('')}</tbody></table></div></div>`);
}
screen('seller-audit','seller','Аудит и документы','/seller/audit',sellerAudit);
