---
title: "WireTyped"
description: "An error-first, typed HTTP client for fetch runtimes. Most HTTP clients optimize for happy-path ergonomics; I optimized for not missing failures."
pubDate: 2025-12-23
draft: false
hero: "/wiretyped.png"
---

Everyone has been in that situation: you write a beautiful data-fetching function, the flow reads clean, the formatting is perfect… and then you realize you forgot the `try/catch` (or the `.catch()`), and now an error can punch straight through your call stack. Early in my career, someone I worked with had a habit of “nagging” me in PRs:

- “But what if this happens?”
- “What if this errors?”
- “Can this throw?”

And (annoyingly) he was right. Things _can_ throw: not just from your own code, but from libraries, built-in parsing, runtime edge cases, and all the syntactic sugar we pile on top. Yes, you can promise-chain with `.then()`/`.catch()`. But for me, it has the same problem as `try/catch`: the failure path quickly drifts away from the success path, and context starts leaking out of the flow of reading. So I did what every frontend/full-stack developer eventually does: I built a fetch-based HTTP client. And then I forced it to match the way I actually want to write production code: **errors first, always**.

## Error-first, by default

WireTyped’s core ergonomics are simple: every operation returns a tuple.

- First value: the error (if any)
- Second value: the data (if successful)

That means you _always_ see the failure branch right next to the success branch, and you can’t “forget” it unless you explicitly choose to.

```ts
import { RequestClient } from "wiretyped";

// elsewhere: const client = new RequestClient(...)
const [err, user] = await client.get("/users/{id}", { id: "123" });

if (err) {
  // Handle it (or rethrow / bubble / log / map to UI state)
  return;
}

// `user` is typed, validated (if enabled), and safe to use
console.log(user.name);
```
 
Internally, the package follows the same pattern with helpers like `safeWrap` / `safeWrapAsync` to keep control flow readable while still being aggressively error-aware.

## “Stop handing me the Response”

Another thing that’s always annoyed me about fetch-based request libraries is how often they hand you a raw `Response` and say “good luck”. I don’t want to care whether the server returned `200` vs `204` vs `205` (etc.). If the request is successful (2xx), I want the **data**. If it fails, I want an **error**.

WireTyped follows that assumption:

- Success → you get the endpoint’s typed data
- Failure → you get an error, and _for HTTP failures_ you can still access the underlying `Response`

```ts
import { getHttpError, isHttpError } from "wiretyped";

const [err, user] = await client.get("/users/{id}", { id: "123" });

if (err) {
  // Type guard style
  if (isHttpError(err)) {
    console.log("HTTP status:", err.response.status);
  }

  // Or extractor style (useful when errors are wrapped)
  const httpErr = getHttpError(err);
  if (httpErr) {
    console.log("HTTP status:", httpErr.response.status);
    console.log("Request ID:", httpErr.response.headers.get("x-request-id"));
  }

  return;
}
```
 
That `Response` exposure is intentional: different stacks propagate error details in wildly different ways, and sometimes you need access to headers/status for logging, retries, or UI decisions.

## One place to define endpoints

When you instantiate `RequestClient`, you provide an `endpoints` map typed as `RequestDefinitions`. This is meant to feel like routers: define things once, and then keep usage clean everywhere else. I’m tired of clients that require you to pass schemas at the callsite, because it inevitably leads to importing validators all over your UI. With WireTyped you define schemas once, instantiate the client once, and consumers only need the client + endpoint key.

```ts
import { z } from "zod";
import { RequestClient, type RequestDefinitions } from "wiretyped";

const endpoints = {
  "/users/{id}": {
    get: {
      response: z.object({
        id: z.string(),
        name: z.string(),
      }),
    },
  },

  "/users": {
    post: {
      request: z.object({ name: z.string() }),
      response: z.object({ id: z.string() }),
    },
  },

  "/files/{id}": {
    download: {
        response: z.instanceof(Blob)
    },
    url: {
        response: z.url(),
    },
  },

  "/events": {
    sse: {
      events: {
        "user.updated": z.object({ id: z.string(), name: z.string() }),
        "user.deleted": z.object({ id: z.string() }),
      },
    },
  },
} satisfies RequestDefinitions;

export const client = new RequestClient({
  hostname: "https://api.example.com",
  baseUrl: "/api",
  endpoints,
  validation: true,
});
```
 
## Validation (and Standard Schema)

With `validation` defaulting to `true`, WireTyped validates:

- URL parameters (path + search)
- request bodies (when present)
- response bodies (when present)

To make validator choice flexible, the typing is based on [`@standard-schema/spec`](https://standardschema.dev/schema), so any validator implementing the Standard Schema interface should work (e.g. `zod`, `arktype`, `valibot`, etc.).

## Retries + timeouts

WireTyped supports retries with status-code based policies and built-in timeouts. Both `timeout` and `retry` can be set as **defaults** on the client via `fetchOpts`.

```ts
export const client = new RequestClient({
  hostname: "https://api.example.com",
  baseUrl: "/api",
  endpoints,

  fetchOpts: {
    headers: { Authorization: `Bearer ${token}` },

    // Request timeout in ms (false disables timeouts)
    timeout: 10_000,

    // Retry can be a number OR an object
    retry: {
      limit: 2,                     // total attempts = limit + 1
      timeout: 1_000,               // ms between retries
      statusCodes: [408, 429, 500, 502, 503, 504],
      // ignoreStatusCodes: [400, 401, 403],
    },

    // You can also pass through normal fetch options
    // credentials: "include",
    // mode: "cors",
  },
});
```
 
These settings can also be set **specifically per request** as well (since I'm not insane):

```ts
const [err, user] = await client.get(
  "/users/{id}",
  { id: "123" },
  {
    timeout: 2_500,
    retry: 0, // disable retries for this call
    headers: { "x-request-id": crypto.randomUUID() },
    validate: true,
  },
);

const [createErr, created] = await client.post(
  "/users",
  null,
  { name: "Kasper" },
  {
    timeout: 15_000,
    retry: {
      limit: 5,
      timeout: 200,
      statusCodes: [429, 503],
    },
    validate: true,
  },
);
```
 
## Extra operations: download + url

Only implementing the classic HTTP methods felt boring, so WireTyped also includes:

- `download` (binary download → `Blob`)
- `url` (build + validate a URL without making a request)

`url` is especially useful when you want to generate links consistently (including baseUrl + hostname chaining) while still validating params.

```ts
const [urlErr, url] = await client.url("/files/{id}", { id: "abc" });
if (!urlErr) {
  console.log("Direct link:", url);
}

const [dlErr, blob] = await client.download("/files/{id}", { id: "abc" });
if (!dlErr) {
  // do something with the Blob (save, stream, etc.)
}
```
 
## SSE, typed all the way down

WireTyped also has full SSE support, including validation and endpoint typing. SSE took a bit more work to structure cleanly, but I ended up with:

- return value: `[error, closeFunction]`
- handler: required parameter
- events: a typed union, discriminated by `type`

```ts
const [err, close] = await client.sse(
  "/events",
  null,
  ([eventErr, event]) => {
    if (eventErr) {
      // handler errors are values too
      console.error(eventErr);
      return;
    }

    // event is a discriminated union:
    // { type: "user.updated", data: ... } | { type: "user.deleted", data: ... }
    if (event.type === "user.updated") {
      console.log("Updated:", event.data.id, event.data.name);
    }

    if (event.type === "user.deleted") {
      console.log("Deleted:", event.data.id);
    }
  },
  {
    // If your endpoint definitions list events explicitly, this can be used
    // to treat unknown event names as errors.
    errorUnknownType: true,
  },
);

if (err) {
  console.error(err);
} 

// later…
close();
```
 
As you can see, the handler also takes an error. If you’ve gotten this far, you know I wasn’t going to skip errors here. There’s no skipping errors. Ever. If the SSE endpoint is also an “unknown” endpoint, WireTyped can error on unknown event names via `errorUnknownType`. The idea is to make it more visible when data comes in with the wrong form (or the backend starts emitting new event names unexpectedly).

Building the SSE support taught me a lot about how retries should work, how `Last-Event-ID` is used, and how important consistent event names are. I folded those lessons into the SSE handling so reconnects, backfills, and event typing behave the way you expect.

## In-memory cache (for “rerender fetch storms”)

There’s also an in-memory cache, primarily to combat the “multiple components request the same resource within milliseconds” problem. Right now it’s intentionally scoped: **GET-only**, to preserve idempotency and avoid pretending state-changing operations are immutable.

```ts
// Global cache config (example)
export const client = new RequestClient({
  hostname: "https://api.example.com",
  baseUrl: "/api",
  endpoints,
  cacheOpts: {
    ttl: 5_000,
    cleanupInterval: 30_000,
  },
});

// Per-request cache opt-in (GET-only)
const [err, data] = await client.get(
  "/users/{id}",
  { id: "123" },
  {
    cacheRequest: true,
    cacheTimeToLive: 10_000, // override TTL for this call (ms)
  },
);
```
 
Internally the cache key is based on URL + headers to reduce collisions (and avoid mixing auth contexts).

## Error types, helpers, and unwrapping

Errors are a first-class part of the API surface. WireTyped exposes typed error classes and helpers so you don’t have to rely on brittle `instanceof` checks when errors are wrapped. Each error comes with either (or both of) `is**` and `get**` helpers, like `isHttpError` / `getHttpError`. When errors are wrapped continuously across the package, checks like `err instanceof HTTPError` become shallow. The helpers are designed to survive wrapping, while still letting you “peel” specific errors out. This is inspired by the ergonomics of error wrapping in Go (objectively and arguably the best language ever created): being able to wrap errors while still retaining access to the underlying error types, and producing better stack traces for tools like Sentry (so you can pinpoint where an error occurred, not just the top-most rethrow).

```ts
import {
  getHttpError,
  getValidationError,
  isTimeoutError,
  isAbortError,
  HTTPError,
} from "wiretyped";
import { isErrorType, unwrapErrorType } from "wiretyped/error";

const [err, data] = await client.get("/users/{id}", { id: "123" });

if (err) {
  // Specific helpers
  if (isAbortError(err)) {
    console.log("Request was aborted");
    return;
  }

  if (isTimeoutError(err)) {
    console.log("Request timed out");
    return;
  }

  const httpErr = getHttpError(err);
  if (httpErr) {
    console.log("Non-2xx response:", httpErr.response.status);
    return;
  }

  const validationErr = getValidationError(err);
  if (validationErr) {
    console.log("Validation failed:", validationErr.message);
    return;
  }

  // Generic helpers (when you want a unified pattern)
  if (isErrorType(HTTPError, err)) {
    const unwrapped = unwrapErrorType(HTTPError, err);
    console.log("HTTP status:", unwrapped.response.status);
    return;
  }

  console.error("Unknown error:", err);
}
```
 
## Runtime config + teardown

If you ever don’t like the config you set the client up with, you can update it at runtime via `.config(...)`. And if you want to stop ongoing requests and “kill” the client, you can do that with `.dispose()`.

```ts
client.config({
  fetchOpts: {
    timeout: 10_000,
    retry: { limit: 1 },
  },
  cacheOpts: { ttl: 5_000, cleanupInterval: 30_000 },
  validation: false,
});

client.dispose();
```

## Tests + Publishing

Testing + publishing are treated as first-class. It ships with extensive integration tests, plus smoke tests and runtime-agnostic end-to-end coverage. A GitHub Actions matrix runs the end-to-end suite across Node (18/20/22/24/25), Bun, Deno, browsers, and Cloudflare Workers, and all tests are required before merges. Publishing is automated through GitHub Actions to both npm and JSR. Unfortunately, I’m a committer, I'm not going to lie, so the commit logs are a bit riddled with test commits to trigger and try out these actions; this was my first time running full-scale tests, builds, and publishing to npm and JSR without any manual terminal interaction.

## Wrapping it up

WireTyped exists for one reason: I got tired of writing request code that *looks* correct while quietly hiding failure paths. In real systems, the interesting part is rarely the “200 OK”; it’s everything around it: timeouts, partial outages, schema drift, retry storms, and the occasional “why is prod doing *that*?”

So the design goals are boring on purpose:

- Make errors impossible to ignore by accident.
- Make endpoint definitions the single source of truth.
- Make the happy path clean **without** making the failure path invisible.
- Keep it fetch-native so it works across browser, Node, Bun, Deno, and Workers.

If any of that sounds like your kind of pain, give WireTyped a spin, poke holes in it, and tell me what breaks. If you’ve got strong opinions about error handling (I clearly do), I’d love to hear them, especially if you’ve been burned by the same “oops, forgot to handle failure” bug in a different disguise. If you want to try it out, the docs and examples live at **https://wiretyped.io**. Start with the intro and you’ll be calling typed endpoints in a couple minutes.

Either way: may your requests be fast, your schemas honest, and your errors handled **before** they become incidents.
