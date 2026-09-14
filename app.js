/*
 * Экраны страницы-ассистента. Данные и правила — в `ProtekApi` (сейчас
 * подставной `demo-api.js`, потом клиент сервера `app/web`); здесь только
 * показ и нажатия. Можно ли оформлять, какой у строки значок и что делать
 * дальше, решает не браузер.
 *
 * Порядок экранов тот же, что у бота в Telegram, а раскладка своя: в
 * браузере влезает таблица, поэтому наименования и коды печатаются целиком,
 * а не обрезаются на кнопках.
 */
(function () {
  "use strict";

  const api = window.ProtekApi;
  const $ = (selector, root = document) => root.querySelector(selector);
  const main = $("#main");
  const logList = $("#log");

  const GLYPH = { ok: "✓", attention: "!", retry: "↻", missing: "×" };
  const MARK_TITLE = {
    ok: "Готово — можно оформлять",
    attention: "Решается здесь: выбрать вариант, подтвердить или задать количество",
    retry: "Портал не ответил — повторить",
    missing: "В каталоге нет",
  };
  const TALLY = [["all", "все"], ["ok", "готово"], ["attention", "выбрать"],
                 ["retry", "повторить"], ["missing", "нет в каталоге"]];

  const ui = {
    view: "card",        // intake | parsing | card | ordered | closed
    card: null,          // карточка от ProtekApi — единственный источник правды
    filter: "all",
    open: null,          // номер раскрытой строки
    mode: {},            // номер строки → analog | link | custom | qty
    error: null,         // {number, text} — ошибка у формы строки
    busy: false,
    step: "",
    files: [],           // что уже пришло файлами по этой заявке
    invoice: null,
    intake: { text: "", file: null, kind: "text", error: "" },
    steps: [],
  };

  // --- мелочи ------------------------------------------------------------

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const money = (value) => (value == null ? "—"
    : value.toLocaleString("ru-RU", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " ₽");
  const qty = (value) => (value == null ? "?" : String(Number(value.toFixed(3))).replace(".", ","));
  const toNumber = (text) => Number(String(text || "").replace(/\s/g, "").replace(",", "."));

  function plural(n, one, few, many) {
    const d10 = n % 10;
    const d100 = n % 100;
    const word = d10 === 1 && d100 !== 11 ? one
      : d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14) ? few : many;
    return `${n} ${word}`;
  }

  const live = () => ui.card && ui.card.status === "draft";

  // --- ход работы: бот проговаривает всё, что сделал сам -----------------

  function log(entries) {
    const now = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    for (const entry of entries || []) {
      const item = document.createElement("li");
      item.className = `t-${entry.tone || "plain"}`;
      item.innerHTML = `<div><time>${now}</time>${esc(entry.text)}</div>`;
      logList.append(item);
    }
    while (logList.children.length > 60) logList.firstElementChild.remove();
    // Прокручивается сам список, а не страница: иначе каждая запись уводила
    // бы экран прочь от строки, с которой работает менеджер.
    logList.scrollTop = logList.scrollHeight;
  }
  const say = (text, tone) => log([{ text, tone }]);

  function setStep(text) {
    ui.step = text;
    const slot = $("#work-text");
    if (slot) slot.textContent = text;
    if (ui.view === "parsing") renderSteps(text);
  }

  /** Долгая работа: кнопки гаснут, ход виден словами (`_Working` в боте). */
  async function run(call, after) {
    if (ui.busy) return;
    ui.busy = true;
    ui.error = null;
    ui.step = "Работаю…";
    render();
    try {
      const result = await call();
      if (result && result.draft) ui.card = result.draft;
      if (result) log(result.said);
      if (after) after(result);
      followStatus();
    } catch (error) {
      ui.error = { number: ui.open, text: error.message };
      say(error.message, "error");
    } finally {
      ui.busy = false;
      render();
    }
  }

  function followStatus() {
    if (!ui.card) return;
    const status = ui.card.status;
    if (status === "confirmed") ui.view = "ordered";
    else if (status === "draft") ui.view = "card";
    else ui.view = "closed";
  }

  // --- отрисовка ---------------------------------------------------------

  function render() {
    renderTopbar();
    renderSource();
    if (ui.view === "intake") renderIntake();
    else if (ui.view === "parsing") renderParsing();
    else if (ui.view === "ordered") renderOrdered();
    else if (ui.view === "closed") renderClosed();
    else renderCard();
    const composer = $("#composer");
    composer.querySelectorAll("button, textarea").forEach((el) => { el.disabled = ui.busy || !live(); });
    if (ui.busy) main.querySelectorAll("button, input, textarea").forEach((el) => { el.disabled = true; });
  }

  function renderTopbar() {
    const card = ui.card;
    $("#client-name").textContent = card ? card.company_name : "—";
    $("#client-inn").textContent = card ? `ИНН ${card.company_inn}` : "";
    $("#client-button").disabled = ui.busy;
    $("#new-request").disabled = ui.busy;
  }

  function renderSource() {
    const box = $("#source");
    if (ui.view === "intake" || ui.view === "parsing") {
      const text = ui.intake.file ? ui.intake.file.name : ui.intake.text;
      box.innerHTML = text ? esc(text) : `<span class="hint">Заявка ещё не прислана.</span>`;
      return;
    }
    const source = ui.card && ui.card.source;
    if (!source) { box.textContent = ""; return; }
    const chip = source.kind === "file"
      ? `<div class="file-chip"><span class="file-kind">XLSX</span><span><span class="file-name">${esc(source.fileName)}</span>` +
        `<span class="file-meta">лист «Спецификация» · текст ниже — как я его прочитал</span></span></div>`
      : "";
    box.innerHTML = chip + esc(source.text);
  }

  function tallyHtml(card) {
    return TALLY.map(([key, word]) => {
      const n = key === "all" ? card.matches.length : card.counts[key];
      const mark = key === "all" ? "" : `<span class="mark m-${key}" aria-hidden="true">${GLYPH[key]}</span>`;
      return `<button type="button" data-act="filter" data-filter="${key}" aria-pressed="${ui.filter === key}"` +
             `${n || key === "all" ? "" : " disabled"}>${mark}<b>${n}</b> ${word}</button>`;
    }).join("");
  }

  function metaHtml(candidate, match) {
    const parts = [];
    if (candidate.custom) parts.push(`<span class="tag tag-custom">своя позиция</span>`);
    if (match && match.analog) parts.push(`<span class="tag tag-analog">аналог</span>`);
    if (candidate.article) parts.push(`<span class="code">${esc(candidate.article)}</span>`);
    // Код производителя — то, по чему менеджер сверяет товар с заявкой.
    if (candidate.manufacturer_code) parts.push(`<span>код <span class="code">${esc(candidate.manufacturer_code)}</span></span>`);
    if (candidate.brand) parts.push(`<span>${esc(candidate.brand)}</span>`);
    if (candidate.multiplicity > 1) parts.push(`<span>кратность ${qty(candidate.multiplicity)} ${esc(candidate.unit)}</span>`);
    if (candidate.stock != null) {
      parts.push(candidate.stock > 0
        ? `<span class="stock-yes">есть на складе: ${qty(candidate.stock)}</span>`
        : `<span class="stock-no">нет на складе</span>`);
    }
    return parts.join("");
  }

  function rowHtml(match) {
    const open = ui.open === match.number;
    const position = match.position;
    const line = match.line;

    const reqNotes = [];
    if (position.article) reqNotes.push(`арт. клиента <span class="code">${esc(position.article)}</span>`);
    match.notes.forEach((note) => reqNotes.push(esc(note)));
    const reqQty = position.quantity > 0
      ? `${qty(position.quantity)} ${esc(position.unit)}`
      : `<span class="qty-none">нет</span>`;

    let product;
    if (match.chosen) {
      product = `<div class="prod-name">${esc(match.chosen.name)}</div><div class="prod-meta">${metaHtml(match.chosen, match)}</div>`;
      if (match.mark === "attention" && !match.needs_quantity) {
        product += `<div class="hint">${esc(match.reason)} · <span class="hint-act">проверить →</span></div>`;
      }
    } else if (match.mark === "retry") {
      product = `<span class="hint">Портал не ответил на поиск.</span> <span class="hint-act">Повторить →</span>`;
    } else if (match.mark === "attention") {
      product = `<span class="hint">${esc(match.reason)}.</span> <span class="hint-act">${plural(match.alternatives.length, "вариант", "варианта", "вариантов")} на выбор →</span>`;
    } else {
      product = `<span class="hint">${esc(match.reason)}.</span> <span class="hint-act">Указать ссылкой или завести свою →</span>`;
    }

    let cartQty = "—";
    let price = "";
    let sum = "";
    if (line) {
      cartQty = line.adjusted
        ? `<span class="qty-was">${qty(line.requested)}</span> ${qty(line.actual)} ${esc(line.unit)}<span class="qty-note">${esc(line.adjust_note)}</span>`
        : `${qty(line.actual)} ${esc(line.unit)}`;
      price = line.price == null ? `<span class="tag tag-request">по запросу</span>` : money(line.price);
      sum = line.total == null ? "—" : money(line.total);
    } else if (match.needs_quantity) {
      cartQty = `<span class="hint-act">задать →</span>`;
    }

    return `<tr class="row m-${match.mark}" data-number="${match.number}" tabindex="0" aria-expanded="${open}">
      <td class="c-no side-req"><span class="no"><span class="mark" title="${MARK_TITLE[match.mark]}" role="img" aria-label="${MARK_TITLE[match.mark]}">${GLYPH[match.mark]}</span>${match.number}</span></td>
      <td class="c-req side-req"><div class="req-name">${esc(position.name)}</div>${reqNotes.length ? `<div class="req-raw">${reqNotes.join(" · ")}</div>` : ""}</td>
      <td class="c-rqty side-req num">${reqQty}</td>
      <td class="c-prod edge">${product}</td>
      <td class="c-cqty num">${cartQty}</td>
      <td class="c-price num">${price}</td>
      <td class="c-sum num">${sum}</td>
    </tr>${open ? `<tr class="detail"><td colspan="7">${detailHtml(match)}</td></tr>` : ""}`;
  }

  function optionsHtml(match, analog) {
    const chosenId = match.chosen && !match.chosen.custom ? match.chosen.id : "";
    const list = [...match.alternatives];
    if (chosenId && !list.some((c) => c.id === chosenId)) list.unshift(match.chosen);
    // Наличие наверх, порядок внутри устойчивый; выбор бота помечен отдельно,
    // иначе первый номер значил бы то «бот выбрал», то «есть на складе».
    const sorted = list.map((c, i) => ({ c, i }))
      .sort((a, b) => ((b.c.stock > 0) - (a.c.stock > 0)) || a.i - b.i)
      .map((x) => x.c);
    const head = analog
      ? `<p><b>Возьмёте как аналог</b> — запомню как замену, а не как тот самый товар: в следующей заявке спрошу снова.</p>`
      : `<p class="label">Что нашлось на портале</p>`;
    const items = sorted.map((c, i) => {
      const isChosen = c.id === chosenId;
      const tag = isChosen ? `<span class="tag tag-bot">${match.confirmed ? "выбрано" : "предложение бота"}</span>` : "";
      return `<li class="option${isChosen ? " is-chosen" : ""}">
        <span class="option-no">${i + 1}.</span>
        <div><div class="option-name">${esc(c.name)} ${tag}</div><div class="option-meta">${metaHtml(c)}</div></div>
        <div class="option-acts"><span class="option-price">${c.price == null ? "по запросу" : money(c.price)}</span>
          <button type="button" class="btn btn-small${analog ? "" : " btn-primary"}" data-act="pick" data-id="${esc(c.id)}" data-analog="${analog}">${analog ? "Взять как аналог" : "Взять"}</button></div>
      </li>`;
    }).join("");
    return head + `<ul class="options">${items}</ul>`;
  }

  function qtyForm(match) {
    const position = match.position;
    const n = match.number;
    const hint = match.needs_quantity
      ? `<p class="hint">Товар найден: «${esc(match.chosen.name)}». Без количества строка в заказ не попадёт.</p>` : "";
    return `<form class="inline-form" data-form="qty">
      <div class="field"><label class="label" for="qty-${n}">Количество, ${esc(position.unit || "шт")}</label>
        <input type="number" id="qty-${n}" name="qty" min="0" step="any" inputmode="decimal" value="${position.quantity ?? ""}"></div>
      <button type="submit" class="btn btn-primary">Задать количество</button>
    </form>${hint}`;
  }

  function linkForm(match) {
    const n = match.number;
    return `<form class="inline-form" data-form="link">
      <div class="field field-grow"><label class="label" for="link-${n}">Ссылка на товар портала</label>
        <input type="text" inputmode="url" id="link-${n}" name="url" placeholder="https://…/catalog/…" autocomplete="off"></div>
      <button type="submit" class="btn btn-primary">Найти по ссылке</button>
    </form><p class="hint">Товар возьму как аналог: в следующей заявке предложу его, но молча не подставлю.</p>`;
  }

  function customForm(match) {
    const n = match.number;
    const unit = match.position.unit || "шт";
    return `<form class="inline-form" data-form="custom">
      <div class="field field-grow"><label class="label" for="cname-${n}">Название для заказа</label>
        <input type="text" id="cname-${n}" name="name" value="${esc(match.position.name)}"></div>
      <div class="field"><label class="label" for="cprice-${n}">Цена за ${esc(unit)}, ₽</label>
        <input type="number" id="cprice-${n}" name="price" min="0" step="any" inputmode="decimal"></div>
      <button type="submit" class="btn btn-primary">Завести</button>
    </form><p class="hint">Своя позиция уйдёт в 1С произвольным товаром, а не номенклатурой каталога.</p>`;
  }

  function detailHtml(match) {
    const position = match.position;
    const mode = ui.mode[match.number] || "";
    const facts = [`<p class="raw">в заявке: ${esc(position.raw)}</p>`];
    if (match.reason) facts.push(`<p>${match.ok ? "Сейчас подобрано" : "Почему спрашиваю"}: ${esc(match.reason)}</p>`);

    let body;
    if (match.needs_quantity || mode === "qty") body = qtyForm(match);
    else if (match.mark === "retry") {
      body = `<div class="choices"><button type="button" class="btn btn-primary btn-small" data-act="retry">Повторить поиск</button></div>` +
             `<p class="hint">Товар, скорее всего, есть — портал просто не ответил вовремя.</p>`;
    } else if (mode === "link") body = linkForm(match);
    else if (mode === "custom") body = customForm(match);
    else if (match.alternatives.length || (match.chosen && !match.chosen.custom)) body = optionsHtml(match, mode === "analog");
    else if (match.chosen) body = `<p>Сейчас в заявке своя позиция: «${esc(match.chosen.name)}», ${money(match.chosen.price)}.</p>`;
    else body = `<p>На портале ничего похожего не нашлось. Укажите товар ссылкой, заведите свою позицию или отмените строку.</p>`;

    const ways = [];
    if (match.mark !== "retry" && !match.needs_quantity) {
      const hasOptions = match.alternatives.length || (match.chosen && !match.chosen.custom);
      if (mode) ways.push(`<button type="button" class="link" data-act="mode" data-mode="">${hasOptions ? "К вариантам" : "Назад"}</button>`);
      if (hasOptions && mode !== "analog") ways.push(`<button type="button" class="link" data-act="mode" data-mode="analog">Взять вариант как аналог</button>`);
      if (mode !== "link") ways.push(`<button type="button" class="link" data-act="mode" data-mode="link">Указать товар ссылкой</button>`);
      if (mode !== "custom") ways.push(`<button type="button" class="link" data-act="mode" data-mode="custom">Завести свою позицию</button>`);
      if (match.chosen && mode !== "qty") ways.push(`<button type="button" class="link" data-act="mode" data-mode="qty">Изменить количество</button>`);
    }
    const error = ui.error && ui.error.number === match.number ? `<p class="form-error" role="alert">${esc(ui.error.text)}</p>` : "";

    return `<div class="detail-body">
      <div class="detail-facts">${facts.join("")}</div>
      ${body}${error}
      <div class="detail-foot">
        <div class="choices">${ways.join("")}</div>
        <div class="choices">
          <button type="button" class="btn btn-danger btn-small" data-act="remove">Отменить строку</button>
          <button type="button" class="btn btn-quiet btn-small" data-act="close">Свернуть</button>
        </div>
      </div>
    </div>`;
  }

  function filesHtml() {
    if (!ui.files.length) return "";
    return `<div class="files">${ui.files.map((file) => `
      <div class="file-card"><span class="file-kind">${esc(file.name.split(".").pop().toUpperCase())}</span>
        <span class="file-name">${esc(file.name)}</span>
        <span class="file-meta">${esc(file.size)}</span>
        <button type="button" class="btn btn-small" data-act="download">Скачать</button></div>`).join("")}</div>`;
  }

  function removedHtml(card, withCopy = true) {
    if (!card.removed.length) return "";
    return `<section class="removed">
      <div class="removed-head"><h2>Не вошло в заявку: ${card.removed.length}</h2>
        ${withCopy ? `<button type="button" class="link" data-act="copy-removed">Скопировать список</button>` : ""}</div>
      <ul>${card.removed.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
      <p class="hint">Список стоит вписать в комментарий к заказу — поставщик увидит, чего не хватает.</p>
    </section>`;
  }

  function renderCard() {
    const card = ui.card;
    if (ui.filter !== "all" && !card.counts[ui.filter]) ui.filter = "all";
    const rows = card.matches.filter((m) => ui.filter === "all" || m.mark === ui.filter);
    const from = card.source.kind === "file" ? `из файла ${card.source.fileName}` : "из текста заявки";
    const onRequest = card.on_request.length
      ? `<span class="total-note">без ${plural(card.on_request.length, "позиции", "позиций", "позиций")} по запросу</span>` : "";
    const comment = card.manager_comment
      ? `<p class="delivery"><span class="label">Комментарий</span><span>${esc(card.manager_comment.slice(0, 120))}${card.manager_comment.length > 120 ? "…" : ""}</span></p>` : "";
    const work = ui.busy
      ? `<span class="spinner" aria-hidden="true"></span> <span id="work-text">${esc(ui.step)}</span>`
      : esc(card.next_step || "Всё готово: проверьте клиента и оформляйте.");

    main.innerHTML = `
      <section class="card-head">
        <div class="card-title">
          <h1>Заявка №${card.request_id}</h1>
          <p class="sub">${plural(card.matches.length, "позиция", "позиции", "позиций")} ${esc(from)} · в корзине ${card.lines.length}</p>
          ${card.produced.length ? `<span class="produced">Уже создано: ${esc(card.produced.join(", "))}</span>` : ""}
        </div>
        <div class="tally" role="group" aria-label="Какие строки показать">${tallyHtml(card)}</div>
      </section>
      ${filesHtml()}
      <div class="table-wrap"><table class="lines">
        <thead>
          <tr class="groups"><th colspan="3" class="side-req">В заявке</th><th colspan="4" class="edge">В корзине портала</th></tr>
          <tr><th class="side-req">№</th><th class="side-req">Строка заявки</th><th class="side-req num">Кол-во</th>
              <th class="edge">Товар портала</th><th class="num">Кол-во</th><th class="num">Цена</th><th class="num">Сумма</th></tr>
        </thead>
        <tbody>${rows.map(rowHtml).join("")}</tbody>
      </table></div>
      ${card.warnings.length ? `<ul class="warnings">${card.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
      ${removedHtml(card)}
      <footer class="actionbar">
        <div class="total"><span class="label">Итого по корзине</span><span class="total-sum">${money(card.total)}</span>${onRequest}</div>
        <p class="next-step${card.ready && !ui.busy ? " is-ready" : ""}" aria-live="polite">${work}</p>
        <div class="facts">
          <p class="delivery"><span class="label">Получение</span>
            <span class="delivery-value${card.delivery_label ? "" : " is-empty"}">${esc(card.delivery_label || "не выбрано")}</span>
            <button type="button" class="link" data-act="delivery">${card.delivery_id ? "изменить" : "выбрать способ"}</button></p>
          ${comment}
        </div>
        <div class="actions">
          <button type="button" class="btn btn-danger" data-act="cancel">Отменить заявку</button>
          <button type="button" class="btn" data-act="keep"${card.lines.length ? "" : " disabled"}>Оставить в корзине</button>
          <span class="sep" aria-hidden="true"></span>
          <button type="button" class="btn" data-act="spec"${card.lines.length ? "" : " disabled"}>Спецификация</button>
          <button type="button" class="btn" data-act="offer"${card.lines.length ? "" : " disabled"}>КП</button>
          ${card.produced.length ? `<button type="button" class="btn" data-act="done">Готово, закрыть</button>` : ""}
          <button type="button" class="btn btn-go" data-act="order"${card.ready ? "" : " disabled"}>Оформить заказ</button>
        </div>
      </footer>`;
  }

  function renderIntake() {
    const intake = ui.intake;
    const file = intake.file
      ? `<div class="file-card"><span class="file-kind">XLSX</span><span class="file-name">${esc(intake.file.name)}</span>
         <button type="button" class="link" data-act="unfile">убрать</button></div>` : "";
    main.innerHTML = `
      <section class="panel">
        <h1>Новая заявка</h1>
        <p class="lead">Вставьте заявку клиента как есть — письмо, список из мессенджера, строки из спецификации — или приложите файл. Разберу позиции, найду их в каталоге и соберу корзину на портале.</p>
        <div class="field"><label class="label" for="intake-text">Текст заявки</label>
          <textarea id="intake-text" rows="10" placeholder="Например: «ИПР 513-11ИКЗ-А-R3 — 6 шт, кабель КПСнг 1х2х0,75 — 300 м…»">${esc(intake.text)}</textarea></div>
        <label class="drop" id="drop" for="intake-file">
          <input type="file" id="intake-file" accept=".xlsx,.xls,.docx,.pdf,image/*">
          <span class="drop-kinds" aria-hidden="true"><span>XLSX</span><span>XLS</span><span>DOCX</span><span>PDF</span><span>ФОТО</span></span>
          <span><b>Приложить файл</b> или перетащить сюда<br><span class="hint">Голосовые не принимаю — нужен текст или документ.</span></span>
        </label>
        ${file}
        ${intake.error ? `<p class="form-error" role="alert">${esc(intake.error)}</p>` : ""}
        <div class="panel-foot">
          <p class="samples">Для пробы:
            <button type="button" class="link" data-act="sample" data-sample="letter">письмо клиента</button>
            <button type="button" class="link" data-act="sample" data-sample="excel">спецификация в Excel</button></p>
          <button type="button" class="btn btn-primary" data-act="parse">Разобрать заявку</button>
        </div>
      </section>`;
  }

  function renderParsing() {
    main.innerHTML = `
      <section class="panel" aria-live="polite">
        <h1>Разбираю заявку</h1>
        <p class="lead">Позиции ищутся на портале по одной — большая спецификация занимает минуту-другую.</p>
        <div class="bar"><span id="bar"></span></div>
        <ol class="steps" id="steps"></ol>
      </section>`;
    renderSteps();
  }

  function renderSteps(text) {
    if (text) {
      const last = ui.steps[ui.steps.length - 1];
      const same = last && last.replace(/\d+ из \d+.*/, "") === text.replace(/\d+ из \d+.*/, "") && /\d+ из \d+/.test(text);
      if (same) ui.steps[ui.steps.length - 1] = text; else ui.steps.push(text);
    }
    const list = $("#steps");
    if (!list) return;
    list.innerHTML = ui.steps.map((step, i) => {
      const now = i === ui.steps.length - 1;
      return `<li class="${now ? "is-now" : "is-done"}">${now ? `<span class="spinner" aria-hidden="true"></span>` : `<span class="tick">✓</span>`}${esc(step)}</li>`;
    }).join("");
    const found = /(\d+) из (\d+)/.exec(ui.steps[ui.steps.length - 1] || "");
    const done = ui.steps.some((s) => /корзин|итог/i.test(s));
    const bar = $("#bar");
    if (bar) bar.style.width = done ? "100%" : found ? `${Math.round((found[1] / found[2]) * 85)}%` : "6%";
  }

  function renderOrdered() {
    const card = ui.card;
    const number = card.orders[0];
    const onRequest = card.on_request.length ? ` <span class="hint">без ${plural(card.on_request.length, "позиции", "позиций", "позиций")} по запросу</span>` : "";
    const invoice = ui.invoice
      ? `<div class="file-card"><span class="file-kind">PDF</span><span class="file-name">${esc(ui.invoice.name)}</span>
         <span class="file-meta">${esc(ui.invoice.size)}</span><button type="button" class="btn btn-small" data-act="download">Скачать</button></div>`
      : `<div class="invoice"><span class="spinner" aria-hidden="true"></span>Жду счёт из 1С — обычно от одной до семи минут. Пришлю сюда файлом.</div>`;
    main.innerHTML = `
      <section class="panel">
        <div class="result-head"><span class="result-mark" aria-hidden="true">✓</span>
          <div><h1>Заказ оформлен, №${esc(number)}</h1><p class="result-sub">Заявка №${card.request_id} · ${new Date().toLocaleDateString("ru-RU")}</p></div></div>
        <dl class="result-facts">
          <dt>Клиент</dt><dd>${esc(card.company_name)} <span class="code">ИНН ${esc(card.company_inn)}</span></dd>
          <dt>Сумма</dt><dd>${money(card.total)}${onRequest}</dd>
          <dt>Получение</dt><dd>${esc(card.delivery_label)}</dd>
          <dt>Позиций</dt><dd>${card.lines.length}</dd>
          ${card.manager_comment ? `<dt>Комментарий</dt><dd>${esc(card.manager_comment)}</dd>` : ""}
        </dl>
        ${invoice}
        ${filesHtml()}
        <div class="panel-foot">
          <p class="hint">По этим позициям можно сразу сделать КП или спецификацию — не дожидаясь счёта.</p>
          <div class="choices">
            <button type="button" class="btn" data-act="repeat">Вернуться к заявке</button>
            <button type="button" class="btn btn-primary" data-act="fresh">Новая заявка</button>
          </div>
        </div>
      </section>`;
  }

  function renderClosed() {
    const card = ui.card;
    const texts = {
      kept: ["Оставлено в корзине", "Корзина собрана на портале — дальше оформляйте на сайте. Подбор запомнил."],
      cancelled: ["Заявка отменена", "Корзина на портале очищена. Подбор по этой заявке в память не пошёл."],
      done: ["Заявка закрыта", `Созданное остаётся на портале: ${card.produced.join(", ")}.`],
    };
    const [title, lead] = texts[card.status] || ["Заявка закрыта", ""];
    main.innerHTML = `
      <section class="panel">
        <div class="result-head"><span class="result-mark${card.status === "cancelled" ? " is-neutral" : ""}" aria-hidden="true">${card.status === "cancelled" ? "×" : "✓"}</span>
          <div><h1>${esc(title)}</h1><p class="result-sub">Заявка №${card.request_id} · ${esc(card.company_name)}</p></div></div>
        <p class="lead">${esc(lead)}</p>
        ${filesHtml()}
        ${removedHtml(card, false)}
        <div class="panel-foot"><span></span><button type="button" class="btn btn-primary" data-act="fresh">Новая заявка</button></div>
      </section>`;
  }

  // --- окна: клиент, доставка, заказ --------------------------------------

  const companyDialog = $("#company-dialog");
  const deliveryDialog = $("#delivery-dialog");
  const orderDialog = $("#order-dialog");
  let searchTimer = null;

  async function fillCompanies() {
    const found = await api.searchCompanies($("#company-query").value);
    $("#company-list").innerHTML = found.length
      ? found.map((c) => `<li><button type="button" data-company="${c.id}"${c.active ? ` aria-current="true" disabled` : ""}>
          <span>${esc(c.name)}${c.active ? " — сейчас активный" : ""}</span><span class="inn">ИНН ${esc(c.inn)}</span></button></li>`).join("")
      : `<li class="hint">Никого не нашёл. Контрагентов заводят в 1С — на портал они приезжают сами.</li>`;
  }

  $("#client-button").addEventListener("click", () => {
    if (!live()) { say("Клиента меняют у открытой заявки — сейчас её нет.", "warn"); return; }
    $("#company-query").value = "";
    fillCompanies();
    companyDialog.showModal();
  });
  $("#company-query").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(fillCompanies, 200);
  });
  $("#company-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-company]");
    if (!button) return;
    companyDialog.close();
    run(() => api.switchCompany(Number(button.dataset.company), setStep));
  });

  function openDelivery() {
    const card = ui.card;
    const box = $("#delivery-options");
    box.innerHTML = `<div class="radio-group">${card.delivery_options.map((option) => {
      const checked = option.id === card.delivery_id;
      const points = option.points.map((point) => `
        <label class="radio"><input type="radio" name="pt-${option.id}" value="${point.id}"
          ${point.id === card.delivery_point_id || option.points.length === 1 ? "checked" : ""}><span>${esc(point.address)}</span></label>`).join("");
      return `<label class="radio"><input type="radio" name="dlv" value="${option.id}"${checked ? " checked" : ""}>
          <span>${esc(option.name)}</span><small>${esc(option.tariff)}</small></label>
        ${points ? `<div class="points" data-points="${option.id}"${checked ? "" : " hidden"}>${points}</div>` : ""}`;
    }).join("")}</div><p class="form-error" id="delivery-error" hidden></p>`;
    deliveryDialog.showModal();
  }

  $("#delivery-options").addEventListener("change", (event) => {
    if (event.target.name !== "dlv") return;
    document.querySelectorAll("#delivery-options [data-points]").forEach((el) => {
      el.hidden = el.dataset.points !== event.target.value;
    });
  });
  $("#delivery-apply").addEventListener("click", () => {
    const box = $("#delivery-options");
    const error = $("#delivery-error");
    const option = box.querySelector('input[name="dlv"]:checked');
    if (!option) { error.textContent = "Выберите способ получения."; error.hidden = false; return; }
    const hasPoints = !!box.querySelector(`[data-points="${option.value}"]`);
    const point = box.querySelector(`input[name="pt-${option.value}"]:checked`);
    if (hasPoints && !point) { error.textContent = "Выберите, куда или откуда."; error.hidden = false; return; }
    deliveryDialog.close();
    run(() => api.setDelivery(option.value, point ? Number(point.value) : null, setStep));
  });

  function openOrder() {
    const card = ui.card;
    const onRequest = card.on_request.length ? ` — без ${plural(card.on_request.length, "позиции", "позиций", "позиций")} по запросу` : "";
    // Сначала список непрошедших позиций, потом поле комментария: его и
    // вписывают в комментарий, поставщик должен видеть, чего не хватает.
    const removed = card.removed.length ? `
      <div class="removed"><div class="removed-head"><h2>Не вошло в заявку: ${card.removed.length}</h2>
        <button type="button" class="link" id="removed-insert">Вписать в комментарий</button></div>
        <ul>${card.removed.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>` : "";
    $("#order-body").innerHTML = `
      <div class="order-client"><span class="label">Заказ уйдёт на</span>
        <div class="name">${esc(card.company_name)}</div><div class="inn">ИНН ${esc(card.company_inn)}</div></div>
      <dl class="result-facts">
        <dt>Позиций</dt><dd>${card.lines.length}</dd>
        <dt>Сумма</dt><dd>${money(card.total)}${onRequest}</dd>
        <dt>Получение</dt><dd>${esc(card.delivery_label)}</dd>
      </dl>
      ${removed}
      <div class="field"><label class="label" for="order-comment">Комментарий к заказу для менеджера Протэк</label>
        <textarea id="order-comment" rows="4" placeholder="Сроки, объект, чего не хватает — всё, что важно поставщику">${esc(card.manager_comment)}</textarea></div>
      <p class="hint">Уйдёт в заказ вместе со служебной подписью «Заявка с портала, менеджер: Анна Демо».</p>
      <p class="order-note" id="order-note" hidden></p>`;
    const insert = $("#removed-insert");
    if (insert) {
      insert.addEventListener("click", () => {
        const field = $("#order-comment");
        const list = "Не вошло в заявку:\n" + card.removed.map((item) => `· ${item}`).join("\n");
        field.value = field.value.trim() ? `${field.value.trim()}\n\n${list}` : list;
        field.focus();
      });
    }
    orderDialog.showModal();
  }

  $("#order-place").addEventListener("click", () => {
    const field = $("#order-comment");
    const result = api.setComment(field.value);
    ui.card = result.draft;
    if (result.note) {
      // Показываем то, что уйдёт, а не то, что написали, — и просим нажать ещё раз.
      field.value = result.comment;
      const note = $("#order-note");
      note.textContent = `${result.note} Проверьте текст и нажмите «Оформить заказ» ещё раз.`;
      note.hidden = false;
      return;
    }
    orderDialog.close();
    run(() => api.placeOrder(setStep), (res) => {
      ui.invoice = null;
      const number = res.orders[0];
      api.waitInvoice(number).then((got) => {
        log(got.said);
        if (ui.card && ui.card.orders[0] === number) { ui.invoice = got.file; render(); }
      });
    });
  });

  orderDialog.addEventListener("close", () => {
    // Комментарий живёт в черновике: вернувшийся к заявке увидит его на месте.
    const field = $("#order-comment");
    if (live() && field && field.value.trim() !== ui.card.manager_comment) {
      ui.card = api.setComment(field.value).draft;
      render();
    }
  });

  // --- нажатия -------------------------------------------------------------

  function nextProblem(card, after) {
    const pending = card.matches.filter((m) => !m.ok);
    const later = pending.find((m) => m.number > after);
    return (later || pending[0] || {}).number ?? null;
  }

  /** После ответа по строке — к следующей нерешённой, как «Уточнить» в боте. */
  function lineDone(number) {
    return () => {
      ui.mode[number] = "";
      const match = ui.card.matches.find((m) => m.number === number);
      if (!match || match.ok) ui.open = nextProblem(ui.card, number);
    };
  }

  async function startIntake() {
    if (live()) {
      const ok = window.confirm(
        `Заявка №${ui.card.request_id} ещё не оформлена. Отменить её и начать новую? Корзина на портале очистится.\n\n` +
        "Если клиент просто дописал позиции — нажмите «Отмена» и вставьте их в «Дослать позиции» слева.");
      if (!ok) return;
      await run(() => api.cancel(setStep));
    }
    Object.assign(ui, { view: "intake", open: null, mode: {}, filter: "all", files: [], invoice: null, error: null });
    ui.intake = { text: "", file: null, kind: "text", error: "" };
    render();
    $("#intake-text").focus();
  }

  async function parse() {
    const intake = ui.intake;
    const field = $("#intake-text");
    if (field) intake.text = field.value;
    if (!intake.text.trim() && !intake.file) {
      intake.error = "Вставьте текст заявки или приложите файл — разбирать пока нечего.";
      render();
      return;
    }
    const samples = api.samples();
    const source = intake.file
      ? { ...samples.excel, fileName: intake.file.name }
      : { kind: "text", title: "Текст заявки", text: intake.text };
    Object.assign(ui, { view: "parsing", steps: [], busy: true });
    render();
    try {
      const result = await api.parse(source, setStep);
      ui.card = result.draft;
      log(result.said);
      Object.assign(ui, { view: "card", filter: "all", open: null, mode: {} });
    } catch (error) {
      intake.error = error.message;
      ui.view = "intake";
    } finally {
      ui.busy = false;
      render();
    }
  }

  const actions = {
    filter: (el) => { ui.filter = el.dataset.filter; ui.open = null; render(); },
    close: () => { ui.open = null; render(); },
    mode: (el, n) => {
      ui.mode[n] = el.dataset.mode;
      ui.error = null;
      render();
      const input = main.querySelector("tr.detail input");
      if (input) input.focus();
    },
    pick: (el, n) => run(() => api.pick(n, el.dataset.id, { analog: el.dataset.analog === "true" }, setStep), lineDone(n)),
    retry: (el, n) => run(() => api.retry(n, setStep), lineDone(n)),
    remove: (el, n) => run(() => api.removeLine(n, setStep), () => { ui.open = null; }),
    delivery: openDelivery,
    order: openOrder,
    cancel: () => {
      if (!window.confirm(`Отменить заявку №${ui.card.request_id}? Корзина на портале очистится.`)) return;
      run(() => api.cancel(setStep));
    },
    keep: () => run(() => api.keep(setStep)),
    spec: () => run(() => api.saveList("spec", setStep), (res) => ui.files.push(res.file)),
    offer: () => run(() => api.saveList("offer", setStep), (res) => ui.files.push(res.file)),
    done: () => run(() => api.done()),
    repeat: () => run(() => api.repeat(setStep), () => {
      Object.assign(ui, { files: [], invoice: null, open: null, mode: {}, filter: "all" });
    }),
    fresh: startIntake,
    parse,
    sample: (el) => {
      const sample = api.samples()[el.dataset.sample];
      if (sample.kind === "file") ui.intake.file = { name: sample.fileName };
      else { ui.intake.file = null; ui.intake.text = sample.text; }
      ui.intake.error = "";
      render();
    },
    unfile: () => { ui.intake.file = null; render(); },
    download: () => say("В пробнике файла нет — на портале он придёт готовым и откроется одним касанием.", "demo"),
    "copy-removed": async () => {
      const text = "Не вошло в заявку:\n" + ui.card.removed.map((item) => `· ${item}`).join("\n");
      try {
        await navigator.clipboard.writeText(text);
        say("Список скопирован — вставьте его в комментарий к заказу.", "good");
      } catch {
        say("Скопировать не вышло — выделите список вручную.", "warn");
      }
    },
  };

  main.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");
    const row = event.target.closest("tr.row");
    if (button && !button.disabled) {
      const detail = button.closest("tr.detail");
      const number = detail ? Number(detail.previousElementSibling.dataset.number) : null;
      actions[button.dataset.act](button, number);
      return;
    }
    if (row && !ui.busy) toggleRow(Number(row.dataset.number));
  });

  main.addEventListener("keydown", (event) => {
    const row = event.target.closest && event.target.closest("tr.row");
    if (row && event.target === row && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      toggleRow(Number(row.dataset.number));
    }
  });

  function toggleRow(number) {
    ui.open = ui.open === number ? null : number;
    ui.error = null;
    render();
    const row = main.querySelector(`tr.row[data-number="${number}"]`);
    if (row) { row.focus({ preventScroll: true }); row.scrollIntoView({ block: "nearest" }); }
  }

  main.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const number = Number(form.closest("tr.detail").previousElementSibling.dataset.number);
    const data = new FormData(form);
    const kind = form.dataset.form;
    if (kind === "qty") run(() => api.setQuantity(number, toNumber(data.get("qty")), setStep), lineDone(number));
    if (kind === "link") run(() => api.byLink(number, data.get("url"), setStep), lineDone(number));
    if (kind === "custom") run(() => api.custom(number, data.get("name"), toNumber(data.get("price")), setStep), lineDone(number));
  });

  main.addEventListener("change", (event) => {
    if (event.target.id !== "intake-file") return;
    const file = event.target.files[0];
    if (file) { ui.intake.file = { name: file.name }; ui.intake.text = $("#intake-text").value; ui.intake.error = ""; render(); }
  });
  main.addEventListener("dragover", (event) => {
    const drop = event.target.closest && event.target.closest("#drop");
    if (drop) { event.preventDefault(); drop.classList.add("is-over"); }
  });
  main.addEventListener("dragleave", (event) => {
    const drop = event.target.closest && event.target.closest("#drop");
    if (drop) drop.classList.remove("is-over");
  });
  main.addEventListener("drop", (event) => {
    const drop = event.target.closest && event.target.closest("#drop");
    if (!drop) return;
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) { ui.intake.file = { name: file.name }; ui.intake.text = $("#intake-text").value; ui.intake.error = ""; render(); }
  });

  $("#new-request").addEventListener("click", startIntake);

  $("#composer").addEventListener("submit", (event) => {
    event.preventDefault();
    const field = $("#composer-text");
    if (!field.value.trim()) { say("Вставьте, что клиент дописал, — тогда добавлю.", "warn"); return; }
    const text = field.value;
    run(() => api.addPositions({ kind: "text", text }, setStep), () => { field.value = ""; ui.filter = "all"; });
  });
  $("#composer-sample").addEventListener("click", () => {
    $("#composer-text").value = api.samples().addition.text;
  });

  // --- старт: заявка уже разобрана, чтобы было на что смотреть -------------

  const boot = api.boot();
  ui.card = boot.draft;
  say("Это пробник: заявка уже разобрана на выдуманных данных. Откройте строку со значком, чтобы решить её.", "demo");
  log(boot.said);
  render();
})();
