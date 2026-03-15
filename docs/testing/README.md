# Testing Documentation — Index

This directory contains the authoritative test catalog for every project in this repo.
It is the **mandatory reference** for all PRs — consult it before opening any PR to understand
what tests exist and what new tests are required.

---

## Projects

| Project | Test Catalog | Tech Stack |
|---------|-------------|------------|
| [Portal](./PORTAL.md) | Auth, admin, user management | Jest + Supertest + Playwright |
| [TrackMyWeek](./TRACKMYWEEK.md) | Logging, data, reports, categories, questions | Jest + Supertest + Playwright |

---

## Testing Philosophy

This repo follows a three-tier testing model based on industry best practices
(Google SRE, Netflix, Meta, Amazon):

| Tier | Tool | Purpose |
|------|------|---------|
| **Unit** | Jest | Single function in isolation. Fast, no I/O, no server. |
| **Integration** | Jest + Supertest | Two or more modules working together via real server calls. |
| **E2E** | Playwright | Full browser + server flows. Only what integration cannot catch. |

E2E tests are classified into **Critical**, **Smoke**, and **Regression** tiers.
See each project's catalog for the full breakdown.

---

## Classification Definitions

| Classification | Definition | Failure Severity |
|---------------|------------|------------------|
| **Critical** | If this fails, the app is broken for all users. Core auth, data persistence, primary user journey. | Blocks release |
| **Smoke** | If this fails, a specific surface is broken. Page loads, API responds, primary data renders. | Blocks release |
| **Regression** | Written to prevent a previously-fixed bug from returning. Tied to a specific incident. | High |
| **Integration** | Verifies two or more modules work together via real HTTP calls. | High |
| **Unit** | Verifies a single function in isolation. | Medium |

---

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Test exists and passing |
| 🔴 | Test does not exist — must be added |
| 🟡 | Test exists but incomplete or known gap |

---

## Rules for Maintaining This Documentation

1. **Every PR that adds a new test must update the relevant project catalog** in the same PR.
2. **Every PR that modifies existing behavior must re-read the affected test files** from GitHub,
   verify every assertion is still correct, update any that are wrong, and update the catalog
   to reflect the change — all before the PR is opened.
3. **Every PR that adds a new project must create a new `docs/testing/<PROJECT>.md`** and update
   this `README.md` index in the same PR.
4. **Claude must read `docs/testing/` before opening any PR** and explicitly state in the PR
   description what tests exist, what new tests the PR adds, and what existing tests were updated.
5. **Missing tests** (`🔴`) are tracked in project catalogs as the authoritative backlog.
   Do not remove a `🔴` entry without adding the test.

> **Backlog item:** CI tooling to auto-validate that new test files are referenced in the
> appropriate `docs/testing/<PROJECT>.md`, and to auto-regenerate this index. Tracked in `docs/TODO.md`.

---

## Adding a New Project

1. Create `docs/testing/<PROJECT_NAME>.md` using the existing catalogs as a template.
2. Add the project row to the table in this `README.md`.
3. Both files must be in the same PR as the first test for that project.
4. Claude must update this index in the same PR — this is enforced by CLAUDE.md Section 16.
