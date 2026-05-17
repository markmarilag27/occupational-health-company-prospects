# AGENTS.md

## Purpose

This file gives AI coding agents clear development instructions for the existing `occupational-health-company-prospects` repository.

The repository is already set up. Do not bootstrap, recreate, restructure, or reinitialize the project unless explicitly asked.

This project is developed with AI coding assistance through pi.dev using Gemini Flash 2.5 or the configured coding model.

## Project overview

`occupational-health-company-prospects` is a Bun + TypeScript CSV-first project for building UK company prospect profiles for occupational health sales review.

The first target segment is Fleet / Transport.

The system answers:

> Which UK fleet companies might be worth occupational health sales review, and why?

The project does not generate final leads. It builds company prospect profiles for sales review. Sales decides whether a company becomes a qualified lead.

## Current development mode

Work from the current repo state.

Do not assume the project is empty.

Before making changes:

1. Inspect the relevant files.
2. Understand what already exists.
3. Make the smallest safe change.
4. Preserve existing structure unless there is a clear reason to change it.
5. Add or update tests when changing deterministic logic.
6. Run the relevant checks.
7. Summarize what changed.

## Hard constraints

Do not add any of the following unless explicitly requested:

- PostgreSQL
- Redis
- Docker changes
- Kysely
- Drizzle
- migrations
- background workers
- dashboards
- CRM features
- outbound email automation
- web scraping
- automated lead qualification

Do not use `dotenv`.

Bun loads `.env` automatically. Read environment values from `process.env`.

Do not make API keys required for the core CSV pipeline.

`COMPANIES_HOUSE_API_KEY` and `OPENAI_API_KEY` are optional for later enrichment only.

## Product language

Use these terms:

- company prospect profile
- prospect profile
- prospect score
- sales review export
- suggested services
- outreach hook
- review status
- Fleet / Transport segment
- Traffic Commissioner source signal
- Companies House legal company profile

Avoid these terms in new code, commands, env vars, docs, and comments:

- final lead
- lead intelligence
- lead scoring
- lead automation
- qualified lead, except when explaining that sales qualifies later
- sieve, except when referring to legacy Python files

A company is not a qualified lead until sales reviews and qualifies it.

## Architecture

Keep the MVP CSV-first.

The core flow is:

1. Read Companies House bulk CSV.
2. Read Traffic Commissioner CSV.
3. Normalize company names, company numbers, postcodes, SIC values, and numeric values.
4. Match Traffic Commissioner operators to Companies House companies.
5. Build Fleet / Transport company prospect profiles.
6. Export `data/exports/fleet_prospect_profiles.csv`.

The core pipeline should work without:

- database
- Redis
- external APIs
- OpenAI
- Companies House API

## Runtime and tooling

Use:

- Bun
- TypeScript
- Commander for CLI commands
- Zod for config validation
- Pino for logging
- csv-parse and csv-stringify for CSV handling
- Bun test runner

Do not introduce alternative tooling unless requested.

### Running Bun commands in this repo

If Bun is not available on the host shell, run commands inside the Docker Compose app container.

Examples:

```bash
./run-start.sh
docker compose exec app bun test
docker compose exec app bun run cli doctor
docker compose exec app bun run cli build:fleet-prospects
```

`./run-ssh.sh` can be used to open an interactive shell in the app container.

## Environment variables

Expected app environment variables:

```env
NODE_ENV=development
LOG_LEVEL=info

DATA_DIR=data
RAW_DIR=data/raw
PROCESSED_DIR=data/processed
EXPORT_DIR=data/exports

CH_BULK_FILE=data/raw/companies_house/BasicCompanyDataAsOneFile.csv
CH_BULK_ENCODING=latin1

TC_CSV_FILE=data/raw/traffic_commissioner/tc_operators.csv
TC_REGION=

SCORE_IMMEDIATE_THRESHOLD=80
SCORE_HIGH_THRESHOLD=65

COMPANIES_HOUSE_API_KEY=
OPENAI_API_KEY=
```

Do not create environment variables starting with the project name.

Do not print secrets.

When reporting key presence, use booleans only, for example:

```text
OPENAI_API_KEY present: false
COMPANIES_HOUSE_API_KEY present: false
```

## CLI expectations

Primary commands:

```bash
bun run cli doctor
bun run cli build:fleet-prospects
```

Optional later:

```bash
bun run cli enrich:fleet-prospects
```

`build:fleet-prospects` should run the full MVP pipeline:

1. Load config.
2. Ensure data directories exist.
3. Load Companies House CSV.
4. Load Traffic Commissioner CSV.
5. Match operators to companies.
6. Build Fleet / Transport company prospect profiles.
7. Export the sales review CSV.

Only run `build:fleet-prospects` if the required raw CSV files exist locally.

## Main output

The main output file is:

```text
data/exports/fleet_prospect_profiles.csv
```

Do not name output files with `lead` or `sieve`.

## Sales review CSV columns

The sales review CSV headers must be exactly:

```text
company name
company number
company status
company summary
segment
fleet size
licence type
postcode
industry / SIC
score
priority
why found
why relevant
suggested services
directors
website guess
email guesses
nearest clinic
distance to clinic
AI outreach hook
LinkedIn research URL
HSE notice search URL
review status
sales_rating
sales_comment
would_contact
best_buyer_role
missing_information
wrong_reason
```

Preserve this header order unless explicitly asked to change it.

## Source distinction

Companies House and Traffic Commissioner are different sources.

Companies House tells us who the company is legally:

- company number
- company status
- SIC codes
- registered address
- postcode
- incorporation date

Traffic Commissioner tells us whether the company/operator has regulated fleet/operator licence signals:

- operator name
- licence number
- licence type
- authorised vehicles
- authorised trailers
- traffic area / region
- status

Traffic Commissioner is a source signal.

Fleet / Transport is a segment.

Do not mix these concepts.

## Matching rules

Match Traffic Commissioner operators to Companies House companies using:

1. Company number, if present.
2. Normalized company/operator name + postcode, if exactly one match.
3. Normalized company/operator name only, if exactly one match.
4. Otherwise leave unmatched.

Do not invent matches.

For the MVP, export matched companies only unless explicitly asked to export unmatched rows.

## Fleet / Transport suggested services

For Fleet / Transport company prospect profiles, suggested services should be:

```text
D4 Medicals; Driver Medicals; Drug & Alcohol Testing; Safety-Critical Medicals
```

## Scoring rules

Use prospect scoring, not lead scoring.

Fleet / Transport MVP scoring:

- Base score 65 for an active Traffic Commissioner fleet/operator licence signal.
- If Companies House company status is known and is not active, score is 0.
- Add 20 if authorised vehicles >= 50.
- Else add 10 if authorised vehicles >= 10.
- Add 5 if SIC text suggests freight, transport, haulage, logistics, courier, or road.
- Cap score at 100.

Priority:

- `Immediate` if score >= `SCORE_IMMEDIATE_THRESHOLD`
- `High` if score >= `SCORE_HIGH_THRESHOLD`
- `Nurture` otherwise

## AI enrichment rules

AI enrichment can be added later, but it must stay optional.

When AI enrichment is requested:

- Use `OPENAI_API_KEY`.
- Do not require it for `build:fleet-prospects`.
- Use it only for review-supporting fields such as `AI outreach hook` or `company summary`.
- Do not invent facts.
- Do not say a company is definitely a lead.
- Do not imply sales qualification has happened.
- Base generated text only on existing row data.
- Keep output cautious, concise, and useful for sales review.

## Companies House API rules

Companies House API enrichment can be added later, but it must stay optional.

When requested:

- Use `COMPANIES_HOUSE_API_KEY`.
- Do not require it for `build:fleet-prospects`.
- Use it mainly for officer/director enrichment.
- Do not block the core CSV pipeline if the API key is missing.
- Avoid storing unnecessary personal details beyond names and roles needed for B2B sales review.

## Coding standards

Use small, focused modules.

Prefer pure functions for:

- normalization
- matching
- scoring
- profile building
- CSV row mapping

Use clear TypeScript types.

Avoid hidden side effects.

Do not silently swallow errors.

Log useful context without exposing secrets.

Keep code readable and boring. Avoid clever abstractions unless they reduce real duplication.

## Testing expectations

Use:

```bash
bun test
```

Add or update tests for deterministic logic, including:

- company number normalization
- company name normalization
- postcode normalization
- SIC parsing
- number parsing
- matching rules
- scoring rules
- CSV header mapping
- profile deduplication

For config or CLI changes, also run:

```bash
bun run cli doctor
```

For full pipeline changes, only run:

```bash
bun run cli build:fleet-prospects
```

when raw CSV input files exist locally.

If raw CSV files are missing, say that full pipeline testing could not be completed locally.

## Safe development workflow

For each task:

1. Read this file.
2. Inspect the current repo state.
3. Identify the smallest required change.
4. Modify only relevant files.
5. Add or update tests.
6. Run checks.
7. Summarize the result.

When summarizing, include:

- files changed
- commands run
- whether tests passed
- anything not tested
- any follow-up needed

## Task boundaries

Do not perform broad refactors unless the user explicitly asks.

Do not rename files or folders unless necessary for the requested task.

Do not change CSV headers unless explicitly requested.

Do not add dependencies unless the task requires them.

Do not remove existing behavior unless it conflicts with this file or the user explicitly asks.

## Git and data safety

Never commit:

- `.env`
- raw Companies House CSV files
- raw Traffic Commissioner CSV files
- generated export files
- secrets
- API keys
- local cache files

Generated files under `data/processed` and `data/exports` should normally stay untracked.

## Definition of done

A task is done when:

- The requested change is implemented.
- Relevant tests are added or updated.
- `bun test` passes, or any failure is clearly explained.
- `bun run cli doctor` passes for config/CLI changes, or any failure is clearly explained.
- The change follows CSV-first architecture.
- The change does not introduce final-lead language or automated qualification.

## Repository guidance files

This repository includes a few guidance files for AI-assisted development.

- `AGENTS.md`  
  Main rules the AI coding agent must follow. Always treat this file as the primary source of truth.

- `docs/ai-development-workflow.md`  
  How AI-assisted development should happen in this repo: task size, prompt patterns, review workflow, testing expectations, and commit habits. Consult this when planning or reviewing AI-driven development tasks.

- `docs/decisions.md`  
  Product and architecture decisions, including why the project is CSV-first and what not to overbuild. Consult this before proposing architecture changes, adding infrastructure, changing terminology, or expanding scope.

- `docs/legacy-python-mapping.md`  
  Mapping from the old Python worker to the new Bun + TypeScript project. Consult this when porting behavior, comparing legacy scripts, or deciding where old functionality belongs.

If a task conflicts with these files, follow this priority order:

1. The user’s latest explicit instruction
2. `AGENTS.md`
3. `docs/decisions.md`
4. `docs/ai-development-workflow.md`
5. `docs/legacy-python-mapping.md`

Do not load or rely on the legacy mapping unless the task involves legacy Python behavior.
