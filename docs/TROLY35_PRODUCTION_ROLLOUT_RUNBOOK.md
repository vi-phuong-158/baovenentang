# TROLY35 Production Rollout Runbook

## Status

`TROLY35_PRODUCTION_ROLLOUT_READINESS_BLOCKED_PRODUCTION_SNAPSHOT_ENVIRONMENT_AND_GAS_COMPATIBILITY_UNVERIFIED`

This runbook is planning evidence only. It must not be used to run setup, seed, email, trigger, AI, Pinecone sync, or other write flows in Production.

## Evidence available

- Branch `codex/troly35-hoc-tap-loi-bac`, source baseline `1859d29c2b89f81ca63ae6afb7e7b0674986a037`.
- Preview TEST acceptance passed with `QUIZ-TEST-001` and `BOOK-TEST-001` through Preview.
- Local: 23/23 `hoc-tap` tests pass; 16 GAS files parse; both manifests parse; frontend build passes.
- Production Sheet, Production GAS, and Production environment metadata are not inspected by this evidence package.

## Required Production schema

| Sheet | Preserve existing columns | Append-only columns | Public condition |
|---|---|---|---|
| `QUIZ` | ID, question, A-D, correct answer, explanation, topic | Nguồn; Trạng thái duyệt; Người duyệt; Ngày duyệt; Phiên bản | All base fields present; source; `DaDuyet`; reviewer; valid approval date; version |
| `TU_SACH` | ID, title, author, year, topic, summary, podcast, mind map, NotebookLM URL, source, status, updated date | Người duyệt; Ngày duyệt; Phiên bản | `DaDuyet`; source label and URL; reviewer; valid approval date; version |

No historical column may move or change meaning. Any row without the required metadata fails closed and must not be inferred approved.

## Owner snapshot and backfill template

Before Production rollout, export a read-only audit containing each sheet header in order, physical/data row count, blank rows, duplicate/missing IDs, equivalent metadata headers, timestamp, and checksum.

| ID | Current status | Missing metadata/base fields | Classification | Proposed action | Human review |
|---|---|---|---|---|---|
| `<record ID>` | `<status>` | `<fields>` | READY_TO_PUBLISH / NEEDS_SOURCE / NEEDS_APPROVAL / NEEDS_DATE / NEEDS_VERSION / INVALID_BASE_DATA / INTENTIONALLY_NOT_PUBLIC | Append metadata only after approval, or keep non-public | YES |

Do not fabricate source, reviewer, approval date, or version.

## Deployment order

| Step | Preconditions and action | Expected evidence | Stop / rollback |
|---|---|---|---|
| 1 | Owner-authorized final read-only snapshot | Headers, row counts, ID report, timestamp | Stop if snapshot incomplete |
| 2 | Append listed columns only | Header order matches target | Restore header order; do not delete data |
| 3 | Controlled human backfill | Publication classification/count report | Stop if metadata is ambiguous |
| 4 | Recount public Quiz/Books rows | Expected visible/hidden counts approved | Keep release blocked on unexpected loss |
| 5 | Deploy compatible GAS version | Version/deployment ID retained | Revert GAS deployment on incompatible response |
| 6 | Read-only GAS smoke tests: `quiz_topics`, `quiz`, `books`, `book` | Approved-only response shapes | Stop/revert GAS on error or unexpected data |
| 7 | Verify Production env names/scopes only | Required variables SET in Production scope | Stop if required configuration missing |
| 8 | Owner approves release | Recorded approval | No merge without approval |
| 9 | Merge branch; observe Git-backed Vercel Production deployment | Production SHA and READY | Roll back Vercel deployment if build fails |
| 10 | Read-only Production smoke tests and runtime-error review | Public visibility and controlled rejects | Roll back on access-control/data regression |

## Required Production environment metadata

| Variable | Requirement |
|---|---|
| `GAS_DEPLOYMENT_URL` | SET, Production scope, Production GAS Web App |
| `IP_HASH_SALT` | SET, Production scope |
| `GAS_API_TOKEN` or `API_ACCESS_TOKEN` | SET if protected server actions remain enabled |
| `GEMINI_API_KEY` | SET only if AI runtime is enabled |
| `PINECONE_API_KEY` | SET only if AI runtime is enabled |
| `PINECONE_INDEX_HOST` | SET only if AI runtime is enabled |
| `TROLY35_ACCESS_CODE` | SET only if `troly35_run` remains enabled |

## Compatibility

A Production GAS update is mandatory for the branch frontend: `quiz_topics`, category-aware approved-only `quiz`, approved-only `books`/`book`, response `source`/`version`, and controlled rejections for `submit_quiz`, history, trends, rate, and feedback.

## Evidence retention

Retain snapshots, approval/backfill report, GAS deployment ID, env scope checklist, Vercel Production deployment ID/SHA, read-only smoke responses, runtime-error review, and any rollback decision.
