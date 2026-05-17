# AI Development Workflow

## Purpose

This document explains how to use AI coding assistance for the existing `occupational-health-company-prospects` repository.

The repo already exists. This workflow is not for bootstrapping or recreating the project. It is for day-to-day development using pi.dev with Gemini Flash 2.5 or whichever coding model is configured.

## Development principle

Use AI as a careful pair programmer.

The agent should:

1. Read `AGENTS.md`.
2. Inspect the current repo state.
3. Work on one small task.
4. Modify only relevant files.
5. Add or update tests when logic changes.
6. Run relevant checks.
7. Explain what changed.

Do not ask the agent to build the whole project in one prompt.

## Standard pi.dev prompt template

Use this template for most tasks:

```text
Read AGENTS.md first.

Work from the current repo state. Do not bootstrap, recreate, restructure, or reinitialize the project.

Task:
[describe one small task]

Constraints:
- Keep the project CSV-first.
- Do not add PostgreSQL, Redis, Docker changes, migrations, Kysely, or Drizzle.
- Do not use dotenv.
- Do not add OpenAI or Companies House API calls unless this task explicitly says so.
- Do not call outputs final leads.
- Use company prospect profile language.
- Keep COMPANIES_HOUSE_API_KEY and OPENAI_API_KEY optional.

After changes:
- Run bun test.
- Run bun run cli doctor if applicable.
- Do not run bun run cli build:fleet-prospects unless raw CSV inputs exist locally.
- Summarize changed files, commands run, what passed, and what still needs manual testing.
```

## Good task size

Good AI tasks are small and specific.

Good examples:

```text
Add tests for company number normalization.
```

```text
Implement matching by normalized company name plus postcode.
```

```text
Fix the CSV export so the headers exactly match AGENTS.md.
```

```text
Add an unmatched Traffic Commissioner operators export.
```

Avoid broad prompts like:

```text
Build the whole app.
```

```text
Refactor everything.
```

```text
Make this production-ready.
```

## Recommended development order

Use this order unless the repo already has some of these pieces:

1. Audit current implementation.
2. Normalizers.
3. CSV utilities.
4. Companies House parser.
5. Traffic Commissioner parser.
6. Matching.
7. Prospect scoring.
8. Company prospect profile builder.
9. Sales review CSV export.
10. Full `build:fleet-prospects` CLI wiring.
11. Optional unmatched operators export.
12. Optional Companies House API enrichment.
13. Optional AI outreach hook enrichment.

## Prompt: audit current repo

Use this when starting a pi.dev session:

```text
Read AGENTS.md first.

Audit the current repository.

Do not modify files yet.

Check:
- What MVP pieces already exist.
- Whether the project is still CSV-first.
- Whether dotenv, database code, migrations, Docker changes, Redis, Kysely, or Drizzle were added.
- Whether terminology follows company prospect profile language.
- Whether API keys are optional.
- Whether tests exist for deterministic logic.
- Whether CLI commands match AGENTS.md.

Return:
1. What is correct.
2. What is missing.
3. What conflicts with AGENTS.md.
4. The next smallest safe task.
```

## Prompt: implement one feature

```text
Read AGENTS.md first.

Work from the current repo state.

Task:
Implement [specific feature].

Acceptance criteria:
- [criterion 1]
- [criterion 2]
- [criterion 3]

Constraints:
- Do not change unrelated files.
- Do not add new dependencies unless necessary.
- Do not alter CSV headers unless explicitly required.
- Do not introduce final-lead language.
- Do not make optional API keys required.

After changes:
- Add or update tests.
- Run bun test.
- Run bun run cli doctor if applicable.
- Summarize changed files and test results.
```

## Prompt: fix a bug

```text
Read AGENTS.md first.

Bug:
[describe the bug]

Expected behavior:
[describe expected behavior]

Actual behavior:
[describe actual behavior]

Please:
1. Inspect the relevant code.
2. Explain the likely cause.
3. Make the smallest safe fix.
4. Add a regression test.
5. Run bun test.
6. Summarize the changed files and result.
```

## Prompt: review a diff

Use this before committing AI-generated work:

```text
Read AGENTS.md first.

Review the current git diff.

Do not modify files unless you find a clear issue.

Check for:
- accidental broad refactors
- terminology violations
- dotenv usage
- database or Docker additions
- required API keys
- missing tests
- CSV header changes
- leaked secrets or raw data

Return:
1. Safe to commit: yes/no
2. Issues found
3. Suggested fixes, if any
```

## Manual review checklist

Before committing AI changes, check:

- Did it read and follow `AGENTS.md`?
- Did it avoid bootstrapping/recreating the repo?
- Did it keep the project CSV-first?
- Did it avoid database, Redis, migrations, Kysely, Drizzle, and Docker changes?
- Did it avoid `dotenv`?
- Did it keep API keys optional?
- Did it use company prospect profile language?
- Did it avoid final-lead language?
- Did tests pass?
- Did it avoid committing raw CSV files or generated exports?

## Local command checklist

Common checks:

```bash
bun test
bun run cli doctor
```

If Bun is not available on the host shell, run commands in the Docker Compose app container:

```bash
bash ./run-start.sh
docker compose exec app bun test
docker compose exec app bun run cli doctor
```

If Traffic Commissioner regional CSVs are downloaded into `data/raw/traffic_commissioner/regions`, combine them before build:

```bash
bun run combine:tc
```

Only run the full build when input files are available:

```bash
bun run cli build:fleet-prospects
```

If the raw Companies House or Traffic Commissioner CSV files are missing, the agent should say that full pipeline testing could not be completed locally.

## Commit workflow

After each accepted task:

```bash
git diff
bun test
bun run cli doctor
git status
git add .
git commit -m "type: concise description"
```

Suggested commit message examples:

```text
feat: add fleet prospect scoring
feat: parse traffic commissioner csv
feat: export sales review csv
fix: preserve csv header order
test: add matching edge cases
docs: clarify ai development workflow
```

## pi.dev usage notes

In pi.dev, keep prompts focused and attach only the context needed for the task.

Recommended flow:

1. Open the repo in pi.dev.
2. Ask the agent to read `AGENTS.md`.
3. Ask for an audit when starting a new session.
4. Give one small implementation task.
5. Let it run tests.
6. Review its summary and diff.
7. Commit manually after you are satisfied.

If pi.dev lets you pin or attach context files, pin:

- `AGENTS.md`
- `docs/ai-development-workflow.md`
- relevant source files for the task

Avoid pinning large raw CSV files unless the task specifically needs fixture data.
