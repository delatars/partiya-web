/* Макет «Лента» — общие хелперы, реестр экранов, роутер, панель макета.
   Без сборки: экраны регистрируются из screens/*.js через screen(). */
const D = window.PARTIYA;
const $ = (s) => document.querySelector(s);
const tag = (s, cls) => `<span class="tag ${cls || D.statusColor[s] || 'done'}">${s}</span>`;
const ph = (t, l = '', extra = '') => `<div class="ph ${t}">${l}${extra}</div>`;
const crumbs = (...p) => `<div class="crumbs">${p.map((x, i) => i < p.length - 1 ? `<a href="#${x[1]}">${x[0]}</a> › ` : x).join('')}</div>`;

/* ---------- реестр ---------- */
const GROUPS = [
  ['public', 'Витрина'], ['deal', 'Сделка'], ['auth', 'Вход'], ['account', 'Заказчик'],
  ['seller', 'Завод'], ['states', 'Состояния'], ['admin', 'Бэк-офис'],
];
const SCREENS = [];
function screen(id, group, label, url, render, opts = {}) { SCREENS.push({ id, group, label, url, render, ...opts }); }

/* ---------- шапки ---------- */
function header(o = {}) {
  return `<header class="top"><div class="wrap">
    <a class="logo" href="#home"><i></i>${D.brand.name}</a>
    <a class="catbtn" href="#catalog">☰ <span>Каталог</span></a>
    <div class="search"><input id="q" value="${o.q || ''}" placeholder="Что произвести? футболки, худи, свечи, БАДы, металлокаркас…"><select id="qc"><option>Все категории</option>${D.categories.map(c => `<option>${c}</option>`).join('')}</select><button>Найти</button></div>
    <div class="icons">${o.guest
      ? `<a href="#compare"><i></i>Сравнение</a><a href="#login"><i></i>Войти</a>`
      : `<a href="#compare"><i></i>Сравнение<span class="b">2</span></a><a href="#favorites"><i></i>Избранное</a><a href="#customer"><i></i>Заказы<span class="b">3</span></a><a href="#notifications"><i></i>Уведомления<span class="b">4</span></a><a href="#company"><i></i>Кабинет</a>`}</div>
  </div></header>
  <div class="menu"><div class="wrap">${D.categories.map((c, i) => `<a class="${i === 0 && !o.noCat ? 'on' : ''}" href="#catalog">${c}</a>`).join('')}<a href="#factory-page">Заводы</a><a class="promo" href="#catalog">Свободная мощность −15 %</a><a href="#how">Как это работает</a><a href="#for-factories">Заводам</a></div></div>`;
}
function headerSlim(right = '') {
  return `<header class="top slim"><div class="wrap"><a class="logo" href="#home"><i></i>${D.brand.name}</a><span class="sp"></span>${right}</div></header>`;
}
function footer() {
  return `<footer class="foot"><div class="wrap"><div><b>${D.brand.name}</b><p class="muted small">Маркетплейс производственных мощностей. Оплата через эскроу, производство под контролем.</p></div>
  <div><h4>Заказчикам</h4><a href="#catalog">Каталог</a><a href="#how">Как это работает</a><a href="#sample">Образцы</a><a href="#how">Эскроу и споры</a></div>
  <div><h4>Заводам</h4><a href="#for-factories">Подключить завод</a><a href="#onboarding-factory">Аудит платформы</a><a href="#for-factories">Комиссия</a></div>
  <div><h4>Платформа</h4><a href="#how">Оферта</a><a href="#how">Политика данных</a><a href="#how">Поддержка</a></div></div></footer>`;
}

/* ---------- боковые меню кабинетов ---------- */
const CUST_NAV = [['customer', 'Заказы', 14], ['tracking', 'Трекинг'], ['repeat', 'Повторные партии', 2], ['samples', 'Образцы', 1], ['compare', 'Сравнение', 2], ['favorites', 'Избранное', 5], ['documents', 'Документы и ЭДО'], ['escrow', 'Эскроу и счета'], ['company', 'Компания'], ['notifications', 'Уведомления', 4]];
const SELL_NAV = [['seller-home', 'Сводка'], ['seller-offers', 'Предложения', 3], ['factory', 'Заказы', 4], ['seller-samples', 'Запросы образцов', 2], ['seller-capacity', 'Мощность'], ['seller-finance', 'Финансы'], ['seller-feedback', 'Отзывы и вопросы', 5], ['seller-audit', 'Аудит и документы'], ['company', 'Компания']];
const sideNav = (items, active, user) => `<aside class="side">${user}${items.map(([id, l, c]) => `<a class="${id === active ? 'on' : ''}" href="#${id}">${l}${c ? `<span class="c">${c}</span>` : ''}</a>`).join('')}</aside>`;
const custNav = (a) => sideNav(CUST_NAV, a, `<div class="u"><i>К</i><div><b>${D.customer.company}</b><div class="muted small">Заказчик · ИНН 7701234567</div></div></div>`);
const sellerNav = (a) => sideNav(SELL_NAV, a, `<div class="u"><i>В</i><div><b>«${D.factory.name}»</b><div class="muted small">Завод · ${D.factory.city}</div></div></div>`);
const cabinet = (nav, body) => header({ noCat: true }) + `<main class="wrap" style="padding-top:12px"><div class="cab-layout">${nav}<section>${body}</section></div></main>`;

/* ---------- карточка оффера ---------- */
const card = (o, i) => `<a class="card" href="#offer">
  ${ph(o.tone, 'фото', `<div class="bd">${i === 0 ? '<span class="tag hot">Хит</span>' : ''}${i === 2 ? '<span class="tag disc">−15 % мощность</span>' : ''}${o.audit ? '<span class="tag ok">аудит</span>' : ''}</div><div class="acts"><span class="${i < 2 ? 'on' : ''}">⇄</span><span>♡</span></div>`)}
  <div class="b">
    <div class="pr"><span class="price num">${o.price} ₽</span>${i === 2 ? `<span class="old num">${o.price + 37} ₽</span>` : ''}<span class="muted small">/шт от ${num(o.moq)}</span></div>
    <div class="t">${o.title}</div>
    <div class="rating">${o.rating} <span>· ${o.reviews} отзывов · ${Math.round(o.reviews * .7)} заказов</span></div>
    <div class="m">MOQ <b>${num(o.moq)}</b> · срок <b>от ${o.lead} дн.</b> · свободно <b>${o.free} %</b></div>
    <div class="fac"><b>«${o.factory}»</b>, ${o.city}</div>
    ${i % 2 === 0 ? '<div class="smp">Образец за 1 500 ₽ · 5 дней</div>' : '<div class="smp muted">Образец недоступен</div>'}
    <span class="btn cta">Рассчитать партию</span>
  </div></a>`;

/* ---------- мелкие строительные блоки ---------- */
const kpi = (l, v, d = '', cls = '') => `<div class="kpi"><span>${l}</span><b class="num">${v}</b>${d ? `<span class="d ${cls}">${d}</span>` : ''}</div>`;
const pageH = (h, sub = '', actions = '') => `<div class="page-h"><div><h1>${h}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div><div class="row">${actions}</div></div>`;
const fld = (l, v, o = {}) => `<div class="fld ${o.wide ? 'wide' : ''}"><label>${l}${o.req ? ' <i>*</i>' : ''}</label>${o.select ? `<select>${o.select.map(x => `<option>${x}</option>`).join('')}</select>` : o.area ? `<textarea rows="${o.area}">${v}</textarea>` : `<input value="${v}" ${o.ro ? 'readonly' : ''} placeholder="${o.ph || ''}">`}${o.hint ? `<span class="hint ${o.err ? 'err' : ''}">${o.hint}</span>` : ''}</div>`;
const alertBox = (kind, title, text, action = '') => `<div class="alert ${kind}"><i></i><div><b>${title}</b><div>${text}</div></div>${action}</div>`;
const tabbar = (items, on = 0) => `<div class="tabbar">${items.map((x, i) => `<a class="${i === on ? 'on' : ''}" href="${location.hash || '#'}">${x}</a>`).join('')}</div>`;
const empty = (title, text, action = '') => `<div class="empty"><div class="ill"></div><h3>${title}</h3><p class="muted">${text}</p>${action}</div>`;

/* ---------- роутер и панель макета ---------- */
function route() {
  const id = (location.hash || '#home').slice(1);
  const s = SCREENS.find(x => x.id === id) || SCREENS.find(x => x.id === 'home');
  document.body.className = s.bodyClass || '';
  $('#app').innerHTML = s.render();
  const idx = SCREENS.indexOf(s);
  $('#sw-groups').innerHTML = GROUPS.map(([g, l]) => `<button data-g="${g}" class="${g === s.group ? 'on' : ''}">${l}<span>${SCREENS.filter(x => x.group === g).length}</span></button>`).join('');
  $('#sw-cur').innerHTML = `<a href="#${SCREENS[(idx - 1 + SCREENS.length) % SCREENS.length].id}" title="предыдущий">‹</a><b>${idx + 1}/${SCREENS.length} · ${s.label}</b><a href="#${SCREENS[(idx + 1) % SCREENS.length].id}" title="следующий">›</a>`;
  $('#url').textContent = s.url.startsWith('/') ? D.brand.domain + s.url : s.url;
  $('#sw-pop').hidden = true;
  document.title = `Партия · ${s.label}`;
  window.scrollTo(0, 0);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('#sw-groups button');
  const pop = $('#sw-pop');
  if (b) {
    const g = b.dataset.g, cur = (location.hash || '#home').slice(1);
    if (!pop.hidden && pop.dataset.g === g) { pop.hidden = true; return; }
    pop.dataset.g = g;
    pop.innerHTML = SCREENS.filter(x => x.group === g).map(x => `<a class="${x.id === cur ? 'on' : ''}" href="#${x.id}">${x.label}<span>${x.url}</span></a>`).join('');
    pop.style.left = b.getBoundingClientRect().left + 'px';
    pop.hidden = false;
  } else if (!e.target.closest('#sw-pop')) pop.hidden = true;
});
addEventListener('hashchange', route);
addEventListener('DOMContentLoaded', route);
addEventListener('keydown', (e) => { if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const a = $('#sw-cur').querySelectorAll('a')[e.key === 'ArrowRight' ? 1 : 0]; location.hash = a.getAttribute('href'); } });
