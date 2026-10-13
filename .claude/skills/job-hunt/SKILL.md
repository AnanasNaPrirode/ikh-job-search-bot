---
name: job-hunt
description: Поиск работы Ивана Хахарева — разбор новых вакансий от бота, подача заявок, учёт статусов и отказов. Используй, когда просят проверить новые вакансии, податься на вакансию, обновить трекер, проверить почту на ответы работодателей или прошерстить список компаний.
---

# Job hunt — рабочий процесс

Собрано по сессии 08.10.2026. Язык общения с Иваном — русский, технические термины с английским в скобках, без воды.

## 1. Карта источников

| Что | Где | Зачем |
|---|---|---|
| Трекер | `JOB_TRACKER.md` | Статусы, очередь, пропуски, правила подачи. **Читать первым.** В шапке — дата последней просмотренной отправки бота |
| Карточки заявок | `applications/YYYY-MM-DD_company_role.md` | Одна на заявку: метаданные, этапы, что отправили, гэпы, снапшот текста вакансии, «Разбор» при отказе |
| Вакансии от бота | `sent.json` (`{sent:[{sentAt,title,company,location,score,reasons,url}]}`) | Всё, что ушло в Telegram @AnanasNaPrirode_job_search. Новое = `sentAt` > даты из шапки трекера |
| Здоровье бота | `STATUS.md`, `status.json` | Какие доски отвалились |
| Скоринг бота | `build_workflow.py` → `python build_workflow.py` | Источники, веса, `TITLE_KW`, `DONE_COMPANIES`, `CLOSED_DOORS` |
| Список компаний | `companies_ru_abroad.csv` | 156 компаний (HyperCareer), колонки `ats`/`ats_slug` — найденная публичная ATS-доска |
| Исходная таблица | Google Sheets `1vO8bLxR3kzz7VNTuHlZhIqmgedezKosX8Vb_Elu6Wbc` | CSV: `/gviz/tq?tqx=out:csv&gid=379887995` (обычный `/export` отдаёт 403) |
| Почта откликов | Gmail **ikhakharev@gmail.com** (в Chrome это `/mail/u/2/`) | Подтверждения, отказы, приглашения |
| CV | PDF у Ивана: `Ivan_Khakharev_Engineering_Manager.pdf`, `..._Solution_Architect.pdf`, `..._AI_Solutions_Architect.pdf`, `..._Lead_Systems_Analyst.pdf`; HTML-исходники локально (`cv_grafana.html`, `cv_spotify.html`) | Выбор по треку вакансии |

## 2. Профиль и правила подачи (кратко; полная версия — раздел 6 трекера)

- Salou, Spain, CET. Английский C1, русский родной, испанский A1. Контакты — из шапки CV.
- Треки: Solution Architect, AI Solutions Architect, Lead Systems Analyst / Technical BA (Business Systems Analyst, Technical Analyst, Solution Analyst, Requirements Engineer), Engineering Manager. **С EM постепенно уходим** (см. §6).
- Виза: ВНЖ цифрового кочевника. Remote на иностранную компанию — спонсор не нужен. Найм в испанский штат, DE, DK, UK — **sponsorship = Yes**, «legally allowed» = **No** (нужен перевод на рабочий ВНЖ).
- Лидерство: de facto lead 5+ лет, без формальных подчинённых; 1:1, второй интервьюер на найме, команда ~9. Не выдумывать performance management и роль Hiring Manager.
- Финтех: 4 месяца в банке — кредитный конвейер, бизнес-процессы автоматических проверок для одобрения кредита. В CV нет — указывать в анкетах честно, срок не раздувать.
- Зарплата: EM remote Spain ~94–117k €; аналитик — верхняя полка, **5 500–6 500 € gross/мес** (66–78k/год); Дания 68–75k DKK/мес.
- Выход: 2–3 недели после оффера.
- Не подаём: нужен немецкий/французский/испанский рабочий; 10+ лет staff; TPM; LATAM, US-only, Индия/APAC.
- **Submit, капчу и вопрос «human/AI» делает Иван.** Мы заполняем форму и останавливаемся перед отправкой.

## 3. Сценарий: «проверь новую порцию вакансий»

1. Прочитать дату в шапке `JOB_TRACKER.md`.
2. Взять из `sent.json` записи с `sentAt` позже этой даты.
3. Отсеять повторы: сверять по компании + названию роли (бот присылает ту же роль с новым URL), а также с разделами 1–5 трекера — бот пока не знает о поданных и отказах.
4. По каждой оставшейся открыть страницу работодателя (не агрегатор) и проверить: язык, офис/remote и страны, виза, годы и **формальный people management**, стек. Агрегаторы (arbeitnow, jobicy) часто уже сняли вакансию → в 🔒.
5. Разнести: очередь (2) / решить (3) / пропуск с причиной (4) / закрыто (5). Новые помечать 🆕.
6. Обновить дату в шапке, закоммитить.
7. Ответ Ивану: таблица «подходит / решить / пропущено», ссылки на страницы работодателя, без пересказа всего.

## 4. Сценарий: «подаёмся»

1. Открыть вакансию на ATS работодателя (Ashby/Greenhouse/Lever/Workable), прочитать требования, отметить гэпы.
2. Выбрать CV по треку. Если адаптируем CV под вакансию — **сохранить адаптированный текст/HTML в `applications/`** рядом с карточкой (иначе потом нельзя разобрать отказ).
3. Заполнить форму: контакты, локация, right to work по §2, зарплата по §2 (спросить, если вилки нет), свободные поля — по фактам CV, без выдумок. Cover letter — по требованиям вакансии пункт за пунктом, гэп назвать прямо.
4. Остановиться перед Submit, перечислить, что осталось Ивану (CV-файл, капча, недостающие ответы).
5. После подтверждения отправки: строка в раздел 1 трекера (Дата / Статус ⏳ / … / Карточка) + карточка в `applications/` со **снапшотом текста вакансии сразу** (вакансии закрываются, текст пропадает) и дословными ответами формы.

## 5. Сценарий: «проверь ответы / почту»

1. Gmail `ikhakharev@gmail.com`, поиск вида `newer_than:7d (company1 OR company2 ...)`.
2. Открыть каждое письмо и прочитать тело (превью обманчиво: «Thank you for your application» бывает и подтверждением, и отказом).
3. Обновить статус в трекере (⏳ / ❌ DD.MM / этап интервью) и таблицу «Этапы» в карточке.
4. При отказе заполнить «Разбор»: этап, их формулировка, какие требования не закрыли (сверить с «Гэпами на момент подачи»), вывод. Обновить сводку отказов под таблицей раздела 1.

## 6. Текущие гипотезы (обновлять)

- 08.10: 3 отказа из 13 (Lunar, Testlio, Mapbox) — все EM, все на скрининге резюме за 2–3 дня. Общий фактор — требование формального people management (5+ лет). Решение: постепенно смещаться к SA / аналитику; если EM — подавать туда, где «1+ год управления» или «tech lead → manager».
- Аналитический трек (CoinsPaid, Libertex) — ждём ответов, это проверка гипотезы.

## 7. Сценарий: «прошерсти список компаний»

1. Компании с `ats` в `companies_ru_abroad.csv` — через публичные API (одним запросом весь список):
   - Greenhouse: `boards-api.greenhouse.io/v1/boards/{slug}/jobs` (+ `/jobs/{id}?content=true` для текста)
   - Ashby: `api.ashbyhq.com/posting-api/job-board/{slug}` (`descriptionPlain`)
   - Lever: `api.lever.co/v0/postings/{slug}?mode=json`; EU-аккаунты — `api.eu.lever.co`
   - SmartRecruiters: `api.smartrecruiters.com/v1/companies/{slug}/postings`
   - Workable: `apply.workable.com/api/v1/widget/accounts/{slug}`; текст вакансии — `/api/v2/accounts/{slug}/jobs/{shortcode}` (same-origin со страницы workable)
   - Recruitee: `{slug}.recruitee.com/api/offers/`; Pinpoint: `{slug}.pinpointhq.com/postings.json`
2. Компании без ATS — открыть карьерную страницу в браузере и искать **ссылку на ATS** (это ценнее, чем читать страницу): регулярка по `huntflow|teamtailor|lever.co|greenhouse|workable|breezy|ashbyhq|personio|smartrecruiters|myworkdayjobs|recruitee|comeet|peopleforce|pinpoint`. Найденные доски — в CSV и в источники бота.
3. Фильтр названий: EM/Head of Eng, Solution/Software/AI Architect, Tech Lead, Business/Systems/Technical/Solution/Functional Analyst, Requirements Engineer, Technical PO. Отсекать sales/pre-sales, junior, mobile, game, non-EU.

## 8. Технические грабли (окружение Cowork + Claude in Chrome)

- **Облачная песочница не ходит** на GitHub API (`gh` — нет доступа к репо), Google, ATS-API, карьерные сайты (egress proxy 403). Всё — через браузер Ивана.
- **Чтение репо**: `fetch('https://github.com/AnanasNaPrirode/ikh-job-search-bot/raw/main/<path>?t='+Date.now(), {cache:'no-store'})` со страницы github.com (raw кешируется — нужен cache-buster).
- **Запросы к ATS** делать со страницы `docs.google.com/spreadsheets/...`: там CORS-запросы проходят; на github.com CSP режет часть хостов (Lever). На docs.google — Trusted Types: `DOMParser`/`innerHTML` падают, HTML→текст регуляркой.
- **Вывод JS-инструмента** ~1000 символов и блокируется, если в нём URL с query string — резать `?…`, отдавать данные пачками.
- **Коммит нового файла**: `github.com/<repo>/new/main?filename=path/to/file.md` → фокус на `.cm-content` → вставка. **Правка существующего** (`/edit/main/<path>`): синтетический paste не заменяет текст надёжно; рабочий способ — временная `<textarea>` с текстом → клик → Ctrl+A/Ctrl+C → фокус редактора → Ctrl+A/Ctrl+V → сверить число строк (гуттер) с ожидаемым → кнопка «Commit changes...» → описание → «Commit changes». Буфер обмена работает только в активной вкладке — всё в одной вкладке; данные между переходами хранить в `localStorage` страницы docs.google и **чистить после**.
- В описание коммита — строки `Co-Authored-By` / `Claude-Session` по системной инструкции.
- **Формы на React (Ashby, Workable)**: значение, выставленное скриптом, может не засчитаться (так было с телефоном у Pleo) — критичные поля вводить с клавиатуры и проверять ошибки формы. Workable сам подставляет адрес по геолокации — проверять.
- **Загрузка CV** через `file_upload` иногда блокируется для файлов из чата — тогда CV прикладывает Иван.
- **WebFetch** не видит вакансии на JS-страницах (InDrive, Semrush, Exness и т.п.) и не читает robots-закрытые (Palta). Расширение Chrome падает на длинных пачках переходов — не больше 1–4 сайтов на вызов.
- `radar.yml` пушит без `git pull --rebase`: коммит во время прогона бота может сломать сохранение `seen.json`. Пока принято как редкий риск.

## 9. Открытые задачи

- Добавить в бота найденные ATS-доски (раздел 7 трекера) и аналитические названия ролей в фильтр.
- Заполнить `DONE_COMPANIES` / `CLOSED_DOORS` по разделам 1 и 5 трекера, чтобы бот не присылал поданное и отказавшее.
- `git pull --rebase` перед `git push` в `radar.yml`.
- Ответ Finom ожидается ≈13.10.
