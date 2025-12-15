# UCI Dataride Integration Reference

This document outlines the constants and endpoints used when integrating the UCI Dataride API into a fantasy cycling league platform. It is structured for unambiguous, machine-readable use and can be imported or referenced within projects using tools like Codex.

## Disciplines

These constants represent the internal UCI discipline IDs used in the API.

```ts
const DISCIPLINES = {
  ROAD: 1,
  TRACK: 3,
  CYCLOCROSS: 4,
  MTB_XCO: 5,
  MTB_DH: 6,
  BMX_RACING: 7,
  BMX_FREESTYLE: 8
};
```

## Genders

Used to filter rankings or results by gender.

```ts
const GENDER = {
  MALE: 1,
  FEMALE: 2
};
```

## Sample Event IDs

These IDs correspond to real events in the UCI Dataride system and are used for fetching results.

```ts
const EVENT_IDS = {
  FORT_WILLIAM_2024: 199132,
  LES_GETS_2024: 199135,
  VAL_DI_SOLE_2024: 199138
};
```

## API Endpoints (Unofficial but Public)

Endpoints have been discovered via browser dev tools and are used by the frontend of https://dataride.uci.org/

### Get Rider Rankings (by discipline and gender)

```
GET https://dataride.uci.org/api/Ranking/GetRankingByDiscipline?disciplineId={DISCIPLINE_ID}&genderId={GENDER_ID}
```

### Get Event Results

```
GET https://dataride.uci.org/api/EventResults?eventId={EVENT_ID}&disciplineId={DISCIPLINE_ID}
```

## Example Response (Simplified)

```json
[
  {
    "position": 1,
    "uciCode": "SUI19850112",
    "riderName": "Nino SCHURTER",
    "team": "SCOTT-SRAM MTB RACING TEAM",
    "time": "1:22:45"
  }
]
```

## Notes

- These APIs do not require authentication.
- Data returned is in JSON format.
- All requests should be rate-limited and cached responsibly.
- UCI does not officially support this as a public API — use with care.

## Usage

These constants and endpoints can be imported into your scraping or syncing modules and used to fetch up-to-date rider, team, and event data for use in a fantasy league or similar application.