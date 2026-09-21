/* Макет «Лента» · витрина. Экраны регистрируются через screen(id, группа, название, url, render). */

function catalog(){
  const f=D.filters, all=[...D.offers,...D.offers.slice(0,2)];
  return header()+`<main class="wrap">
  <div class="crumbs"><a href="#home">Главная</a> › <a href="#catalog">Каталог</a> › <a href="#catalog">Текстиль</a> › Футболки и худи</div>
  <div class="cat-layout">
    <aside class="filters">
      <h4>Минимальная партия</h4><div class="range"><input value="100"><input value="1 000"></div>
      <label><input type="checkbox" checked>до 500 шт<span>64</span></label><label><input type="checkbox" checked>500–1 000<span>92</span></label><label><input type="checkbox">1 000–5 000<span>47</span></label>
      <h4>Цена за шт</h4><div class="range"><input value="90 ₽"><input value="700 ₽"></div>
      <h4>Регион фабрики</h4><label><input type="checkbox" checked>ЦФО<span>131</span></label><label><input type="checkbox">ПФО<span>44</span></label><label><input type="checkbox">СЗФО<span>22</span></label><label><input type="checkbox">УФО<span>17</span></label>
      <h4>Срок</h4><label><input type="radio" name="l">до 14 дней<span>58</span></label><label><input type="radio" name="l" checked>до 21 дня<span>171</span></label><label><input type="radio" name="l">любой</label>
      <h4>Надёжность</h4><label><input type="checkbox" checked>Аудит платформы<span>140</span></label><label><input type="checkbox">Рейтинг 4,7+<span>63</span></label><label><input type="checkbox">Есть образец<span>88</span></label><label><input type="checkbox">Свободно в сентябре<span>112</span></label>
      <h4>Материал</h4><label><input type="checkbox">Хлопок 100 %</label><label><input type="checkbox">Футер</label><label><input type="checkbox">Пике</label><label><input type="checkbox">Двунитка</label>
      <button class="btn wide" style="margin-top:14px">Показать ${f.found}</button>
    </aside>
    <section>
      <h1 style="margin-bottom:6px">Футболки и худи под СТМ <span class="muted" style="font:400 14px var(--body)">${f.found} предложений</span></h1>
      <div class="chips"><span class="chip on">MOQ ${f.moq} ×</span><span class="chip on">${f.region} ×</span><span class="chip on">${f.lead} ×</span><span class="chip on">Аудит ×</span><span class="chip">Сбросить</span></div>
      <div class="res-head"><div class="sorts"><a class="on" href="#catalog">Популярные</a><a href="#catalog">Дешевле</a><a href="#catalog">Быстрее</a><a href="#catalog">Рейтинг</a><a href="#catalog">Свободнее</a></div><div class="view"><a class="on" href="#catalog">▦</a><a href="#catalog-list">☰</a></div></div>
      <div class="grid">${all.map(card).join('')}</div>
      <div style="text-align:center;padding:22px 0"><button class="btn ghost">Показать ещё 36</button> <span class="muted small" style="margin-left:12px">Страница 1 из 6</span></div>
    </section>
  </div></main>
  <div class="tray"><div class="wrap"><b>Сравнение · 2</b><div class="items">${D.offers.slice(0,2).map(o=>`<div class="it">${ph(o.tone)}<div><b>${o.title}</b><span>${o.price} ₽ · MOQ ${num(o.moq)}</span></div></div>`).join('')}</div><span class="muted small">добавьте ещё до 4</span><a class="btn cta" style="margin-left:auto" href="#compare">Сравнить</a><button class="btn ghost">Очистить</button></div></div>`;
}
screen('catalog','public','Каталог · сетка','/catalog/tekstil/futbolki',catalog);

function offer(){
  const o=D.offerDetail,f=o.factory;
  return header()+`<main class="wrap">
  <div class="crumbs"><a href="#catalog">Каталог</a> › <a href="#catalog">Текстиль</a> › <a href="#catalog">Футболки</a> › ${o.title}</div>
  <div class="of">
    <div class="thumbs">${['A','A','C','B','D'].map((t,i)=>ph(t,'',i===0?'':'').replace('class="ph','class="ph '+(i===0?'on':''))).join('')}</div>
    ${ph('A','фото 1 · лицевая').replace('class="ph A"','class="ph A main-ph"')}
    <div class="info">
      <div class="row" style="gap:6px;margin-bottom:8px"><span class="tag hot">Хит</span><span class="tag ok">аудит платформы</span><span class="tag smp">образец 1 500 ₽</span></div>
      <h1>${o.title}</h1>
      <div class="meta"><span class="rating">${f.rating} <span>· ${f.reviews} отзывов</span></span><a href="#offer">14 вопросов</a><span class="muted">·</span><span class="muted">${f.completed} заказов через платформу</span><span class="muted">·</span><span class="muted">арт. ${o.id}</span></div>
      <h3 style="margin-bottom:6px">Цена за шт по объёму</h3>
      <div class="tiers">${o.tiers.map((t,i)=>`<div class="tier ${i===1?'on':''}"><b>${t.price} ₽</b>от ${num(t.from)} шт</div>`).join('')}</div>
      <dl class="kv"><dt>Мин. партия</dt><dd>${num(o.tiers[0].from)} шт</dd><dt>Срок</dt><dd>${o.lead.min}–${o.lead.max} раб. дней от согласования макета</dd><dt>Материал</dt><dd>${o.specs[0][1]}</dd><dt>Печать</dt><dd>${o.specs[4][1]}</dd><dt>Свободно в сентябре</dt><dd>38 % мощности · ближайший запуск 22.09</dd><dt>Приёмка</dt><dd>5 раб. дней, выборка 5 % по ГОСТ</dd></dl>
      <div class="row" style="margin-top:14px;gap:8px"><a class="btn ghost sm" href="#compare">⇄ В сравнение</a><button class="btn ghost sm">♡ В избранное</button><button class="btn ghost sm">Задать вопрос</button></div>
    </div>
    <aside class="buy">
      <div class="pr"><span class="price num">168 ₽</span><span class="muted small">/шт при 1 000</span></div>
      <div class="muted small">при повторе партии −9 % · <span style="color:var(--violet);font-weight:500">152 ₽</span></div>
      <div class="in"><div><label>Объём, шт</label><input id="q1" value="1 000"></div><div><label>Печать</label><select id="q2"><option>Шелкография 2 цв.</option><option>DTF</option><option>Вышивка</option></select></div><div style="grid-column:1/3"><label>Цвета и размеры</label><input id="q3" value="белый 600 · чёрный 400 · S–XL"></div></div>
      <div class="dl"><span>Партия 1 000 × 168 ₽</span><span class="num">168 000 ₽</span></div><div class="dl"><span>Доп. цвет принта</span><span class="num">6 000 ₽</span></div><div class="dl"><span>Доставка до склада WB</span><span class="num">9 400 ₽</span></div>
      <div class="row between" style="margin:12px 0 4px"><b>Итого</b><span class="price num" style="font-size:22px">183 400 ₽</span></div>
      <div class="muted small" style="margin-bottom:12px">Срок 18 раб. дней · отгрузка ~2 октября</div>
      <a class="btn cta lg wide" href="#checkout">Оформить партию</a>
      <a class="btn wide" style="margin-top:6px" href="#sample">Заказать образец · 1 500 ₽</a>
      <div class="escrow"><i></i>Эскроу платформы: фабрика получит деньги после вашей приёмки.</div>
      <div class="seller"><i>В</i><div><b>«${f.name}»</b>, ${f.city}<div class="muted small"><span class="rating">${f.rating}</span> · ${f.completed} заказов · <a href="#factory-page">все предложения (3)</a></div></div></div>
    </aside>
  </div>
  <div class="box" style="margin-top:12px">
    <div class="tabs"><a class="on" href="#offer">Характеристики</a><a href="#offer">Опции</a><a href="#offer">О фабрике</a><a href="#offer">Отзывы ${f.reviews}</a><a href="#offer">Вопросы 14</a></div>
    <table class="spec">${o.specs.map(s=>`<tr><td>${s[0]}</td><td>${s[1]}</td></tr>`).join('')}${o.options.map(x=>`<tr><td>${x.name}</td><td>${rub(x.price)} <span class="muted">${x.unit}</span></td></tr>`).join('')}</table>
    <h2 style="margin:22px 0 10px">Вопросы технологу</h2>
    <div class="qa"><b>Можно свой Pantone на 500 шт?</b><div class="a">Технолог «Волна»: от 1 000 шт — окраска ткани в свой цвет, на 500 подберём ближайший из 14 базовых.</div></div>
    <div class="qa"><b>Усадка после стирки?</b><div class="a">Технолог «Волна»: до 3 % по длине, ткань предварительно декатирована. Отчёт по ГОСТ в документах.</div></div>
    <h2 style="margin:22px 0 10px">Отзывы</h2>
    ${o.reviews.map(r=>`<div class="qa"><div class="row between"><b>${r.who}</b><span class="rating">${r.rate} <span>· ${r.when}</span></span></div><div style="margin-top:4px">${r.text}</div></div>`).join('')}
  </div>
  <h2 style="margin:20px 0 10px">Похожие предложения</h2>
  <div class="similar">${D.offers.map((x,i)=>card(x,i+10)).join('')}</div>
  </main>`;
}
screen('offer','public','Карточка предложения','/offer/2231-futbolki-180',offer);

/* ---------------- Главная ---------------- */
function home(){
  const cats=[['Текстиль','214 предложений · от 96 ₽','A'],['Косметика и БАДы','86 · от 45 ₽','C'],['Свечи и декор','132 · от 120 ₽','C'],['Упаковка','167 · от 8 ₽','D'],['Металлоконструкции','58 · от 1 900 ₽','B'],['Пищевое производство','73 · от 32 ₽','D'],['Мебель','41 · от 3 400 ₽','B'],['Пластик и литьё','64 · от 14 ₽','A']];
  return header({noCat:true})+`<main class="wrap">
  <section class="hero">
    <div class="hero-main">
      <span class="tag disc">Свободная мощность −15 %</span>
      <h1>Произведите партию под своим брендом — от 200 штук</h1>
      <p>Ищите не завод, а продукт. Цена за штуку, минимальная партия и срок видны сразу. Деньги — в эскроу до приёмки.</p>
      <div class="hero-search"><input id="hq" placeholder="Например: худи оверсайз 300 шт с вышивкой"><a class="btn cta lg" href="#catalog">Найти производство</a></div>
      <div class="hero-facts"><div><b>38</b><span>фабрик с аудитом</span></div><div><b>1 060</b><span>предложений</span></div><div><b>16 дней</b><span>средний срок партии</span></div><div><b>48,2 млн ₽</b><span>прошло через эскроу</span></div></div>
    </div>
    <aside class="hero-side">
      <h3>Как это работает</h3>
      <ol class="how-mini"><li><b>Выберите предложение</b><span>цена и MOQ — в выдаче</span></li><li><b>Соберите партию</b><span>объём, цвета, макет печати</span></li><li><b>Оплатите в эскроу</b><span>фабрика получит деньги после приёмки</span></li><li><b>Следите за цехом</b><span>проценты, фотоотчёты, чат с технологом</span></li></ol>
      <a class="btn wide" href="#how">Подробнее</a>
    </aside>
  </section>

  <div class="sec-h"><h2>Категории</h2><a href="#catalog">Весь каталог →</a></div>
  <div class="cat-tiles">${cats.map(c=>`<a class="cat-tile" href="#catalog">${ph(c[2])}<div><b>${c[0]}</b><span>${c[1]}</span></div></a>`).join('')}</div>

  <div class="promo-band"><div><span class="tag disc">−15 %</span><h2>Недозагруженные линии на октябрь</h2><p>Фабрики дают скидку на свободные недели. Срок тот же, аудит пройден, эскроу работает.</p></div><a class="btn cta lg" href="#catalog">Смотреть 112 предложений</a></div>

  <div class="sec-h"><h2>Популярное в текстиле</h2><a href="#catalog">Все 214 →</a></div>
  <div class="grid g6">${D.offers.map(card).join('')}</div>

  <div class="sec-h"><h2>Фабрики с аудитом</h2><a href="#factory-page">Все заводы →</a></div>
  <div class="fac-row">${[['Волна','Иваново','4,8','87','швейное · с 2014'],['Формат','Тула','4,9','143','свечи, гипс · с 2017'],['Пошив37','Иваново','4,7','64','сумки, шоперы · с 2019'],['Ткань+','Кострома','4,6','41','трикотаж · с 2011']].map(f=>`<a class="fac-tile" href="#factory-page"><i>${f[0][0]}</i><div><b>«${f[0]}»</b><span class="muted small">${f[1]} · ${f[4]}</span><span class="rating">${f[2]} <span>· ${f[3]} заказов</span></span></div><span class="tag ok">аудит</span></a>`).join('')}</div>

  <div class="trust"><div><i class="sh"></i><b>Эскроу</b><span>Оплата резервируется платформой и уходит фабрике после вашей приёмки.</span></div><div><i class="ck"></i><b>Аудит фабрик</b><span>Проверяем юрлицо, цех, оборудование и образцы. Дата аудита — в карточке.</span></div><div><i class="ey"></i><b>Прозрачное производство</b><span>Проценты, фотоотчёты и чат с технологом вместо «менеджер перезвонит».</span></div><div><i class="rp"></i><b>Повтор в один клик</b><span>Спецификация сохраняется. Повторная партия — со скидкой 9 %.</span></div></div>
  </main>`+footer();
}
screen('home','public','Главная','/',home);
SCREENS.unshift(SCREENS.pop()); // главная — первой

/* ---------------- Каталог списком ---------------- */
function catalogList(){
  const f=D.filters;
  return header()+`<main class="wrap">
  ${crumbs(['Главная','home'],['Каталог','catalog'],['Текстиль','catalog'],'Футболки и худи')}
  <h1 style="margin-bottom:6px">Футболки и худи под СТМ <span class="muted" style="font:400 14px var(--body)">${f.found} предложений</span></h1>
  <div class="chips"><span class="chip on">MOQ ${f.moq} ×</span><span class="chip on">${f.region} ×</span><span class="chip on">${f.lead} ×</span><span class="chip on">Аудит ×</span><span class="chip">Все фильтры · 5</span></div>
  <div class="res-head"><div class="sorts"><a href="#catalog-list">Популярные</a><a class="on" href="#catalog-list">Дешевле</a><a href="#catalog-list">Быстрее</a><a href="#catalog-list">Рейтинг</a><a href="#catalog-list">Свободнее</a></div><div class="view"><a href="#catalog">▦</a><a class="on" href="#catalog-list">☰</a></div></div>
  <div class="rows">${[...D.offers].sort((a,b)=>a.price-b.price).map((o,i)=>`<div class="rowc">
    <a href="#offer">${ph(o.tone,'фото')}</a>
    <div class="rc-main"><div class="row" style="gap:6px">${o.audit?'<span class="tag ok">аудит</span>':''}${i===0?'<span class="tag hot">Хит</span>':''}${o.free>60?'<span class="tag disc">−15 % мощность</span>':''}</div><a class="rc-t" href="#offer">${o.title}</a><div class="muted small">${o.material}</div><div class="fac"><b>«${o.factory}»</b>, ${o.city} · <span class="rating">${o.rating} <span>· ${o.reviews} отзывов</span></span></div></div>
    <div class="rc-tiers"><div><b class="num">${o.price+47} ₽</b><span>от ${num(o.moq)}</span></div><div><b class="num">${o.price+33} ₽</b><span>от 1 000</span></div><div class="best"><b class="num">${o.price} ₽</b><span>от 3 000</span></div></div>
    <div class="rc-meta"><div>MOQ <b class="num">${num(o.moq)} шт</b></div><div>Срок <b>от ${o.lead} дн.</b></div><div>Свободно <b>${o.free} %</b><span class="mini"><i style="width:${o.free}%"></i></span></div><div class="${i%2?'muted':'smp'}">${i%2?'Образец недоступен':'Образец 1 500 ₽'}</div></div>
    <div class="rc-act"><a class="btn cta" href="#offer">Рассчитать</a><div class="row" style="gap:4px"><a class="btn ghost sm" href="#compare">⇄</a><a class="btn ghost sm" href="#favorites">♡</a></div></div>
  </div>`).join('')}</div>
  <div style="text-align:center;padding:22px 0"><button class="btn ghost">Показать ещё 36</button></div>
  </main>`;
}
screen('catalog-list','public','Каталог · список','/catalog/tekstil/futbolki?view=list&sort=price_asc',catalogList);

/* ---------------- Сравнение ---------------- */
function compare(){
  const o=D.offers.slice(0,4);
  const rows=[
    ['Цена от 500 шт',x=>`<b class="num">${x.price+47} ₽</b>`,x=>x.price],
    ['Цена от 1 000 шт',x=>`<b class="num">${x.price+33} ₽</b>`,x=>x.price],
    ['Цена от 3 000 шт',x=>`<b class="num">${x.price} ₽</b>`,x=>x.price],
    ['Партия 1 000 шт с доставкой',x=>`<b class="num">${rub((x.price+33)*1000+15400)}</b>`,x=>x.price],
    ['Минимальная партия',x=>`${num(x.moq)} шт`,x=>x.moq],
    ['Срок производства',x=>`от ${x.lead} раб. дней`,x=>x.lead],
    ['Свободно в сентябре',x=>`${x.free} % <span class="mini"><i style="width:${x.free}%"></i></span>`,x=>-x.free],
    ['Материал',x=>x.material],
    ['Рейтинг фабрики',x=>`<span class="rating">${x.rating} <span>· ${x.reviews}</span></span>`,x=>-x.rating],
    ['Аудит платформы',x=>x.audit?'<span class="tag ok">пройден</span>':'<span class="tag done">нет</span>'],
    ['Образец',(x,i)=>i%2?'<span class="muted">недоступен</span>':'1 500 ₽ · 5 дней'],
    ['Регион',x=>x.city],
  ];
  return header()+`<main class="wrap">
  ${crumbs(['Главная','home'],['Каталог','catalog'],'Сравнение')}
  ${pageH('Сравнение предложений','4 из 4 · лучшее значение в строке подсвечено',`<label class="row small"><input type="checkbox" checked> Только различия</label><button class="btn ghost">Очистить</button>`)}
  <div class="box cmp-wrap"><table class="cmp"><thead><tr><th></th>${o.map(x=>`<th><a href="#offer">${ph(x.tone,'фото')}</a><a class="cmp-t" href="#offer">${x.title}</a><div class="muted small">«${x.factory}», ${x.city}</div><a class="btn cta sm wide" href="#offer">Рассчитать партию</a><a class="rm" href="#compare">убрать ×</a></th>`).join('')}</tr></thead>
  <tbody>${rows.map(r=>{const best=r[2]?Math.min(...o.map(r[2])):null;return `<tr><td>${r[0]}</td>${o.map((x,i)=>`<td class="${r[2]&&r[2](x)===best?'best':''}">${r[1](x,i)}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>
  <p class="muted small" style="margin-top:10px">Цены — за штуку при шелкографии в 2 цвета, без НДС. Итог партии — с доп. цветом и доставкой до склада WB.</p>
  </main>`;
}
screen('compare','public','Сравнение','/compare?ids=2231,2204,2187,2160',compare);

/* ---------------- Витрина завода ---------------- */
function factoryPage(){
  const f=D.offerDetail.factory, mine=D.offers.filter(o=>o.factory==='Волна');
  return header({noCat:true})+`<main class="wrap">
  ${crumbs(['Главная','home'],['Заводы','factory-page'],'«Волна»')}
  <div class="box fp-head">
    <div class="fp-logo">В</div>
    <div><div class="row" style="gap:6px"><span class="tag ok">аудит платформы ${f.audit}</span><span class="tag new">отвечает за 40 мин</span></div><h1>Швейная фабрика «${f.name}»</h1><div class="muted">${f.city} · производство с ${f.since} года · ${f.workers} сотрудников · на платформе ${f.onPlatform}</div>
      <div class="fp-stats"><div><b><span class="rating">${f.rating}</span></b><span>${f.reviews} отзывов</span></div><div><b>${f.completed}</b><span>заказов выполнено</span></div><div><b>97 %</b><span>отгружено в срок</span></div><div><b>1 спор</b><span>из 87, решён в пользу заказчика</span></div><div><b>${num(f.capacityMonth)}</b><span>ед./мес мощность</span></div><div><b>38 %</b><span>свободно в сентябре</span></div></div></div>
    <div class="fp-act"><button class="btn cta">Задать вопрос</button><button class="btn ghost">♡ В избранное</button></div>
  </div>
  <div class="tabs"><a class="on" href="#factory-page">Предложения ${mine.length+1}</a><a href="#factory-page">О производстве</a><a href="#factory-page">Отзывы ${f.reviews}</a><a href="#factory-page">Аудит и сертификаты</a></div>
  <div class="cols-side">
    <div><div class="grid g4">${[...mine,D.offers[1]].map(card).join('')}</div>
      <h2 style="margin:20px 0 10px">О производстве</h2>
      <div class="box"><p style="margin:0 0 10px">Полный цикл: раскрой, пошив, печать (шелкография до 6 цветов, DTF), вышивка, маркировка «Честный знак», упаковка и отгрузка на склады маркетплейсов. Две линии: футболки/поло и худи/свитшоты.</p><div class="gal4">${ph('B','цех')}${ph('A','раскрой')}${ph('A','печать')}${ph('D','склад')}</div></div>
    </div>
    <aside><div class="box"><h3>Аудит платформы</h3><dl class="kv" style="grid-template-columns:1fr auto;margin-top:8px"><dt>Юрлицо и реквизиты</dt><dd>✓</dd><dt>Выезд в цех</dt><dd>✓</dd><dt>Оборудование и штат</dt><dd>✓</dd><dt>Контрольные образцы</dt><dd>✓</dd><dt>Действителен до</dt><dd>12.06.2027</dd></dl></div>
      <div class="box" style="margin-top:12px"><h3>Загрузка по неделям</h3><div class="sales" style="height:70px">${D.factory.capacityWeeks.map(w=>`<div class="${w.pct<30?'low':''}"><i style="height:${w.pct}%"></i>${w.w}</div>`).join('')}</div><p class="muted small" style="margin:8px 0 0">Оранжевым — недозагруз: действует скидка −15 %.</p></div></aside>
  </div></main>`+footer();
}
screen('factory-page','public','Витрина завода','/factory/17-volna',factoryPage);

/* ---------------- Как это работает ---------------- */
function how(){
  const st=[['Найдите продукт','Поиск по «что произвести», а не по заводу. В выдаче сразу цена за штуку, MOQ, срок и свободная мощность.'],['Соберите партию','Конструктор из параметров, заданных фабрикой: нельзя заказать то, что завод не умеет. Макет проверяет технолог.'],['Оплатите в эскроу','Счёт от платформы. Деньги резервируются и уходят фабрике только после вашей приёмки. Оферта и спецификация — автоматически.'],['Следите за производством','Этапы, проценты, фотоотчёты, чат с технологом. Вся история привязана к заказу.'],['Примите партию','5 рабочих дней на проверку. Претензия — спор решает платформа по спецификации и фотоотчётам.'],['Повторите в один клик','Спецификация сохранена. Повторная партия у той же фабрики — со скидкой 9 %.']];
  return header({noCat:true})+`<main class="wrap narrow">
  <div class="lp-h"><h1>Как устроена сделка на «Партии»</h1><p>От поиска до повторной партии — шесть шагов, ни одного звонка и предоплаты незнакомому заводу.</p></div>
  <div class="lp-steps">${st.map((s,i)=>`<div class="box"><span class="n">${i+1}</span><h3>${s[0]}</h3><p class="muted">${s[1]}</p></div>`).join('')}</div>
  <div class="box lp-esc"><div><h2>Эскроу: куда идут деньги</h2><p class="muted">Платформа не держит деньги у себя — расчёты идут через банк-партнёр.</p></div>
    <div class="flow"><div><b>Вы</b><span>оплата по счёту</span></div><i>→</i><div class="hi"><b>Эскроу</b><span>резерв до приёмки</span></div><i>→</i><div><b>Фабрика</b><span>92 % после приёмки</span></div><i>+</i><div><b>Платформа</b><span>комиссия 8 %</span></div></div></div>
  <h2 style="margin:24px 0 10px">Частые вопросы</h2>
  ${[['Что если фабрика сорвёт срок?','Каждый день просрочки фиксируется в журнале заказа. Вы можете открыть спор; до его решения выплата фабрике заблокирована.'],['Можно заказать образец?','Да, если фабрика его предлагает: от 1 500 ₽, 5 рабочих дней. Стоимость образца зачитывается в первую партию.'],['Кто отвечает за качество?','Фабрика — по спецификации. Платформа — за то, чтобы деньги не ушли до приёмки, и за арбитраж.'],['Какие документы я получу?','Договор-оферта, спецификация, счёт, УПД и акт приёмки. Подписание по ЭДО.']].map((q,i)=>`<details class="faq" ${i===0?'open':''}><summary>${q[0]}</summary><p class="muted">${q[1]}</p></details>`).join('')}
  <div class="lp-cta"><a class="btn cta lg" href="#catalog">Перейти в каталог</a><a class="btn lg" href="#register">Зарегистрировать компанию</a></div>
  </main>`+footer();
}
screen('how','public','Как это работает','/how-it-works',how);

/* ---------------- Заводам ---------------- */
function forFactories(){
  return header({noCat:true})+`<main class="wrap narrow">
  <div class="lp-h"><span class="tag new">для производств</span><h1>Продавайте свободную мощность как товар на маркетплейсе</h1><p>Выкладываете предложение — с ценой по объёму, MOQ и сроком. Заказы приходят оплаченными: деньги уже в эскроу.</p><div class="lp-cta"><a class="btn cta lg" href="#onboarding-factory">Подключить завод</a><a class="btn lg" href="#seller-home">Посмотреть кабинет</a></div></div>
  <div class="kpis">${kpi('Комиссия','8 %','только с выполненных заказов')}${kpi('Выплата','1–2 дня','после приёмки партии')}${kpi('Заказов в месяц','≈ 340','по платформе, сентябрь')}${kpi('Средний чек','212 000 ₽','текстиль')}</div>
  <div class="lp-steps">${[['Витрина вместо тендеров','Не нужно отвечать на запросы и считать КП. Один раз описали SKU — платформа сама считает партию заказчику.'],['Только оплаченные заказы','Заказ попадает к вам после резервирования денег. У вас — время до конца рабочего дня, чтобы подтвердить.'],['Платформа не даст перебрать','Вы задаёте план мощности. Продаётся только свободный остаток; недозагруз можно продвигать скидкой.'],['Меньше переписки','Макет, параметры, документы и чат — в заказе. Статусы стандартные: заказчик видит их сам.'],['Аудит = доверие','Проходите проверку один раз в год — получаете бейдж и приоритет в выдаче.'],['Аналитика как у селлера','Просмотры, сравнения, конверсия в заказ по каждому предложению.']].map((s,i)=>`<div class="box"><span class="n">${i+1}</span><h3>${s[0]}</h3><p class="muted">${s[1]}</p></div>`).join('')}</div>
  <div class="lp-cta"><a class="btn cta lg" href="#onboarding-factory">Начать подключение · 15 минут</a></div>
  </main>`+footer();
}
screen('for-factories','public','Лендинг для заводов','/for-factories',forFactories);

/* ---------------- Карта экранов ---------------- */
function map(){
  return headerSlim('<span class="muted-w">Макет «Лента» · все экраны</span>')+`<main class="wrap">
  ${pageH('Карта экранов',`${SCREENS.length-1} экранов в 7 зонах. Навигация: панель внизу, Alt+←/→ — листать.`)}
  ${GROUPS.map(([g,l])=>`<h2 class="map-h">${l} <span class="muted">${SCREENS.filter(x=>x.group===g&&x.id!=='map').length}</span></h2><div class="map-grid">${SCREENS.filter(x=>x.group===g&&x.id!=='map').map(x=>`<a class="box map-i" href="#${x.id}"><b>${x.label}</b><span class="muted small">${x.url}</span>${['catalog','offer','checkout','tracking','customer','factory'].includes(x.id)?'<span class="tag done">из макета v1</span>':'<span class="tag new">новый</span>'}</a>`).join('')}</div>`).join('')}
  </main>`;
}
screen('map','public','Карта экранов','/__map',map);
