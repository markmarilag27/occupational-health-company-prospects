# Occupational Health Company Prospects

`occupational-health-company-prospects` is a Bun + TypeScript CSV-first pipeline for building UK company prospect profiles for occupational health sales review.

The project does **not** generate final leads. It builds company prospect profiles that the sales team can review. A company becomes a qualified lead only after sales reviews and qualifies it.

The first target segment is:

```text
Fleet / Transport
```

The system answers:

```text
Which UK fleet companies might be worth occupational health sales review, and why?
```

---

## What This Project Does

The pipeline reads Companies House and Traffic Commissioner data, matches fleet operators to legal company profiles, scores them as occupational health prospects, and exports a sales review CSV.

It can also optionally enrich existing prospect profiles with:

- Companies House director names
- AI-generated outreach hooks
- unmatched Traffic Commissioner operator exports for review

---

## What This Project Does Not Do

This project does not:

- Automatically qualify companies as leads
- Send outbound emails
- Act as a CRM
- Require a database
- Require OpenAI for the core CSV pipeline
- Require the Companies House API for the core CSV pipeline
- Scrape personal email addresses
- Replace sales review

The main output is a **sales review export**, not a final lead list.

---

## Runtime and Tooling

The project currently uses:

- Bun
- TypeScript
- ESM modules
- Commander for CLI commands
- Zod for config validation
- Pino for logging
- `csv-parse` and `csv-stringify` for CSV handling
- Bun test runner
- Biome for linting/checks

---

## Current Docker Setup

A Docker development setup is present.

The `Dockerfile`:

- Uses `oven/bun:1.3-slim`
- Installs shell and development tools
- Creates a non-root `dev` user
- Uses `/var/www/html` as the working directory

The `compose.yml`:

- Defines an `app` service
- Builds from the local `Dockerfile`
- Mounts the repo into the container
- Keeps the container alive with `sleep infinity`

Helper scripts are present:

```bash
./run-start.sh
./run-stop.sh
./run-ssh.sh
```

Start the container:

```bash
./run-start.sh
```

Enter the container:

```bash
./run-ssh.sh
```

Stop the container:

```bash
./run-stop.sh
```

---

## Repository Structure

The current implementation is organized around the CSV pipeline:

```text
src/
  cli.ts
  config.ts
  logger.ts
  index.ts

  utils/
    csv.ts
    filesystem.ts

  normalizers/
    companyName.ts
    companyNumber.ts
    postcode.ts
    sic.ts
    numbers.ts

  types/
    company.ts
    trafficCommissioner.ts
    prospect.ts

  sources/
    companiesHouse.ts
    trafficCommissioner.ts

  matching/
    matchCompanies.ts

  prospects/
    suggestedServices.ts
    scoreFleetProspect.ts
    buildFleetProspectProfiles.ts

  export/
    salesReviewCsv.ts
    unmatchedTrafficCommissionerCsv.ts

  enrichment/
    companiesHouseClient.ts
    openaiOutreach.ts
    enrichFleetProspects.ts
```

`src/index.ts` is currently only a default Bun hello-world stub. The project entrypoint is the CLI in `src/cli.ts`.

---

## Data Flow

The core CSV pipeline is:

```text
Companies House bulk CSV
+
Traffic Commissioner operator CSV
↓
normalization
↓
company matching
↓
Fleet / Transport prospect scoring
↓
company prospect profile generation
↓
sales review CSV export
```

More specifically:

1. Load configuration.
2. Ensure data directories exist.
3. Read Companies House bulk CSV.
4. Build Companies House indexes by company number, normalized name + postcode, and normalized name.
5. Read Traffic Commissioner CSV.
6. Match Traffic Commissioner operators to Companies House companies.
7. Build Fleet / Transport company prospect profiles.
8. Export `fleet_prospect_profiles.csv`.
9. Optionally export unmatched Traffic Commissioner operators.
10. Optionally enrich existing prospect profiles.

If you collect Traffic Commissioner CSVs by region first, run the combine utility before step 5.

---

## Data Sources

### Companies House Bulk CSV

Companies House is the legal company profile source.

It provides:

- company number
- company name
- company status
- SIC codes
- registered address
- postcode
- incorporation date

Default input path:

```text
data/raw/companies_house/BasicCompanyDataAsOneFile.csv
```

Download source:

- Companies House bulk data download page: https://download.companieshouse.gov.uk/en_output.html?ft=1

### Traffic Commissioner CSV

Traffic Commissioner data is the fleet/operator licence source signal.

It provides:

- operator name
- company registration number, where available
- licence number
- licence type
- traffic area or region
- authorised vehicle count
- authorised trailer count
- postcode
- status

Default input path:

```text
data/raw/traffic_commissioner/tc_operators.csv
```

Download sources:

- Traffic Commissioner operator licence dataset (data.gov.uk): https://www.data.gov.uk/dataset/2a67d1ee-8f1b-43a3-8bc6-e8772d162a3c/traffic-commissioners-goods-and-public-service-vehicle-operator-licence-records
- Key Traffic Commissioner data index (GOV.UK): https://www.gov.uk/government/collections/key-traffic-commissioner-data

Traffic Commissioner is the source signal. Fleet / Transport is the segment.

---

## Environment Variables

Create a local `.env` file from `.env.example`.

```bash
cp .env.example .env
```

Current environment variables:

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

### Required for the Core CSV Pipeline

The core pipeline expects:

```env
DATA_DIR=
RAW_DIR=
PROCESSED_DIR=
EXPORT_DIR=
CH_BULK_FILE=
CH_BULK_ENCODING=
TC_CSV_FILE=
SCORE_IMMEDIATE_THRESHOLD=
SCORE_HIGH_THRESHOLD=
```

### Optional Enrichment Keys

These are optional:

```env
COMPANIES_HOUSE_API_KEY=
OPENAI_API_KEY=
```

`COMPANIES_HOUSE_API_KEY` is used for optional Companies House director enrichment.

`OPENAI_API_KEY` is used for optional AI outreach hook enrichment.

The core `build:fleet-prospects` command should work without either key.

## CLI Commands

### Doctor

```bash
bun run cli doctor
```

The doctor command:

- loads and validates config
- ensures `DATA_DIR`, `RAW_DIR`, `PROCESSED_DIR`, and `EXPORT_DIR`
- ensures parent directories for `CH_BULK_FILE` and `TC_CSV_FILE`
- prints a safe config summary
- reports API key presence as booleans only
- does not print secrets

---

### Build Fleet Prospects

```bash
bun run cli build:fleet-prospects
```

This is the main core pipeline command.

It:

1. Loads config.
2. Ensures data directories exist.
3. Checks Companies House and Traffic Commissioner CSV input files.
4. Loads Companies House data.
5. Loads Traffic Commissioner data.
6. Matches operators to companies.
7. Builds company prospect profiles.
8. Exports the sales review CSV.
9. Optionally exports unmatched Traffic Commissioner operators if unmatched rows exist.
10. Logs summary counts.

Main output:

```text
data/exports/fleet_prospect_profiles.csv
```

Optional unmatched output:

```text
data/exports/unmatched_tc_operators.csv
```

---

### Enrich Fleet Prospects

```bash
bun run cli enrich:fleet-prospects --ai --limit=50
```

This command enriches an existing `fleet_prospect_profiles.csv`.

It can:

- read the current sales review CSV
- enrich director names from Companies House officers data
- generate AI outreach hooks when `--ai` is provided
- rewrite the CSV with updated values

The enrichment flow is optional and should not be required for the core build.

If a row fails enrichment, the job should warn and continue rather than blocking the entire file.

---

### Combine Regional Traffic Commissioner CSVs

```bash
bun run combine:tc
```

This utility:

- reads all `.csv` files from `data/raw/traffic_commissioner/regions`
- combines them into `data/raw/traffic_commissioner/tc_operators.csv`
- preserves all discovered columns across files
- adds `source_region_file` for row-level traceability
- skips empty files with warnings
- logs each file loaded and total output rows

---

## Input Files

Default expected inputs:

```text
data/raw/companies_house/BasicCompanyDataAsOneFile.csv
data/raw/traffic_commissioner/tc_operators.csv
```

You can change these paths in `.env`:

```env
CH_BULK_FILE=data/raw/companies_house/BasicCompanyDataAsOneFile.csv
TC_CSV_FILE=data/raw/traffic_commissioner/tc_operators.csv
```

---

## Output Files

### Main Sales Review Export

```text
data/exports/fleet_prospect_profiles.csv
```

This is the primary output.

It contains company prospect profiles for sales review.

### Optional Unmatched Traffic Commissioner Export

```text
data/exports/unmatched_tc_operators.csv
```

This is useful for reviewing Traffic Commissioner operators that could not be confidently matched to Companies House companies.

---

## Sales Review CSV Columns

The main sales review CSV should use these headers in this exact order:

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

These fields are for sales review.

They should not be treated as automated lead qualification.

---

## Matching Rules

Traffic Commissioner operators are matched to Companies House companies using conservative rules:

1. Match by company number if present.
2. Otherwise match by normalized operator/company name plus postcode, if exactly one match exists.
3. Otherwise match by normalized name only, if exactly one match exists.
4. Otherwise leave unmatched.

Do not invent matches.

---

## Fleet / Transport Scoring

The prospect score is a review-prioritization aid, not a qualification decision.

Current scoring rules:

- Base score: `65` for an active Traffic Commissioner fleet/operator licence signal.
- If Companies House company status is known and is not active, score is `0`.
- Add `20` if authorised vehicles are `>= 50`.
- Else add `10` if authorised vehicles are `>= 10`.
- Add `5` if SIC text suggests freight, transport, haulage, logistics, courier, or road.
- Cap the score at `100`.

Priority bands:

```text
Immediate: score >= SCORE_IMMEDIATE_THRESHOLD
High:      score >= SCORE_HIGH_THRESHOLD
Nurture:   score < SCORE_HIGH_THRESHOLD
```

Default thresholds:

```env
SCORE_IMMEDIATE_THRESHOLD=80
SCORE_HIGH_THRESHOLD=65
```

---

## Suggested Services

For Fleet / Transport company prospect profiles, suggested services are:

```text
D4 Medicals; Driver Medicals; Drug & Alcohol Testing; Safety-Critical Medicals
```

---

## Optional Enrichment

Optional enrichment is implemented under `src/enrichment`.

### Companies House Director Enrichment

Uses:

```env
COMPANIES_HOUSE_API_KEY=
```

Purpose:

- fetch director/officer names from Companies House officers data
- update the `directors` field in the sales review CSV

This should remain optional.

### AI Outreach Hook Enrichment

Uses:

```env
OPENAI_API_KEY=
```

Command example:

```bash
bun run cli enrich:fleet-prospects --ai --limit=50
```

Purpose:

- generate a concise AI outreach hook for sales review
- update the `AI outreach hook` field

AI-generated text should:

- not invent facts
- not say a company is definitely a lead
- not imply sales qualification has happened
- be based only on existing row data
- remain cautious and useful for review

---

## Testing

Run tests with:

```bash
bun test
```

Tests currently exist for:

- Traffic Commissioner combine utility script
- CSV utilities
- normalizers
- Companies House parser
- Traffic Commissioner parser
- matching
- scoring
- profile builder
- sales review CSV export
- CLI smoke flow

If changing config or CLI behavior, also run:

```bash
bun run cli doctor
```

Run the full build only when input files exist:

```bash
bun run cli build:fleet-prospects
```

---

## Linting / Checks

Biome is present for checks.

Use the scripts defined in `package.json`:

```bash
bun run lint
bun run lint:fix
```

or run Biome directly:

```bash
bunx biome check .
```

---

## Development Workflow

This repo is intended for AI-assisted development using tools such as Codex.

Recommended workflow:

1. Ask the coding agent to read `AGENTS.md`.
2. Work from the current repo state.
3. Make one small change at a time.
4. Review the git diff.
5. Run tests.
6. Commit only after review.

Useful prompt:

```text
Read AGENTS.md first.

Work from the current repo state. Do not bootstrap, recreate, restructure, or reinitialize the project.

Task:
[describe one small task]

Constraints:
- Keep the project CSV-first.
- Do not add PostgreSQL, Redis, Docker changes, migrations, Kysely, or Drizzle.
- Do not use dotenv.
- Do not call outputs final leads.
- Keep COMPANIES_HOUSE_API_KEY and OPENAI_API_KEY optional.

After changes:
- Run bun test.
- Run bun run cli doctor if applicable.
- Summarize changed files, commands run, what passed, and what still needs manual testing.
```

---

## Data Safety

Do not commit:

- `.env`
- raw Companies House CSV files
- raw Traffic Commissioner CSV files
- generated exports
- API keys
- local cache files

Generated files under `data/processed` and `data/exports` should normally remain untracked.

It is safe to commit `.env.example` with empty placeholder values.

---

## Troubleshooting

### `bun` is not found

Install Bun locally or run inside the Docker container.

Check:

```bash
bun --version
```

### Raw CSV file missing

If `build:fleet-prospects` fails because an input file is missing, place files at the configured paths:

```text
data/raw/companies_house/BasicCompanyDataAsOneFile.csv
data/raw/traffic_commissioner/tc_operators.csv
```

or update `.env`.

### API key missing

Missing `COMPANIES_HOUSE_API_KEY` or `OPENAI_API_KEY` should not block the core build.

They are only needed for optional enrichment.

### AI enrichment skipped

Make sure:

```env
OPENAI_API_KEY=your_key_here
```

Then run:

```bash
bun run cli enrich:fleet-prospects --ai --limit=50
```

### Companies House director enrichment skipped

Make sure:

```env
COMPANIES_HOUSE_API_KEY=your_key_here
```

Then rerun enrichment.

---

## Legacy Notes

The previous implementation was a Python project called SignalSieve.

Legacy files included:

- `harvest_tc.py`
- `enrich_ch_bulk.py`
- `sieve.py`
- `enrich_everything.py`
- `ch_officer_enrichment.py`

Those names should only appear in migration documentation.

The current project is a Bun + TypeScript CSV-first company prospect profile pipeline.
