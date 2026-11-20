# Roadmap

What's next after the six build phases, in the order I'd suggest doing them.
Each section says what's involved, the decisions to make, and the risks found
while researching (November 2026). Versions and service limits move quickly:
re-check anything marked _verify_ before starting that work.

| #   | Work                                                               | Depends on | Size   | Status |
| --- | ------------------------------------------------------------------ | ---------- | ------ | ------ |
| 0   | [Continuous integration](#0-continuous-integration)                | –          | Small  | Done   |
| 1   | [Visual polish and mobile](#1-visual-polish-and-mobile)            | –          | Medium | Done   |
| 2   | [Accounts and auth](#2-accounts-and-auth)                          | –          | Large  | Done   |
| 3   | [Deploy to Cloudflare with Pulumi](#3-deployment)                  | 2          | Large  | Next   |
| 4   | [Card scanning](#4-card-scanning)                                  | 1          | Medium |        |
| 5   | [Rules lookup](#5-rules-lookup)                                    | –          | Medium |        |
| 6   | [Game tracking](#6-game-tracking)                                  | 1 (2)      | Medium |        |
| 7   | [Card data: legality and prices](#7-card-data-legality-and-prices) | –          | Medium |        |
| 8   | [Deck builder improvements](#8-deck-builder-improvements)          | –          | Small  |        |
| 9   | [Production hardening](#9-production-hardening)                    | 2, 3       | Medium |        |

Why this order: CI first so everything after it is checked on every push.
Mobile polish before scanning, because scanning happens on a phone. Auth
before deployment, because the app shouldn't go on the internet without it. Rules lookup stands alone and
can slot in anywhere. Game tracking is played on a phone, so it follows the
mobile work; anyone can use the tracker, but saving games, like any other
change, needs signing in. Card data and the deck builder improvements are independent. Hardening
goes with deployment: do it before the app is opened to anyone else.

---

## 0. Continuous integration

A GitHub Actions workflow that runs `npm run check` on every push and pull
request, so `main` only ever receives code that passes.

- Node from `.nvmrc`, `npm ci`, MySQL 8.4 as a service container with the
  `mtg_test` database (mirroring `docker/mysql-init`), then `npm run check`.
- Run `npm run test:coverage` and upload the HTML reports as an artefact.
- Protect `main`: require the check and a pull request.
- Optional: Dependabot or Renovate for dependency updates, and `npm audit` as a
  non-blocking step (the 7 moderate advisories in dev tooling are still open).

---

## 1. Visual polish and mobile

The app works on a phone but isn't designed for one: the collection is a wide
DataGrid, the deck builder is two columns, and navigation is a drawer.

### Theming

- **Light and dark mode.** Use MUI's CSS-variables theme (`colorSchemes` with
  `light` and `dark`), follow the system setting by default, and add a toggle
  in the app bar. CSS variables avoid the flash of the wrong theme on load.
- **A palette with some character.** Keep the purple primary, but derive
  accents from the five Magic colours for colour pips, charts and chips
  (consistent everywhere: filters, deck stats, deck cards).
- **Typography.** A display face for headings with a fantasy feel. Beleren
  (Magic's own) isn't licensed for this; pick an open font from Google Fonts
  via `next/font`.
- **Cards first.** Show card art more: hover (desktop) or long-press (mobile)
  previews in tables and deck lists, larger images on entry pages, art crops as
  deck card backgrounds (Scryfall's `art_crop` image size; needs adding to the
  card cache).
- **States.** Consistent skeletons, empty states with a next action, and
  error states with retry, using one set of components.

### Mobile

| Page          | Desktop now                    | Mobile plan                                                                            |
| ------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| Navigation    | Side drawer                    | Bottom navigation bar (Dashboard, Collection, Decks, Add), side drawer kept on desktop |
| Collection    | DataGrid with 11 columns       | Card list (image, name, printing, counts) below `md`; filters in a bottom sheet        |
| Add cards     | Printing grid, then form below | Full-width steps: name → printing → copies, with a sticky save button                  |
| Entry page    | Two columns                    | Image on top, form below, actions in a bottom bar                                      |
| Deck builder  | Boards and stats side by side  | Tabs: Cards / Stats / Check; larger quantity steppers; "add" as a floating button      |
| Import / Data | Wide tables                    | Stacked summaries; error lists as cards                                                |

- **Installable (PWA).** A web manifest and icons so it can be added to a
  phone's home screen. Offline support isn't needed at first.
- **Testing.** Add Playwright with desktop and mobile viewports for a few
  end-to-end journeys (add a card, build a deck, import), plus an accessibility
  check with `@axe-core/playwright`. These also catch layout regressions the
  unit tests can't see.

---

## 2. Accounts and auth

**Done** (pull requests #17 and #18, November 2026).

### What was decided

- **Better Auth inside the API**, rather than OpenAuth as first planned.
  OpenAuth had gone quiet (last release 0.4.3 in March 2025, last commit April
  2025). Better Auth is a library, not a separate service, so there's no
  extra Worker to deploy, and it keeps its users and sessions in the same
  MySQL database (`auth_*` tables).
- **GitHub sign-in only, with an allowlist** of GitHub usernames
  (`AUTH_GITHUB_ALLOWLIST`). There is no sign-up: anyone else is turned away
  before a user is created, and someone taken off the list stops counting as
  signed in straight away.
- **Public read, sign in to edit.** One shared collection, not one per
  person, so no `ownerId` columns. Visitors can browse everything except what
  was paid for cards, notes and the "Spent" total, which the API leaves out
  of its responses unless the request is signed in.

### How it fits together

```text
Browser ──cookie──▶ Next.js BFF ──read-only token + cookie──▶ API (Better Auth) ──▶ MySQL
                    /api/auth/* passed through as is ─────────▶ /api/auth/*
```

- The BFF's own token can only read. Changes need the person's session
  cookie, which the BFF forwards and the API checks (tsoa's `editor`
  security scheme: a session, or a token with the scope, for scripts).
- `/api/auth/*` on the site passes straight through to the API, so the
  cookies are the site's and the browser never sees the API.
- Failed sign-ins go to the site's `/error` page, never raw JSON.
- The README has the GitHub OAuth app set-up for local development.

### Follow-ups

- An `Origin` check on the BFF's state-changing routes (see section 9).
  Session cookies are `SameSite=Lax`, which already stops cross-site form
  posts.
- If the collection ever becomes per person (for example after merging with
  shelf, below), that's when `ownerId` columns and per-owner queries come in.

---

## 3. Deployment

### Decisions

- **Cloudflare Workers Paid** from the start. The web Worker built with
  OpenNext measured 2.87 MiB gzipped, just under the free plan's 3 MiB limit,
  and the free plan's 10 ms of CPU per request is too tight for server
  rendering. Paid raises these to 10 MiB and 30 s.
- **Keep MySQL, through Hyperdrive.** No change to the schema, the queries or
  local development (Docker MySQL). Needs a hosted MySQL provider: still to
  choose (_verify_ current free tiers and pricing; requirements are MySQL 8,
  TLS, and a region near `weur`).
- **Modelled on the [shelf](https://github.com/Macavitymadcap/shelf) repo's
  deployment**, which already works:
  - Pulumi (state in Pulumi Cloud, a `prod` stack) creates the long-lived
    resources; `infra/scripts/sync-wrangler.ts` writes their ids into
    `wrangler.jsonc`.
  - Wrangler builds and uploads the Workers.
  - A `deploy` job in CI runs on `main` after the checks pass: `pulumi up`,
    sync, migrations, deploy. It uses the repo secrets
    `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `PULUMI_ACCESS_TOKEN`.
  - The site starts on a `workers.dev` subdomain; a custom domain can come
    later.

### Target

| Part          | Runs as                                              | Notes                                                                                                                                                                       |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web (Next.js) | Worker, built with `@opennextjs/cloudflare`          | Measured with 1.20.17 and Wrangler 4.163. _verify_ support before upgrading Next                                                                                            |
| API (Express) | Worker with `nodejs_compat`, via `httpServerHandler` | Includes Better Auth. Private: only the web Worker calls it, through a [service binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/) |
| Database      | Hosted MySQL through Hyperdrive                      | `mysql2` ≥ 3.13 with `disableEval: true`; TLS required                                                                                                                      |
| Secrets       | Worker secrets, set from CI or Pulumi config secrets | `JWT_SECRET`, `AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `AUTH_GITHUB_ALLOWLIST`, the database URL                                                          |
| Sign-in       | A second GitHub OAuth app for the deployed site      | Callback `https://<site>/api/auth/callback/github`; `AUTH_BASE_URL` set to the site's URL                                                                                   |

### Risks to spike before committing

1. **Connections per request.** Workers can't reuse I/O objects (database
   connections) across requests. Today Inversify creates one Knex instance,
   and Better Auth its own `mysql2` pool, for the whole process. On Workers
   both need a connection per request (cheap with Hyperdrive, which pools for
   you): make the Knex and auth bindings request-scoped, or create them in a
   request middleware.
2. **Bundling Knex.** Knex `require`s every dialect it supports. Bundling for
   Workers may need the unused drivers marked as externals or aliased away.
3. **Everything else in the API on Workers:** tsoa's generated routes,
   decorator metadata, Inversify, winston (console output is fine) and
   `AsyncLocalStorage` (supported with `nodejs_compat`). Swagger UI is already
   off in production.

If the API spike fails, alternatives: run the API unchanged as a Cloudflare
Container (_verify_ availability and pricing), or move the API's routes into
the Next.js app.

### Steps

1. Choose the MySQL provider and create the database (by hand, or in Pulumi
   if the provider has one).
2. Spike: API on a Worker against Hyperdrive.
3. Spike: web on a Worker with OpenNext, calling the API through a service
   binding.
4. `infra/` Pulumi project (Hyperdrive config, secrets), following shelf's.
5. CI `deploy` job, following shelf's: migrations run before the API deploys.
6. Load the data: `npm run db:export` locally, then import through the
   deployed Data page (or the CLI pointed at production).
7. Scheduled backups: a Cron Trigger that exports to R2 nightly, keeping a few
   weeks.

### Later: one app for every collection

shelf (books, records, board games) and this app may merge into one app for
all collections. Not planned yet; until then, keep new code that isn't about
Magic generic where it costs nothing (auth, the BFF, the error pages, the data
export).

---

## 4. Card scanning

### Constraint

Most scanners read the set code and collector number printed in a card's
bottom-left corner, then look the printing up directly (we already have
`GET /api/catalogue/cards/{set}/{number}`). **The set code has only been
printed there since Magic 2015 (mid-2014), and collector numbers only since
about 1998.** Most of this collection is pre-2007, so the card's **name** has
to be the main thing read.

### Approach

1. **Capture.** A "Scan" page using the phone camera (`getUserMedia`; needs
   HTTPS or localhost), with a card-shaped guide on screen. Also allow picking
   photos from the camera roll.
2. **Read.** Two options to compare in a spike:
   - **On-device OCR** with Tesseract.js on the title strip (and the
     collector line when there is one). Free and private, but sensitive to
     lighting and stylised fonts.
   - **A vision model** called from the API, for example Claude, returning
     `{ name, setCode?, collectorNumber?, foil? }` as JSON. More reliable on
     old cards and odd frames; costs a little per scan and needs an API key
     on the server.
3. **Match.** Look the name up with Scryfall's fuzzy name search
   (`/cards/named?fuzzy=`, behind our rate-limited client), then:
   - with a set and number: select that printing directly;
   - without: open the existing printing picker, filtered to that card, so you
     confirm the printing by eye.
4. **Confirm and save.** Reuse the add-card form (quantity, condition,
   finish, flags). A **batch mode** queues scans so you can scan a stack of
   cards and confirm them in one pass.

### Is it worth it?

ManaBox already scans well, and the ManaBox import handles its exports. The
in-app scanner earns its place if it handles old cards better, or saves the
export-and-import round trip. A one-day spike comparing the OCR and vision
options on 20 of your oldest cards should decide it.

---

## 5. Rules lookup

Three parts, from smallest to largest.

### Card rulings

Scryfall publishes the official rulings for each card
(`GET /cards/{id}/rulings`: date, source and text). Show them on a card's page
under its oracle text, fetched through the API's Scryfall client and cached,
since they rarely change.

### Comprehensive Rules search

A `/rules` page to search the Comprehensive Rules by keyword or rule number
(e.g. "702.19" or "trample"), showing the rule in context with its parent and
child rules, and the glossary.

- **Source.** Wizards publishes the Comprehensive Rules as a text file (and
  PDF) at [magic.wizards.com/en/rules](https://magic.wizards.com/en/rules),
  updated with most set releases. A script (`npm run rules:update`)
  downloads it, parses rule numbers, text and glossary entries, and loads them
  into a `rule` table. _Verify_ the file's current URL and format, and Wizards'
  Fan Content Policy on reproducing it, before starting; keep the text out of
  the repo and fetch it instead.
- **Search.** MySQL `FULLTEXT` on the rule text, or SQLite FTS5 if the
  database moves to D1, plus exact matching on rule numbers.
- **Links.** Rule references inside rules ("see rule 702.19c") become links.

### Keywords in card text

Link keyword abilities in oracle text (Flying, Trample, Ward …) to their rule,
with a short definition on hover or tap. The keyword list comes from rule 702
in the same data.

### Later: ask a rules question

An "ask" box that answers rules questions in plain English using a language
model, with the relevant rules and card rulings supplied as context and quoted
in the answer so it can be checked. Costs a little per question; do it only
once the search above exists, because the answer quality depends on finding
the right rules to supply.

---

## 6. Game tracking

### Live game tracker

A phone-first screen for playing: one tile per player, rotated to face them
when the phone lies flat between players.

- **Per player:** life (tap ±1, hold ±10, with a running "−7" indicator that
  settles after a moment), poison, and other counters (energy, experience,
  rad, which Fallout decks use).
- **Commander:** commander damage per opponent's commander (21 loses), and
  commander tax.
- **Table:** turn counter and active player, Monarch and Initiative, a dice
  roll and coin flip, and a game timer.
- **Set-up:** 2 to 6 players, starting life by format (20, or 40 for
  Commander), and choose which of your decks you're playing.
- **Robust:** game state saved in the browser as it changes (survives a
  refresh or the screen locking), with undo for mis-taps; the screen kept awake
  with the Wake Lock API.

### Game log and stats

Finishing a game saves a record:

- **`game`:** format, date, duration and notes.
- **`game_player`:** seat, player name, your deck (or a free-text deck name for
  opponents), commander, final life, placing, and what eliminated them
  (combat, commander damage, poison, concession …).

That gives each deck a **record** (games, wins, win rate, average game
length) on its page and the dashboard, a list of recent games, and head-to-head
results against regular opponents. Opponents are just names: they don't need
accounts.

### Steps

1. Tracker only, saved in the browser: no API or database changes. Useful
   straight away.
2. Game log: migrations, API endpoints, "save game" at the end of the
   tracker, and deck records.
3. Include games in the JSON export and import (format version 3, still
   accepting versions 1 and 2).

---

## 7. Card data: legality and prices

The card cache stores what was needed to add cards and build decks. Two more
things from Scryfall make the deck checks and dashboard more useful.

### Format legality

- Add each card's `legalities` (legal, banned, restricted, not legal, per
  format) to the `card` table.
- A new deck warning, `not-legal`, in `packages/shared/src/rules.ts`: a banned,
  restricted-over-one or not-legal card for the deck's format. This also
  covers Pauper's commons-only rule properly, which the current checks skip.
- Legality changes with ban announcements, so the cache needs refreshing:
  either per card when it's older than a few days, or a daily job using
  Scryfall's bulk data files (one download instead of thousands of requests,
  and the approach Scryfall recommends for keeping a copy of its data).

### Prices

- Scryfall gives a daily price per printing in **USD, EUR and MTGO tix only**,
  for non-foil, foil and etched. There's no GBP, so either show EUR, or convert
  using a daily exchange rate (and label it as converted).
- Store the latest price on the card, and optionally a `card_price` history
  table filled by the same daily job, for value-over-time charts.
- Collection value on the dashboard, value per deck, and value per entry next
  to what you paid (which is already recorded).

---

## 8. Deck builder improvements

- **Move cards between boards** (now it's remove and re-add): a board menu on
  each card line, saved as one change (a `move` endpoint, or a transaction in
  the existing `PUT`) so the deck is never briefly missing the card.
- **Export a decklist** as text in the common `1 Sol Ring (PIP) 240` format,
  with commander and sideboard sections, which Moxfield, Archidekt and MTG
  Arena-style tools import. A "copy" button and a download.
- **Import a decklist** from text: parse the lines, look the cards up on
  Scryfall, and build the deck from cards you own. This reuses the matching
  written for preconstructed decks ("I already own these cards"), with the
  same preview, substitution notes and all-or-nothing rule.

---

## 9. Production hardening

What needs to be in place before the deployed app is used by anyone other
than you. Most of it sits naturally in the deployment work (section 3), but
it's listed separately so none of it gets missed.

- **Rate limiting** with Cloudflare rules, tighter on sign-in, imports and
  Scryfall-backed lookups (which also protects our standing with Scryfall).
- **Security headers:** a Content Security Policy (allowing Scryfall's image
  and symbol hosts), HSTS, and `X-Content-Type-Options`.
- **CSRF protection** on the BFF's state-changing routes: sessions are
  `SameSite=Lax` cookies already (and Better Auth checks `Origin` on its own
  routes); add an `Origin` check on the BFF's `POST`, `PUT`, `PATCH` and
  `DELETE` routes.
- **Request limits:** the API accepts 25 MB bodies for whole-database imports;
  keep that limit on the import routes only and use a small default elsewhere.
- **Observability:** Workers Logs for both Workers, with the correlation
  ids that already flow from the web app through the API; error tracking for
  the browser.
- **Backups and restore:** the nightly export to R2 from section 3, plus a
  tested restore (import a backup into a fresh database and compare exports, as
  the round-trip test does).
- **Dependency hygiene:** the `npm audit` advisories in dev tooling, and an
  update routine (Renovate or Dependabot from section 0).

## Sources

- Better Auth: [docs](https://www.better-auth.com/docs), [GitHub provider](https://www.better-auth.com/docs/authentication/github)
- Deployment model: [shelf](https://github.com/Macavitymadcap/shelf) (`infra/`, `.github/workflows/ci.yml`)
- Next.js on Cloudflare: [OpenNext Cloudflare docs](https://opennext.js.org/cloudflare), [1.19.2 release notes](https://newreleases.io/project/github/opennextjs/opennextjs-cloudflare/release/@opennextjs%2Fcloudflare@1.19.2), [Next.js across platforms](https://nextjs.org/nextjs-across-platforms), [`proxy.ts` gap (MakerKit)](https://makerkit.dev/docs/next-supabase-turbo/cloudflare)
- Express on Workers: [Cloudflare blog: Node.js HTTP servers on Workers](https://blog.cloudflare.com/bringing-node-js-http-servers-to-cloudflare-workers/), [Express tutorial](https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/index.md)
- Hyperdrive and MySQL: [MySQL GA changelog](https://developers.cloudflare.com/changelog/post/2026-08-07-hyperdrive-mysql-ga/), [connect to MySQL](https://developers.cloudflare.com/hyperdrive/examples/connect-to-mysql), [launch blog post](https://blog.cloudflare.com/building-global-mysql-apps-with-cloudflare-workers-and-hyperdrive/)
- Pulumi Cloudflare provider: [registry](https://www.pulumi.com/registry/packages/cloudflare/api-docs/), [WorkersScript](https://pulumi.com/registry/packages/cloudflare/api-docs/workersscript), [D1Database](https://pulumi.com/registry/packages/cloudflare/api-docs/d1database), [HyperdriveConfig](https://www.pulumi.com/registry/packages/cloudflare/api-docs/hyperdriveconfig)
- Rules: [Comprehensive Rules (Wizards)](https://magic.wizards.com/en/rules), [Scryfall API docs (rulings)](https://scryfall.com/docs/api)
- Card scanning prior art: [Gathering the Magic](https://awesome.ecosyste.ms/projects/github.com%2Felykdeer%2Fgathering-the-magic), [Talrand](https://awesome.ecosyste.ms/projects/github.com%2Ftectiv3%2Ftalrand), [MTG Card Format Identifier](https://github.com/LetheTheForgotten/MTG-Card-Format-Identifier), [Mystic Inventory](https://tobyish111.github.io/Mystic-Inventory)
