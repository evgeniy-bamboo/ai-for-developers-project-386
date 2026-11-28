# Hexlet check and assignment requirements

Research for issue #2. Date: 2026-11-29.

## Answer

The Hexlet automated check is small. It builds `Dockerfile` from the repo root, runs the container with `PORT=8080` and expects `GET /` to return 200. It checks no API paths, UI text or selectors. Tests do not run until the project is submitted for review. Until then every `hexlet-check` run is green but checks nothing.

A mentor checks everything else by hand against the assignment steps and a checklist. Several of those requirements conflict with the current `README.md`:

- the owner creates **event types**, where the README has fixed duration toggles;
- the shared check command must run a **browser e2e test** against the real server, where the README allows built-in test tools only;
- the app ships as **one container listening on `PORT`**, where the README has two processes;
- the app is deployed at a **public URL**, with **release-please** and **MCP config** in the repo.

## Sources

| Key | Source |
| --- | --- |
| [action] | [`hexlet/project-action`](https://github.com/hexlet/project-action) on branch `release`, commit `94cb871d15d4ea807ce362a76c3e8575a333f903`: `action.yml`, `src/index.js`, `src/routes.js`, `AGENTS.md`, `README.md` |
| [image] | Docker Hub image `hexletprojects/ai_assisted_development_calendar_slot_project_ru:latest`, public, digest `sha256:fd4ada89b844af86f6e0d32b18b2196e00470bd1567a9b3c51b98a36e11fbd57`, pushed 2026-11-24. Paths below are inside `/project`. |
| [run] | This repo's `hexlet-check` run [45681836631](https://github.com/evgeniy-bamboo/ai-for-developers-project-386/actions/runs/45681836631) (2026-11-25) |
| [help] | [help.hexlet.io: Автопроверка проектов](https://help.hexlet.io/project-work/avtoproverka-proektov) |
| [program] | [ru.hexlet.io/programs/ai-for-developers](https://ru.hexlet.io/programs/ai-for-developers) |

To reproduce [image]: `docker run --rm hexletprojects/ai_assisted_development_calendar_slot_project_ru cat /project/__data__/checklist.md`. Without Docker, fetch the last layer (`COPY . .`) through the anonymous Docker Hub registry API.

### Why this image is ours

- The action pulls `hexletprojects/${project.image_name}:latest`. `image_name` comes from `GET https://hexlet.io/api/user_project_github_workflow/project_members/<HEXLET_ID>.json` [action `src/index.js`, `src/routes.js`]. That call needs the `HEXLET_ID` secret, so the mapping was **not** confirmed directly.
- Indirect evidence: in `__data__/spec.yml` the image's project is "Календарь звонков" with link `https://files.hexlet.app/a/2ipc5m`, the demo linked from our README [image]. The only other matching image, `ai_assisted_development_calendar_advanced_project_ru`, is "Календарь звонков (продолжение)", the stage 2 project [image of that repo, `__data__/spec.yml`]. The program page also describes a two-stage project, and stage 1 is the call calendar [program].

## How the automated check runs

Confirmed from [action] `src/index.js`, unless noted:

1. The action fetches the project member from the Hexlet API. If `tests_on` is false, it logs `Tests will run during review step`, runs nothing and still finishes green.
   - Our runs so far all show this warning [run].
   - [help]: the action "активируется на последнем шаге при отправке на проверку". After that, every commit runs the tests. The README badge is green even when no tests ran.
2. It pulls the project image, copies its `/project` into `/var/tmp/source` and deletes the reference solution in `code/`. Then it copies the student repo into `source/code/` and builds the harness image.
3. Before tests, `checkPackageName`: if the harness `package.json` has a `file:code` dependency, the student's `package.json` `name` must match it. In our image the harness `package.json` has no such dependency, so this check is skipped. Only its devDependencies were inspected: Playwright.
4. `docker compose -f docker-compose.yml run --rm app make setup`. For the image, `make setup` runs `docker build -t calendar-slot-code:local -f code/Dockerfile code` [image `Makefile`]. So:
   - the build context is the student repo root;
   - `Dockerfile` must be at the repo root. Without it, the build fails with `open Dockerfile: no such file or directory` [image `__data__/checklist.md`].
5. `docker compose -f docker-compose.yml run --rm test`. The exit code of the `test` service is the verdict.
   - [image `docker-compose.yml`]: `app` runs `make code-run-compose`, which is `docker run --rm --network container:$HOSTNAME -e PORT=8080 calendar-slot-code:local` [image `Makefile`]. No command is passed, so the image's own `CMD`/`ENTRYPOINT` must start the app.
   - `app` has the network alias `calendar.test`. Its healthcheck runs `curl -fsS http://localhost:8080/` every 2 s, up to 300 retries, after a 10 s start period. That gives the app about 10 minutes to come up.
   - `test` waits for `app` to be healthy, then runs `make test`, which is `npm test` with Playwright, and `BASE_URL=http://calendar.test:8080` [image `docker-compose.yml`, `Makefile`, `playwright.config.ts`].
6. The only test [image `__tests__/00-smoke.spec.ts`]:

   ```ts
   const response = await page.goto("/");
   expect(response?.status()).toBe(200);
   ```

   Its settings: Chromium, locale `ru-RU`, navigation timeout 5 s, test timeout 10 s [image `playwright.config.ts`].
7. Post step: the action reports the verdict to Hexlet and uploads `tmp/artifacts/*/**` of the harness as `test-results` [action].

The image's README and the mentor file state the scope directly: "Проверка Хекслета собирает `code/Dockerfile`, запускает контейнер с `PORT=8080` и проверяет `GET /` с ответом `200`. Этот уровень не знает маршрутов API и структуры приложения студента" [image `README.md`, `__data__/review-checklist.md`]. The authors' change log also says the common check keeps "сборку Dockerfile, PORT и GET / 200, без фиксированных маршрутов API и привязки к языку" [image `docs/feedback-749.md`].

## Constraints

Columns: **Auto**: the automated check enforces it. **Mentor**: a requirement of the steps or the mentor checklist, checked by hand. File names refer to [image] `__data__/`.

### Deployment and runtime

| # | Constraint | Auto | Mentor | Source |
| --- | --- | --- | --- | --- |
| D1 | `Dockerfile` at the repo root. The build context is the repo root. | yes | yes | `Makefile` `code-setup`; `checklist.md`; `steps/60-deploy.md` |
| D2 | The container starts the app by itself, with no extra command. | yes | yes | `Makefile` `code-run-compose`; `steps/60-deploy.md` |
| D3 | The app listens on the port from env `PORT`. The check sets 8080. | yes | yes | `Makefile`; `docker-compose.yml`; `steps/60-deploy.md` |
| D4 | `GET /` returns HTTP 200 within a 5 s navigation. Health is polled with `curl -fsS` to `localhost:8080/`. | yes | — | `__tests__/00-smoke.spec.ts`; `playwright.config.ts`; `docker-compose.yml` |
| D5 | Reachable from another container as `http://calendar.test:8080`, so the app must listen on all interfaces, not only loopback. This is inferred from the compose network setup. | yes | — | `docker-compose.yml` |
| D6 | One container, no external dependencies such as a database. In-memory storage is allowed, and the README must say that data is lost on restart. | partly: there is no DB service in the compose file | yes | `steps/60-deploy.md`; `steps/05-intro.md` |
| D7 | A public URL of the deployed app in `README.md`, and the guest and owner scenarios work there, including a rejected double booking. Render is suggested, Railway is the fallback, and the platform itself does not matter. | — | yes | `steps/60-deploy.md`; `checklist.md`; `review-checklist.md` |
| D8 | Project MCP config for the chosen agent (e.g. hosting MCP), or a safe template with instructions. OAuth or env keys are fine. The README describes how to connect MCP, without secrets. | — | yes | `steps/60-deploy.md`; `checklist.md` |
| D9 | No secrets in git history. | — | yes | `steps/60-deploy.md`; `review-checklist.md` |
| D10 | Do not edit `.github/workflows/hexlet-check.yml`. The Hexlet monolith validates `hexlet/project-action@release` exactly. | — | — | file header; [action] `AGENTS.md` |
| D11 | LF line endings, because the tests run on Linux. | — | — | [help] |

### API contract

| # | Constraint | Auto | Mentor | Source |
| --- | --- | --- | --- | --- |
| A1 | **No fixed paths, methods or field names.** "Пути, методы и поля вы выбираете сами." | — | — | `steps/40-spec.md` |
| A2 | TypeSpec contract. OpenAPI generated from it, and a client SDK generated from OpenAPI, all with one command. Server artifacts are needed only if the framework has a generator. | — | yes | `steps/40-spec.md`; `steps/50-implement.md`; `checklist.md` |
| A3 | The spec defines the API and its expected responses, including booking creation, data errors and the conflict on busy time. | — | yes | `steps/40-spec.md` |
| A4 | The live server matches the contract: paths, methods, fields, success responses, data errors and conflict. API tests verify it. | — | yes | `steps/50-implement.md`; `review-checklist.md` |
| A5 | Framework errors (bad JSON, unknown route, wrong Content-Type) and limits beyond the contract are **not** grounds for returning the project, only recommendations. | — | — | `review-checklist.md` |
| A6 | The frontend calls the API only through the generated SDK. | — | yes | `steps/50-implement.md` |
| A7 | Generation is reproducible in CI. `AGENTS.md` names the generated paths and forbids editing them by hand. | — | yes | `steps/50-implement.md` |

### Domain and UI

| # | Constraint | Auto | Mentor | Source |
| --- | --- | --- | --- | --- |
| U1 | **Event types**: the owner *creates* event types, each with id, title, description and duration in minutes. Guests see a page of types with title, description and duration, then pick one. | — | yes | `steps/05-intro.md`; `steps/40-spec.md` |
| U2 | Full guest flow: event type → calendar → free slot → booking → confirmation. | — | yes | `steps/50-implement.md`; `checklist.md` |
| U3 | Owner page lists upcoming bookings of all types in one list. | — | yes | `steps/40-spec.md`; `checklist.md` |
| U4 | The booking window is 14 calendar days and moves with the date. Its start (today or tomorrow), working hours, time zone and slot start step are the student's choice, recorded in the spec. A slot lasts as long as its type. | — | yes | `steps/05-intro.md`; `steps/40-spec.md` |
| U5 | No overlap across types, including partial overlap and two simultaneous requests. Back-to-back is allowed. Busy slots are never shown as free. | — | yes | `steps/05-intro.md`; `steps/40-spec.md`; `review-checklist.md` |
| U6 | On a slot conflict the guest sees a clear message. | — | yes | `steps/40-spec.md`; `checklist.md` |
| U7 | Booking rules run on the server, so a direct API call cannot bypass them. | — | yes | `steps/50-implement.md`; `review-checklist.md` |
| U8 | The home page opens and links to the booking page. | — | yes | `steps/30-landing.md` |
| U9 | **No UI text, language or selectors are required.** The reference UI is Russian, but only `GET /` is automated. | — | — | `__tests__/`; `review-checklist.md` ("стек и структура каталогов у студента свои") |

### Testing and CI

| # | Constraint | Auto | Mentor | Source |
| --- | --- | --- | --- | --- |
| T1 | **Browser e2e scenario** against the real running server, without mocked booking API responses. It is part of the one check command. Playwright is recommended, not mandated. | — | yes | `steps/50-implement.md`; `checklist.md` |
| T2 | One command from `AGENTS.md` runs all checks locally and in CI: linter, type check, API tests and the browser test. | — | yes | `steps/10-scaffold.md`; `steps/50-implement.md` |
| T3 | Tests cover the booking flow and slot conflicts, including partial overlap of different lengths, e.g. 60 min at 10:00 and 30 min at 10:30. | — | yes | `steps/50-implement.md` |
| T4 | Home page tests from the first cycle run in the common check. | — | yes | `steps/30-landing.md`; `checklist.md` |
| T5 | Tests and linter run in GitHub Actions on every push, and the main branch is green. | — | yes | `steps/10-scaffold.md`; `checklist.md` |
| T6 | **Mutation check**: temporarily break one booking rule, show the protecting test red, restore the rule and show it green. A ticket records the rule, the command, both results and the reason. | — | yes | `steps/50-implement.md` |
| T7 | **release-please** workflow that opens a release PR, set up after the first feature. | — | yes | `steps/50-implement.md` |
| T8 | Conventional Commits. Implementation commits reference their ticket, e.g. `feat: … (#12)`, and that rule is in `AGENTS.md`. | — | yes | `steps/10-scaffold.md`; `steps/50-implement.md` |

### Process artifacts

| # | Constraint | Source |
| --- | --- | --- |
| P1 | `AGENTS.md` at the root: run, test and lint commands and the commit rule, compact, with a skills section. `docs/agents/` holds the tracker, labels and domain-docs config. | `steps/10-scaffold.md`; `steps/20-agent-setup.md` |
| P2 | `GLOSSARY.md` and entries in `docs/adr/`. | `steps/30-landing.md`; `checklist.md` |
| P3 | In GitHub Issues: a decision map with closed questions and written answers, a spec from `/to-spec`, and tickets from `/to-tickets` with declared dependencies and links to the spec. The first ticket takes one small feature through the whole contract chain. | `steps/40-spec.md`; `review-checklist.md` |
| P4 | The spec is implemented with `/implement-spec`, the results are collected in one branch, and the branch passes a joint review. | `steps/50-implement.md`; `checklist.md` |

## Conflicts with the current README

| README says | Assignment says | Ref |
| --- | --- | --- |
| Admin toggles fixed durations 15m/30m/45m/1h. The guest picks a duration. | The owner creates event types (id, title, description, duration). The guest picks a type. | U1 |
| Node built-ins only for tests. The map puts browser e2e out of scope. | A browser e2e scenario is required in the one check command. Playwright is recommended. | T1 |
| Frontend server and backend run as separate processes. | One image and one container that starts by itself and listens on `PORT`. The reference serves the SPA and the API from one Fastify process. | D1–D6; [image] `code/Dockerfile`, `code/package.json` |
| Deployment, MCP and release-please are not specified. | A public URL in the README, MCP config or template, release-please, ticket-referencing commits, and a recorded mutation check. | D7, D8, T6–T8 |
| `docs/adr/` does not exist yet. | ADR entries are required. | P2 |

Already compatible: the 14-day window starting tomorrow, working hours with the time zone in the spec, a 15-minute start grid, no overlap across durations with back-to-back allowed, server-side validation, atomic overlap check, in-memory storage, TypeSpec → OpenAPI → hey-api SDK, the generated-code check in CI, Conventional Commits, `GLOSSARY.md`, `docs/agents/`.

## Unknowns

- **Which image Hexlet maps our project to.** It was not confirmed directly, because the API call needs `HEXLET_ID`. The evidence for `ai_assisted_development_calendar_slot_project_ru` is strong: the same title and demo link, and the only other candidate is the stage 2 project.
- **The assignment text shown on ru.hexlet.io** is behind login and was not read. The steps above come from `__data__/steps/` in the image, which is the source for the assignment. The site may lag or lead it.
- **The image changes over time.** It was last pushed on 2026-11-24, and `TODO.md` lists open edits, e.g. "явно зафиксировать порт `8080`". The automated check may change, but the authors' change log states that it keeps only Dockerfile, `PORT` and `GET /` 200.
- **Whether a mentor would accept duration toggles as "event types".** This is a judgment call. The steps say the owner *creates* types with a title and description, so toggles likely fall short.
- **The CPU limit (0.7) of the harness `app` service** does not obviously apply to the nested `docker run` container. Its effect on startup time was not measured.
