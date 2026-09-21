# InternAI

InternAI is an internship-search and application-preparation workspace.

## Baseline

The production alias is `https://internai-mvp-fixed-devancalabrese-2065.vercel.app/`. Check the Vercel status for the current `main` commit before treating code as deployed.

That UI is the source of truth. Future changes should be targeted patches: preserve the landing page, profile/autocomplete behavior, PDF resume review, Discover/match flow, Application Kit, and application tracking unless a change explicitly calls for modifying them.

## Product principles

- Truth-first: never invent qualifications, experience, GPA, metrics, or achievements.
- User-controlled submission: do not collect third-party credentials or silently submit applications.
- Patch, don't rebuild: change the smallest necessary surface and preserve working behavior.
- Local-first storage is backed by optional Supabase Auth and per-user cloud sync. Public employer feeds provide live roles; clearly labeled samples remain available when feeds fail.

## Deployment

This repository is intended to be connected to Vercel. Changes merged to the deployment branch should trigger a Vercel deployment.

## V1 verification

Use Node 22+ and run:

```sh
node --test tests/accounts.cjs tests/ingestion.cjs tests/matching.cjs tests/workflows.cjs
node tests/runtime.cjs
```

These tests execute the existing scripts in a Node VM with minimal DOM stubs and controlled auth/network responses. They cover matching, source-claim integrity, account transitions and sync failures, application persistence, URL validation, PDF line ordering, structured employer requirements, degree alternatives, password-recovery callbacks, state migration, status history, sample labeling, feed fallback, concurrency, and health reporting. They do not replace browser or production integration tests.

The eight-case matching regression in `app18.js` also runs on page load. Inspect its actual result before reporting a pass.

## Account recovery

The active workspace remains in `internai-demo`. `internai-local-owner` binds it to an account. Account switches preserve a local recovery copy under `internai-workspace:<user-id>` and clear the previous account from the active UI. Pending cloud writes are marked per account and retried after a successful cloud read; failed reads cannot trigger uploads over unknown cloud state. Anonymous work replaced by an existing cloud workspace is retained as `internai-workspace:anonymous`.

Recovery copies are browser-local, not encrypted backups. No password or service-role key is stored by this bridge. Clearing browser storage removes these copies. Simultaneous edits across devices do not have a conflict-resolution UI; unsynced local changes on the same account take precedence on recovery.

## Deployment and release gate

The existing GitHub `main` → Vercel pipeline is the deployment path. Runtime health uses Vercel's deployment hostname environment variables, not request-supplied forwarding headers. Production protection can prevent its internal probes as well as external QA; an authentication failure is not proof that ingestion is broken.

Before declaring the beta ready, verify the deployed revision in a browser, desktop/mobile layouts, PDF upload with a real file, live employer ingestion, real signup/login and A/B account isolation, and Supabase RLS using authenticated test accounts. The local test suite does not certify these production checks.
