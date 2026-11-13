# MTG Collection

Manage a Magic: The Gathering collection: add the cards you own (looked up on
Scryfall), import them in bulk, build decks from them, and export everything as JSON.

| Workspace         | What                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `packages/shared` | `@mtg/shared`: constants, API types, Zod schemas, deck rules and stats, export format                        |
| `apps/api`        | Express 5 + tsoa + Inversify + Knex + MySQL, port 3400                                                       |
| `apps/web`        | Next.js 16 + MUI 9 + TanStack Query, port 3000. Talks to the API through its own `/api` route handlers (BFF) |

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
- API token for curl: `npm run -s token -w @mtg/api`

## Pages

| Page                 | What                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `/`                  | Totals, recently added cards, deck shortcuts                                               |
| `/collection`        | Table or image grid, with filters kept in the URL                                          |
| `/collection/add`    | Search Scryfall by name, pick the printing, add copies                                     |
| `/collection/import` | Import a ManaBox CSV or a preconstructed product                                           |
| `/settings/data`     | Export everything to JSON, or replace the database from an export                          |
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
curl -s 'localhost:3400/api/catalog/precons?search=scrappy' -H "Authorization: Bearer $TOKEN" | jq
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
(including that every reference resolves) before anything is written.

## Checks

```bash
npm run check         # everything below, in order
npm run format:check  # Prettier (npm run format to fix)
npm run lint          # ESLint in every workspace (npm run lint:fix to fix what it can)
npm run typecheck     # including tests
npm run test          # API integration tests use the mtg_test database
```

## Notes

- `@mtg/shared` is consumed from its built `dist/`. `npm run dev` rebuilds it on change; otherwise run `npm run build -w @mtg/shared` after editing it.
- The shared package keeps top-level `main` and `types` fields as well as `exports`: tsoa's type resolver doesn't read `exports`, and without them it can't find the shared types.
- tsoa generates routes from the controllers. After changing a controller or a shared request type, restart the API (or run `npm run routes -w @mtg/api`).
- `tsconfig.check.json` in `apps/api` and `packages/shared` covers tests and config files, for type-checking and type-aware linting. Builds use `tsconfig.json`.
- `.git-blame-ignore-revs` lists formatting-only commits. Run `git config blame.ignoreRevsFile .git-blame-ignore-revs` once after cloning.

## Troubleshooting

- **A page reloads itself over and over just after `npm run dev` starts.** Seen a few times during development. It stopped once Next's on-disk Turbopack cache was rebuilt, so a bad cache is the likely cause (not proven). Stop the dev server, run `rm -rf apps/web/.next`, and start it again.
