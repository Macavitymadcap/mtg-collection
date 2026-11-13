# MTG Collection

Manage a Magic: The Gathering collection: add the cards you own (looked up on
Scryfall), build decks from them, and export everything as JSON.

| Workspace | What |
|---|---|
| `packages/shared` | `@mtg/shared`: constants, API types, Zod schemas, export format |
| `apps/api` | Express 5 + tsoa + Inversify + Knex + MySQL, port 3400 |
| `apps/web` | Next.js 16 + MUI 9 + TanStack Query, port 3000. Talks to the API through its own `/api` route handlers (BFF) |

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

## Importing from ManaBox

Export your collection from ManaBox as CSV, then preview and import it:

```bash
TOKEN=$(npm run -s token -w @mtg/api)
jq -Rs '{csv: .}' ManaBox_Collection.csv > /tmp/manabox.json
curl -s -X POST 'localhost:3400/api/import/manabox?dryRun=true' \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' --data @/tmp/manabox.json | jq
# then the same without ?dryRun=true
```

- Nothing is written if any row has an error; the response lists each bad row by line number.
- Imports add to the collection. Importing the same file twice doubles the quantities.
- ManaBox's conditions (Cardmarket grades) are mapped: mint/near_mint → NM, excellent → LP, good/light_played → MP, played → HP, poor → DMG.

## Checks

```bash
npm run typecheck
npm run test          # API integration tests use the mtg_test database
npm run lint
```

## Notes

- `@mtg/shared` is consumed from its built `dist/`. `npm run dev` rebuilds it on change; otherwise run `npm run build -w @mtg/shared` after editing it.
- The shared package keeps top-level `main` and `types` fields as well as `exports`: tsoa's type resolver doesn't read `exports`, and without them it can't find the shared types.
- tsoa generates routes from the controllers. After changing a controller or a shared request type, restart the API (or run `npm run routes -w @mtg/api`).
