/*
 * Экраны страницы-ассистента. Данные и правила — в `ProtekApi` (сейчас
 * подставной `demo-api.js`, потом клиент сервера `app/web`); здесь только
 * показ и нажатия. Можно ли оформлять, какой у строки значок и что делать
 * дальше, решает не браузер.
 *
 * Порядок экранов тот же, что у бота в Telegram, а вид — портала: таблица
 * как в каталоге, значки Material, «Цена, ₽» в заголовке и копейки в цифрах.
 */
(function () {
  "use strict";

  const api = window.ProtekApi;
  const $ = (selector, root = document) => root.querySelector(selector);
  const main = $("#main");
  const logList = $("#log");

  // Material Icons — тот же набор, что в шапке портала.
  const ICONS = {
    ok: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
    attention: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
    retry: "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",
    missing: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z",
    info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
    dot: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    truck: "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9 1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
    comment: "M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
    download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    copy: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    upload: "M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z",
    business: "M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z",
    close: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    check: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    sparkle: "M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z",
    add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    target: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    swap: "M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z",
  };
  const icon = (name, cls = "") =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

  const MARK_TITLE = {
    ok: "Готово — можно оформлять",
    attention: "Решается здесь: выбрать вариант, подтвердить или задать количество",
    retry: "Портал не ответил — повторить",
    missing: "В каталоге нет",
  };
  const TALLY = [["all", "Все"], ["ok", "Готово"], ["attention", "Выбрать"],
                 ["retry", "Повторить"], ["missing", "Нет в каталоге"]];
  const LOG_ICON = { good: "ok", warn: "attention", error: "missing", demo: "info", plain: "dot" };

  const ui = {
    view: "card",        // intake | parsing | card | ordered | closed
    card: null,          // карточка от ProtekApi — единственный источник правды
    filter: "all",
    open: null,          // номер раскрытой строки
    mode: {},            // номер строки → link | custom | qty
    ask: {},             // номер строки → товар, по которому спрошено «тот самый или аналог»
    error: null,         // {number, text} — ошибка у формы строки
    busy: false,
    step: "",
    files: [],           // что уже пришло файлами по этой заявке
    invoice: null,
    intake: { text: "", file: null, error: "" },
    steps: [],
  };

  // --- мелочи ------------------------------------------------------------

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  // Цифры — как в каталоге портала: всегда с копейками, «₽» — в заголовке колонки.
  const fixed2 = (value) => value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (value) => (value == null ? "—" : `${fixed2(value)} ₽`);
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
      const tone = entry.tone || "plain";
      const item = document.createElement("li");
      item.className = `t-${tone}`;
      item.innerHTML = `${icon(LOG_ICON[tone] || "dot", "icon-18")}<div><time>${now}</time>${esc(entry.text)}</div>`;
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
    if (slot && ui.busy) slot.textContent = text;
    if (ui.view === "parsing") renderSteps(text);
  }

  /** Долгая работа: кнопки гаснут, ход виден словами (`_Working` в боте). */
  async function run(call, after) {
    if (ui.busy) return;
    const opened = ui.open;
    const view = ui.view;
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
      // Сменился экран (заказ оформлен, заявка закрыта) — показываем его с начала.
      if (ui.view !== view) window.scrollTo({ top: 0 });
      // Бот сам перешёл к следующей нерешённой строке — показываем её.
      else if (ui.open != null && ui.open !== opened) revealRow(ui.open);
    }
  }

  function followStatus() {
    if (!ui.card) return;
    const status = ui.card.status;
    ui.view = status === "confirmed" ? "ordered" : status === "draft" ? "card" : "closed";
  }

  // --- отрисовка ---------------------------------------------------------

  function render() {
    renderClient();
    renderSource();
    if (ui.view === "intake") renderIntake();
    else if (ui.view === "parsing") renderParsing();
    else if (ui.view === "ordered") renderOrdered();
    else if (ui.view === "closed") renderClosed();
    else renderCard();
    $("#composer").querySelectorAll("button, textarea").forEach((el) => { el.disabled = ui.busy || !live(); });
    if (ui.busy) main.querySelectorAll("button, input, textarea").forEach((el) => { el.disabled = true; });
  }

  function renderClient() {
    const card = ui.card;
    const name = card ? card.company_name : "—";
    $("#client-name").textContent = name;
    $("#client-card-name").textContent = name;
    $("#client-inn").textContent = card ? `ИНН ${card.company_inn}` : "";
    ["#client-button", "#client-card", "#new-request"].forEach((id) => { $(id).disabled = ui.busy; });
  }

  function renderSource() {
    const box = $("#source");
    if (ui.view === "intake" || ui.view === "parsing") {
      const text = ui.intake.file ? ui.intake.file.name : ui.intake.text;
      box.innerHTML = text ? esc(text) : `<span class="muted">Заявка ещё не прислана.</span>`;
      return;
    }
    const source = ui.card && ui.card.source;
    if (!source) { box.textContent = ""; return; }
    const chip = source.kind === "file"
      ? `<div class="file-chip"><span class="file-kind">XLSX</span><span class="file-name">${esc(source.fileName)}</span></div>`
      : "";
    box.innerHTML = chip + esc(source.text);
  }

  function chipsHtml(card) {
    return TALLY.map(([key, word]) => {
      const n = key === "all" ? card.matches.length : card.counts[key];
      const mark = key === "all" ? "" : icon(key, `icon-18 st-${key}`);
      return `<button type="button" class="chip" data-act="filter" data-filter="${key}" aria-pressed="${ui.filter === key}"` +
             `${n || key === "all" ? "" : " disabled"}>${mark}${word} <b>${n}</b></button>`;
    }).join("");
  }

  function metaHtml(candidate) {
    const parts = [];
    if (candidate.article) parts.push(`<span>${esc(candidate.article)}</span>`);
    // Код производителя — то, по чему менеджер сверяет товар с заявкой.
    if (candidate.manufacturer_code) parts.push(`<span>код ${esc(candidate.manufacturer_code)}</span>`);
    if (candidate.brand) parts.push(`<span>${esc(candidate.brand)}</span>`);
    if (candidate.multiplicity > 1) parts.push(`<span>кратность ${qty(candidate.multiplicity)} ${esc(candidate.unit)}</span>`);
    if (candidate.stock != null) {
      parts.push(candidate.stock > 0
        ? `<span>на складе <b>${qty(candidate.stock)}</b></span>`
        : `<span class="stock-no">нет на складе</span>`);
    }
    return parts.join("");
  }

  function tagsHtml(candidate, match) {
    let tags = "";
    if (match && match.analog) tags += ` <span class="tag tag-analog">аналог</span>`;
    if (candidate.custom) tags += ` <span class="tag tag-custom">своя позиция</span>`;
    return tags;
  }

  const todo = (kind, text) =>
    `<div class="todo-row"><span class="todo todo-${kind}">${icon(kind, "icon-18")}${esc(text)}</span></div>`;

  function rowHtml(match) {
    const open = ui.open === match.number;
    const position = match.position;
    const line = match.line;

    const notes = [];
    if (position.article) notes.push(`арт. клиента ${esc(position.article)}`);
    match.notes.forEach((note) => notes.push(esc(note)));
    const reqQty = position.quantity > 0
      ? `${qty(position.quantity)} ${esc(position.unit)}`
      : `<span class="qty-none">не указано</span>`;

    let product;
    if (match.chosen) {
      product = `<div class="prod-name">${esc(match.chosen.name)}${tagsHtml(match.chosen, match)}</div>` +
                `<div class="meta">${metaHtml(match.chosen)}</div>`;
      if (match.needs_quantity) product += todo("attention", "Задать количество");
      else if (match.mark === "attention") product += `<p class="reason">${esc(match.reason)}</p>${todo("attention", "Проверить подбор")}`;
    } else if (match.mark === "retry") {
      product = `<p class="reason">Портал не ответил на поиск — товар, скорее всего, есть.</p>${todo("retry", "Повторить поиск")}`;
    } else if (match.mark === "attention") {
      product = `<p class="reason">${esc(match.reason)}.</p>` +
                todo("attention", `Выбрать: ${plural(match.alternatives.length, "вариант", "варианта", "вариантов")}`);
    } else {
      product = `<p class="reason">${esc(match.reason)}.</p>${todo("missing", "Указать товар")}`;
    }

    let cartQty = "—";
    let price = "";
    let sum = "";
    if (line) {
      cartQty = line.adjusted
        ? `<span class="qty-was">${qty(line.requested)}</span> ${qty(line.actual)} ${esc(line.unit)}<span class="qty-note">${esc(line.adjust_note)}</span>`
        : `${qty(line.actual)} ${esc(line.unit)}`;
      price = line.price == null ? `<span class="tag tag-request">по запросу</span>` : fixed2(line.price);
      sum = line.total == null ? "—" : fixed2(line.total);
    }

    return `<tr class="row m-${match.mark}" data-number="${match.number}" tabindex="0" aria-expanded="${open}">
      <td class="c-no"><span class="no"><span class="st-${match.mark}" title="${MARK_TITLE[match.mark]}" role="img" aria-label="${MARK_TITLE[match.mark]}">${icon(match.mark, "icon-20")}</span>${match.number}</span></td>
      <td class="c-req"><div class="req-name">${esc(position.name)}</div>${notes.length ? `<div class="req-note">${notes.join(" · ")}</div>` : ""}</td>
      <td class="c-rqty num">${reqQty}</td>
      <td class="c-prod edge">${product}</td>
      <td class="c-cqty num">${cartQty}</td>
      <td class="c-price num">${price}</td>
      <td class="c-sum num">${sum}</td>
    </tr>${open ? `<tr class="detail"><td colspan="7">${detailHtml(match)}</td></tr>` : ""}`;
  }

  function optionsHtml(match) {
    const chosenId = match.chosen && !match.chosen.custom ? match.chosen.id : "";
    const asked = ui.ask[match.number] || "";
    const list = [...match.alternatives];
    if (chosenId && !list.some((c) => c.id === chosenId)) list.unshift(match.chosen);
    // Наличие наверх, порядок внутри устойчивый; выбор бота помечен отдельно,
    // иначе первый номер значил бы то «бот выбрал», то «есть на складе».
    const sorted = list.map((c, i) => ({ c, i }))
      .sort((a, b) => ((b.c.stock > 0) - (a.c.stock > 0)) || a.i - b.i)
      .map((x) => x.c);
    const items = sorted.map((c, i) => {
      const isChosen = c.id === chosenId;
      const isAsked = c.id === asked;
      const tag = isChosen ? ` <span class="tag tag-bot">${match.confirmed ? "выбрано" : "предложение бота"}</span>` : "";
      const price = `<span class="option-price">${c.price == null ? "по запросу" : money(c.price)}</span>`;
      const take = isAsked ? "" : `<button type="button" class="btn btn-sm btn-primary" data-act="ask" data-id="${esc(c.id)}">Взять</button>`;
      return `<li class="option${isChosen ? " is-chosen" : ""}${isAsked ? " is-asking" : ""}">
        <span class="option-no">${i + 1}</span>
        <div><div class="option-name">${esc(c.name)}${tag}</div><div class="meta">${metaHtml(c)}</div></div>
        <div class="option-side">${price}${take}</div>
        ${isAsked ? askHtml(c) : ""}
      </li>`;
    }).join("");
    return `<p class="detail-title">Что нашлось на портале</p><ul class="options">${items}</ul>`;
  }

  /**
   * Вопрос на каждом выборе: тот самый это товар или замена — как в боте
   * (15.09.2026). Отдельную «Взять вариант как аналог» забывали, и замена
   * уходила в память тем самым товаром. Кнопки ответов одного вида:
   * выделенная «Тот самый» подталкивала бы к себе, а защита как раз от этого.
   * И без галочки на «Тот самый»: в боте её однажды прочли как «уже отмечено».
   */
  function askHtml(candidate) {
    const id = esc(candidate.id);
    return `<div class="ask" role="group" aria-label="Тот самый товар или замена" tabindex="-1">
      <p class="ask-q">Это тот самый товар или замена?</p>
      <div class="ask-acts">
        <button type="button" class="btn btn-sm" data-act="answer" data-id="${id}" data-analog="false">${icon("target", "icon-18")} Тот самый</button>
        <button type="button" class="btn btn-sm" data-act="answer" data-id="${id}" data-analog="true">${icon("swap", "icon-18")} Аналог</button>
        <button type="button" class="link" data-act="unask">Отмена</button>
      </div>
      <p class="hint">«Тот самый» — клиент просил именно его: запомню, и у этого клиента в следующий раз подставлю сам. «Аналог» — подойдёт вместо исходного: запомню как замену и в следующий раз спрошу снова.</p>
    </div>`;
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
      <div class="field grow"><label class="label" for="link-${n}">Ссылка на товар портала</label>
        <input type="text" inputmode="url" id="link-${n}" name="url" placeholder="https://…/products/…" autocomplete="off"></div>
      <button type="submit" class="btn btn-primary">Найти по ссылке</button>
    </form><p class="hint">Найду товар на портале и спрошу, тот самый это или замена.</p>`;
  }

  function customForm(match) {
    const n = match.number;
    const unit = match.position.unit || "шт";
    return `<form class="inline-form" data-form="custom">
      <div class="field grow"><label class="label" for="cname-${n}">Название для заказа</label>
        <input type="text" id="cname-${n}" name="name" value="${esc(match.position.name)}"></div>
      <div class="field"><label class="label" for="cprice-${n}">Цена за ${esc(unit)}, ₽</label>
        <input type="number" id="cprice-${n}" name="price" min="0" step="any" inputmode="decimal"></div>
      <button type="submit" class="btn btn-primary">Завести</button>
    </form><p class="hint">Своя позиция уйдёт в 1С произвольным товаром, а не номенклатурой каталога.</p>`;
  }

  function detailHtml(match) {
    const position = match.position;
    const mode = ui.mode[match.number] || "";
    const facts = [`<p class="raw">В заявке: ${esc(position.raw)}</p>`];
    if (match.reason) facts.push(`<p>${match.ok ? "Сейчас подобрано" : "Почему спрашиваю"}: ${esc(match.reason)}</p>`);

    const hasOptions = match.alternatives.length || (match.chosen && !match.chosen.custom);
    let body;
    if (match.needs_quantity || mode === "qty") body = qtyForm(match);
    else if (match.mark === "retry") {
      body = `<div><button type="button" class="btn btn-primary" data-act="retry">${icon("retry", "icon-18")} Повторить поиск</button></div>`;
    } else if (mode === "link") body = linkForm(match);
    else if (mode === "custom") body = customForm(match);
    else if (hasOptions) body = optionsHtml(match);
    else if (match.chosen) body = `<p>Сейчас в заявке своя позиция: «${esc(match.chosen.name)}», ${money(match.chosen.price)}.</p>`;
    else body = `<p>На портале ничего похожего не нашлось. Укажите товар ссылкой, заведите свою позицию или отмените строку.</p>`;

    const ways = [];
    if (match.mark !== "retry" && !match.needs_quantity) {
      if (mode) ways.push(`<button type="button" class="link" data-act="mode" data-mode="">${hasOptions ? "К вариантам" : "Назад"}</button>`);
      if (mode !== "link") ways.push(`<button type="button" class="link" data-act="mode" data-mode="link">Указать товар ссылкой</button>`);
      if (mode !== "custom") ways.push(`<button type="button" class="link" data-act="mode" data-mode="custom">Завести свою позицию</button>`);
      if (match.chosen && mode !== "qty") ways.push(`<button type="button" class="link" data-act="mode" data-mode="qty">Изменить количество</button>`);
    }
    const error = ui.error && ui.error.number === match.number
      ? `<p class="form-error" role="alert">${icon("missing", "icon-18")}${esc(ui.error.text)}</p>` : "";

    return `<div class="detail-body">
      <div class="detail-facts">${facts.join("")}</div>
      ${body}${error}
      <div class="detail-foot">
        <div class="ways">${ways.join("")}</div>
        <div class="ways">
          <button type="button" class="btn btn-danger btn-sm" data-act="remove">Отменить строку</button>
          <button type="button" class="btn btn-ghost btn-sm" data-act="close">Свернуть</button>
        </div>
      </div>
    </div>`;
  }

  function filesHtml() {
    if (!ui.files.length) return "";
    return `<div class="files">${ui.files.map((file) => {
      const kind = file.name.split(".").pop().toUpperCase();
      return `<div class="file-card"><span class="file-kind${kind === "PDF" ? " pdf" : ""}">${esc(kind)}</span>
        <span class="file-name">${esc(file.name)}</span><span class="file-size">${esc(file.size)}</span>
        <button type="button" class="btn btn-sm" data-act="download">${icon("download", "icon-18")} Скачать</button></div>`;
    }).join("")}</div>`;
  }

  function removedHtml(card, withCopy = true) {
    if (!card.removed.length) return "";
    return `<section class="removed">
      <div class="removed-head"><h3>Не вошло в заявку: ${card.removed.length}</h3>
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
    const step = ui.busy
      ? `<span class="spinner" aria-hidden="true"></span><span id="work-text">${esc(ui.step)}</span>`
      : `${icon(card.ready ? "ok" : "attention", "icon-20")}<span id="work-text">${esc(card.next_step || "Всё готово: проверьте клиента и оформляйте.")}</span>`;
    const notes = card.warnings.length || card.removed.length
      ? `<div class="notes">
          ${card.warnings.length ? `<ul class="warnings">${card.warnings.map((w) => `<li>${icon("info", "icon-20")}<span>${esc(w)}</span></li>`).join("")}</ul>` : ""}
          ${removedHtml(card)}
        </div>` : "";

    main.innerHTML = `
      <section class="sheet">
        <header class="sheet-head">
          <div class="sheet-title">
            <h2>Заявка №${card.request_id}</h2>
            <span class="caption">${plural(card.matches.length, "позиция", "позиции", "позиций")} ${esc(from)} · в корзине ${card.lines.length}</span>
            ${card.produced.length ? `<span class="produced">${icon("check", "icon-16")}Уже создано: ${esc(card.produced.join(", "))}</span>` : ""}
          </div>
          <div class="chips" role="group" aria-label="Какие строки показать">${chipsHtml(card)}</div>
        </header>
        ${filesHtml()}
        <div class="table-wrap"><table class="lines">
          <thead>
            <tr class="groups"><th colspan="3">В заявке</th><th colspan="4" class="edge">В корзине портала</th></tr>
            <tr><th>№</th><th>Строка заявки</th><th class="num">Кол-во</th>
                <th class="edge">Товар портала</th><th class="num">Кол-во</th><th class="num">Цена, ₽</th><th class="num">Сумма, ₽</th></tr>
          </thead>
          <tbody>${rows.map(rowHtml).join("")}</tbody>
        </table></div>
        ${notes}
        <footer class="actionbar">
          <div class="bar-row">
            <div class="total"><span class="caption">Итого по корзине</span><span class="total-sum">${money(card.total)}</span>${onRequest}</div>
            <div class="facts">
              <p class="fact">${icon("truck", "icon-20")}<span class="fact-text${card.delivery_label ? "" : " fact-empty"}">${esc(card.delivery_label || "Способ получения не выбран")}</span>
                <button type="button" class="link" data-act="delivery">${card.delivery_id ? "Изменить" : "Выбрать"}</button></p>
              ${card.manager_comment ? `<p class="fact">${icon("comment", "icon-20")}<span class="fact-text">${esc(card.manager_comment)}</span></p>` : ""}
            </div>
            <button type="button" class="btn btn-danger btn-sm bar-cancel" data-act="cancel">Отменить заявку</button>
          </div>
          <div class="bar-row">
            <p class="next-step${ui.busy ? " is-busy" : card.ready ? " is-ready" : ""}" aria-live="polite">${step}</p>
            <div class="actions">
              <button type="button" class="btn" data-act="keep"${card.lines.length ? "" : " disabled"}>Оставить в корзине</button>
              <button type="button" class="btn" data-act="spec"${card.lines.length ? "" : " disabled"}>Спецификация</button>
              <button type="button" class="btn" data-act="offer"${card.lines.length ? "" : " disabled"}>КП</button>
              ${card.produced.length ? `<button type="button" class="btn" data-act="done">Готово, закрыть</button>` : ""}
              <button type="button" class="btn btn-primary btn-lg" data-act="order"${card.ready ? "" : " disabled"}>Оформить заказ</button>
            </div>
          </div>
        </footer>
      </section>`;
  }

  function renderIntake() {
    const intake = ui.intake;
    const file = intake.file
      ? `<div class="file-card"><span class="file-kind">XLSX</span><span class="file-name">${esc(intake.file.name)}</span>
         <button type="button" class="link" data-act="unfile">Убрать</button></div>` : "";
    main.innerHTML = `
      <section class="panel">
        <h2>Новая заявка</h2>
        <p class="lead">Вставьте заявку клиента как есть — письмо, список из мессенджера, строки из спецификации — или приложите файл. Разберу позиции, найду их в каталоге и соберу корзину на портале.</p>
        <div class="field"><label class="label" for="intake-text">Текст заявки</label>
          <textarea id="intake-text" rows="9" placeholder="Например: «ИПР 513-11ИКЗ-А-R3 — 6 шт, кабель КПСнг 1х2х0,75 — 300 м…»">${esc(intake.text)}</textarea></div>
        <label class="drop" id="drop">
          ${icon("upload")}
          <span><b>Приложите файл</b> или перетащите его сюда
            <span class="kinds" aria-hidden="true"><span>XLSX</span><span>XLS</span><span>DOCX</span><span>PDF</span><span>ФОТО</span></span></span>
          <input type="file" id="intake-file" accept=".xlsx,.xls,.docx,.pdf,image/*" aria-label="Файл заявки">
        </label>
        ${file}
        ${intake.error ? `<p class="form-error" role="alert">${icon("missing", "icon-18")}${esc(intake.error)}</p>` : ""}
        <div class="panel-foot">
          <p class="samples">Для пробы:
            <button type="button" class="link" data-act="sample" data-sample="letter">письмо клиента</button>
            <button type="button" class="link" data-act="sample" data-sample="excel">спецификация в Excel</button></p>
          <button type="button" class="btn btn-primary btn-lg" data-act="parse">${icon("sparkle")} Разобрать заявку</button>
        </div>
        <p class="hint">Голосовые не принимаю — нужен текст или документ.</p>
      </section>`;
  }

  function renderParsing() {
    main.innerHTML = `
      <section class="panel" aria-live="polite">
        <h2>Разбираю заявку</h2>
        <p class="lead">Позиции ищутся на портале по одной — большая спецификация занимает минуту-другую.</p>
        <div class="bar"><span id="bar"></span></div>
        <ol class="steps" id="steps"></ol>
      </section>`;
    renderSteps();
  }

  function renderSteps(text) {
    if (text) {
      const last = ui.steps[ui.steps.length - 1];
      const stem = (s) => s.replace(/\d+ из \d+.*/, "");
      if (last && /\d+ из \d+/.test(text) && stem(last) === stem(text)) ui.steps[ui.steps.length - 1] = text;
      else ui.steps.push(text);
    }
    const list = $("#steps");
    if (!list) return;
    list.innerHTML = ui.steps.map((step, i) => {
      const now = i === ui.steps.length - 1;
      return `<li class="${now ? "is-now" : ""}">${now ? `<span class="spinner" aria-hidden="true"></span>` : icon("check", "icon-18")}${esc(step)}</li>`;
    }).join("");
    const found = /(\d+) из (\d+)/.exec(ui.steps[ui.steps.length - 1] || "");
    const done = ui.steps.some((s) => /корзин|итог/i.test(s));
    const bar = $("#bar");
    if (bar) bar.style.width = done ? "100%" : found ? `${Math.round((found[1] / found[2]) * 85)}%` : "6%";
  }

  function renderOrdered() {
    const card = ui.card;
    const number = card.orders[0];
    const onRequest = card.on_request.length ? ` <span class="muted">без ${plural(card.on_request.length, "позиции", "позиций", "позиций")} по запросу</span>` : "";
    const invoice = ui.invoice
      ? `<div class="files"><div class="file-card"><span class="file-kind pdf">PDF</span><span class="file-name">${esc(ui.invoice.name)}</span>
         <span class="file-size">${esc(ui.invoice.size)}</span><button type="button" class="btn btn-sm" data-act="download">${icon("download", "icon-18")} Скачать</button></div></div>`
      : `<div class="invoice"><span class="spinner" aria-hidden="true"></span>Жду счёт из 1С — обычно от одной до семи минут. Пришлю сюда файлом.</div>`;
    main.innerHTML = `
      <section class="panel">
        <div class="result-head"><span class="result-mark">${icon("ok")}</span>
          <div><h2>Заказ оформлен, №${esc(number)}</h2><p class="caption">Заявка №${card.request_id} · ${new Date().toLocaleDateString("ru-RU")}</p></div></div>
        <dl class="facts-list">
          <dt>Клиент</dt><dd>${esc(card.company_name)} <span class="muted">ИНН ${esc(card.company_inn)}</span></dd>
          <dt>Сумма</dt><dd>${money(card.total)}${onRequest}</dd>
          <dt>Получение</dt><dd>${esc(card.delivery_label)}</dd>
          <dt>Позиций</dt><dd>${card.lines.length}</dd>
          ${card.manager_comment ? `<dt>Комментарий</dt><dd>${esc(card.manager_comment)}</dd>` : ""}
        </dl>
        ${invoice}
        ${filesHtml()}
        <div class="panel-foot">
          <p class="hint">По этим позициям можно сразу сделать КП или спецификацию — не дожидаясь счёта.</p>
          <div class="page-actions">
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
    const cancelled = card.status === "cancelled";
    main.innerHTML = `
      <section class="panel">
        <div class="result-head"><span class="result-mark${cancelled ? " is-neutral" : ""}">${icon(cancelled ? "close" : "ok")}</span>
          <div><h2>${esc(title)}</h2><p class="caption">Заявка №${card.request_id} · ${esc(card.company_name)}</p></div></div>
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
      ? found.map((c) => `<li><button type="button" data-company="${c.id}"${c.active ? " disabled" : ""}>
          <span>${esc(c.name)}${c.active ? " — сейчас активный" : ""}</span><span class="inn">ИНН ${esc(c.inn)}</span></button></li>`).join("")
      : `<li class="hint">Никого не нашёл. Контрагентов заводят в 1С — на портал они приезжают сами.</li>`;
  }

  function openCompanies() {
    if (!live()) { say("Клиента меняют у открытой заявки — сейчас её нет.", "warn"); return; }
    $("#company-query").value = "";
    fillCompanies();
    companyDialog.showModal();
  }
  $("#client-button").addEventListener("click", openCompanies);
  $("#client-card").addEventListener("click", openCompanies);
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
      <div class="removed"><div class="removed-head"><h3>Не вошло в заявку: ${card.removed.length}</h3>
        <button type="button" class="link" id="removed-insert">Вписать в комментарий</button></div>
        <ul>${card.removed.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>` : "";
    $("#order-body").innerHTML = `
      <div class="order-client">${icon("business")}
        <div><div class="label">Заказ уйдёт на</div><div class="name">${esc(card.company_name)}</div>
          <div class="caption">ИНН ${esc(card.company_inn)}</div></div></div>
      <dl class="facts-list">
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
      delete ui.ask[number];
      const match = ui.card.matches.find((m) => m.number === number);
      if (!match || match.ok) ui.open = nextProblem(ui.card, number);
    };
  }

  async function startIntake() {
    if (live()) {
      const ok = window.confirm(
        `Заявка №${ui.card.request_id} ещё не оформлена. Отменить её и начать новую? Корзина на портале очистится.\n\n` +
        "Если клиент просто дописал позиции — нажмите «Отмена» и вставьте их в «Дослать позиции» справа.");
      if (!ok) return;
      await run(() => api.cancel(setStep));
    }
    Object.assign(ui, { view: "intake", open: null, mode: {}, ask: {}, filter: "all", files: [], invoice: null, error: null });
    ui.intake = { text: "", file: null, error: "" };
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
      Object.assign(ui, { view: "card", filter: "all", open: null, mode: {}, ask: {} });
    } catch (error) {
      intake.error = error.message;
      ui.view = "intake";
    } finally {
      ui.busy = false;
      render();
    }
  }

  function takeFile(file) {
    if (!file) return;
    const field = $("#intake-text");
    ui.intake.file = { name: file.name };
    if (field) ui.intake.text = field.value;
    ui.intake.error = "";
    render();
  }

  const actions = {
    filter: (el) => { ui.filter = el.dataset.filter; ui.open = null; ui.ask = {}; render(); },
    close: () => { ui.open = null; ui.ask = {}; render(); },
    mode: (el, n) => {
      ui.mode[n] = el.dataset.mode;
      delete ui.ask[n];
      ui.error = null;
      render();
      const input = main.querySelector("tr.detail input");
      if (input) input.focus();
    },
    // «Взять» ничего не записывает: раскрывает вопрос «тот самый или аналог».
    // Фокус — на вопросе, а не на кнопке ответа: Enter не должен отвечать за человека.
    ask: (el, n) => {
      ui.ask[n] = el.dataset.id;
      render();
      const question = main.querySelector("tr.detail .ask");
      if (question) question.focus({ preventScroll: true });
    },
    unask: (el, n) => { delete ui.ask[n]; render(); },
    answer: (el, n) => run(() => api.pick(n, el.dataset.id, { analog: el.dataset.analog === "true" }, setStep), lineDone(n)),
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
      Object.assign(ui, { files: [], invoice: null, open: null, mode: {}, ask: {}, filter: "all" });
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
    ui.ask = {};
    render();
    if (ui.open != null) revealRow(ui.open);
  }

  /** Строку — к верху экрана: под ней раскрытая часть, а низ листа закрывает панель действий. */
  function revealRow(number) {
    const row = main.querySelector(`tr.row[data-number="${number}"]`);
    if (!row) return;
    row.focus({ preventScroll: true });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }

  main.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const number = Number(form.closest("tr.detail").previousElementSibling.dataset.number);
    const data = new FormData(form);
    const kind = form.dataset.form;
    if (kind === "qty") run(() => api.setQuantity(number, toNumber(data.get("qty")), setStep), lineDone(number));
    // Ссылка только находит товар; тот самый он или замена — ответ на вопрос.
    if (kind === "link") {
      run(() => api.findByLink(number, data.get("url"), setStep), (res) => {
        ui.mode[number] = "";
        ui.ask[number] = res.found_id;
      });
    }
    if (kind === "custom") run(() => api.custom(number, data.get("name"), toNumber(data.get("price")), setStep), lineDone(number));
  });

  main.addEventListener("change", (event) => {
    if (event.target.id === "intake-file") takeFile(event.target.files[0]);
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
    takeFile(event.dataTransfer.files[0]);
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

  // Каркас портала в пробнике никуда не ведёт — говорим об этом, а не молчим.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-portal]");
    if (!link) return;
    event.preventDefault();
    say("В пробнике работает только раздел «Ассистент» — остальное меню портала здесь для вида.", "demo");
  });
  $("#portal-search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    say("Поиск по каталогу в пробнике не работает — это строка портала, она здесь для вида.", "demo");
  });

  // --- старт: заявка уже разобрана, чтобы было на что смотреть -------------

  $("#page-sub").textContent = "Заявка клиента → корзина на портале, спецификация, КП или заказ";
  const boot = api.boot();
  ui.card = boot.draft;
  say("Это пробник: заявка уже разобрана на выдуманных данных. Нажмите на строку с жёлтым, синим или красным значком, чтобы её решить.", "demo");
  log(boot.said);
  render();
})();
