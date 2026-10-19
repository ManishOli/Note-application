# Junior Backend API

A small backend project I built to practise TypeScript, Express, PostgreSQL, Prisma 7, authentication, validation, and API security.

## Stack

- TypeScript and Express
- PostgreSQL with Prisma ORM 7 and migrations
- JWT in an HTTP-only cookie, with bcrypt password hashing
- Zod validation, CSRF checks, CORS allowlist, rate limiting
- AES-256-GCM encryption for note bodies
- Docker Compose for local PostgreSQL

## Run locally (Windows CMD)

Requirements: Node.js 20.19+ (Node 22 recommended) and Docker Desktop.

```cmd
npm install
copy .env.example .env
```

Edit `.env` and set your own `JWT_SECRET` and `DATA_ENCRYPTION_KEY`. Generate them separately:

```cmd
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the first output in `JWT_SECRET` and the second in `DATA_ENCRYPTION_KEY`. Keep `.env` private; commit only `.env.example`.

Start PostgreSQL and create the tables:

```cmd
docker compose up -d
npx prisma generate
npx prisma migrate deploy
```

Run the API:

```cmd
npm run dev
```

Health check: `GET http://localhost:5000/api/health`

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/csrf` | Get a CSRF token and cookie |
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user (login cookie required) |
| POST | `/api/auth/logout` | Clear login cookie |
| GET | `/api/notes` | List notes with title search and pagination; favourites first |
| POST | `/api/notes` | Create a note |
| PATCH | `/api/notes/:id` | Update your note |
| PATCH | `/api/notes/:id/favourite` | Mark/unmark your note as favourite |
| DELETE | `/api/notes/:id` | Delete your note |

## Quick test with Thunder Client

1. Call `GET http://localhost:5000/api/csrf` and copy `data.csrfToken`. Keep the returned `csrfToken` cookie.
2. For POST, PATCH, and DELETE requests, send header `X-CSRF-Token` with that token. Thunder Client must also send cookies.
3. Register with JSON `{ "name": "Manish", "email": "manish@example.com", "password": "your-password-here" }` at `POST /api/auth/register`.
4. Call `GET /api/auth/me`; it should return `200` while the `token` cookie is present and `401` after you remove it.
5. Create a note with JSON `{ "title": "First note", "body": "A private note" }` at `POST /api/notes`.
6. List notes with `GET /api/notes`. Use query parameters such as `GET /api/notes?search=prisma&page=1&limit=5` (the `query` parameter also works instead of `search`). Search matches note titles; encrypted note bodies are not searched.
7. Mark a note favourite with `PATCH /api/notes/NOTE_ID/favourite` and JSON `{ "isFavourite": true }`. Send `{ "isFavourite": false }` to remove it from favourites. Both actions require the CSRF header and only affect your own notes.
8. Use the returned `pagination` object (`page`, `limit`, `totalNotes`, `totalPages`) to navigate pages. Favourite notes appear first within the matching result set.
9. Remove `X-CSRF-Token` from a POST/PATCH/DELETE request. It should return `403`.
10. Send invalid registration data to see Zod return `400`.

For PATCH, send at least one of `title` or `body`, e.g. `{ "title": "Updated title" }`.

## Structure

- `src/routes/` maps URLs to controller functions.
- `src/controllers/` handles request logic.
- `src/middleware/` contains authentication, CSRF, validation, and error handling.
- `src/validators/` contains Zod schemas.
- `src/config/` contains environment, cookie, and database configuration.
- `src/utils/` contains response helpers and encryption.
- `prisma/schema.prisma` defines models; `prisma.config.ts` configures Prisma CLI; `prisma/migrations/` stores migration history.

## Notes

- In production, cookies use `Secure`; the JWT cookie is `HttpOnly`, `SameSite=Strict`, scoped to `/`, and expires after one hour. Logout clears it using matching cookie attributes.
- The CSRF cookie is intentionally readable by frontend JavaScript so the frontend can send the value in `X-CSRF-Token`. The server compares both values using a timing-safe comparison.
- The API uses `Cache-Control: no-store` for API responses.
- The encryption key must be backed up securely. Losing it means encrypted note bodies cannot be decrypted.
- This is a learning project, not a production security audit. Production deployment still needs environment-specific review, HTTPS, monitoring, a secret manager, and a session/token revocation plan.
