/*
 * Подставной сервер пробника страницы-ассистента.
 *
 * Настоящая страница будет ходить в `app/web` — сервер поверх ядра
 * `app/core/`. Пробник живёт на GitHub Pages, где сервера нет, поэтому
 * здесь тот же набор вызовов, но данные выдуманы и портал не вызывается.
 * Заменить этот файл клиентом настоящего сервера с теми же методами —
 * и экраны (`app.js`) менять не придётся.
 *
 * Экраны ничего не решают сами: можно ли оформлять (`ready`), какой
 * у строки значок (`mark`), что сказать следующим шагом (`next_step`) —
 * всё приходит отсюда, как потом придёт от сервера. Иначе правило
 * «кнопку «Оформить» не из чего нажать» жило бы в двух местах и разошлось.
 *
 * Поля — как у датаклассов `app/core/models.py` (Draft, Match, Position,
 * Candidate, CartLine), чтобы серверу осталось отдать их как есть.
 * Значок строки — словом, а не эмодзи: ok ✅, attention ⚠️, retry 🔄,
 * missing ❌ (`Match.mark`).
 *
 * Каждый вызов возвращает `{draft, said}`: карточку целиком и то, что бот
 * говорит вслух (перевод единиц, кратность, смена клиента). Проговаривание
 * — правило ядра, а не экрана: молча поднятое количество менеджер не заметит.
 */
(function () {
  "use strict";

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const round = (value, digits) => Number(value.toFixed(digits));
  const fmtQty = (value) => String(round(value, 3)).replace(".", ",");
  const fmtMoney = (value) =>
    value.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + " ₽";

  function plural(n, one, few, many) {
    const d10 = n % 10;
    const d100 = n % 100;
    const word = d10 === 1 && d100 !== 11 ? one
      : d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14) ? few : many;
    return `${n} ${word}`;
  }

  // --- каталог: товары настоящие по смыслу, цены и артикулы выдуманы --------

  const P = (id, brand, name, article, price, extra = {}) => ({
    id, brand, name, article, price,
    unit: "шт", multiplicity: 1, stock: null, manufacturer_code: "", ...extra,
  });

  const CATALOG = Object.fromEntries([
    P("p-ip212", "Рубеж", "Извещатель пожарный дымовой адресно-аналоговый ИП 212-64-R3", "УТ-00031102", 1290, { stock: 412, manufacturer_code: "Rbz-084357" }),
    P("p-ipr", "Рубеж", "Извещатель пожарный ручной адресный ИПР 513-11ИКЗ-А-R3", "УТ-00027848", 1640, { stock: 96, manufacturer_code: "Rbz-301159" }),
    P("p-kps", "Паритет", "Кабель КПСнг(А)-FRLS 1х2х0,75 (бухта 200 м)", "УТ-00018211", 38.5, { unit: "м", multiplicity: 200, stock: 12000, manufacturer_code: "КПС-1х2х0,75-FRLS" }),
    P("p-rip50", "Болид", "Резервированный источник питания РИП-24 исп.50 (РИП-24-2/7М4-Р)", "УТ-00007431", 7420, { stock: 14, manufacturer_code: "РИП-24 исп.50" }),
    P("p-rip51", "Болид", "Резервированный источник питания РИП-24 исп.51 (РИП-24-2/7П-Р-RS)", "УТ-00007432", 9860, { stock: 0, manufacturer_code: "РИП-24 исп.51" }),
    P("p-rip56", "Болид", "Резервированный источник питания РИП-24 исп.56 (РИП-24-4/7М4-Р-RS)", "УТ-00007440", 11230, { stock: 6, manufacturer_code: "РИП-24 исп.56" }),
    P("p-dtm1207", "Delta", "Аккумуляторная батарея DTM 1207 12В 7Ач", "УТ-00002214", 1480, { stock: 230, manufacturer_code: "DTM 1207" }),
    P("p-dtm1226", "Delta", "Аккумуляторная батарея DTM 1226 12В 26Ач", "УТ-00002231", 6150, { stock: 18, manufacturer_code: "DTM 1226" }),
    P("p-2op", "Рубеж", "Прибор приёмно-контрольный и управления пожарный адресный Rubezh-2OP прот. R3", "УТ-00030877", 21900, { stock: 7, manufacturer_code: "Rbz-257438" }),
    P("p-molnia", "Арсенал Безопасности", "Табло световое «ВЫХОД» Молния-24", "УТ-00005119", 690, { stock: 150, manufacturer_code: "Молния-24" }),
    P("p-dkc91920", "DKC", "Труба гофрированная ПВХ лёгкая с протяжкой д20 мм (100 м)", "УТ-00014520", 11.9, { unit: "м", multiplicity: 100, stock: 8800, manufacturer_code: "91920" }),
    P("p-km41216", "IEK", "Коробка распаячная КМ41216 для о/п 100х100х50 мм IP44", "УТ-00009921", 118, { stock: 640, manufacturer_code: "UKO10-100-100-050-K41-44" }),
    P("p-shield", "IEK", "Щит металлический ЩМП-4-0 У2 IP54 650х500х220", "УТ-00011874", 4870, { stock: 11, manufacturer_code: "YKM40-04-54" }),
    // Тот самый щит из строки 11: по длинному названию портал его не находит,
    // по артикулу или коду — находит. На нём и видно, зачем поле «артикул».
    P("p-shield-6615", "EKF", "Щит металлический с монтажной панелью ЩМП-6.6.15 IP54 600х600х150", "УТ-00011902", 6240, { stock: 4, manufacturer_code: "ЩМП-6.6.15" }),
    P("p-kk4025", "Промрукав", "Кабель-канал 40х25 белый (2 м)", "УТ-00022937", 96, { unit: "м", multiplicity: 2, stock: 3200, manufacturer_code: "PR09.0302" }),
    P("p-shun", "Рубеж", "Шкаф управления насосами ШУН/В-18-03-R3", "УТ-00032410", null, { manufacturer_code: "Rbz-126523" }),
    P("p-mayak", "Электротехника и Автоматика", "Оповещатель звуковой Маяк-24-3М", "УТ-00005530", 410, { stock: 500, manufacturer_code: "Маяк-24-3М" }),
    P("p-exit-over", "Smartec", "Кнопка выхода накладная ST-EX110", "УТ-00019004", 540, { stock: 64, manufacturer_code: "ST-EX110" }),
    P("p-exit-mort", "Smartec", "Кнопка выхода врезная ST-EX012SM", "УТ-00019011", 780, { stock: 0, manufacturer_code: "ST-EX012SM" }),
  ].map((product) => [product.id, product]));

  const cand = (id) => ({ ...CATALOG[id] });

  /** Подпись товара — как `Candidate.label`: бренд, название, артикул портала. */
  function label(candidate) {
    let head = (candidate.name || "").trim();
    if (candidate.brand && !head.toLowerCase().includes(candidate.brand.toLowerCase())) {
      head = `${candidate.brand} ${head}`.trim();
    }
    if (!head) head = candidate.article || "без названия";
    return candidate.article ? `${head} [${candidate.article}]` : head;
  }

  // --- клиенты: активная компания на портале, цены считаются по ней --------

  const COMPANIES = [
    { id: 1001, name: "ООО «Пример-Монтаж»", inn: "7000000001", factor: 1,
      addresses: ["ул. Школьная, 3 — объект «Школа №3»", "пр. Строителей, 18, офис 4"] },
    { id: 1002, name: "АО «Демо-Электро»", inn: "7000000002", factor: 0.94,
      addresses: ["ул. Заводская, 7, склад 2"] },
    { id: 1003, name: "ООО «Тестовый объект»", inn: "5400000003", factor: 1.06, addresses: [] },
    { id: 1004, name: "ООО «Пример-Сервис»", inn: "5400000004", factor: 0.98,
      addresses: ["ул. Лесная, 21"] },
  ];

  function deliveryOptions(company) {
    const options = [
      { id: "pickup", name: "Самовывоз", type: "pickup", tariff: "бесплатно",
        points: [{ id: 11, address: "склад, ул. Складская, 1" },
                 { id: 12, address: "пункт выдачи, ул. Северная, 40" }] },
    ];
    // Адреса лежат в профиле клиента. Нет ни одного — способа нет вовсе.
    if (company.addresses.length) {
      options.push({
        id: "address", name: "Доставка по адресу", type: "address",
        tariff: "стоимость и срок уточнит менеджер",
        points: company.addresses.map((address, i) => ({ id: company.id * 10 + i, address })),
      });
    }
    options.push({ id: "tk", name: "Транспортная компания", type: "tk",
                   tariff: "до терминала ТК, оплата при получении", points: [] });
    return options;
  }

  // --- выдуманная заявка ---------------------------------------------------

  const SAMPLE_TEXT = [
    "Добрый день! Прошу счёт по объекту «Школа №3, корпус Б»:",
    "1. Извещатель ИП 212-64 прот. R3 — 40 шт",
    "2. ИПР 513-11ИКЗ-А-R3 Рубеж — 6 шт",
    "3. Кабель КПСнг(А)-FRLS 1х2х0,75 — 0,3 км",
    "4. РИП-24 исп.51 — 2 шт",
    "5. АКБ 12В 7Ач — 4 шт",
    "6. Аккумуляторная батарея 12В, 26 А/ч DTM 1226 — 2 шт",
    "7. Прибор Р-020 (Rubezh-2OP) — 1 шт",
    "8. Табло «Выход» 24В",
    "9. Труба гофр. ПВХ 20 мм с зондом, арт. 91920 — 500 м",
    "10. Коробка КМ41216 — 20 шт",
    "11. Щит металлический 600х600х150 — 1 шт",
    "12. Кабель-канал 40х25 белый — 60 м",
    "13. ШУН/В-18-03-R3 — 1 шт",
    "Спасибо! Ольга, снабжение",
  ].join("\n");

  const ADDITION_TEXT = [
    "Забыли дописать:",
    "— Оповещатель звуковой Маяк-24-3М, 4 шт",
    "— Кнопка выхода, 2 шт",
  ].join("\n");

  const SAMPLES = {
    letter: { kind: "text", title: "Письмо клиента", text: SAMPLE_TEXT },
    excel: { kind: "file", title: "Спецификация, Excel", fileName: "Спецификация_Школа3_корпус_Б.xlsx",
             text: SAMPLE_TEXT.split("\n").slice(1, -1).join("\n") },
    addition: { kind: "text", title: "Дописка клиента", text: ADDITION_TEXT },
    // Что ввести в «Указать товар» у строки, которую портал не нашёл (строка 11).
    find: ["УТ-00011902", "ЩМП-6.6.15", "https://b2b.pro-tek.pro/products/demo"],
  };

  function M(raw, name, quantity, unit, chosen, confidence, reason, alternatives = [], extra = {}) {
    return {
      position: { raw, name, quantity, unit, article: extra.article || "", note: "" },
      chosen: chosen ? cand(chosen) : null,
      confidence, reason,
      alternatives: alternatives.map(cand),
      confirmed: false, unreachable: !!extra.unreachable, hand_picked: false,
      // Взято как аналог — замена, а не тот самый товар. В ядре это правило
      // памяти (`aliases`, kind='analog'); карточке нужно показать его при строке.
      analog: false,
      // Что бот сделал со строкой сам: перевёл единицы, нашёл по артикулу.
      // В ядре это предупреждения карточки; странице удобнее держать их при строке.
      notes: extra.notes || [],
      // Чем портал ответит на повтор и на ссылку — только для пробника.
      demo_retry: extra.retry || null, demo_link: extra.link || null,
      number: 0,
    };
  }

  function sampleMatches() {
    return [
      M("Извещатель ИП 212-64 прот. R3 — 40 шт", "Извещатель ИП 212-64 прот. R3", 40, "шт", "p-ip212", "likely", "совпали модель и протокол R3"),
      M("ИПР 513-11ИКЗ-А-R3 Рубеж — 6 шт", "ИПР 513-11ИКЗ-А-R3", 6, "шт", "p-ipr", "likely", "совпало обозначение модели"),
      M("Кабель КПСнг(А)-FRLS 1х2х0,75 — 0,3 км", "Кабель КПСнг(А)-FRLS 1х2х0,75", 300, "м", "p-kps", "likely", "совпали марка и сечение", [],
        { notes: ["в заявке 0,3 км — перевёл в 300 м: портал продаёт кабель метрами"] }),
      M("РИП-24 исп.51 — 2 шт", "РИП-24 исп.51", 2, "шт", "p-rip51", "weak", "исполнение совпало, но на складе его нет — есть исп.50 и исп.56",
        ["p-rip50", "p-rip51", "p-rip56"]),
      M("АКБ 12В 7Ач — 4 шт", "Аккумулятор 12В 7Ач", 4, "шт", "p-dtm1207", "likely", "12 В, 7 Ач — DTM 1207"),
      M("Аккумуляторная батарея 12В, 26 А/ч DTM 1226 — 2 шт", "Аккумуляторная батарея DTM 1226", 2, "шт", "p-dtm1226", "likely", "совпала модель DTM 1226"),
      M("Прибор Р-020 (Rubezh-2OP) — 1 шт", "Прибор приёмно-контрольный Rubezh-2OP", 1, "шт", "p-2op", "likely", "совпало обозначение Rubezh-2OP"),
      M("Табло «Выход» 24В", "Табло «Выход» 24В", null, "шт", "p-molnia", "likely", "табло «ВЫХОД» на 24 В — Молния-24"),
      M("Труба гофр. ПВХ 20 мм с зондом, арт. 91920 — 500 м", "Труба гофрированная ПВХ 20 мм с зондом", 500, "м", "p-dkc91920", "likely",
        "совпал артикул клиента 91920", [],
        { article: "91920", notes: ["по наименованию нашлась труба 16 мм — спросил портал артикулом клиента 91920"] }),
      M("Коробка КМ41216 — 20 шт", "Коробка распаячная КМ41216", 20, "шт", null, "none", "портал не ответил на поиск", [],
        { unreachable: true, retry: "p-km41216" }),
      M("Щит металлический 600х600х150 — 1 шт", "Щит металлический 600х600х150", 1, "шт", null, "none", "на портале ничего похожего не нашлось", [],
        { link: "p-shield" }),
      M("Кабель-канал 40х25 белый — 60 м", "Кабель-канал 40х25 белый", 60, "м", "p-kk4025", "likely", "совпали размер и цвет"),
      M("ШУН/В-18-03-R3 — 1 шт", "Шкаф управления насосами ШУН/В-18-03-R3", 1, "шт", "p-shun", "likely", "совпало обозначение модели"),
    ];
  }

  function additionMatches() {
    return [
      M("Оповещатель звуковой Маяк-24-3М, 4 шт", "Оповещатель звуковой Маяк-24-3М", 4, "шт", "p-mayak", "likely", "совпала модель"),
      M("Кнопка выхода, 2 шт", "Кнопка выхода", 2, "шт", null, "weak", "по названию подходят две — накладная и врезная",
        ["p-exit-over", "p-exit-mort"]),
    ];
  }

  // --- правила: те же, что в models.py и bot.py ----------------------------

  const qtyKnown = (position) => position.quantity != null && position.quantity > 0;
  const isOk = (m) => !!m.chosen && (m.confidence === "exact" || m.confidence === "likely") && qtyKnown(m.position);
  const needsQuantity = (m) => !!m.chosen && !qtyKnown(m.position);

  /** `Match.mark`: что делать со строкой, а не насколько уверена модель. */
  function mark(m) {
    if (isOk(m)) return "ok";
    if (m.unreachable) return "retry";
    if (needsQuantity(m) || m.chosen || m.alternatives.length) return "attention";
    return "missing";
  }

  let draft = null;
  let requestSeq = 6;
  let orderSeq = 416;
  let offerSeq = 48;

  const company = () => COMPANIES.find((c) => c.id === draft.company_id);
  const priced = (candidate) =>
    candidate.price == null || candidate.custom ? candidate.price : round(candidate.price * company().factor, 2);

  function newDraft(matches, source, companyId) {
    matches.forEach((m, i) => { m.number = i + 1; });
    const client = COMPANIES.find((c) => c.id === companyId);
    return {
      request_id: ++requestSeq, status: "draft", company_id: client.id, source, matches,
      lines: [], total: 0, warnings: [],
      delivery_options: deliveryOptions(client), delivery_id: null, delivery_point_id: null, delivery_label: "",
      removed: [], required: [], on_request: [], produced: [], manager_comment: "", orders: [],
    };
  }

  /** Сборка корзины: строки с товаром и количеством, количество — до кратности. */
  function buildCart() {
    const d = draft;
    d.lines = [];
    d.on_request = [];
    d.warnings = [];
    for (const m of d.matches) {
      if (!m.chosen || !qtyKnown(m.position)) continue;
      const c = m.chosen;
      const requested = m.position.quantity;
      const multiplicity = c.multiplicity || 1;
      const actual = round(Math.ceil(requested / multiplicity - 1e-9) * multiplicity, 3);
      const price = priced(c);
      if (price == null) d.on_request.push(`${m.number}. ${c.name}`);
      d.lines.push({
        number: m.number, title: label(c), requested, actual, unit: c.unit, price,
        total: price == null ? null : round(price * actual, 2), skipped_reason: "",
        adjusted: actual !== requested,
        adjust_note: multiplicity > 1 ? `кратность ${fmtQty(multiplicity)} ${c.unit}` : "изменено магазином",
      });
    }
    d.total = round(d.lines.reduce((sum, line) => sum + (line.total || 0), 0), 2);
    if (d.on_request.length) {
      d.warnings.push(`Без цены, по запросу: ${plural(d.on_request.length, "позиция", "позиции", "позиций")}. ` +
                      "В сумму не входят, цену поставят в 1С — припишу это к комментарию заказа.");
    }
  }

  function nextStep(attention) {
    const d = draft;
    if (!d.lines.length) return "В корзину не встала ни одна строка — оформлять нечего.";
    if (attention.length) {
      const blank = attention.filter(needsQuantity).length;
      if (blank === attention.length) {
        return `Строк без количества: ${blank}. Задайте количество — без него они в заказ не попадут.`;
      }
      return `Строк, требующих проверки: ${attention.length} — они отмечены в таблице. ` +
             "Пока они не решены, заказ не оформить." + (blank ? ` Из них без количества: ${blank}.` : "");
    }
    if (!d.delivery_id) return "Осталось выбрать способ получения — без него портал заказ не примет.";
    if (d.required.length) return "Портал просит: " + d.required.slice(0, 3).join("; ");
    return "";
  }

  /** Карточка целиком — то, что потом отдаст сервер. */
  function view() {
    const d = draft;
    const withLabel = (c) => ({ ...c, label: label(c), price: priced(c) });
    const matches = d.matches.map((m) => ({
      ...structuredClone(m),
      chosen: m.chosen ? withLabel(m.chosen) : null,
      alternatives: m.alternatives.map(withLabel),
      mark: mark(m), ok: isOk(m), needs_quantity: needsQuantity(m),
      line: d.lines.find((line) => line.number === m.number) || null,
    }));
    const attention = d.matches.filter((m) => !isOk(m));
    const counts = { ok: 0, attention: 0, retry: 0, missing: 0 };
    matches.forEach((m) => { counts[m.mark] += 1; });
    const client = company();
    return structuredClone({
      request_id: d.request_id, status: d.status, source: d.source,
      company_id: client.id, company_name: client.name, company_inn: client.inn,
      matches, lines: d.lines, total: d.total, warnings: d.warnings, counts,
      delivery_options: d.delivery_options, delivery_id: d.delivery_id,
      delivery_point_id: d.delivery_point_id, delivery_label: d.delivery_label,
      removed: d.removed, required: d.required, on_request: d.on_request,
      produced: d.produced, manager_comment: d.manager_comment, orders: d.orders,
      needs_attention: attention.length,
      ready: d.matches.length > 0 && !attention.length && !!d.delivery_id && !d.required.length && d.lines.length > 0,
      next_step: nextStep(attention),
    });
  }

  const said = (text, tone = "plain") => ({ text, tone });

  function find(number) {
    const m = draft.matches.find((x) => x.number === number);
    if (!m) throw new Error(`Строки №${number} уже нет в заявке.`);
    return m;
  }

  function requireDraft() {
    if (!draft || draft.status !== "draft") {
      throw new Error("Заявка уже закрыта. Начните новую или вернитесь к этой из журнала.");
    }
  }

  async function rebuild(onStep, quick = false) {
    onStep("Освобождаю корзину на портале…");
    await wait(quick ? 150 : 300);
    const count = draft.matches.filter((m) => m.chosen && qtyKnown(m.position)).length;
    onStep(`Кладу в корзину ${plural(count, "позицию", "позиции", "позиций")}…`);
    await wait(quick ? 200 : 400);
    onStep("Портал считает итог и доставку…");
    await wait(quick ? 150 : 300);
    buildCart();
  }

  function adjustedSaid(numbers) {
    return draft.lines
      .filter((line) => line.adjusted && (!numbers || numbers.includes(line.number)))
      .map((line) => said(
        `Строка ${line.number}: магазин поднял количество до кратности — ` +
        `${fmtQty(line.actual)} ${line.unit} вместо ${fmtQty(line.requested)} (${line.adjust_note}).`, "warn"));
  }

  function parseSaid(source, own) {
    const out = [];
    if (own) {
      out.push(said("В пробнике разбор ненастоящий: вместо присланного показываю выдуманную заявку.", "demo"));
    }
    out.push(said(`Разобрал заявку: ${plural(draft.matches.length, "позиция", "позиции", "позиций")}. ` +
                  `Заказ уйдёт на ${company().name} — этот клиент сейчас активный на портале.`));
    draft.matches.forEach((m) => m.notes.forEach((note) => out.push(said(`Строка ${m.number}: ${note}.`))));
    out.push(...adjustedSaid());
    draft.lines.filter((line) => line.price == null).forEach((line) => out.push(said(
      `Строка ${line.number}: цены на портале нет — позиция по запросу, в сумму не входит.`, "warn")));
    const attention = draft.matches.filter((m) => !isOk(m)).length;
    if (attention) out.push(said(`Требуют проверки: ${plural(attention, "строка", "строки", "строк")}. Остальное подобрано.`, "warn"));
    return out;
  }

  // --- вызовы, которые потом уйдут на сервер -------------------------------

  const quiet = () => {};

  // Артикул портала — учётный код 1С: «УТ-00011902», «УТ000000348».
  const PORTAL_ARTICLE = /^(ут|ut)[\s-]?\d{5,}$/i;
  // Для сравнения кодов: регистр, пробелы, дефисы и точки не важны; «x» в размерах — как «х».
  const squash = (text) => String(text || "").toLowerCase().replace(/x/g, "х").replace(/[\s\-_.]/g, "");

  window.ProtekApi = {
    samples: () => structuredClone(SAMPLES),

    /** Стартовое состояние пробника — заявка уже разобрана, чтобы было на что смотреть. */
    boot() {
      draft = newDraft(sampleMatches(), SAMPLES.letter, 1001);
      buildCart();
      return { draft: view(), said: parseSaid(SAMPLES.letter, false) };
    },

    current: () => (draft ? view() : null),

    async parse(source, onStep = quiet) {
      const own = source.kind === "text" && source.text.trim() !== SAMPLE_TEXT.trim();
      onStep(source.kind === "file" ? `Читаю файл ${source.fileName}…` : "Читаю заявку…");
      await wait(700);
      const matches = sampleMatches();
      onStep(`Нашёл позиций: ${matches.length}`);
      await wait(450);
      for (let i = 1; i <= matches.length; i += 1) {
        onStep(`Ищу на портале: ${i} из ${matches.length}…`);
        await wait(120);
      }
      draft = newDraft(matches, structuredClone(source), draft ? draft.company_id : 1001);
      await rebuild(onStep);
      return { draft: view(), said: parseSaid(source, own) };
    },

    async pick(number, productId, { analog = false } = {}, onStep = quiet) {
      requireDraft();
      const m = find(number);
      const source = m.alternatives.find((c) => c.id === productId) || CATALOG[productId];
      m.chosen = { ...source };
      Object.assign(m, { confidence: "likely", confirmed: true, hand_picked: true, analog });
      m.reason = analog ? "выбран менеджером как аналог" : "выбран менеджером";
      await rebuild(onStep, true);
      // Что записано — словами и в обоих случаях, как в боте.
      const out = [said(analog
        ? `Строка ${number}: записал «${label(m.chosen)}» как замену (аналог) — в следующий раз предложу, но спрошу снова.`
        : `Строка ${number}: записал «${label(m.chosen)}» как тот самый товар — у этого клиента в следующий раз подставлю сам.`, "good")];
      if (!qtyKnown(m.position)) out.push(said(`Строка ${number}: осталось задать количество.`, "warn"));
      return { draft: view(), said: [...out, ...adjustedSaid([number])] };
    },

    async setQuantity(number, quantity, onStep = quiet) {
      requireDraft();
      const m = find(number);
      if (!(quantity > 0)) throw new Error("Нужно число больше нуля — например, 12 или 2,5.");
      m.position.quantity = quantity;
      m.confirmed = true;
      await rebuild(onStep, true);
      return {
        draft: view(),
        said: [said(`Строка ${number}: количество ${fmtQty(quantity)} ${m.position.unit}.`, "good"), ...adjustedSaid([number])],
      };
    },

    async retry(number, onStep = quiet) {
      requireDraft();
      const m = find(number);
      onStep("Спрашиваю портал ещё раз…");
      await wait(900);
      m.unreachable = false;
      m.chosen = cand(m.demo_retry || "p-km41216");
      m.alternatives = [cand(m.chosen.id)];
      m.confidence = "likely";
      m.reason = "совпала модель";
      await rebuild(onStep, true);
      return { draft: view(), said: [said(`Строка ${number}: портал ответил — нашлась «${label(m.chosen)}».`, "good")] };
    },

    /**
     * Товар, указанный менеджером: ссылка, артикул портала или код / название.
     * Как в боте: ссылка — товар по ссылке, «УТ…» — точный поиск по артикулу
     * портала, остальное — поиск по названию, куда портал пишет и код
     * производителя. Найденное только ставится в варианты строки; тот самый
     * это товар или замена, решает ответ на вопрос — дальше обычный `pick`.
     */
    async findProduct(number, query, onStep = quiet) {
      requireDraft();
      const m = find(number);
      const text = (query || "").trim();
      if (!text) throw new Error("Пришлите ссылку на товар, артикул портала или код производителя.");
      let found;
      let how;
      if (/^https?:\/\//i.test(text)) {
        onStep("Открываю товар по ссылке…");
        await wait(700);
        found = [cand(m.demo_link || "p-shield")];
        how = "по ссылке";
      } else if (PORTAL_ARTICLE.test(text)) {
        onStep("Ищу по артикулу портала…");
        await wait(600);
        const wanted = Number(text.replace(/\D/g, ""));
        found = Object.values(CATALOG)
          .filter((p) => Number(p.article.replace(/\D/g, "")) === wanted).map((p) => cand(p.id));
        if (!found.length) {
          throw new Error(`Артикул ${text} на портале не нашёлся. Проверьте его в карточке товара на сайте — он вида УТ-00011902.`);
        }
        how = `по артикулу ${text}`;
      } else {
        onStep("Ищу на портале по коду и названию…");
        await wait(700);
        const words = text.split(/\s+/).map(squash).filter(Boolean);
        found = Object.values(CATALOG)
          .filter((p) => {
            const hay = squash(`${p.brand} ${p.name} ${p.manufacturer_code}`);
            return words.every((word) => hay.includes(word));
          })
          .slice(0, 8).map((p) => cand(p.id));
        if (!found.length) {
          throw new Error("По этому на портале ничего нет. Пришлите артикул портала (вида УТ-00011902) — " +
                          "он в карточке товара на сайте — или ссылку на товар.");
        }
        how = `по «${text}»`;
      }
      found.forEach((c) => { if (!m.alternatives.some((a) => a.id === c.id)) m.alternatives.push(c); });
      // Прежняя причина «на портале ничего не нашлось» после поиска уже неправда.
      if (!m.chosen) m.reason = `нашлось ${how}`;
      return {
        draft: view(), found_ids: found.map((c) => c.id),
        said: [said(found.length === 1
          ? `Строка ${number}: ${how} нашёл «${label(found[0])}». Тот самый это товар или замена?`
          : `Строка ${number}: ${how} нашёл ${plural(found.length, "вариант", "варианта", "вариантов")} — выберите нужный.`)],
      };
    },

    async custom(number, name, price, onStep = quiet) {
      requireDraft();
      const m = find(number);
      const title = (name || "").trim();
      if (!title) throw new Error("Напишите название позиции — так она попадёт в заказ.");
      if (!(price > 0)) throw new Error("Цена нужна числом больше нуля, например 5200.");
      m.chosen = { id: `custom-${number}`, brand: "", name: title, article: "", price, unit: m.position.unit || "шт",
                   multiplicity: 1, stock: null, manufacturer_code: "", custom: true };
      m.alternatives = [];
      Object.assign(m, { confidence: "likely", confirmed: true, hand_picked: true, analog: false,
                         reason: "своя позиция менеджера" });
      await rebuild(onStep, true);
      return {
        draft: view(),
        said: [said(`Строка ${number}: завёл свою позицию «${title}» по ${fmtMoney(price)}. ` +
                    "В 1С она уйдёт произвольным товаром, а не номенклатурой каталога.", "good")],
      };
    },

    async removeLine(number, onStep = quiet) {
      requireDraft();
      const m = find(number);
      const q = m.position.quantity;
      draft.matches = draft.matches.filter((x) => x !== m);
      draft.removed.push(m.position.name + (q > 0 ? ` — ${fmtQty(q)} ${m.position.unit}` : ""));
      if (!draft.matches.length) {
        onStep("Очищаю корзину на портале…");
        await wait(400);
        draft.status = "cancelled";
        buildCart();
        return { draft: view(), said: [said("Убрана последняя строка — заявка закрыта, корзина на портале очищена.", "warn")] };
      }
      await rebuild(onStep, true);
      return {
        draft: view(),
        said: [said(`Строка ${number} убрана. Она в списке «Не вошло в заявку» — его стоит вписать в комментарий к заказу.`, "warn")],
      };
    },

    async setDelivery(optionId, pointId, onStep = quiet) {
      requireDraft();
      const option = draft.delivery_options.find((o) => o.id === optionId);
      if (!option) throw new Error("Такого способа портал сейчас не предлагает.");
      const point = option.points.find((p) => p.id === pointId) || null;
      if (option.points.length && !point) throw new Error("Выберите точку получения.");
      onStep("Портал пересчитывает доставку…");
      await wait(450);
      draft.delivery_id = option.id;
      draft.delivery_point_id = point ? point.id : null;
      draft.delivery_label = point ? `${option.name}, ${point.address}` : option.name;
      return { draft: view(), said: [said(`Способ получения: ${draft.delivery_label}.`, "good")] };
    },

    async searchCompanies(query) {
      await wait(250);
      const q = (query || "").trim().toLowerCase();
      return COMPANIES
        .filter((c) => !q || c.name.toLowerCase().includes(q) || c.inn.includes(q))
        .map((c) => ({ id: c.id, name: c.name, inn: c.inn, active: !!draft && c.id === draft.company_id }));
    },

    async switchCompany(companyId, onStep = quiet) {
      requireDraft();
      if (companyId === draft.company_id) return { draft: view(), said: [said("Этот клиент уже активный.")] };
      const client = COMPANIES.find((c) => c.id === companyId);
      onStep("Переключаю активного клиента на портале…");
      await wait(600);
      const hadAddress = draft.delivery_id === "address";
      draft.company_id = client.id;
      draft.delivery_options = deliveryOptions(client);
      const out = [said(`Клиент сменён: ${client.name}. Подбор оставил как есть, корзину пересобрал — цены и кратность теперь его.`, "good")];
      if (hadAddress) {
        Object.assign(draft, { delivery_id: null, delivery_point_id: null, delivery_label: "" });
        out.push(said("Прежний адрес доставки у нового клиента не предлагается — выберите способ получения заново.", "warn"));
      }
      await rebuild(onStep);
      return { draft: view(), said: out };
    },

    async addPositions(source, onStep = quiet) {
      requireDraft();
      const own = source.kind === "text" && source.text.trim() !== ADDITION_TEXT.trim();
      onStep("Читаю дополнение…");
      await wait(600);
      const added = additionMatches();
      const start = Math.max(...draft.matches.map((m) => m.number)) + 1;
      added.forEach((m, i) => { m.number = start + i; });
      for (let i = 1; i <= added.length; i += 1) {
        onStep(`Ищу на портале: ${i} из ${added.length}…`);
        await wait(250);
      }
      draft.matches.push(...added);
      await rebuild(onStep);
      const out = own ? [said("В пробнике разбор ненастоящий: вместо присланного добавляю выдуманные строки.", "demo")] : [];
      out.push(said(`Дополнил заявку: ${plural(added.length, "позиция", "позиции", "позиций")}, строки ${start}–${start + added.length - 1}. ` +
                    "Прежний подбор и ваши ответы не трогал.", "good"));
      return { draft: view(), said: out };
    },

    /** Комментарий к заказу. Эмодзи портал не принимает — падает с 500 (`clean_for_portal`). */
    setComment(text) {
      requireDraft();
      const raw = (text || "").trim();
      const clean = raw.replace(/[\u{10000}-\u{10FFFF}]/gu, "").replace(/[️‍]/g, "")
        .replace(/[ \t]{2,}/g, " ").trim();
      draft.manager_comment = clean;
      const note = clean !== raw ? "Убрал эмодзи: портал на них падает с ошибкой, и заказ не оформляется." : "";
      return { draft: view(), comment: clean, note };
    },

    async placeOrder(onStep = quiet) {
      requireDraft();
      const card = view();
      if (!card.ready) throw new Error(card.next_step || "Заявка ещё не готова к заказу.");
      onStep(`Проверяю, что на портале всё ещё ${card.company_name}…`);
      await wait(700);
      onStep("Оформляю заказ…");
      await wait(1200);
      onStep("Сверяю номер со списком заказов…");
      await wait(500);
      const number = `ДЕМО-${++orderSeq}`;
      draft.orders = [number];
      draft.status = "confirmed";
      return {
        draft: view(), orders: [number],
        said: [said(`Заказ оформлен, №${number}. Клиент: ${card.company_name}.`, "good"),
               said("Жду счёт из 1С — обычно от одной до семи минут. Пришлю сюда файлом.")],
      };
    },

    async waitInvoice(number) {
      await wait(6500);
      return {
        file: { name: `Счёт по заказу ${number}.pdf`, size: "84 КБ" },
        said: [said(`Пришёл счёт по заказу №${number}.`, "good")],
      };
    },

    async saveList(kind, onStep = quiet) {
      requireDraft();
      const savable = draft.matches.filter((m) => m.chosen && qtyKnown(m.position));
      if (!savable.length) throw new Error("Ни одна строка ещё не подобрана — в подборку класть нечего.");
      onStep(kind === "offer" ? "Создаю КП на портале…" : "Создаю спецификацию на портале…");
      await wait(800);
      onStep("Забираю файл…");
      await wait(600);
      const skipped = draft.matches.length - savable.length;
      let file;
      const out = [];
      if (kind === "offer") {
        const title = `КП №ДЕМО-${++offerSeq}`;
        draft.produced.push(title);
        file = { name: `${title}.pdf`, size: "212 КБ" };
        out.push(said(`Создано ${title} — PDF с шапкой и таблицей, его можно пересылать клиенту. Корзина цела: по этой же заявке можно оформить заказ.`, "good"));
      } else {
        draft.produced.push("спецификация");
        file = { name: `Спецификация — ${company().name.replace(/[«»"]/g, "")}.xlsx`, size: "18 КБ" };
        out.push(said("Создана спецификация — файл ниже. Корзина цела: по этой же заявке можно оформить заказ.", "good"));
      }
      if (skipped) out.push(said(`Не вошли строки без товара или количества: ${skipped}.`, "warn"));
      return { draft: view(), file, said: out };
    },

    async keep(onStep = quiet) {
      requireDraft();
      onStep("Запоминаю подбор…");
      await wait(400);
      draft.status = "kept";
      return { draft: view(), said: [said("Корзина собрана на портале — дальше на сайте. Подбор запомнил, заявка закрыта.", "good")] };
    },

    async cancel(onStep = quiet) {
      requireDraft();
      onStep("Очищаю корзину на портале…");
      await wait(500);
      draft.status = "cancelled";
      return { draft: view(), said: [said("Заявка отменена, корзина на портале очищена.")] };
    },

    async done() {
      requireDraft();
      draft.status = "done";
      return { draft: view(), said: [said(`Заявка закрыта. На портале остаётся: ${draft.produced.join(", ")}.`, "good")] };
    },

    /** «Вернуться к заявке» после заказа: новая заявка из тех же позиций, без разбора. */
    async repeat(onStep = quiet) {
      if (!draft) throw new Error("Возвращаться не к чему — заявок ещё не было.");
      const previous = draft;
      onStep("Беру позиции из журнала…");
      await wait(400);
      const matches = structuredClone(previous.matches);
      const numbers = matches.map((m) => m.number);
      draft = newDraft(matches, previous.source, previous.company_id);
      // `newDraft` пронумеровал заново — возвращаем прежние номера строк.
      matches.forEach((m, i) => { m.number = numbers[i]; });
      await rebuild(onStep);
      const was = previous.orders.length ? ` Прошлая заявка №${previous.request_id} с заказом №${previous.orders[0]} цела.` : "";
      return {
        draft: view(),
        said: [said(`Это новая заявка №${draft.request_id} из тех же позиций — без разбора и подбора, цены сегодняшние.${was}`, "good")],
      };
    },
  };
})();
