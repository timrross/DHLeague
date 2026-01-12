# Rider Data API Contract

This document describes the public Rider Data API exposed at the `/api/rider-data` base path. It is the contract relied upon by the client and integration tests.

## Common details
- **Base URL:** `/api/rider-data`
- **Authentication:** Not required for the public endpoints below.
- **Content type:** `application/json`
- **Error format:** `{ "message": string }`. Notable status codes are `400` for bad input, `404` when a record is missing, and `500` for unexpected errors.

## Riders
### GET `/riders`
Returns the complete list of riders.

**Response body**
```json
[
  {
    "id": 1,
    "riderId": "uci-123",
    "firstName": "Ava",
    "lastName": "Lopez",
    "team": "Gravity Co.",
    "country": "USA",
    "cost": 420000,
    "points": 180,
    "gender": "female",
    "image": "https://…"
  }
]
```

### GET `/riders/:id`
Returns a single rider by numeric `id` or alphanumeric `riderId`.

**Response body**
```json
{
  "id": 1,
  "riderId": "uci-123",
  "firstName": "Ava",
  "lastName": "Lopez",
  "team": "Gravity Co.",
  "country": "USA",
  "cost": 420000,
  "points": 180,
  "gender": "female",
  "image": "https://…"
}
```

## Races
### GET `/races`
Returns all races with a computed `status` field (`upcoming`, `next`, `ongoing`, or `completed`). Exactly one upcoming race is marked as `next` when available.

**Response body**
```json
[
  {
    "id": 12,
    "name": "Val di Sole",
    "location": "Trentino",
    "country": "Italy",
    "startDate": "2025-07-05T00:00:00.000Z",
    "endDate": "2025-07-06T00:00:00.000Z",
    "status": "next",
    "imageUrl": "https://…"
  }
]
```

### GET `/races/:id`
Returns a single race with its computed `status`. The race that is next on the calendar will surface `status: "next"`.

**Response body**
```json
{
  "id": 12,
  "name": "Val di Sole",
  "location": "Trentino",
  "country": "Italy",
  "startDate": "2025-07-05T00:00:00.000Z",
  "endDate": "2025-07-06T00:00:00.000Z",
  "status": "next",
  "imageUrl": "https://…"
}
```

### GET `/races/:id/results`
Returns the full results for a race. Each entry contains the rider and their finishing details.

**Response body**
```json
[
  {
    "id": 101,
    "raceId": 12,
    "riderId": 1,
    "position": 1,
    "points": 250,
    "rider": {
      "id": 1,
      "firstName": "Ava",
      "lastName": "Lopez",
      "country": "USA",
      "team": "Gravity Co.",
      "gender": "female",
      "cost": 420000,
      "points": 180,
      "image": "https://…"
    }
  }
]
```

## Notes for downstream consumers
- The `status` field on races is derived from start/end dates; consumers should treat `next` as the race to highlight and `completed` as eligible for results.
- Results endpoints are the canonical source for leaderboard hooks or other features that need to refresh points after a race finishes.
- All endpoints include CORS-friendly JSON responses and will bubble meaningful HTTP status codes for error handling in clients.
