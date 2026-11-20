# MTG Collection

[![CI](https://github.com/Macavitymadcap/mtg-collection/actions/workflows/ci.yml/badge.svg)](https://github.com/Macavitymadcap/mtg-collection/actions/workflows/ci.yml)

Manage a Magic: The Gathering collection: add the cards you own (looked up on
Scryfall), import them in bulk, build decks from them, and export everything as JSON.

| Workspace         | What                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `packages/shared` | `@mtg/shared`: constants, API types, Zod schemas, deck rules and stats, export format                        |
| `apps/api`        | Express 5 + tsoa + Inversify + Knex + MySQL, port 3400                                                       |
| `apps/web`        | Next.js 16 + MUI 9 + TanStack Query, port 3000. Talks to the API through its own `/api` route handlers (BFF) |

Anyone can browse the collection and decks; changes need signing in with
GitHub (see [Signing in](#signing-in)). What's planned next (deployment to
Cloudflare, card scanning, rules lookup …) is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Set up

```bash
nvm use                                    # Node 24
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:up                              # MySQL 8.4 on 127.0.0.1:3310 (mtg and mtg_test databases)
npm run db:migrate
npm run dev                                # shared (watch) + API + web
```

- Web: http://localhost:3000
- API docs (Swagger UI): http://localhost:3400/docs
- API token for curl: `npm run -s token -w @mtg/api` (full access, for scripts and testing)

The site runs read-only until sign-in is set up: follow [Signing in](#signing-in)
to be able to make changes in the browser.

## Signing in

Anyone can browse the collection and decks. Adding, editing, importing and
the Data page need signing in with GitHub, and only the GitHub accounts on an
allowlist can sign in. Visitors don't see what you paid for cards, your notes
or the "Spent" total.

How it works: the API runs [Better Auth](https://www.better-auth.com), which
keeps users and sessions in the `auth_*` tables. The web app passes
`/api/auth/*` through to it, so the session cookie belongs to the site. The
web app's own token to the API can only read; changes go through only with
your session cookie, which the API checks.

### Set up GitHub sign-in locally

1. Create a GitHub OAuth app: go to
   [github.com/settings/applications/new](https://github.com/settings/applications/new)
   (or avatar → **Settings** → **Developer settings** → **OAuth Apps** →
   **New OAuth App**). Make sure it's an **OAuth App**, not a GitHub App.
   - **Application name:** `MTG Collection (local)`
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL** (also called a **redirect URI**):
     `http://localhost:3000/api/auth/callback/github`. It has to match
     exactly: `http`, port 3000, no trailing slash.
   - Leave **Enable Device Flow** unticked.
2. Register it. Copy the **Client ID**, then **Generate a new client secret**
   and copy that too (GitHub shows it only once).
3. Fill these in `apps/api/.env`:

   ```bash
   AUTH_SECRET=<output of: openssl rand -base64 32>
   AUTH_BASE_URL=http://localhost:3000
   GITHUB_CLIENT_ID=<client ID>
   GITHUB_CLIENT_SECRET=<client secret>
   AUTH_GITHUB_ALLOWLIST=<your GitHub username>
   ```

4. Restart `npm run dev` (the API reads `.env` when it starts) and click
   **Sign in**. GitHub asks you to authorise the app the first time, then
   brings you back to the page you were on.

| Setting                                    | What                                                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`                              | Signs session cookies. At least 32 random characters; changing it signs everyone out                                                                  |
| `AUTH_BASE_URL`                            | The site's address, where GitHub sends people back to. In production, the deployed site's URL                                                         |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | The OAuth app. Leave them blank and sign-in is off: the site is read-only                                                                             |
| `AUTH_GITHUB_ALLOWLIST`                    | GitHub usernames that may sign in, comma-separated, any letter case. Taking someone off (and restarting the API) stops them at once, even mid-session |

### In production

Create a second OAuth app for the deployed site, with its own homepage URL and
callback URL (`https://<site>/api/auth/callback/github`), so the production
secret lives only in the deployment. Set the same settings as secrets there,
with `AUTH_BASE_URL` set to the site's URL.

## Pages

| Page                 | What                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `/`                  | Totals, recently added cards, deck shortcuts                                               |
| `/collection`        | Table or image grid, with filters kept in the URL                                          |
| `/collection/add`    | Search Scryfall by name, pick the printing, add copies (signed in)                         |
| `/collection/import` | Import a ManaBox CSV or a preconstructed product (signed in)                               |
| `/settings/data`     | Export everything to JSON, or replace the database from an export (signed in)              |
| `/collection/[id]`   | Edit copies (condition, flags, price …), change the printing, see which decks use them     |
| `/decks`             | Every deck, with format, colours, size and warnings                                        |
| `/decks/[id]`        | Deck builder: add owned cards to boards, quantities, mana curve, rule and ownership checks |

## Importing

Both imports add to the collection (identical copies are merged), are all or
nothing (if any row has a problem nothing is written and the problems are
listed), and can be previewed with `?dryRun=true`. Importing the same thing
twice adds the copies twice.

### ManaBox

Export your collection from ManaBox as CSV and choose it on `/collection/import`, or:

```bash
TOKEN=$(npm run -s token -w @mtg/api)
jq -Rs '{csv: .}' ManaBox_Collection.csv > /tmp/manabox.json
curl -s -X POST 'localhost:3400/api/import/manabox?dryRun=true' \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' --data @/tmp/manabox.json | jq
```

ManaBox's conditions (Cardmarket grades) are mapped: mint/near_mint → NM,
excellent → LP, good/light_played → MP, played → HP, poor → DMG.

### Preconstructed products

Commander precons, starter decks, Jumpstart packs and other products come from
[MTGJSON](https://mtgjson.com)'s deck lists. Every card is added as a near-mint
English copy, foils kept, and a deck holding them can be created at the same
time (commander on the commander board).

If you've already added the cards, choose "I already own these cards"
(`"useOwnedCards": true`) to build the deck from your existing entries instead.
No copies are added. Each card uses the same printing and finish if you have
it, then the same printing in another finish, then any printing of the card;
free copies come before copies already in other decks. Substitutions are
listed, and if a card isn't owned in sufficient numbers nothing is written.

```bash
curl -s 'localhost:3400/api/catalogue/precons?search=scrappy' -H "Authorization: Bearer $TOKEN" | jq
curl -s -X POST 'localhost:3400/api/import/precon?dryRun=true' -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"fileName": "ScrappySurvivors_PIP", "createDeck": true}' | jq
```

## Backups and moving data

The Data page (`/settings/data`) exports everything to one JSON file and can
replace the database from one. From the command line:

```bash
npm run db:export -- backup.json          # or omit the file to print to stdout
npm run db:import -- backup.json          # checks the file and shows what would change
npm run db:import -- backup.json --yes    # replaces everything, in one transaction
```

The file holds the collection, decks and the card data they use, so it loads
without Scryfall. Database ids are replaced by references (`c1`, `d1` …), so it
can be loaded into any empty database, which is the plan for moving to a
hosted environment later. The file format is `ExportFile` in
`packages/shared/src/export.ts`; files are checked against its Zod schema
(including that every reference resolves) before anything is written. The
current format is version 2; version 1 files (which spelt the card fields
`colors` and `colorIdentity`) still import. Sign-in accounts and sessions
aren't included: after moving, people just sign in again.

## Checks

```bash
npm run check         # everything below, in order
npm run format:check  # Prettier (npm run format to fix)
npm run lint          # ESLint in every workspace (npm run lint:fix to fix what it can); runs codegen first
npm run typecheck     # including tests
npm run test          # shared rules, API (integration tests use the mtg_test database) and web
npm run test:coverage # the same with coverage reports; fails below the thresholds in each vitest config
npm run test:e2e      # browser tests (Playwright): desktop and phone journeys, accessibility checks
```

The browser tests build the web app and start it on port 3001, with the API
on 3401 (using the `mtg_test` database, which they reset) and a fake Scryfall
and MTGJSON on 3402, so they don't touch your data, need the internet, or
clash with `npm run dev`. Run `npx playwright install chromium` in `apps/web`
once first. Failures leave traces in `apps/web/test-results`
(`npx playwright show-trace <file>`).

GitHub Actions runs the same checks, plus a production build, on every pull
request and push to `main` (`.github/workflows/ci.yml`), then the browser
tests, against a MySQL 8.4 service container. Dependabot opens weekly update pull requests.

## Notes

- `npm run codegen` creates the generated, git-ignored files that linting and
  type-checking need: the built `@mtg/shared`, tsoa's routes, and Next's route
  types. `lint`, `typecheck`, `test` and `dev` run their parts of it themselves.

- `@mtg/shared` is consumed from its built `dist/`. `npm run dev` rebuilds it on change; otherwise run `npm run build -w @mtg/shared` after editing it.
- The shared package keeps top-level `main` and `types` fields as well as `exports`: tsoa's type resolver doesn't read `exports`, and without them it can't find the shared types.
- tsoa generates routes from the controllers. After changing a controller or a shared request type, restart the API (or run `npm run routes -w @mtg/api`).
- `tsconfig.check.json` in `apps/api` and `packages/shared` covers tests and config files, for type-checking and type-aware linting. Builds use `tsconfig.json`.
- `.git-blame-ignore-revs` lists formatting-only commits. Run `git config blame.ignoreRevsFile .git-blame-ignore-revs` once after cloning.

## Troubleshooting

- **Pages show errors, or signing in fails, and the API logs `ECONNREFUSED 127.0.0.1:3310`.** MySQL isn't running (it stops when the machine restarts). Run `npm run db:up`; no need to restart `npm run dev`.
- **GitHub says the redirect URI isn't associated with the application.** The OAuth app's callback URL doesn't match `http://localhost:3000/api/auth/callback/github` exactly.
- **"Not allowed to sign in" for your own account.** Check `AUTH_GITHUB_ALLOWLIST` in `apps/api/.env` has your GitHub username, then restart `npm run dev`: the API only reads `.env` when it starts.
- **Sign in shows "Provider not found".** `GITHUB_CLIENT_ID` or `GITHUB_CLIENT_SECRET` is blank in `apps/api/.env`, so sign-in is off.
- **You approve on GitHub but land on "Couldn't sign in with GitHub".** The client secret is wrong (or was regenerated): copy a new one into `apps/api/.env` and restart.

- **A page reloads itself over and over just after `npm run dev` starts.** Next 16.4's on-disk Turbopack dev cache did this on every warm start, so it's turned off in `apps/web/next.config.ts` (`turbopackFileSystemCacheForDev: false`). Dev restarts compile from scratch as a result. If it ever happens again, stop the dev server, run `rm -rf apps/web/.next`, and start it again.
