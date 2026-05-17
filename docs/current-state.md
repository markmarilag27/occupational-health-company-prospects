# Current State

## 1. Project identity
- Repo/package name: `occupational-health-company-prospects`
- Runtime: Bun + TypeScript (ESM)
- Purpose: CSV-first pipeline to build Fleet / Transport company prospect profiles for occupational health sales review export.

## 2. Current tooling
- Bun: used for CLI/test runtime and scripts.
- TypeScript: strict mode enabled via `tsconfig.json`.
- CLI framework: Commander (`src/cli.ts`).
- Config validation: Zod (`src/config.ts`).
- Logging: Pino (`src/logger.ts`).
- CSV libraries: `csv-parse`, `csv-stringify` (`src/utils/csv.ts`).
- Test runner: Bun test (`*.test.ts` files).
- Lint/check tooling: Biome (`lint`, `lint:fix` scripts).

## 3. Current CLI commands
- `bun run cli doctor`
  - Validates config, ensures directories, prints safe summary and API key presence booleans.
- `bun run cli build:fleet-prospects`
  - Runs core pipeline: load config, ensure dirs, validate input files exist, parse CH/TC CSVs, match, build profiles, export sales review CSV, optionally export unmatched TC CSV, print summary.
- `bun run cli enrich:fleet-prospects [--ai] [--limit <n>]`
  - Reads existing export CSV and optionally enriches directors (Companies House API) and AI outreach hooks (OpenAI), then rewrites CSV.
- `bun run combine:tc`
  - Combines regional Traffic Commissioner CSV files from `data/raw/traffic_commissioner/regions` into `data/raw/traffic_commissioner/tc_operators.csv`, preserves unioned columns, and adds `source_region_file`.

## 4. Current pipeline status
- CSV-first pipeline: implemented.
- Companies House parsing: implemented in `src/sources/companiesHouse.ts` with indexes:
  - by company number
  - by normalized name + postcode
  - by normalized name
- Traffic Commissioner parsing: implemented in `src/sources/trafficCommissioner.ts` with flexible header aliases.
- Matching: implemented in `src/matching/matchCompanies.ts` with rule order:
  - company number
  - unique name+postcode
  - unique name
  - unmatched
- Scoring: implemented in `src/prospects/scoreFleetProspect.ts` with threshold-based priority.
- Profile building: implemented in `src/prospects/buildFleetProspectProfiles.ts` including dedupe by company number and deterministic research URLs.
- Export: implemented in `src/export/salesReviewCsv.ts` with exact header order; unmatched export in `src/export/unmatchedTrafficCommissionerCsv.ts`.

## 5. Optional enrichment status
- Companies House API/director enrichment:
  - Implemented in `src/enrichment/companiesHouseClient.ts` and `src/enrichment/enrichFleetProspects.ts`.
  - Uses `COMPANIES_HOUSE_API_KEY`.
  - Optional and non-blocking (core build does not require it).
- AI outreach hook enrichment:
  - Implemented in `src/enrichment/openaiOutreach.ts` and `src/enrichment/enrichFleetProspects.ts`.
  - Uses `OPENAI_API_KEY`, gated by `--ai`.
  - Optional and non-blocking.

## 6. Input files
Default paths from config:
- Companies House bulk CSV: `data/raw/companies_house/BasicCompanyDataAsOneFile.csv`
- Traffic Commissioner CSV: `data/raw/traffic_commissioner/tc_operators.csv`

Optional pre-processing input folder for TC combine utility:
- `data/raw/traffic_commissioner/regions/*.csv`

## 7. Output files
Default output directory: `data/exports`
- Main sales review export: `data/exports/fleet_prospect_profiles.csv`
- Optional unmatched export: `data/exports/unmatched_tc_operators.csv`

## 8. Environment variables
From `.env.example`:
- Core pipeline variables:
  - `NODE_ENV`
  - `LOG_LEVEL`
  - `DATA_DIR`
  - `RAW_DIR`
  - `PROCESSED_DIR`
  - `EXPORT_DIR`
  - `CH_BULK_FILE`
  - `CH_BULK_ENCODING`
  - `TC_CSV_FILE`
  - `TC_REGION`
  - `SCORE_IMMEDIATE_THRESHOLD`
  - `SCORE_HIGH_THRESHOLD`
- Optional enrichment variables:
  - `COMPANIES_HOUSE_API_KEY`
  - `OPENAI_API_KEY`
- Potential AGENTS.md conflict:
  - `.env.example` includes `DEEPSEEK_API_KEY`, but AGENTS.md expected variable list does not include it.

## 9. Main source modules
- `src/config.ts`: env schema/defaults and validation.
- `src/logger.ts`: Pino logger with redaction paths.
- `src/utils/`: CSV read/write helpers and filesystem utilities.
- `src/normalizers/`: deterministic normalizers for company number/name, postcode, SIC, numeric parsing.
- `src/sources/`: Companies House and Traffic Commissioner loaders.
- `src/matching/`: operator-to-company matching and unmatched reason logic.
- `src/prospects/`: suggested services, scoring, profile builder.
- `src/export/`: sales review CSV mapping/export and unmatched operator export.
- `src/enrichment/`: optional Companies House API and AI enrichment pipeline.
- `src/cli.ts`: command wiring.
- `src/index.ts`: currently Bun hello-world stub and not the pipeline entrypoint.
- `scripts/combine-tc-csvs.ts`: regional Traffic Commissioner CSV combine utility (`combine:tc`).

## 10. Tests
Test coverage exists for:
- Regional Traffic Commissioner combine utility script
- CSV utilities
- Normalizers
- Companies House parser
- Traffic Commissioner parser
- Matching
- Scoring
- Prospect profile builder
- Sales review export
- CLI fixture smoke flow

Test files:
- `scripts/combine-tc-csvs.test.ts`
- `src/utils/csv.test.ts`
- `src/normalizers/normalizers.test.ts`
- `src/sources/companiesHouse.test.ts`
- `src/sources/trafficCommissioner.test.ts`
- `src/matching/matchCompanies.test.ts`
- `src/prospects/scoreFleetProspect.test.ts`
- `src/prospects/buildFleetProspectProfiles.test.ts`
- `src/export/salesReviewCsv.test.ts`
- `src/cli.test.ts`
- `scripts/combine-tc-csvs.test.ts`

Run tests:
- `bun test`

## 11. Known gaps or conflicts
- `src/index.ts` is still a hello-world stub; actual app entrypoint is CLI.
- Runtime test/build execution status is unclear in this environment because Bun availability is unclear at doc-generation time.
- Docker files are present (`Dockerfile`, `compose.yml`), while AGENTS.md states not to add Docker changes unless requested. Current repo history/baseline intent is unclear from filesystem alone.
- `.env.example` includes `DEEPSEEK_API_KEY`, which is outside AGENTS.md expected env list.
- README content may not fully reflect current implementation details; this file is intended as authoritative current snapshot.

## 12. Recommended next tasks
1. Add CLI command-level tests for `enrich:fleet-prospects` flags and summary output.
2. Add an integration test path that runs `combine:tc` output through parser + matching to validate end-to-end regional-file ingestion.
3. Align `.env.example` with AGENTS.md expected variable list (or document why extra vars remain).
4. Replace `src/index.ts` hello-world stub with a minimal CLI usage pointer (or remove if unused).
5. Add concise troubleshooting notes for Docker/Bun permissions to README and AGENTS docs.
