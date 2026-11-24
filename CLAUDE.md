# CLAUDE.md

Guidance for Claude working in this repo. Human setup lives in [README.md](README.md);
this file is the agent-facing runbook.

## Project

Club Rowing — the Regina Rowing Club's app for athletes, workouts, activities, and equipment.

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Bun** is the runtime and package manager — always use `bun` / `bunx`, never npm/yarn/pnpm
- **Prisma 7** on **Neon** Postgres via the serverless adapter (`@prisma/adapter-neon`) — the DB is Neon cloud, not a local Postgres
- **Clerk** auth, **tRPC** API, **Ollama** (local vision model) for screenshot parsing
- Lint/format: **Biome** (tabs, not spaces)

## Everyday commands

```bash
bun dev                 # Next.js dev + auto-starts native Ollama (port 3000)
bun test                # vitest
bun lint                # biome check
bun run lint:fix        # biome autofix
bun run db:migrate      # prisma migrate dev
bun run db:branch:create / db:branch:reset   # the single shared `develop` Neon branch
```

Env is validated at import in [src/lib/env.ts](src/lib/env.ts) and **throws at boot** if a
required var is missing: `DATABASE_URL`, `INTEGRATION_TOKEN_ENCRYPTION_KEY`,
`NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID`, plus Clerk's `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
and `CLERK_SECRET_KEY`. Migrations run against the **unpooled** connection
(`DATABASE_URL_UNPOOLED`); the app runtime uses the pooled `DATABASE_URL`.
`BLOB_READ_WRITE_TOKEN` is optional; without it `POST /api/v1/uploads` answers 503.
`NEXT_PUBLIC_GIPHY_API_KEY` is optional; without it the chat composer's GIF button is hidden.

## Worktrees & isolated instances

This repo is developed with **git worktrees** — the primary checkout is at
`…/rrc-app`, and each branch gets its own worktree under `…/rrc-app-worktrees/<name>`.

Any worktree can run as a fully **isolated instance**: its own Docker container at its own
`localhost` port, backed by its own **forked Neon database branch**. Use this to test
migrations, run a version live, or compare branches — without touching `main` or other
instances. Implemented by [scripts/instance.ts](scripts/instance.ts) +
[docker-compose.yml](docker-compose.yml); see the README "Multiple instances" section for
the human-facing version.

### Prerequisites (do not skip)

- **Docker Desktop must be running.** Check with `docker info`; if it's down, start it
  (`open -a Docker`) and wait until `docker info` succeeds before running `instance:*`.
- **No per-worktree `.env` is needed.** The CLI auto-loads `NEON_*` creds and shared
  secrets from the **primary worktree's `.env`** when the current worktree has none. (Only
  create a local `.env` if you also want to run `bun dev` natively here.)

### Commands — all auto-derive the instance name from the current git branch

Run these from inside the worktree you want to containerize. The name comes from the
branch (sanitized), the host port is auto-allocated from 3001, and the Neon branch is
`inst/<name>`.

| Command | Effect |
|---|---|
| `bun run instance:create` | Fork Neon branch off `main` **and** build + start the container (up). `--parent=<branch>` / `--port=<n>` to override. Idempotent. |
| `bun run instance:list` | All instances (across worktrees): name, URL, branch, status, dir. |
| `bun run instance:logs` | Tail the container logs. |
| `bun run instance:migrate` | Apply migrations to this instance's Neon branch only. |
| `bun run instance:reset` | Re-fork this instance's Neon branch from its parent (clean slate for re-testing migrations). |
| `bun run instance:down` | Pause: stop the container but **keep** the Neon branch + volumes. |
| `bun run instance:destroy` | Full teardown: remove container + volumes + image + **delete the Neon branch** + env file. |
| `bun run instance:create --dummy` | Same as `create`, then replace every row with invented data and swap Clerk for a local emulator. Use it for anything you record, screenshot or browser-test. |
| `bun run instance:e2e` | Run the headless Playwright suite in `e2e/` against a production build of this worktree inside its dummy instance. Refuses any other instance. Extra args go to Playwright. |

### Lifecycle rule (the Neon branch is bound to the container)

- `create` = **up**: branch created with the container.
- `destroy` = **down**: branch deleted with the container. One live instance ⇄ one live Neon branch.
- `down` is only a pause (branch kept; Neon auto-suspends idle compute, so it's free).
- **Always `instance:destroy` when you're done** — each instance holds an open Neon branch, and branch quota is finite.

### Starting work in a fresh worktree

```bash
git worktree add ../rrc-app-worktrees/my-feature -b my-feature
cd ../rrc-app-worktrees/my-feature
bun run instance:create        # → http://localhost:3001 on Neon branch inst/my-feature
```

### Testing a migration

```bash
# edit prisma/schema.prisma, then:
bun run instance:migrate       # applies to this branch only
bun run instance:reset         # re-fork from parent to test again from clean
bun run instance:migrate
```

### Dummy instances and e2e

A plain instance is a fork of production: real members' names, results and push
subscriptions. **Never record, screenshot or browser-test one.** Use a dummy instance:

```bash
bun run instance:create --dummy   # invented athletes, activities, events and chat
bun run instance:e2e              # desktop + 390px phone, in parallel, results in e2e/.output/
```

- The data is `scripts/lib/dummy-data.ts`. The wipe only runs on an `inst/` branch whose
  host differs from `main`'s. `instance:reset` re-seeds, and the instance stays dummy until
  destroyed.
- Clerk is `@emulators/clerk`, started inside the container (`scripts/clerk-emulator.ts`).
  It has no Frontend API, so `/login` does not work and nobody can sign in by hand. Tests
  sign in with `signInAs(page, "admin" | "member")` from `e2e/sign-in.ts`, using a session
  that `instance:e2e` mints. Sessions last one hour.
- Vercel Blob is `@emulators/vercel`, started inside the container
  (`scripts/blob-emulator.ts`). Uploaded files are held in memory and are gone when the
  container restarts. Nothing reaches Vercel. The host browser also reaches it on the
  app port + 10000 (loopback only), so direct uploads can be tested; it still never
  reaches Vercel. The per-member daily upload limit is raised
  there (`MEMBER_DAILY_UPLOAD_LIMIT`) so repeated e2e runs do not trip it.
- Ollama is `scripts/ollama-emulator.ts`, started inside the container. It gives the
  same answer every time and never calls a model.
- `failed_to_load_clerk_js` in the browser console is expected there; pages do not need it.
- Both commands look after themselves: `create --dummy` installs dependencies and generates
  the Prisma client when the worktree needs it, and `instance:e2e` waits until the app
  answers. Don't poll the logs or sleep first.
- `instance:e2e` does not test `next dev`. It builds the app for production in the
  container (about 30 seconds, skipped when no app file changed since the last build)
  and runs against `next start` on the app port + 20000 (loopback only). `next dev` on
  the app port keeps hot reload for looking at the app by hand. A build error stops the
  run before any test.
- Tests run in parallel (`fullyParallel`, half the cores). A test creates the rows it
  reads and finds them by unique text; it never relies on another test's data or on a
  seeded row that other tests push out of view.
- A test runs at both widths only when the width matters (layout, touch, the phone
  drawer). Otherwise it carries one project's tag, `test("…", { tag: "@desktop" }, …)` or
  `{ tag: "@phone" }`, picked so the two projects stay about even; never skip a project
  inside the test body, which still pays for the page.
- Tests use Playwright's default timeouts. Never extend one (`test.setTimeout`,
  `test.slow`, a raised `timeout:`); make the slow test faster instead, for example by
  setting up its data through the API.
- While iterating, run one file (`bun run instance:e2e e2e/members.spec.ts`); run the whole
  suite once at the end (about 90 seconds). When a test fails, read the page snapshot in
  `e2e/.output/<test>/error-context.md` rather than a screenshot.
- The admin is Avery Coxwell and the member is Morgan Oarsby. To stage a scenario the seed
  lacks, edit `scripts/lib/dummy-data.ts` and run `bun run instance:reset`.

**Recording a flow.** Put a throwaway spec in `e2e/recordings/` (gitignored), run it before
and after the change, and convert each run with the trim it prints. Only these specs record
a video, in their own `desktop-recording` and `phone-recording` projects:

```ts
import { expect, test } from "@playwright/test";
import { signInAs } from "../sign-in";

test("issue 12", async ({ page }) => {
	const started = Date.now();
	await signInAs(page, "member");
	await page.goto("/activities");
	await expect(page.getByRole("button", { name: "2K", exact: true })).toBeVisible();
	await page.addStyleTag({ content: "nextjs-portal { display: none }" }); // Next.js dev badge
	console.log(`trim ${test.info().project.name} ${((Date.now() - started) / 1000).toFixed(1)}`);
	await page.waitForTimeout(1500);
	// one step, then waitForTimeout(1500), for each thing the viewer should see
});
```

```bash
bun run instance:e2e e2e/recordings/issue-12.spec.ts   # prints "trim desktop-recording 8.9" and "trim phone-recording 8.8"
ffmpeg -v error -y -ss 8.9 -i e2e/.output/*-desktop-recording/video.webm -c:v libx264 -pix_fmt yuv420p e2e/recordings/issue-12-before.mp4
ffmpeg -v error -y -ss 8.8 -i e2e/.output/*-phone-recording/video.webm -c:v libx264 -pix_fmt yuv420p e2e/recordings/issue-12-before-phone.mp4
```

The trim cuts the blank lead-in exactly, so there is nothing to tune. One small frame is
enough to check a video: `ffmpeg -v error -y -ss 2 -i x.mp4 -frames:v 1 -vf scale=480:-1 x.png`.

### Verifying an instance is up (important operational detail)

`instance:create` returns as soon as the container **starts**, but the entrypoint then runs
install → `prisma generate` → `migrate deploy` → `next dev` before the app listens, and the
first HTTP request triggers a Turbopack compile. So don't curl immediately. Wait for
readiness first:

```bash
# poll the log, then hit it
until docker logs clubrowing-<name>-app 2>&1 | grep -q "Ready in"; do sleep 2; done
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:<port>/login   # expect 200
# "/" returns 307 -> /login (Clerk middleware) — that's healthy, not an error
```

Container is `clubrowing-<name>-app`; compose project is `clubrowing-<name>`.

### Gotchas

- **`bun.lockb` churns**: any `bun run …` in this repo may rewrite `bun.lockb`. That change
  is incidental — **do not commit it** (`git checkout -- bun.lockb`) unless you actually
  changed dependencies.
- **Hot reload is best-effort** over the macOS bind mount (file-watch polling). If edits
  don't reload, set `DEV_COMMAND="bunx --bun next dev --webpack -p 3000 -H 0.0.0.0"` in that
  instance's `docker/env/<name>.env`, or use `docker compose watch`.
- The dev image uses `bun install` **without** `--frozen-lockfile` on purpose — the host
  lockfile must add linux-native optional deps in the container.
- Per-instance env files live at `docker/env/<name>.env` (gitignored). The instance
  registry is `<git-common-dir>/clubrowing-instances.json`, shared across worktrees so ports never
  collide.

## Architecture

### Client: data calls live in scenes

- A scene root (`XScene.tsx`, or the view it wraps, like `ScheduleView.tsx`) owns every
  TanStack query and mutation, directly or through a hook in `src/hooks/`. Components below it
  never import `trpcClient`, `useQuery`, `useMutation` or `fetch`. They take data, flags and
  callbacks as props.
- Every async call goes through TanStack Query; a `fetch` sits inside a `queryFn` or `mutationFn`.
- Props are explicit: name each value, flag and callback (`isSyncing`, `onSync`), and never pass a
  hook's whole result or a `ReturnType`/`Pick` of one. Values and flags come first, then every
  `on…` action, in the interface, the destructuring and the call site. A layout component that
  would only relay a child's many props takes the child as a slot.
- A lookup that runs only while a widget is open (a dialog, a picker, an @-mention) still belongs
  to the scene. The scene holds the open state, enables the hook with it, and clears stale state
  during render. No `useEffect` syncs state upward.
- Shell widgets with no scene above them (sidebar chat list, tab bar, feedback drawer, confetti)
  keep their calls in their own top component.
- List tables get page, sort, filters and search from `useTable`.
- Pages read the current user through the caller (`caller.users.getCurrentUser()`), never
  `createRequestContext()`.

### Server: domain and infra

- Handlers live in `src/server/domain/<feature>/{commands,queries,common}`, imported as
  `@/domain/...`. Shared domain code, including the context types and `DomainError`, is in
  `src/server/domain/common/`.
- Procedures live in `src/server/infra/trpc/<feature>/{commands,queries}/<name>.procedure.ts`,
  imported as `@/trpc/...`. The tRPC core (init, builder, caller, request context, middleware,
  base procedures) sits at the top of `src/server/infra/trpc/`. `src/server/infra/routes.ts`
  builds the app router.
- A procedure is a thin wrapper: base procedure, `.input(schema)`, an optional `.permission(...)`,
  then a call to its handler. Any other logic belongs in the handler. A member-only check on a
  handler that admins or webhooks share goes in a `<name>.member.command.ts` /
  `.member.query.ts` beside it.
- Domain code imports nothing from Next.js, tRPC, Clerk or Vercel, apart from types. It reaches
  infrastructure only through the context: `ctx.db`, `ctx.origin` and `ctx.services.*`
  (`taskManager.runAfterResponse`, `userService`, `fileStorage`, plus the Strava, Concept2, RCA,
  push and GitHub services). Service implementations are in `src/server/services/`. They are
  built in `createRequestContext` and in the Strava and Concept2 webhook routes.
- Handlers throw `DomainError` (`@/domain/common/domain-error`, using tRPC's code strings), never
  `TRPCError`. The base procedure maps it back, so statuses and client checks don't change.
- There is no repository layer. Data access stays in handlers and in `domain/<feature>/common`.

## Conventions

- Match surrounding code; Biome tabs. Keep changes surgical — don't rewrite working code or
  add comments that restate it.
- Prisma client is generated to `src/generated/prisma` (gitignored); run `prisma generate`
  if it's missing.
- Do not commit unless explicitly asked.
