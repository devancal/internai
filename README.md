# InternAI

InternAI is an internship-search and application-preparation workspace.

## Baseline

The current product baseline is the version deployed at `internai-mvp-fixed-6rhqzvivq-devancalabrese-2065.vercel.app`.

That UI is the source of truth. Future changes should be targeted patches: preserve the landing page, profile/autocomplete behavior, PDF resume review, Discover/match flow, Application Kit, and application tracking unless a change explicitly calls for modifying them.

## Product principles

- Truth-first: never invent qualifications, experience, GPA, metrics, or achievements.
- User-controlled submission: do not collect third-party credentials or silently submit applications.
- Patch, don't rebuild: change the smallest necessary surface and preserve working behavior.
- Browser-local demo state is currently acceptable for the MVP; backend/auth/live job data will come later.

## Deployment

This repository is intended to be connected to Vercel. Changes merged to the deployment branch should trigger a Vercel deployment.
