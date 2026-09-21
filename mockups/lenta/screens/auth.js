/* Макет «Лента» · auth. Экраны регистрируются через screen(id, группа, название, url, render). */

const authShell = (body, side) => headerSlim('<a class="link-w" href="#how">Как это работает</a>') + `<main class="wrap auth-wrap"><div class="auth">${body}</div>${side ? `<aside class="auth-side">${side}</aside>` : ''}</main>`;
const authSide = `<h3>Зачем регистрировать компанию</h3><ul class="ticks"><li>Счета, оферта и УПД — на ваше юрлицо</li><li>Оплата в эскроу по безналу</li><li>Сотрудники с ролями: закупщик, бухгалтер</li><li>Сравнение и избранное сохранятся из этой сессии</li></ul>`;

/* ---------------- Вход ---------------- */
function login(){
  return authShell(`<h1>Вход</h1><p class="muted">По телефону или рабочей почте. Пароль не нужен — пришлём код.</p>
    <div class="seg wide" style="margin:14px 0"><a class="on">Телефон</a><a>Почта</a></div>
    ${fld('Телефон','+7 916 000-12-34',{wide:true})}
    <a class="btn cta lg wide" href="#login-otp">Получить код</a>
    <p class="muted small" style="text-align:center;margin:14px 0 0">Нет аккаунта? <a class="lnk" href="#register">Зарегистрировать компанию</a> · <a class="lnk" href="#for-factories">Я завод</a></p>`, authSide);
}
screen('login','auth','Вход','/login',login);

function loginOtp(){
  return authShell(`<a class="lnk small" href="#login">‹ Изменить номер</a><h1 style="margin-top:8px">Код из SMS</h1><p class="muted">Отправили на +7 916 ···-12-34</p>
    <div class="otp">${['4','8','1','','',''].map((d,i)=>`<input value="${d}" maxlength="1" class="${i===3?'focus':''}" aria-label="цифра ${i+1}">`).join('')}</div>
    <p class="muted small">Отправить повторно через 0:42</p>
    <h3 style="margin-top:18px">Выберите организацию</h3><p class="muted small" style="margin:2px 0 8px">Ваш номер привязан к двум компаниям</p>
    <a class="org on" href="#customer"><i>К</i><div><b>ООО «Кора»</b><span>Заказчик · владелец</span></div><span>›</span></a>
    <a class="org" href="#seller-home"><i>В</i><div><b>ООО «Волна»</b><span>Завод · менеджер</span></div><span>›</span></a>`, authSide);
}
screen('login-otp','auth','Код и выбор организации','/login/verify',loginOtp);

/* ---------------- Регистрация компании ---------------- */
function register(){
  return authShell(`<h1>Регистрация компании</h1><p class="muted">Введите ИНН — остальное подтянем из ЕГРЮЛ.</p>
    <div class="hsteps"><span class="done">1 Контакт</span><span class="on">2 Компания</span><span>3 Роль</span></div>
    ${fld('ИНН','7701234567',{wide:true,req:true,hint:'✓ Найдено в ЕГРЮЛ · действующее'})}
    <div class="found"><b>ООО «Кора»</b><dl class="kv"><dt>КПП</dt><dd class="num">770101001</dd><dt>ОГРН</dt><dd class="num">1157746000000</dd><dt>Адрес</dt><dd>Москва, ул. Лесная, 9</dd><dt>Руководитель</dt><dd>Кораблёва А. С.</dd><dt>Налоговый режим</dt><dd>УСН</dd></dl></div>
    <h3 style="margin-top:14px">Что будете делать на платформе</h3>
    <div class="pick"><label class="on"><input type="radio" name="r" checked><b>Заказывать производство</b><span>бренд, селлер, ритейл</span></label><label><input type="radio" name="r"><b>Принимать заказы</b><span>завод, цех, фабрика</span></label></div>
    <label class="row small" style="margin:12px 0"><input type="checkbox" checked> Принимаю оферту платформы и политику обработки данных</label>
    <a class="btn cta lg wide" href="#customer">Создать компанию</a>
    <p class="muted small" style="text-align:center;margin:12px 0 0">Реквизиты для оплаты добавите при первом заказе</p>`, authSide);
}
screen('register','auth','Регистрация компании','/register',register);

/* ---------------- Подключение завода ---------------- */
function onboardingFactory(){
  const steps=[['Компания','ИНН, реквизиты','done'],['Производство','профиль и фото','done'],['Мощность','план на месяц','on'],['Первое предложение','SKU с ценой',''],['Аудит','заявка на проверку','']];
  return headerSlim('<a class="link-w" href="#seller-home">Сохранить и выйти</a>')+`<main class="wrap narrow">
  ${pageH('Подключение завода','Шаг 3 из 5 · примерно 4 минуты')}
  <div class="hsteps big">${steps.map((s,i)=>`<span class="${s[2]}"><b>${s[2]==='done'?'✓':i+1}</b>${s[0]}<em>${s[1]}</em></span>`).join('')}</div>
  <div class="cols-side">
    <div class="box"><h2>Сколько вы можете произвести</h2><p class="muted" style="margin:4px 0 14px">Платформа продаёт только свободный остаток и не даст принять заказов больше плана. Считаем в условных единицах — «эквивалент футболки».</p>
      <div class="fgrid">${fld('Мощность в месяц, усл. ед.','40 000',{req:true,hint:'Сколько базовых изделий отшивает цех за месяц'})}${fld('Уже занято вне платформы','12 000',{hint:'Свои клиенты, гос. заказ и т. п.'})}</div>
      <h3 style="margin:16px 0 8px">Коэффициенты изделий</h3>
      <table class="tb"><thead><tr><th>Тип изделия</th><th class="r">Коэффициент</th><th class="r">Макс. в месяц</th></tr></thead><tbody>${[['Футболка','1,0','28 000'],['Поло','1,4','20 000'],['Худи / свитшот','2,4','11 600'],['Шопер','0,6','46 600']].map(r=>`<tr><td class="t">${r[0]}</td><td class="r"><input class="inp sm" value="${r[1]}"></td><td class="r num s">${r[2]}</td></tr>`).join('')}</tbody></table>
      ${alertBox('info','Это можно уточнить позже','Понедельный план и отдельные линии настраиваются в разделе «Мощность» кабинета.')}
      <div class="row between" style="margin-top:16px"><a class="btn" href="#onboarding-factory">‹ Назад</a><a class="btn cta lg" href="#seller-offer-edit">Дальше: первое предложение</a></div></div>
    <aside><div class="box"><h3>Что будет видно заказчикам</h3><div class="kpi" style="padding:12px 0 0"><span>Свободно в сентябре</span><b>70 %</b><span class="d">28 000 из 40 000 усл. ед.</span></div><div class="bar" style="margin-top:8px"><i style="width:30%"></i></div></div>
      <div class="box" style="margin-top:12px"><h3>После подключения</h3><ul class="ticks"><li>Предложения уходят на модерацию · до 1 раб. дня</li><li>Аудит: выезд в цех, 3–5 дней</li><li>До аудита вы в выдаче без бейджа</li></ul></div></aside>
  </div></main>`;
}
screen('onboarding-factory','auth','Подключение завода','/seller/onboarding/capacity',onboardingFactory);
