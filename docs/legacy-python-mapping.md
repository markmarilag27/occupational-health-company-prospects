# Legacy Python Mapping

## Purpose

This document maps the legacy Python worker concepts to the new Bun + TypeScript CSV-first project.

The new project should not directly copy old names or old product framing.

The old worker used sieve-style naming. The new project uses company prospect profile language.

## Legacy files

The legacy Python worker included files such as:

- `harvest_tc.py`
- `enrich_ch_bulk.py`
- `sieve.py`
- `enrich_everything.py`
- `ch_officer_enrichment.py`

These names may be mentioned when discussing migration, but do not use `sieve` in new code, commands, environment variables, output files, or docs except when referring to legacy files.

## New project framing

Project:

```text
occupational-health-company-prospects
```

Main output object:

```text
Company prospect profile
```

Main export:

```text
data/exports/fleet_prospect_profiles.csv
```

The output is for sales review. It is not a final lead list.

## Mapping table

| Legacy file / concept | Legacy role | New TypeScript concept |
|---|---|---|
| `harvest_tc.py` | Download or prepare Traffic Commissioner operator licence data | `src/sources/trafficCommissioner.ts` |
| `enrich_ch_bulk.py` | Match Traffic Commissioner rows to Companies House bulk CSV | `src/sources/companiesHouse.ts` plus `src/matching/matchCompanies.ts` |
| `sieve.py` | Score matched fleet companies and export a basic CSV | `src/prospects/scoreFleetProspect.ts` plus `src/prospects/buildFleetProspectProfiles.ts` |
| `enrich_everything.py` | Optional enrichment such as website guesses, emails, clinics, AI hook, research URLs | Optional future files under `src/enrichment/` |
| `ch_officer_enrichment.py` | Standalone Companies House officer/director enrichment | Optional future Companies House API enrichment |
| lead CSV | Legacy-style output | sales review CSV of company prospect profiles |
| lead score | Legacy-style scoring language | prospect score |
| lead status | Legacy-style language | review status |

## Source mapping

### Traffic Commissioner

Legacy source:

```text
Traffic Commissioner operator licence data
```

New meaning:

```text
Traffic Commissioner source signal
```

Use it to identify regulated fleet/operator licence activity.

Expected fields may include:

- operator name
- company registration number
- licence number
- licence type
- traffic area or region
- authorised vehicles
- authorised trailers
- postcode
- status

### Companies House bulk CSV

Legacy source:

```text
Companies House bulk company CSV
```

New meaning:

```text
Companies House legal company profile source
```

Use it for:

- company number
- company name
- company status
- SIC codes
- registered address
- postcode
- incorporation date

### Companies House API

Legacy use:

```text
Optional officers/directors enrichment
```

New use:

```text
Optional later enrichment only
```

Do not require `COMPANIES_HOUSE_API_KEY` for the core CSV build.

### OpenAI API

Legacy use:

```text
Optional AI sales or outreach hook
```

New use:

```text
Optional later review-supporting enrichment only
```

Do not require `OPENAI_API_KEY` for the core CSV build.

AI output must not invent facts or claim a company is a qualified lead.

## New module responsibilities

### `src/sources/companiesHouse.ts`

Read and parse Companies House bulk CSV.

Build indexes for matching:

- by company number
- by normalized company name plus postcode
- by normalized company name

### `src/sources/trafficCommissioner.ts`

Read and parse Traffic Commissioner CSV.

Normalize operator names, company numbers, postcodes, vehicle counts, trailer counts, and statuses.

### `src/normalizers/*`

Contain deterministic pure functions for:

- company names
- company numbers
- postcodes
- SIC fields
- numbers

### `src/matching/matchCompanies.ts`

Match Traffic Commissioner operators to Companies House companies using conservative rules.

Do not invent matches.

### `src/prospects/scoreFleetProspect.ts`

Score matched Fleet / Transport prospects.

The score is a sales-review priority signal, not qualification.

### `src/prospects/buildFleetProspectProfiles.ts`

Build company prospect profile rows for export.

Include:

- why found
- why relevant
- suggested services
- score
- priority
- research URLs
- blank sales review fields

### `src/export/salesReviewCsv.ts`

Write the sales review CSV with the exact required headers.

## Legacy naming to avoid

Avoid these in new implementation:

- `sieve`
- `lead intelligence`
- `lead score`
- `final lead`
- `qualified lead`, except when explaining that sales qualifies later
- `lead automation`

Use these instead:

- company prospect profile
- prospect score
- sales review export
- review status
- suggested services
- outreach hook
- Fleet / Transport segment
- Traffic Commissioner source signal
- Companies House legal company profile

## Migration rule

Do not port blindly.

Use the legacy code as a reference for:

- input fields
- matching ideas
- scoring ideas
- export fields

But implement the new project around the simpler CSV-first company prospect profile model.
