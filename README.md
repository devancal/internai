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

The eight-case matching regression in `js/match-regression.js` also runs on page load. Inspect its actual result before reporting a pass.

## Account recovery

The active workspace remains in `internai-demo`. `internai-local-owner` binds it to an account. Account switches preserve a local recovery copy under `internai-workspace:<user-id>` and clear the previous account from the active UI. Pending cloud writes are marked per account and retried after a successful cloud read; failed reads cannot trigger uploads over unknown cloud state. Anonymous work replaced by an existing cloud workspace is retained as `internai-workspace:anonymous`.

Recovery copies are browser-local, not encrypted backups. No password or service-role key is stored by this bridge. Clearing browser storage removes these copies. Updated clients save profile and application state atomically through `save_intern_workspace`. Server timestamps act as optimistic concurrency tokens. A stale device pauses cloud writes and keeps its local edits. Resolve sync conflict offers a local backup before explicitly loading the cloud copy; it does not merge versions. Pending legacy work without a known baseline also pauses conservatively. Reload older open tabs to adopt this protocol: legacy clients still have direct-table write access and cannot themselves enforce conflicts.

## Deployment and release gate

The existing GitHub `main` → Vercel pipeline is the deployment path. Runtime health uses Vercel's deployment hostname environment variables, not request-supplied forwarding headers. Production protection can prevent its internal probes as well as external QA; an authentication failure is not proof that ingestion is broken.

Before declaring the beta ready, verify the deployed revision in a browser, desktop/mobile layouts, PDF upload with a real file, live employer ingestion, real signup/login and A/B account isolation, and Supabase RLS using authenticated test accounts. The local test suite does not certify these production checks.

## Authentication email redirects

In Supabase Authentication → URL Configuration, set Site URL to `https://internai-mvp-fixed-devancalabrese-2065.vercel.app/` and allow that exact URL under Redirect URLs. Signup and password recovery explicitly request this canonical URL; Supabase still requires it to be allowed. Do not use temporary Vercel share links or localhost as the production Site URL. Existing emails may retain their original redirect.

## Code organization

Browser scripts live in `js/` and use descriptive names. `index.html` preserves their dependency order; `tests/script-order.json` mirrors it. They remain classic scripts for the existing inline UI handlers. The employer-feed refresh is centralized in `js/employer-feeds.js`; earlier duplicate refresh wrappers have been removed. Matching still contains layered legacy helpers, so further consolidation should be incremental and covered by regression tests.

## Reliability and usability improvements

- Core and Midwest feeds refresh concurrently with bounded requests. Discover shows the last refresh, partial failure notices, and source fetch times. Old postings are not automatically called closed. An explicit employer `closed` flag or `status: closed` blocks submission links; current providers do not consistently supply those fields, so automatic closed-listing verification remains incomplete. Role details offer an on-demand status check for direct Lever and Greenhouse URLs. A 404/410 is labeled unavailable (possibly closed or moved); network errors stay unknown. Checks use fixed ATS API hosts, never arbitrary supplied hosts, and do not submit applications.
- Wrapped resume bullets are joined without changing their words. Graph version 3 rebuilds older evidence. The Profile page allows correcting extracted text and rebuilding evidence; profile fields still need manual review. Multi-column/scanned PDFs remain a limitation.
- Skill detection uses word boundaries. Required, preferred, and responsibility headings are distinguished. Accreditation, clearance, and experience-duration requirements require review rather than being inferred from a matching major.
- Tracking & notes is reachable from each application workspace. Notes, tracking drafts, and status changes save immediately; the tracking screen displays timestamped status history. Regeneration asks before replacing a draft, and intentionally cleared materials stay empty when reopened or restored from backup.
- Application material edits save on input. Copy uses current editor contents and reports failure. Plain-text downloads do not preserve PDF formatting. Resetting a tailored draft asks before replacing edits.
- A stale tab pauses saving/cloud writes instead of overwriting another tab. Export the in-memory workspace before reloading when this happens. Network reconnection retries sync. Browser-storage failures are displayed explicitly.
- Profile offers a JSON backup download and a diagnostic summary with fixed event codes and feed status. Diagnostics stay in memory until the user copies them; there is no external monitoring vendor or remote alerting. Profile also accepts downloaded JSON backups up to 5 MB, validates supported fields, previews replacement, and requires downloading the current workspace before restoring. Restore rebuilds derived evidence from resume text and retains a browser-local pre-restore copy. Account changes, active sync, conflicts, stale tabs, and edits after preview block restoration. Automatic merging is not implemented.

## Browser regression checks

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

CI runs the workflow on desktop and 390px mobile Chromium. External services are blocked and employer feeds use synthetic fixtures. Tests cover viewport overflow, importing a job, editing/downloading materials, tracking a submission, reload persistence, and direct workspace links. They do not certify live email delivery, production auth/RLS, real PDF extraction, employer page availability, or Safari/iOS behavior.

## Next human usability check

Invite 3–5 consenting testers yourself; no invitations are sent by the application. Ask each to: create an account, upload their own resume, correct one extracted fact, review a job match, prepare and download a draft, open the employer listing, record an application, and return after reload. Observe without guiding them. Record where they hesitate or need help, whether the match explanation is understandable, and whether they trust the prepared text. Do not collect passwords or unneeded resume copies. Real participants and their feedback cannot be replaced by automated checks.

## Database sync verification

The SQL source is in `supabase/migrations/*_workspace_atomic_sync.sql`. Deploy the function and timestamp triggers before the corresponding client; failed RPC calls preserve local edits. `tests/workspace-sync.sql` verifies successful saves, advancing versions, stale rejection, owner binding, and anonymous permissions in a transaction that rolls back every synthetic row. It requires an administrative SQL connection and must not be appended to a production migration. Existing RLS remains enabled; the save function uses security invoker and derives ownership from `auth.uid()`.
