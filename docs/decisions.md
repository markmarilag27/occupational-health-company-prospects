# Decisions

## Project name

The project is named `occupational-health-company-prospects`.

Reason:

- `occupational-health` describes the industry being targeted.
- `company` describes the entity being profiled.
- `prospects` makes clear that the output is not yet a qualified lead.

The project should not be renamed unless explicitly requested.

## Product framing

The project builds UK company prospect profiles for occupational health sales review.

It does not generate final leads.

Sales decides whether a company becomes a qualified lead.

This distinction matters because the project should support sales review, not automate qualification.

## First segment

The first target segment is:

```text
Fleet / Transport
```

Reason:

- Traffic Commissioner data provides a strong source signal for regulated fleet/operator activity.
- Fleet and transport companies may have occupational health needs such as driver medicals, D4 medicals, safety-critical medicals, and drug and alcohol testing.
- The segment can be built from CSV sources without needing APIs or scraping.

## CSV-first MVP

The MVP is intentionally CSV-first.

No database, Redis, migrations, dashboard, CRM, or background worker is required yet.

Reason:

- The immediate value is producing a useful sales review CSV.
- CSV inputs and outputs are easy to inspect manually.
- The legacy worker was already CSV-oriented.
- The workflow can be validated before adding persistence or infrastructure.
- A database can be added later if the workflow needs history, review state, analytics, or larger-scale processing.

## Core pipeline

The core pipeline is:

1. Read Companies House bulk CSV.
2. Read Traffic Commissioner CSV.
3. Normalize company names, company numbers, postcodes, SIC values, and numeric values.
4. Match Traffic Commissioner operators to Companies House companies.
5. Build Fleet / Transport company prospect profiles.
6. Export `data/exports/fleet_prospect_profiles.csv`.

The core pipeline should work without API keys.

When Traffic Commissioner source files are downloaded by region, they can be combined into `data/raw/traffic_commissioner/tc_operators.csv` as a pre-processing step before the core pipeline.

## Source distinction

Companies House and Traffic Commissioner are different sources.

Companies House is the legal company profile source.

It provides:

- company number
- company name
- company status
- SIC codes
- registered address
- postcode
- incorporation date

Traffic Commissioner is the fleet/operator licence source signal.

It provides:

- operator name
- licence number
- licence type
- traffic area or region
- authorised vehicles
- authorised trailers
- status
- postcode, where available

Traffic Commissioner is not the segment.

Fleet / Transport is the segment.

## Prospect profile object

The main business object is a company prospect profile.

A profile should explain:

- who the company is
- why the company was found
- why it may be relevant to occupational health sales review
- what services may fit
- what information is missing
- what sales should review next

The profile is not a qualified lead.

## Suggested services for Fleet / Transport

For the first segment, suggested services are:

```text
D4 Medicals; Driver Medicals; Drug & Alcohol Testing; Safety-Critical Medicals
```

These are initially hard-coded for the Fleet / Transport MVP.

A service catalog can be added later if more segments are introduced.

## Scoring approach

Use simple prospect scoring for the MVP.

The score is a sales-review prioritization aid, not a qualification decision.

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

## Matching approach

Use conservative matching.

Matching order:

1. Company number, if present.
2. Normalized operator/company name plus postcode, if exactly one match.
3. Normalized operator/company name only, if exactly one match.
4. Otherwise leave unmatched.

Do not invent matches.

For the MVP, export matched companies only unless explicitly asked to export unmatched rows.

## API enrichment

Companies House API and OpenAI enrichment are optional later additions.

They must not be required for the core CSV build.

`COMPANIES_HOUSE_API_KEY` is reserved for later Companies House officer/director enrichment.

`OPENAI_API_KEY` is reserved for later AI-generated review-supporting fields such as company summary or AI outreach hook.

## No dotenv decision

Do not use `dotenv`.

Bun loads `.env` automatically, and the app should read environment variables from `process.env`.

## Data safety

Do not commit:

- `.env`
- raw Companies House CSV files
- raw Traffic Commissioner CSV files
- generated exports
- API keys
- local cache files

Generated files in `data/processed` and `data/exports` should normally remain untracked.
