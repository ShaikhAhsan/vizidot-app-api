# Vizidot API Guide

This document defines the **structure, rules, and conventions** for all APIs in the Vizidot backend. Every new or modified endpoint must follow this guide. It applies to **public** and **private** APIs.

---

## Table of Contents

1. [Overview & Principles](#1-overview--principles)
2. [Public vs Private APIs](#2-public-vs-private-apis)
3. [URL & Versioning](#3-url--versioning)
4. [Request Structure](#4-request-structure)
5. [Response Structure](#5-response-structure)
6. [HTTP Status Codes](#6-http-status-codes)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Validation](#8-validation)
9. [Error Handling](#9-error-handling)
10. [Pagination, Filtering & Sorting](#10-pagination-filtering--sorting)
11. [Security](#11-security)
12. [Project Structure & File Layout](#12-project-structure--file-layout)
13. [Naming Conventions](#13-naming-conventions)
14. [Checklist for New Endpoints](#14-checklist-for-new-endpoints)
15. [Documentation & Testing](#15-documentation--testing)

---

## 1. Overview & Principles

- **RESTful**: Use HTTP methods correctly (GET read, POST create, PUT/PATCH update, DELETE remove). Prefer resource nouns in URLs.
- **Consistency**: Same patterns for similar operations across all routes (e.g. list always returns `data` + `pagination` where applicable).
- **Stateless**: No server-side session for API auth; use Bearer token per request.
- **Stable contracts**: Response shape and status codes are part of the contract; avoid breaking changes without versioning.

---

## 2. Public vs Private APIs

### 2.1 Definitions

| Type | Definition | When to use |
|------|------------|-------------|
| **Public** | No `Authorization` header required. May support optional auth for personalized data. | Login, register, forgot password, public catalog (businesses/products list or get by ID), health check, verify token. |
| **Private** | `Authorization: Bearer <token>` required. User identity and optionally role/resource ownership are enforced. | Profile, orders, cart, admin CRUD, uploads, business owner actions. |

### 2.2 Rules by Type

**Public APIs**

- Must **not** rely on `req.user` for core behavior (e.g. listing businesses works without a token).
- May use **optional auth** (`optionalAuth` middleware): if a token is present and valid, attach `req.user` for personalization (e.g. "your favorites"); if missing, still return a valid response.
- Must **validate and sanitize** all inputs (query, body, params); public endpoints are more exposed to abuse.
- Must **not** return sensitive data (passwords, internal IDs that expose structure, PII of other users).
- Prefer **rate limiting** on auth-related public endpoints (login, register, forgot-password) in production.

**Private APIs**

- Must use **authentication** middleware so that `req.user` is set before handler runs.
- Must enforce **authorization** (role, ownership, or permission) where applicable:
  - **Role-based**: e.g. `requireSystemAdmin`, `requireSuperAdmin`, `requireRole(['admin'])`.
  - **Resource-based**: e.g. `requireBusinessOwnership`, `requireBusinessAccess`, `requirePermission('product', 'update')`.
- Must **never** trust client for identity; always derive identity from the verified token.
- Use **business context** when needed: `x-business-id` header (or `business_id` in query/body) for admin/scoped operations, with middleware enforcing access.

### 2.3 Route Order Within a Router

- Define **public** routes **before** any `router.use(authenticateToken)` (or other auth).
- Define **static or more specific** paths before parameterized ones (e.g. `/user` before `/:id`, `/chat/list` before `/:orderId/chat/messages`) to avoid wrong matches.

Example:

```js
// Public
router.get('/public', optionalAuth, ...);
router.get('/public/:id', optionalAuth, ...);

// Protected (everything below requires auth)
router.use(authenticateToken);
router.get('/', ...);
router.get('/:id', ...);
```

---

## 3. URL & Versioning

- **Base path**: All API routes live under `/api/v1/`. Non-versioned paths (e.g. `/health`) are only for infra (health, static).
- **Version prefix**: Always use `/api/v1/`; do not add new endpoints under `/api` without a version. Future versions will be `/api/v2/`, etc.
- **Resource names**: Plural nouns (e.g. `/users`, `/businesses`, `/products`, `/orders`). No verbs in the path; use HTTP method for action.
- **Hierarchy**: Use path segments for resource hierarchy when it's a clear parent-child relationship (e.g. `/albums/:albumId/audio-tracks`, `/orders/:orderId/chat/messages`). Prefer this over flat paths with many query params.
- **IDs**: Use path params for resource IDs (e.g. `/users/:id`, `/products/:id`). Use consistent param names: `:id`, `:orderId`, `:albumId`, `:businessId`, etc.
- **Actions that are not CRUD**: Prefer a path segment that reads like a sub-resource (e.g. `/users/:id/artists`, `/categories/:id/assign-products`) or a clear action name (e.g. `/artists/:id/restore`). Avoid generic verbs in URL; use method + body/query.

---

## 4. Request Structure

### 4.1 Headers

| Header | When required | Description |
|--------|----------------|-------------|
| `Authorization` | All private APIs | `Bearer <firebase-id-token>` or project-specific token. |
| `Content-Type` | POST/PUT/PATCH with body | `application/json` for JSON body. |
| `x-business-id` | Admin/scoped endpoints | Business context for multi-tenant admin (optional for super admin). |

- **Do not** invent custom auth headers; use `Authorization: Bearer <token>` only.
- For file uploads use `multipart/form-data`; Content-Type is set by client.

### 4.2 Query Parameters

- **Pagination**: `page` (1-based), `limit` (defaults per endpoint, cap e.g. 100).
- **Search**: `search` (free text); scope and fields must be documented.
- **Sorting**: `sortBy` (field name), `sortOrder` (`ASC` \| `DESC`); whitelist allowed fields.
- **Filtering**: use query params for filters (e.g. `is_active`, `business_type`, `status`). Document allowed values.
- Keep names **camelCase** in query for consistency with the rest of the API (e.g. `sortBy`, `businessId`).

### 4.3 Body (JSON)

- Use **camelCase** for all property names (e.g. `firstName`, `businessId`, `orderId`).
- Send only **allowed fields**; ignore or reject unknown fields if strictness is required.
- For arrays, document max length where relevant (e.g. `product_ids`, `artist_ids`).

### 4.4 Path Parameters

- Use **consistent names**: `:id`, `:orderId`, `:albumId`, `:businessId`, `:filename`, etc.
- Validate type (e.g. numeric ID) and existence of resource before business logic; return 400 for bad format, 404 for not found.

---

## 5. Response Structure

### 5.1 Success (Single Resource)

```json
{
  "success": true,
  "data": { ... }
}
```

- For create, prefer **201 Created** with `data` set to the created resource.
- Optional: `message` for user-facing success text (e.g. "User registered successfully").

### 5.2 Success (List with Pagination)

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

- Always include `pagination` when the endpoint is paginated; use same field names project-wide.
- Omit `pagination` only for non-paginated lists (and document that).

### 5.3 Error

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

- Optional: `code` for machine-readable code, `details` for validation errors (array of field messages). Do not expose stack traces or internal details in production.
- In development, additional fields (e.g. `stack`) may be allowed by the error handler.

### 5.4 Consistency Rules

- **Always** include `success: true` or `success: false`.
- **Do not** mix success payloads: e.g. do not return `{ data, error }` together.
- Use **same** structure for the same type of endpoint (e.g. all list endpoints use `data` + `pagination`).

---

## 6. HTTP Status Codes

Use these consistently:

| Code | Usage |
|------|--------|
| **200** | GET/PUT/PATCH success (single or list). |
| **201** | POST create success; include created resource in `data`. |
| **204** | DELETE success with no body (optional; 200 + body is also allowed). |
| **400** | Bad request: validation, invalid params, or business rule violation (e.g. duplicate). |
| **401** | Unauthorized: missing or invalid/expired token. |
| **403** | Forbidden: valid token but insufficient permissions or ownership. |
| **404** | Resource not found (e.g. wrong ID or slug). |
| **409** | Conflict (e.g. duplicate email, duplicate key). |
| **429** | Too many requests (rate limit). |
| **500** | Unexpected server error; do not expose internal details in response body. |

- **401** = "who are you?" (auth). **403** = "you are known but not allowed" (authorization).
- Prefer **400** for client mistakes (bad input, bad state); use **404** only when the resource truly does not exist.

---

## 7. Authentication & Authorization

### 7.1 Authentication

- **Mechanism**: Bearer token (Firebase ID token or project-approved token). Verified in middleware and user loaded into `req.user`.
- **Middleware**: Use `authenticateToken` from `middleware/authWithRoles.js` for all private routes (or the auth module your project uses).
- **Optional auth**: Use `optionalAuth` for public routes that can personalize when a token is present; never require token for these routes.

### 7.2 Authorization (Private APIs)

Apply **after** authentication:

- **Role-based**
  - `requireSystemAdmin` – system admin or super admin (and optionally users with assigned artists, per project).
  - `requireSuperAdmin` – super admin only.
  - `requireRole(['admin', 'manager'])` – one of the listed roles.
- **Resource-based**
  - `requireBusinessOwnership` – user owns the business (by `user_id` on business or equivalent).
  - `requireBusinessAccess` – user has access to the business (e.g. via RBAC).
  - `requirePermission('product', 'update')` – fine-grained permission check.
- **Context**
  - `setBusinessContext` – read `x-business-id` (or query) and set `req.businessContext` for scoped admin; enforce access inside middleware or controller.

Order in route file: auth first, then role/resource middleware, then handler.

### 7.3 Response for Auth Failures

- **No token / invalid token**: `401` with `success: false` and `error` message (e.g. "Access token required", "Invalid or expired token").
- **Valid token, insufficient permissions**: `403` with `success: false` and `error` (e.g. "Insufficient permissions", "Business access required").

---

## 8. Validation

### 8.1 Where to Validate

- **Input**: Validate and sanitize all inputs (query, body, path params) before business logic or DB access.
- **Model**: Use Sequelize model validators for type, format, and presence where applicable (e.g. email format, non-empty string).
- **Business rules**: Enforce in controller or service (e.g. "business must exist", "user must own resource").

### 8.2 What to Validate

- **Required fields**: Presence and type (string, number, array, etc.).
- **Format**: Email, URL, date, enum (e.g. status, type).
- **Range**: Min/max length, min/max value, array length.
- **Sanitization**: Trim strings; reject or escape dangerous content; avoid passing raw input to raw queries.

### 8.3 How to Validate

- Prefer **express-validator** (or similar) for route-level validation: run validations, then check `validationResult(req)` and return **400** with a clear `error` or `details` array.
- For **model-level** validation use Sequelize `validate` in model definition; catch `SequelizeValidationError` in error handler and map to 400.
- Return **one** clear message per field when possible (e.g. "Email is invalid", "product_ids must be an array of IDs").

### 8.4 Public vs Private

- **Public** endpoints: Strict validation and sanitization; no trust of client.
- **Private** endpoints: Same validation rules; identity comes from token, not from body/query.

---

## 9. Error Handling

### 9.1 Central Error Handler

- Use a **single** error-handling middleware at the end of the chain (e.g. `middleware/errorHandler.js`).
- It should:
  - Map known errors (Sequelize validation/unique/foreign key, JWT, Firebase auth, rate limit) to appropriate status and message.
  - Return **500** for unknown errors; log full error server-side; do not expose stack or internals in response in production.

### 9.2 Throwing in Route/Controller

- Use consistent error shape: e.g. `statusCode` and `message` (or rely on handler to set them).
- In route/controller use `next(err)` or throw so the central handler can format the response.

### 9.3 Response Shape

- Always JSON: `{ success: false, error: "..." }`. Optional: `details`, `code`. In development, optional `stack` is acceptable if added in the handler.

---

## 10. Pagination, Filtering & Sorting

### 10.1 Pagination

- **Query params**: `page` (1-based), `limit` (default e.g. 10, max e.g. 100).
- **Response**: Always include `pagination`: `page`, `limit`, `total`, `totalPages` (and optionally `hasMore`).
- **Defaults**: Document default `page` and `limit` per endpoint if they differ from global defaults.

### 10.2 Filtering

- Use **query parameters** for filters (e.g. `is_active`, `business_type`, `status`, `search`).
- **Whitelist** allowed filter keys and values (e.g. enum) to avoid injection and undefined behavior.
- **Document** which query params each list endpoint supports.

### 10.3 Sorting

- **Query params**: `sortBy` (field name), `sortOrder` (`ASC` \| `DESC`).
- **Whitelist** allowed `sortBy` fields (e.g. `created_at`, `name`, `rating`) to avoid SQL injection and invalid columns.
- Default: e.g. `sortBy=created_at`, `sortOrder=DESC`.

### 10.4 Search

- Use a single `search` (or documented) query param for full-text or multi-field search.
- Define scope (which fields/entities are searched) and behavior (contains, starts-with, etc.) in API docs.

---

## 11. Security

### 11.1 Applied Globally

- **Helmet**: Use to set secure headers.
- **CORS**: Restrict origins; allow credentials only when needed; do not use `*` with credentials.
- **Body size**: Limit JSON/urlencoded body size (e.g. 10mb) to avoid DoS.
- **Rate limiting**: Apply to `/api/` (or auth routes) in production; configurable (e.g. per env).

### 11.2 Authentication & Secrets

- **Never** log or return tokens or passwords.
- **Never** put secrets in client-facing responses or in URL query params.
- Store secrets in environment variables; use a single config (e.g. `config/`) to read them.

### 11.3 Input & Output

- **Validate and sanitize** all inputs; whitelist query/body/path params where possible.
- **Do not** expose internal IDs or implementation details unnecessarily; avoid leaking stack traces or DB errors in production.
- **File uploads**: Validate file type and size; store with safe names (e.g. UUID + extension); serve from a non-executable path.

### 11.4 Authorization

- **Always** enforce authorization on private routes (role or resource ownership); never trust client-sent "user id" or "business id" for access control—derive from `req.user` and server-side checks.

---

## 12. Project Structure & File Layout

Keep this layout so that APIs are easy to find and maintain:

```
vizidot-api/
├── server.js              # App entry, middleware mount, route mount
├── config/                # Database, Firebase, env-based config
├── middleware/            # Auth, error handler, optional validation helpers
├── routes/                # One file per domain (auth, users, businesses, products, orders, admin, upload, units, music, media)
├── controllers/           # Shared or domain-specific controllers (e.g. crudController, orderController)
├── services/              # Business logic, external APIs (e.g. Firebase, GCS, RBAC)
├── models/                # Sequelize models
├── scripts/                # DB migrations, seeds, one-off scripts
└── uploads/               # Local uploads (if any); prefer cloud in production
```

### 12.1 Adding a New API Surface

1. **New domain**: Create `routes/<domain>.js` (e.g. `notifications.js`), implement or import middleware (auth, role, ownership), then in `server.js`:  
   `app.use('/api/v1/<domain>', require('./routes/<domain>'))`
2. **New endpoint in existing domain**: Add to the appropriate `routes/<domain>.js`; keep public routes first, then `router.use(authenticateToken)`, then protected routes; put specific paths before parameterized ones.
3. **Shared logic**: Put in `services/` or `controllers/` and require from the route.

### 12.2 Route File Pattern

- At top: require express, router, middleware, models, services.
- Public routes first (no auth or `optionalAuth`).
- Then `router.use(authenticateToken)` (and optionally role/ownership middleware).
- Then protected routes.
- End with `module.exports = router`.

---

## 13. Naming Conventions

- **URL path**: Plural nouns, kebab-case if multiple words (e.g. `order-items`, `audio-tracks`). No verbs in path.
- **Query/body/response**: camelCase (e.g. `sortBy`, `businessId`, `firstName`).
- **Path params**: camelCase in definition (e.g. `:orderId`, `:albumId`, `:businessId`).
- **Route files**: Plural domain name (e.g. `users.js`, `businesses.js`, `orderItems.js` if split).
- **Model names**: Singular PascalCase (e.g. `User`, `Order`, `BusinessTiming`).
- **Middleware**: Descriptive names (e.g. `authenticateToken`, `requireBusinessOwnership`, `optionalAuth`).

---

## 14. Checklist for New Endpoints

Use this before merging a new or changed API:

- [ ] **Public or private**: Decided and implemented (no auth vs `authenticateToken` / `optionalAuth`).
- [ ] **URL**: Under `/api/v1/`, plural resource, correct hierarchy; specific paths before parameterized.
- [ ] **Method**: Correct HTTP method (GET/POST/PUT/PATCH/DELETE).
- [ ] **Request**: Headers (Authorization if private), query/body/path validated and documented.
- [ ] **Response**: Same success/error shape as this guide; list endpoints include `pagination` when applicable.
- [ ] **Status codes**: 200/201/400/401/403/404/409/429/500 used consistently.
- [ ] **Auth**: Private routes use auth middleware; auth errors return 401/403 with `success: false`.
- [ ] **Authorization**: Role or resource ownership enforced where needed.
- [ ] **Validation**: Required fields, types, formats; 400 on failure; no raw user input in queries.
- [ ] **Errors**: Handled or passed to central handler; no stack or internals in production response.
- [ ] **Security**: No secrets in response; CORS/rate limit/body limit considered.
- [ ] **Docs**: Postman (or OpenAPI) and any internal docs updated.
- [ ] **Pagination/sort/filter**: If list, params and response shape follow §10.

---

## 15. Documentation & Testing

### 15.1 Postman / OpenAPI

- **Postman**: Keep `Vizidot-API.postman_collection.json` in sync with all routes; use collection variables for `baseUrl` and `token`.
- **OpenAPI**: If you introduce an OpenAPI spec, keep it in sync with routes and this guide (URLs, methods, request/response, status codes).

### 15.2 In-Code Comments

- For each route, add a short JSDoc-style comment: method, path, one-line description, and `@access Public` or `@access Private`.
- Example:

```js
/**
 * @route GET /api/v1/businesses/public
 * @desc List active businesses (public catalog)
 * @access Public
 */
router.get('/public', optionalAuth, async (req, res) => { ... });
```

### 15.3 Testing

- **Unit**: Test validation, error mapping, and authorization logic (e.g. middleware and services) with mocked req/res.
- **Integration**: Test full request/response for critical paths (auth, create order, admin CRUD) with test DB or mocks.
- **Security**: Ensure 401/403 for invalid or missing token and for insufficient permissions; ensure public endpoints do not return sensitive data.

---

## Summary Table: Public vs Private

| Aspect | Public API | Private API |
|--------|------------|-------------|
| **Auth header** | Not required (optional auth allowed) | Required: `Authorization: Bearer <token>` |
| **Middleware** | None or `optionalAuth` | `authenticateToken` (+ role/ownership as needed) |
| **Identity** | Must not assume user | Identity from token only |
| **Validation** | Strict; all inputs validated | Same |
| **Sensitive data** | Never return | Only for the authenticated user or allowed scope |
| **Rate limiting** | Recommended on auth endpoints | Applied at `/api/` or per route |
| **Documentation** | Mark as Public in Postman/docs | Mark as Private; document required role/permission |

By following this guide, every API will have a consistent structure, clear rules for public vs private behavior, and predictable request/response and error handling.
