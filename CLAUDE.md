# server (inventory-server)

Express 5 + Mongoose REST API for the inventory management app, plus a
Gemini-powered AI chat endpoint built with the Vercel `ai` SDK. Pairs with the
React frontend in `../inventory-management`.

## Run

```
npm install
npx nodemon index.js      # dev, auto-restart
node index.js              # plain run
```

**Do not use `npm start`** — the script is `nodemon start`, which nodemon
misparses as "run node on file `start` with arg `index.js`" and crashes
immediately (`node start index.js`). Fix by changing the script to
`nodemon index.js` if you touch `package.json`, but until then just run
`npx nodemon index.js` directly.

Server listens on `process.env.PORT` (default `5000`). Health/root route
`GET /` just serves `index.html`.

## Architecture

Flat MVC, CommonJS throughout (`require`/`module.exports`, no ES modules):

- `index.js` — app entrypoint: connects Mongoose, mounts CORS + JSON body
  parsing, wires routers, mounts `errorHandler` last.
- `routes/*.js` — thin Express routers, one per resource. Import handlers
  from `controllers/`, no logic here.
- `controllers/*.js` — request handlers. Pattern: `try { ... } catch (err) {
  next(new AppError(err.message || "...", err.status || 500)) }`. Some newer
  controllers (`stockMovements.js`, `orders.js`, `customers.js`,
  `suppliers.js`) just do `next(error)` directly instead of wrapping in
  `AppError` — both patterns exist, follow whichever the file you're editing
  already uses.
- `models/*.js` — Mongoose schemas, all `{ timestamps: true }`.
- `middlware/errorHandler.js` (note: intentionally-misspelled dir name,
  matches existing imports — don't rename without updating every `require`)
  — centralized error handler; special-cases Mongo duplicate-key (11000),
  `ValidationError`, and `CastError` into clean 400s.
- `utils/AppError.js` — `Error` subclass with `statusCode`/`isOperational`.
- `utils/Verifytoken.js` — `verifyToken` / `verifyUser` / `verifyAdmin` JWT
  middleware, reads `Authorization: Bearer <token>`.
- `utils/SendMail.js` — nodemailer wrapper for transactional email
  (password reset).

All routes are mounted under `/api/v1` except chat, which is `/api/chat`
(mounted as `app.use("/api", chatRoute)` with the route itself defined as
`router.post("/chat", ...)`).

## Routes → controllers map

| Resource | Base path | File |
|---|---|---|
| Auth/users | `/api/v1` (`/register`, `/login`, `/all`, `/user/:id`, ...) | `routes/users.js` → `controllers/users.js` |
| Products | `/api/v1` (`/add-product`, `/all-products`, `/products/:id`, `/product/update/:id`, `/product/delete/:id`) | `routes/products.js` → `controllers/ProductsCon.js` |
| Categories | `/api/v1` (`/add-category`, `/all-categories`, ...) | `routes/category.js` → `controllers/category.js` |
| Orders | `/api/v1/orders/*` | `routes/orders.js` → `controllers/orders.js` |
| Customers | `/api/v1/customers/*` | `routes/customers.js` → `controllers/customers.js` |
| Suppliers | `/api/v1/suppliers/*` | `routes/suppliers.js` → `controllers/suppliers.js` |
| Stock movements | `/api/v1/stock-movements/*` | `routes/stockMovements.js` → `controllers/stockMovements.js` |
| AI chat (streaming) | `POST /api/chat` | `routes/chat.js` (no separate controller — logic lives in the route file) |
| Posts (legacy, mostly commented out) | `/api/...` | `routes/posts.js` → `controllers/posts.js` |

Route naming is inconsistent across resources (`/all-products` vs
`/orders/all` vs `/all-categories`) — this is pre-existing, not a bug to
"fix" opportunistically; match the existing convention for the resource
you're touching.

## Products

`models/Products.js` is the central model. `status` is a derived enum
(`in-stock` / `low-stock` / `out-of-stock`) that callers must set explicitly
— it is **not** auto-computed by a Mongoose hook. The stock-status
thresholds (`0` → out-of-stock, `1–10` → low-stock, `11+` → in-stock) are
duplicated in three places and must be kept in sync if changed:
`controllers/ProductsCon.js` (implicitly, via whatever the client sends),
`routes/chat.js` (`getStockStatus`), and the frontend
(`inventory-management/src/utils/appHelpers.js` `getStatusBadgeClasses`
consumes the same three values).

## AI chat route (`routes/chat.js`)

Uses `ai` (Vercel AI SDK) `streamText` + `@ai-sdk/google` against
`gemini-2.5-flash` by default (override with `GEMINI_MODEL` env var).
Streams via `result.pipeUIMessageStreamToResponse(res, ...)` — the frontend
consumes this with `@ai-sdk/react`'s `useChat`. `stopWhen: isStepCount(5)`
caps multi-tool-call turns.

Tools exposed to the model (all query real Mongo data, no mocking):
`checkInventory`, `updateStock`, `checkOrders`, `checkStockLevels`,
`checkIncoming`, `checkOutgoing`, `checkSuppliers`, `checkCustomers`,
`generateReport`, `seedDemoInventory`. `seedDemoInventory` upserts 20 demo
products + 4 categories + a seed user (`inventory.seed@inventorypro.local`)
— safe to call repeatedly (idempotent via `upsert: true`).

`getErrorMessage()` in this file pattern-matches raw SDK errors (API key,
quota, model-not-found, network, Mongo) into user-facing messages — extend
this switch rather than leaking raw SDK errors if you add new failure modes.

Requires `GOOGLE_GENERATIVE_AI_API_KEY` in `.env` (Google AI Studio key) or
the route returns a 500 with a explanatory message before ever calling the
model.

## Known gotchas (don't "fix" without checking blast radius first)

- **JWT secret env mismatch**: `utils/Verifytoken.js` signs/verifies with
  `process.env.JWT`, but `.env` only defines `JWT_SECRET`. As-is,
  `jwt.verify(token, undefined, ...)` — auth middleware is effectively
  broken. If you're asked to fix login/auth, check this first.
- `controllers/users.js` `forgotPassword` uses `crypto` but the file never
  `require("crypto")`s it — will throw `ReferenceError` at runtime.
- `middlware/` (not `middleware/`) is a real, intentional typo baked into
  every import — keep it consistent.
- `.env` is git-ignored and contains live-looking Mongo Atlas + Gemini
  credentials; never print its contents into commits, PRs, or logs.

## Conventions when adding a route/controller

1. Router: one `require("../controllers/xxx")` destructure block, one line
   per route, comment above each (`// GET ALL X` style, matches existing
   files).
2. Controller: `async (req, res, next) => { try { ... } catch (err) {
   next(new AppError(err.message || "Failed to ...", err.status || 500)); }
   }`.
3. Success responses are `{ success: true, ...data }`; list endpoints
   include `total`/`page`/`limit`/`totalPages` (or `pages`) for pagination —
   match the shape of sibling endpoints for the same resource so the
   frontend's RTK Query hooks don't need special-casing.
4. Register the new router in `index.js` under `/api/v1` unless it's
   genuinely chat-like streaming, which goes under `/api`.
