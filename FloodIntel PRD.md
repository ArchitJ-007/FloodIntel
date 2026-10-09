# FloodSense: Product Requirements Document

**Version 1.0 | Status: Ready for build | Last updated: 9 Oct 2026 | Owner: Product and Engineering**

> Working name: **FloodSense**. A real-time urban flood and waterlogging monitoring web app that combines weather data, community reports and AI analysis to help people avoid flooded roads. This PRD is written for senior engineers and designers and is meant to be buildable without another planning document.

## 0. How to Read This Document

**Priority tags**

| Tag | Meaning |
| --- | --- |
| **P0** | Must ship in the first working demo (the 6-hour build). |
| **P1** | Completes the MVP product (reporting, analytics, hardening). |
| **P2** | Polish, scale and commercial readiness. |

**ID conventions:** `US-` user story, `FR-` functional requirement, `NFR-` non-functional requirement, `API-` endpoint, `CMP-` component. Every FR is testable.

**Build order (from the feature list)**

| Tier | Modules | Priority |
| --- | --- | --- |
| Tier 1 | Live Flood Map, Weather and Rainfall, AI Flood Risk Analysis, Smart Route Planner, Demo Flood Data | P0 |
| Tier 2 | Flood Incident Reporting, Analytics Dashboard | P1 |
| Cross-cutting | Premium UX (white theme, dark map option, skeletons, responsive, accessibility, `design.md`) | P0 baseline, P2 polish |

**Core product principle: honest data.** There is no guaranteed live street-level waterlogging feed in the chosen stack. Open-Meteo supplies weather, not verified flood locations. Therefore every flood marker in FloodSense carries a visible **provenance label** (Demo, User-reported, Partner feed) and a **verification status**. The product must never present demo or unverified data as confirmed fact. This is both an ethical requirement and the product's trust differentiator.

---

## 1. Product Vision

### 1.1 Product Overview

FloodSense is a responsive web application that shows where waterlogging is happening in a city, how risky it is, and how to get around it. It has four connected layers:

1. **Situational awareness:** an interactive map of waterlogging incidents with color-coded risk, plus live rainfall context from Open-Meteo.
2. **Intelligence:** an AI layer (Gemini) that classifies incident descriptions, proposes severity, and writes plain-language, evidence-based risk explanations. A deterministic scoring engine produces the numeric risk score. AI explains it and never overrides it silently.
3. **Action:** a route planner (OSRM + Turf.js) that compares alternative routes by hazard exposure and recommends the safest one.
4. **Contribution and insight:** citizen incident reporting and an analytics dashboard for hotspots and trends.

The launch city is configurable. The seed demo dataset ships for one city (default: Mumbai, chosen for its well-known monsoon waterlogging) and the architecture supports multiple cities through a `city` config.

### 1.2 Problem Statement

During heavy rain, urban commuters have no single trustworthy place to learn which roads are waterlogged right now. Weather apps say it is raining but not where streets are flooded. Social media is fast but noisy, unverified and hard to search spatially. Navigation apps route through flooded underpasses because they have no hazard awareness. The result is stalled vehicles, missed work, safety risk, and wasted emergency-response effort.

**The gap:** nobody joins (a) rainfall intensity, (b) on-the-ground incident reports and (c) route planning into one decision tool that is transparent about how reliable its data is.

### 1.3 Target Audience

| Segment | Description | Priority |
| --- | --- | --- |
| Daily commuters | Two-wheeler, car, and transit riders in flood-prone cities | Primary |
| Delivery and gig riders, small fleet dispatchers | Time-sensitive, route-heavy, high exposure | Primary |
| Residents and community volunteers | Report and monitor their own neighbourhood | Secondary |
| Municipal ward officers, NGOs, civic-tech analysts | Need hotspot and trend intelligence | Secondary (future B2B/SaaS) |
| Hackathon judges and demo viewers | Need to understand value in under two minutes | Demo audience |

### 1.4 Goals and Non-Goals

**Goals**

- G1: Let a user see current waterlogging risk around any point in the city in under 3 seconds from page load.
- G2: Let a user get a hazard-aware route recommendation in under 10 seconds from entering two locations.
- G3: Explain every risk score and route recommendation in plain language, with evidence and uncertainty stated.
- G4: Build trust through provenance labels, verification status, freshness timestamps and insufficient-data warnings.
- G5: Provide a polished, premium experience (Apple/Linear/Stripe-grade) that works on mobile and desktop.
- G6: Ship a demoable product that works with zero live flood feed, then scale to real data sources.

**Non-goals (MVP)**

- Official emergency alerts or evacuation guidance (we link to official authorities instead).
- Hydrological flood prediction or inundation modelling.
- Turn-by-turn navigation. FloodSense plans and compares routes and then hands off to the user's navigation app via deep links.
- Native mobile apps (a PWA covers mobile in MVP).
- Guaranteed accuracy of user reports. We label confidence, we do not certify it.

### 1.5 Success Metrics

| Metric | Target (MVP) | Target (Production) | How measured |
| --- | --- | --- | --- |
| Time to first meaningful map render | < 2.5 s on 4G | < 2 s | Web Vitals (LCP) |
| Route comparison success rate | > 95% of requests return at least 1 route | > 98% | API logs |
| Route-to-result latency (p75) | < 8 s | < 5 s | Client timing |
| Users who view a risk explanation | > 40% of sessions | > 50% | Analytics event `risk_explanation_viewed` |
| Users who choose a lower-hazard route | > 30% of route sessions where one exists | > 40% | Event `route_selected` vs. fastest |
| Reports submitted per 100 active users (weekly) | 3 | 8 | DB |
| Reports corroborated within 60 min | > 25% | > 40% | DB |
| Duplicate report rate caught before submit | > 70% of true duplicates | > 85% | Moderation sampling |
| AI classification agreement with human label | > 80% | > 90% | Weekly sample audit |
| Weekly retention during rainy season | 25% | 35% | Cohort analytics |
| Trust score (survey: 'I understand how reliable this data is') | > 4.0 / 5 | > 4.3 / 5 | In-app micro survey |
| Lighthouse (mobile) Performance / Accessibility | 85 / 95 | 90 / 100 | CI |

---

## 2. User Personas

### Persona 1: Priya, the Daily Commuter (Primary)

- **Profile:** 29, product analyst, rides a scooter 14 km each way, checks her phone before leaving.
- **Goals:** Know before leaving if her usual road is waterlogged. Get a safe alternative without adding 40 minutes.
- **Pain points:** Weather apps do not show street-level flooding. WhatsApp groups are noisy. Her navigation app routed her through a flooded underpass last monsoon.
- **What she needs from FloodSense:** A fast route comparison with a clear 'Safer route, +6 min' recommendation and visible hazards.
- **Key screens:** Route Planner, Live Map.

### Persona 2: Imran, the Delivery Rider / Fleet Dispatcher (Primary)

- **Profile:** 34, dispatches 25 riders across several wards from a laptop.
- **Goals:** Re-route riders around blocked roads, protect riders and goods, keep delivery times honest.
- **Pain points:** No aggregated view; riders report conditions by phone; no way to see which areas are repeatedly flooded.
- **What he needs:** Desktop-optimised map with filters, hotspot list, route hazard scores he can compare in bulk later (P2).
- **Key screens:** Live Map (desktop), Analytics Dashboard.

### Persona 3: Meera, the Community Reporter (Secondary)

- **Profile:** 41, resident-welfare-association volunteer.
- **Goals:** Warn neighbours quickly, show authorities that a spot floods repeatedly.
- **Pain points:** Reports vanish in chat groups; no recognition that a report mattered; photo evidence is scattered.
- **What she needs:** A 30-second report flow with GPS and photo, confirmation that it was received, and a visible status (corroborated, resolved).
- **Key screens:** Report flow, Live Map, My Reports.

### Persona 4: Arjun, the Civic Analyst (Secondary, future B2B)

- **Profile:** 36, works for a civic-tech NGO / municipal data cell.
- **Goals:** Identify recurring hotspots, justify drainage investment, compare rainfall to incident volume.
- **Pain points:** Data is fragmented, unstructured and not geocoded.
- **What he needs:** Dashboard with area-wise distribution, hotspot ranking, trend charts, data freshness and exports (P2).
- **Key screens:** Analytics Dashboard.

### Persona 5: Demo Evaluator (Meta)

- **Goals:** Understand the product in two minutes and see all connected pieces working.
- **Needs:** Clearly labelled demo data, a one-click scripted demo scenario ('Heavy rain scenario') and a stable fallback if APIs fail.

---

## 3. Functional Requirements

### 3.0 Shared Definitions (used by all modules)

**Risk categories** (location or route level, derived from a 0 to 100 score)

| Category | Score | Color token | Icon (never color-only) |
| --- | --- | --- | --- |
| Low | 0 to 33 | `--risk-low` #34C759 | Check-circle |
| Moderate | 34 to 66 | `--risk-moderate` #FF9F0A | Alert-triangle |
| High | 67 to 100 | `--risk-high` #FF3B30 | Octagon-alert |
| Unknown / Insufficient data | n/a | `--risk-unknown` #8E8E93 | Help-circle (dashed outline) |

**Incident severity** (per incident, based on reported or estimated depth)

| Severity | Depth guide | Meaning |
| --- | --- | --- |
| Minor | < 15 cm | Ankle-deep, passable, slow |
| Moderate | 15 to 40 cm | Shin to knee, two-wheelers and small cars at risk |
| Severe | > 40 cm | Impassable for most vehicles |

**Verification status**

| Status | Rule |
| --- | --- |
| Demo | From the labelled demo dataset. Always shown with a 'Demo data' tag. |
| Unverified | Single user report without corroboration. |
| Corroborated | At least 2 independent reports within 150 m and 60 min, or 1 report with a photo that passes AI plausibility check. |
| Verified | Confirmed by a moderator or a trusted partner feed. |
| Resolved | Marked cleared by the reporter, moderator, or by corroborated 'clear' reports. |
| Expired | No confirmation within the TTL (default 6 h). Hidden by default. |

**Data provenance types:** `demo`, `user`, `partner` (future feed), `weather_model` (Open-Meteo).

**Freshness rule:** any datum shown to the user shows 'Updated N min ago'. Data older than its freshness budget (weather 30 min, incidents 6 h, routes 5 min) is visually flagged as stale.

**Data mode switch (global):** `Live + Community` | `Demo` | `Both`. Default in production is `Live + Community`. Default in the hackathon build is `Both` with a persistent demo banner. A single `DATA_MODE` environment default and a user-level toggle (P0) control this.

---

### 3.1 Live Flood and Waterlogging Map (P0)

**Purpose:** The home screen. Shows incidents, risk, rainfall context and lets users search and filter.

#### User Stories

- US-MAP-01: As a commuter, I want to see waterlogged locations on a map so I can avoid them.
- US-MAP-02: As a user, I want color-coded markers so I can judge risk at a glance.
- US-MAP-03: As a user, I want to tap a marker and see depth, severity, source, verification and last update.
- US-MAP-04: As a user, I want to filter by risk level to reduce noise.
- US-MAP-05: As a user, I want to search for a place and jump the map there.
- US-MAP-06: As a user, I want to see current rainfall for the area I am viewing.
- US-MAP-07: As a tester/demo viewer, I want demo flood data so I can use the app with no live feed.

#### User Flow

1. User opens `/`. Skeleton map shell appears instantly (< 300 ms), tiles load progressively.
2. App resolves initial viewport: last viewed viewport (local storage) > geolocation (if previously granted) > city default centre.
3. Incidents for the viewport load from `GET /api/incidents?bbox=...`. Markers animate in (staggered fade/scale, max 400 ms total).
4. Rainfall chip loads for the viewport centre from the weather module.
5. User pans/zooms. After 400 ms of idle (debounced) incidents refetch for the new bbox.
6. User taps a marker. Detail panel opens (side panel on desktop, bottom sheet on mobile) and the marker enters a 'selected' state.
7. From the panel the user can: 'Plan route avoiding this', 'Report update', 'View analysis' (AI explanation), 'Share'.

#### Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-MAP-01 | Render an interactive Leaflet map using OpenStreetMap-derived tiles through a **tile-provider abstraction** (`TILE_PROVIDER` config). Default provider for development: OSM standard tiles. Production provider: a commercial or self-hosted provider, because the OSM tile policy prohibits heavy production use. Attribution is always visible. | P0 |
| FR-MAP-02 | Support zoom (scroll, pinch, +/- controls), pan (drag), keyboard navigation (arrow keys, +/-) and a 'locate me' button. Min zoom 10, max zoom 19. Map is bounded to a configurable city-region bounding box with a soft bounce. | P0 |
| FR-MAP-03 | Draw one marker per incident, color by **risk category** of the incident (see 3.3 for score), and shape/icon by severity so meaning is not color-only. Selected marker scales 1.15x with a ring. | P0 |
| FR-MAP-04 | Cluster markers when more than 8 overlap (Leaflet.markercluster). Cluster bubble color equals the highest risk inside; label shows count. Clicking a cluster zooms to its bounds. | P0 |
| FR-MAP-05 | Incident detail panel shows: title, location name (reverse geocoded or user-entered), risk category + score, severity, reported depth (or 'Not reported'), description, photo thumbnail if present, provenance tag, verification status, number of corroborating reports, first reported time, **last updated timestamp** (absolute + relative), and AI explanation summary (lazy loaded). | P0 |
| FR-MAP-06 | Reported depth is displayed in cm with a plain reference ('about knee height'). When absent: 'Depth not reported'. When estimated by AI: label 'Estimated by AI' with an info tooltip. | P0 |
| FR-MAP-07 | Filter bar: risk level multi-select chips (Low, Moderate, High, Unknown), plus 'Include resolved/expired' toggle and data-source filter (Demo / Community). Filters persist in the URL query string for shareable views. Chips show live counts. | P0 |
| FR-MAP-08 | Search box using a geocoder (Nominatim through the backend proxy, with caching and 1 req/s throttling to respect usage policy). Debounce 350 ms, minimum 3 characters, shows up to 5 suggestions with keyboard navigation. Selecting a result flies the map there (animation 600 ms) and drops a temporary pin. | P0 |
| FR-MAP-09 | Rainfall context chip (top of map): current intensity label, mm/h and 'next 3 h' trend arrow for the viewport centre. Tapping opens the weather drawer (3.2). | P0 |
| FR-MAP-10 | Optional **rain intensity overlay** (toggle, P1): sample a 5x5 grid across the viewport using one batched Open-Meteo multi-coordinate request, render as translucent colored cells. Cached per grid cell for 10 min. | P1 |
| FR-MAP-11 | Auto-refresh incidents every 60 s while the tab is visible and pause when hidden. A subtle 'Updated just now' indicator pulses on refresh. Manual refresh button. | P0 |
| FR-MAP-12 | Marker recency styling: markers older than 3 h render at 70% opacity, older than 6 h are Expired and hidden unless the filter is on. | P1 |
| FR-MAP-13 | Legend (collapsible) explains colors, severity icons, verification badges and demo tag. Open by default on first visit, remembered afterwards. | P0 |
| FR-MAP-14 | Demo data: ship a local JSON dataset of 30 to 60 incidents across 8 to 12 areas, with varied severity, ages, verification states and a few duplicates/conflicts to exercise AI comparison. A 'Demo data' badge is on every demo marker and a persistent banner appears whenever demo data is visible. A 'Run heavy-rain scenario' button (P1) shifts timestamps and raises severities to demonstrate the full flow. | P0 |
| FR-MAP-15 | Map theme toggle: Light (default) and Dark map (CARTO Dark Matter-style tiles or equivalent). Marker colors are re-tuned for dark backgrounds to maintain 3:1 contrast. | P0 |
| FR-MAP-16 | Deep linking: `/?lat=..&lng=..&z=..&incident=<id>&risk=high,moderate`. | P1 |
| FR-MAP-17 | Optional OSM context (P2): through the Overpass API, highlight underpasses and low-lying road features (`tunnel=yes`, `layer<0`, `bridge` contexts) as 'historically sensitive' points of interest, cached for 24 h. | P2 |

#### Validation

- Bounding box must be valid (south < north, within city bounds expansion of 50%). Reject otherwise with 400.
- Search query: trimmed, 3 to 100 chars, stripped of control characters.
- Query-string filters: whitelist values, ignore unknown.

#### Edge Cases

- **No incidents in viewport:** show the empty state and offer 'Zoom out' and 'Report waterlogging'.
- **Very dense areas (> 500 incidents):** server returns clustered aggregates beyond zoom threshold; client virtualizes marker layers (canvas renderer) at high counts.
- **Overlapping identical coordinates:** spiderfy on click.
- **Geolocation denied or unavailable:** fall back to city centre, show a non-blocking toast with a 'Search a place instead' action.
- **User outside the supported city:** map centres on the nearest supported city, with an info banner.
- **Tile load failure:** show a neutral grey background with a 'Map tiles unavailable, retrying' notice and retry with exponential backoff.
- **Offline:** show last cached incidents with an 'Offline, showing saved data from HH:MM' banner (service worker, P1).
- **Conflicting reports at the same place (one 'flooded', one 'clear'):** show the most recent with a 'Conflicting reports' badge. The AI comparison (3.3) explains the conflict.
- **Timestamp in the future / clock skew:** clamp to server time.

#### States

| State | Behaviour |
| --- | --- |
| **Loading** | Map frame with shimmer skeleton, filter bar skeleton chips, panel skeleton lines. Markers appear after data, never a blank spinner. |
| **Empty** | Illustration (calm water drop) + 'No waterlogging reported here. That does not guarantee roads are clear.' + actions. |
| **Error (incidents API)** | Inline banner: 'Couldn't load incidents. Showing last known data.' + Retry. If no cache: fall back to the demo dataset only when Data mode includes Demo, otherwise show an error state. |
| **Partial** | Weather fails but incidents load: map works, rainfall chip shows 'Rainfall unavailable' with retry. |

---

### 3.2 Weather and Rainfall Monitoring (P0)

**Purpose:** Provide trustworthy rainfall context that feeds both the UI and the risk engine. Source: **Open-Meteo Forecast API** (no key required for non-commercial use. A commercial plan or self-hosting is required for production SaaS use, see Roadmap).

#### User Stories

- US-WX-01: As a user, I want current weather and rainfall for the location I am looking at.
- US-WX-02: As a user, I want to know if rain is getting heavier or lighter in the next hours.
- US-WX-03: As a user, I want recent rainfall history so I understand why an area is flooded.
- US-WX-04: As a user, I want a simple rainfall-based risk indicator.
- US-WX-05: As a user, I want to see how fresh the weather data is and be told when it fails.

#### User Flow

1. Rainfall chip on map shows intensity for the viewport centre.
2. Tap opens the **Weather Drawer** (right drawer on desktop, bottom sheet on mobile) with: current conditions card, 24 h hourly rainfall bar chart (past 6 h + next 18 h, with 'Now' marker), rainfall accumulation tiles (1 h, 3 h, 24 h), temperature and humidity, risk indicator, timestamp.
3. User changes location via search or by tapping 'Use map centre / my location / selected incident'. Drawer updates with a crossfade.

#### Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-WX-01 | Fetch weather via the backend weather service (not directly from the browser) with parameters: `current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m`, `hourly=precipitation,precipitation_probability`, `minutely_15=precipitation` (when available), `past_hours=24`, `forecast_hours=24`, `timezone=auto`. | P0 |
| FR-WX-02 | Normalise Open-Meteo output into the internal `WeatherSnapshot` model (see Data Models), converting null/missing values to explicit `null` + `availability` flags. | P0 |
| FR-WX-03 | **Rainfall intensity classification** (configurable, mm/h): None (0), Light (0.1 to 2.4), Moderate (2.5 to 7.5), Heavy (7.6 to 15), Very heavy (15.1 to 30), Extreme (> 30). Label + icon + color on every rainfall display. | P0 |
| FR-WX-04 | Show temperature (C), humidity (%), 'feels like', weather icon and a one-line summary (for example 'Heavy rain, easing after 17:00'). | P0 |
| FR-WX-05 | Hourly forecast chart: bars for precipitation (mm), line for precipitation probability, with the intensity color scale and tooltip on hover/tap. Past hours styled as solid, forecast as hatched. | P0 |
| FR-WX-06 | Recent history: 24 h accumulated rainfall and a 'last 3 h' tile. Past data is model-derived (reanalysis/short-term model), so label it 'Model estimate, not a gauge reading'. | P0 |
| FR-WX-07 | **Rainfall-based risk indicator** (`rainRiskIndex`, 0 to 100): `0.45*norm(intensity_1h) + 0.25*norm(accum_3h) + 0.15*norm(accum_24h antecedent) + 0.15*norm(forecast_next_3h_peak)`, each normalised against configurable saturation values (default 30 mm/h, 60 mm/3 h, 120 mm/24 h, 30 mm/h). Bucketed into the shared risk categories. This feeds the AI risk score (3.3). Weights are config, not code. | P0 |
| FR-WX-08 | Display 'Weather updated HH:MM' (provider `current.time`) **and** 'Fetched N min ago'. If the provider time is older than 30 min, flag as stale. | P0 |
| FR-WX-09 | Weather by location: accepts lat/lng (rounded to 2 decimals for caching, roughly 1 km cells). Supports map centre, a searched place, GPS location, or a selected incident. | P0 |
| FR-WX-10 | Handle API failure: timeout 6 s, 2 retries with jittered backoff (500 ms, 1500 ms), then serve cached snapshot up to 2 h old with a 'Showing older data' notice, then show an error state. Never show zeros in place of missing data. | P0 |
| FR-WX-11 | Unit settings (mm vs inches, C vs F) stored in user preferences (P2). | P2 |
| FR-WX-12 | Rainfall alerts (P2): opt-in notification when forecast intensity for saved places reaches Heavy within 3 h. | P2 |

#### Validation

- `lat` in \[-90, 90\], `lng` in \[-180, 180\], numeric. Reject otherwise.
- Provider response schema validated (zod). Unexpected shapes are logged and trigger the fallback path.
- Reject values outside plausible ranges (precipitation < 0 or > 300 mm/h, humidity outside 0 to 100) and treat as missing.

#### Edge Cases

- 15-minute data is unavailable for the region: fall back to hourly and label 'Hourly resolution'.
- Forecast says rain but no incident reported: the UI shows rain risk with 'No incident reports yet' instead of implying flooding.
- Time zone mismatch between the user and the city: all times shown in the **city's** timezone with the zone label if the user is elsewhere.
- Rapid location changes: cancel in-flight requests (AbortController) and ignore stale responses.
- Rate limiting (HTTP 429): serve cache and back off, surfacing no error if the cache is fresh.

#### States

| State | Behaviour |
| --- | --- |
| **Loading** | Skeleton cards for current conditions, chart placeholder with shimmering bars, tiles as skeleton rectangles. |
| **Empty (no rain)** | Positive empty state: 'No rain right now' with next-24 h outlook. Risk indicator shows Low. |
| **Error** | Card-level error with cause ('Weather service is not responding') + Retry + 'Last good data from HH:MM' if available. |
| **Partial** | Missing fields show an em-dash with a tooltip 'Not available for this location'. |

---

### 3.3 AI Flood Risk Analysis (P0)

**Purpose:** Turn weather data and incident reports into understandable, evidence-based insight. **Design principle: hybrid intelligence.** A deterministic scoring engine computes the numeric risk score (testable, reproducible, explainable). Gemini performs language tasks only: classify descriptions, suggest severity, compare reports, and write explanations from structured evidence. Gemini never invents data and never silently overrides the score.

#### User Stories

- US-AI-01: As a user, I want to know why a location is rated High so I can trust the rating.
- US-AI-02: As a user, I want to be warned when a report is unverified or old.
- US-AI-03: As a user, I want to be told when there is not enough data, instead of a falsely reassuring 'Low'.
- US-AI-04: As a reporter, I want my free-text description automatically categorised so reporting is fast.
- US-AI-05: As an analyst, I want multiple reports at one place compared and summarised.

#### Risk Score Specification (deterministic engine)

For an incident or a location cluster `c` at time `t`:

`score = 100 * ( 0.35*S + 0.25*R + 0.15*T + 0.15*C + 0.10*H )`

| Term | Name | Definition |
| --- | --- | --- |
| S | Severity | Minor 0.35, Moderate 0.65, Severe 1.0. If depth in cm is known, use `clamp(depth/60, 0.2, 1)` instead. Uses the highest severity among non-expired reports, weighted toward the most recent. |
| R | Rain context | `rainRiskIndex / 100` from 3.2 (viewport/incident location). If weather unavailable, R is omitted and the remaining weights are renormalised, with confidence lowered. |
| T | Recency | `0.5 ^ (ageHours / 2)` using the latest report time (2-hour half-life). |
| C | Corroboration | 1 report 0.4, 2 reports 0.7, 3+ reports 1.0. Verified 1.0. Demo data fixed at 0.7. |
| H | Hotspot history | `min(1, incidentsWithin200mLast30d / 5)`. P1. Zero before enough history exists. |

All weights live in config (`riskConfig.ts`) and are unit-tested with fixtures. The engine also emits a **confidence** value (High / Medium / Low) based on data completeness: number of reports, presence of depth, weather availability, verification, and recency.

**Insufficient data rule:** return category `Unknown` (never Low) when any of: no incident within 300 m and weather unavailable; the only report is Unverified and older than 3 h with no rain data; the location is outside the covered city.

#### AI Tasks (Gemini)

| Task | Input | Output (strict JSON schema) |
| --- | --- | --- |
| **T1 Classify report** | Description text, optional user severity, optional depth, language | `category` (enum: street\_waterlogging, underpass\_flooding, drain\_overflow, low\_lying\_area, road\_closed, vehicle\_stalled, other), `suggestedSeverity`, `extractedDepthCm` or null, `confidence` 0 to 1, `flags[]` (possible\_spam, off\_topic, duplicate\_likely, contradicts\_user\_severity), `language` |
| **T2 Explain risk** | Score breakdown, rain snapshot, incident evidence list with ids, ages, verification | `headline` (max 90 chars), `explanation` (max 80 words), `keyFactors[]` (each references an evidence id), `caveats[]`, `recommendedAction` |
| **T3 Compare reports** | 2 to 10 reports at/near one place | `agreement` (consistent, mixed, conflicting), `summary`, `latestStateAssessment`, `conflictNotes[]` |
| **T4 Route summary** | Route metrics and hazard list (see 3.4) | `recommendation`, `summary` (max 60 words), `tradeoff`, `caveats[]` |

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-AI-01 | Call Gemini only from the backend. Use JSON-mode / response schema, temperature <= 0.3, and a configurable model name (`GEMINI_MODEL`). Validate every response with zod. On schema failure retry once, then fall back to the template explanation (FR-AI-09). | P0 |
| FR-AI-02 | **Incident description analysis (T1)** runs asynchronously on report submit and on demo-data load (pre-computed and cached for demo). Results are shown as editable suggestions in the report form and stored with the incident. | P0 |
| FR-AI-03 | Automatic categorisation shows a category chip with an 'AI suggested' tag. Users can override. Overrides are stored for later quality evaluation. | P0 |
| FR-AI-04 | **Suggested severity** displays beside the user's choice only when they differ, for example 'AI suggests Severe from your description. Keep Moderate or switch?'. | P0 |
| FR-AI-05 | Risk score (0 to 100) and category (Low/Moderate/High) display immediately from the deterministic engine, with a **score breakdown** (five horizontal bars for S, R, T, C, H). The AI explanation (T2) loads after, with a skeleton, and is cached per `(locationCell, evidenceHash)` for 5 min. | P0 |
| FR-AI-06 | Every AI explanation includes: what the evidence is (counts, ages, sources), why the score is what it is, what is uncertain, and what to do. It must reference only the supplied evidence ids. Server rejects outputs that cite ids not in the input. | P0 |
| FR-AI-07 | **Recency analysis:** each evidence row shows age with a freshness chip (Fresh < 1 h, Recent < 3 h, Aging < 6 h, Stale >= 6 h). Stale-only locations get a 'Conditions may have changed' warning. | P0 |
| FR-AI-08 | **Warnings (always visible, not hidden in tooltips):** *Unverified report* (amber banner: 'Reported by one user and not yet confirmed'); *Demo data* (blue tag); *Insufficient data* (grey banner with the specific reasons: 'No recent reports nearby', 'Rainfall data unavailable'); *Conflicting reports* (amber banner). | P0 |
| FR-AI-09 | **Fallback without AI:** a template-based explanation is generated deterministically from the score breakdown ('High risk because a Severe report was made 20 min ago and heavy rain (14 mm/h) is falling.'). UI shows no error, only a small 'Basic explanation' label and a retry-AI link. | P0 |
| FR-AI-10 | **Multiple report comparison (T3):** when 2 or more reports exist within 150 m and 3 h, show a 'Reports at this location' list sorted by recency plus the AI comparison summary. | P1 |
| FR-AI-11 | Prompt-injection defence: user text is inserted only inside clearly delimited data blocks, system instructions state that content in data blocks is untrusted data, output is schema-validated, and any output containing URLs or instructions is discarded. | P0 |
| FR-AI-12 | PII: strip phone numbers and emails from descriptions before sending to Gemini and before public display. | P1 |
| FR-AI-13 | Cost control: per-IP and global AI quotas, response cache, batching of T1 calls (up to 5 reports per call), 8 s timeout. | P0 |
| FR-AI-14 | Evaluation harness: golden set of 100 labelled reports, run in CI against prompts to track category accuracy and severity agreement. | P1 |

#### Edge Cases

- Description in Hindi, Marathi or mixed language: T1 detects language, returns English category enums, and keeps the original text. The explanation is generated in the UI language (English in MVP).
- Description contradicts user severity (user selects Minor, text says 'water up to my waist'): flag `contradicts_user_severity`, suggest the higher severity, never auto-change.
- Gemini returns low confidence (< 0.5): treat suggestion as hidden, ask the user to choose manually.
- All reports Expired or Resolved but heavy rain is falling: show 'No active reports. Heavy rain may cause new waterlogging' (Moderate rain-only context, labelled as rainfall-based).
- Rate-limited or quota exceeded: silent fallback to template with a subtle notice.

---

### 3.4 Smart Route Planner (P0)

**Purpose:** Compare road routes by time and flood-hazard exposure and recommend the safest sensible one. Stack: **OSRM** (routes), **Turf.js** (geometry and proximity), **Gemini** (summary), plus the incident store.

> OSRM's public demo server is for demos only. Production requires a self-hosted OSRM instance (Docker, regional OSM extract) behind the backend. The client never calls OSRM directly.

#### User Stories

- US-RT-01: As a commuter, I want to search a start and destination and see route options.
- US-RT-02: As a commuter, I want each route's time, distance and flood hazard compared side by side.
- US-RT-03: As a commuter, I want to see exactly where on a route the waterlogging is.
- US-RT-04: As a commuter, I want the app to find a route that avoids known hazards when possible.
- US-RT-05: As a commuter, I want a plain-language recommendation and to know if the information is out of date.

#### User Flow

1. User opens the Route Planner (`/routes`, or the Routes tab/sheet). Fields: **From** (with 'Use my location'), **To**, swap button, optional 'Depart now' (fixed for MVP).
2. User selects suggestions from geocoder autocomplete. When both are set, the planner automatically requests routes.
3. Skeleton route cards appear. Within seconds, 2 to 4 routes render on the map (selected one bold, others muted), hazards appear as markers on the route, hazardous segments are drawn as thick red/amber overlays.
4. A comparison list shows route cards with badges: **Fastest**, **Safest**, **Recommended**. The AI summary appears above the cards.
5. User taps a card to select it. Map fits bounds. Hazard list for that route opens with each hazard's distance along the route.
6. 'Open in Maps' hands off via deep link (Google Maps / Apple Maps / OSM) with the selected route's waypoints.

#### Algorithm

1. **Fetch candidates:** `GET /route/v1/driving/{lng,lat;lng,lat}?alternatives=3&overview=full&geometries=geojson&steps=false`. Treat OSRM as returning 1 to 3 routes.
2. **Load hazards:** incidents (non-expired, in the route corridor bounding box plus 1 km) via the incident service.
3. **Score each route** with Turf.js (below).
4. **Hazard-avoiding candidates (when the best route has Moderate or High exposure):** for each high-impact hazard on the best route, generate up to 2 via-points offset 300 to 600 m perpendicular to the route (using `turf.destination`), snapped by OSRM `nearest`, then request `route/v1/driving/start;via;end`. Cap at 4 extra OSRM calls. Discard routes whose geometry overlaps an existing route by more than 90% of length (shared-length check with `turf.lineOverlap`) or that are more than 1.6x the fastest duration.
5. **Rank** by `cost = durationMinutes + 0.4 * exposureScore`. Hard rule: a route passing through a **Severe, Corroborated or Verified** hazard is flagged 'Not recommended' unless all routes do.
6. **Label:** Fastest (min duration), Safest (min exposure, ties by duration), Recommended (min cost). One route can hold several labels.

#### Hazard Exposure Score

- Buffer each hazard by a severity-based radius: Minor 50 m, Moderate 75 m, Severe 120 m (`turf.buffer`).
- A hazard affects a route if the route line intersects its buffer (`turf.booleanIntersects`). Compute the affected segment with `turf.lineSlice` / `turf.lineIntersect`, record `startKm`, `endKm`, `lengthM`.
- `impact_h = (riskScore_h / 100) * proximityFactor`, where `proximityFactor = 1` if the route passes within 30 m of the hazard and falls linearly to 0.3 at the buffer edge.
- **Exposure score = `100 * (1 - Π(1 - impact_h))`**, a saturating union so many small hazards cannot exceed 100. Category thresholds are the shared Low/Moderate/High bands. Zero known hazards yields **Low with caveat** 'No known hazards. Data may be incomplete'. If incident data is unavailable it yields Unknown, never Low.

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-RT-01 | Start and destination search with geocoder autocomplete (same debounce and caching as FR-MAP-08), 'Use my location' (permission-gated), swap, clear, and tap-on-map selection. | P0 |
| FR-RT-02 | Interactive route selection: tapping a route line or card selects it. Selected route is 6 px, others 4 px at 60% opacity. Hover (desktop) highlights the matching card and vice versa. | P0 |
| FR-RT-03 | Alternative route comparison table/cards: distance (km), duration (min), delta vs fastest (+N min), hazard count, exposure score and category, longest hazardous stretch. | P0 |
| FR-RT-04 | Show waterlogging locations along each route with distance-from-start markers ('2.4 km'), severity icon, verification and age. | P0 |
| FR-RT-05 | Highlight hazardous segments using a distinct overlay (stroke-dasharray pattern plus color so it is not color-only). | P0 |
| FR-RT-06 | Hazard-avoiding route generation per the algorithm above, shown as 'Avoids N hazards' with the time cost. If no better route exists: 'No safer route found. Consider delaying or taking transit.' | P0 |
| FR-RT-07 | **AI route comparison summary (T4)**, at most 60 words, for example 'Route B adds 7 min but avoids the Andheri subway hazard (Severe, corroborated 25 min ago).' Numbers are injected from computed values and the server verifies that every number in the AI text matches the input. Fallback is a template summary. | P0 |
| FR-RT-08 | **Update status bar:** 'Routes computed 14:02 | Hazards checked 14:05 |
| FR-RT-09 | Route visualization: start/end pins, fitBounds with padding for panel overlap, animated polyline draw (500 ms), direction chevrons every 500 m (P1). | P0 |
| FR-RT-10 | Shareable URL: `/routes?from=lat,lng&to=lat,lng&r=2`. | P1 |
| FR-RT-11 | Vehicle profile selector (Car, Two-wheeler) adjusting the severity weights and radius (two-wheelers are more sensitive to Moderate depth). | P2 |
| FR-RT-12 | Save favourite routes and get notified when hazards appear (requires accounts). | P2 |

#### Validation and Edge Cases

- Start and destination must differ (> 200 m apart). Inside the service area (soft limit: warn, hard limit: reject beyond 150 km).
- If a geocoded point snaps more than 500 m to the road network, show 'Start snapped to nearest road, 640 m away'.
- OSRM `NoRoute`: 'No driving route found between these points'.
- OSRM timeout or 5xx: 2 retries (400 ms, 1200 ms), then error state with Retry. If the hazard service fails but routes succeed, show routes with a banner 'Hazard data unavailable, exposure scores not shown' and mark every exposure Unknown.
- Only one route returned: still show hazards and run avoidance generation.
- All routes High: banner 'All routes pass flooded areas', recommend the lowest exposure, and offer 'Check again in 30 min'.
- User changes inputs mid-request: abort in-flight calls.
- Hazards near the start or destination (within 150 m): flagged separately as 'Hazard at your start/destination'.

#### States

| State | Behaviour |
| --- | --- |
| **Empty (no inputs)** | Illustrated prompt plus 'Try a sample route' (demo route that crosses demo hazards). |
| **Loading** | 3 skeleton route cards, map shows the pins and a pulsing line between them. |
| **Error** | Inline error with the cause and Retry. Preserves entered inputs. |

---

### 3.5 Flood Incident Reporting (P1)

**Purpose:** Capture on-the-ground waterlogging information that weather APIs cannot provide, in under 30 seconds, while protecting data quality.

#### User Stories

- US-RP-01: As a resident, I want to report waterlogging at a location with a photo so others can avoid it.
- US-RP-02: As a reporter, I want my GPS location filled in automatically but adjustable on the map.
- US-RP-03: As a reporter, I want to be told if someone has already reported the same spot so I can confirm instead of duplicating.
- US-RP-04: As a reporter, I want to see my report on the map immediately and track its status.
- US-RP-05: As a viewer, I want to quickly confirm that a spot is still flooded or has cleared.

#### User Flow (three steps, single modal on desktop, full-screen sheet on mobile)

1. **Where:** a mini map with a draggable pin. Pre-filled via GPS if permission is granted, otherwise centred on the current map view. Search box above. Reverse-geocoded address shown beneath ('Near Link Road, Andheri West').
2. **What:** severity selector (Minor / Moderate / Severe / Not sure) with illustrated depth references (ankle, knee, waist), a description field with placeholder 'What did you see? For example: water up to the knee, two-wheelers stuck', optional depth in cm, optional photo.
3. **Review:** summary card, duplicate check result, AI suggestions (category, severity), 'Happened earlier' selector (Now, 15 min, 30 min, 1 h, 3 h), consent line, Submit.
4. **Confirmation:** success state with animated check, 'Your report is live as Unverified', and a link to the incident on the map. Share button.

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-RP-01 | Entry points: persistent 'Report' button (FAB on mobile, primary button on desktop), incident panel 'Report update', long-press on map ('Report here'). | P1 |
| FR-RP-02 | Select location by map tap, pin drag, search, or GPS (`navigator.geolocation` with `enableHighAccuracy`, 8 s timeout). Permission is requested only after the user taps 'Use my location', with a one-line rationale before the browser prompt. | P1 |
| FR-RP-03 | Location must be inside the service-area polygon. GPS accuracy above 100 m shows 'Location is approximate, please adjust the pin'. | P1 |
| FR-RP-04 | Description: required, 10 to 500 characters, live counter, trimmed, links and phone numbers stripped on the server, profanity filtered. | P1 |
| FR-RP-05 | Severity: required (Not sure allowed and flagged for AI suggestion). Optional depth (0 to 300 cm integer). | P1 |
| FR-RP-06 | Photo upload: JPEG/PNG/WebP/HEIC, up to 8 MB before compression. Client resizes to max 1600 px and 85% quality, shows a preview with remove. Server accepts through a pre-signed upload, validates magic bytes, strips EXIF (after using EXIF GPS and timestamp only for a plausibility check against the claimed location and time), and generates 400 px and 1200 px WebP variants. Max 1 photo in MVP (3 in P2). | P1 |
| FR-RP-07 | AI categorisation (T1) runs on the Review step and populates category and severity suggestions (3.3). | P1 |
| FR-RP-08 | **Duplicate check:** server query for incidents within 120 m, last 90 min, same or similar category. Results shown as 'Already reported nearby' cards with 'Same spot, add my confirmation' (creates a corroboration, not a new incident) or 'Different spot'. Server-side enforcement also merges exact duplicates (same device, same cell, within 10 min). | P1 |
| FR-RP-09 | Verification lifecycle per 3.0. Initial status Unverified. Auto-promoted to Corroborated by a second independent device/session within 150 m and 60 min, or by a photo that passes the AI plausibility check (is it a plausible flood scene, no faces or plates shown large, no explicit content). | P1 |
| FR-RP-10 | Incident timestamp: server-set `createdAt`, plus user-provided `occurredAt` (max 6 h in the past, never in the future). Both shown in the detail panel. | P1 |
| FR-RP-11 | Submitted reports appear on the map immediately (optimistic UI) with a 'Pending' pulse until the server confirms. If rejected (for example spam), the marker is removed with an explanation toast. | P1 |
| FR-RP-12 | **Quick actions on any incident:** 'Still flooded' / 'It has cleared' / 'Not accurate', limited to one vote per device per incident per 30 min. Three independent 'cleared' votes mark it Resolved. | P1 |
| FR-RP-13 | 'My reports' view (device-scoped until accounts exist): list with status, age, corroborations and a 'Mark as cleared' action. | P1 |
| FR-RP-14 | Anonymous reporting allowed with a device token (signed, httpOnly cookie). Optional account later adds trust scores and recognition. Reporter identity is never shown publicly. | P1 |
| FR-RP-15 | Draft autosave in local storage for 30 min, restored if the modal closes accidentally. | P1 |
| FR-RP-16 | Offline queue: if offline, store the report locally and submit when back online with a 'Queued' status. | P2 |
| FR-RP-17 | Lightweight moderation queue (internal route `/admin/moderation`): list unverified and flagged reports, actions Verify / Reject / Merge / Mark resolved. | P1 |

#### Validation, Edge Cases and States

- Inline validation on blur and on submit, with the error summary focused for screen readers. Error text always says how to fix it.
- Photo too large or wrong type: 'This file couldn't be added. Try a JPEG or PNG under 8 MB.'
- Same user submitting more than 5 reports/hour or more than 20/day: blocked with a friendly rate-limit message.
- Report location far from the user's GPS (> 5 km): confirm 'You are far from this location. Submit anyway?'
- Duplicate-check failure does not block submission (fails open, flagged for server merge).
- Upload failure: retry with exponential backoff, allow submitting without the photo.
- **Loading:** submit button shows a progress state, the form is locked. **Empty (My reports):** 'You haven't reported anything yet' with a Report CTA. **Error:** preserves all inputs.

---

### 3.6 Flood Risk Analytics Dashboard (P1)

**Purpose:** Give analysts, dispatchers and curious residents a clear picture of where and when waterlogging happens, and how reliable the data is.

#### User Stories

- US-AN-01: As an analyst, I want headline counts of incidents and risk locations for a time window.
- US-AN-02: As an analyst, I want to see which areas and hotspots recur.
- US-AN-03: As a dispatcher, I want to compare how hazardous alternative corridors are.
- US-AN-04: As any user, I want to know how fresh and reliable the dashboard data is.

#### Global Controls

Time range (Last 24 h, 7 days, 30 days, Custom P2), area filter (multi-select from ward/neighbourhood list), data source filter (Community / Demo / Both), and an export button (CSV, P2). All filters sync to the URL.

| ID | Widget | Definition and behaviour | Priority |
| --- | --- | --- | --- |
| FR-AN-01 | **Stat cards (animated)** | Total reported incidents, High-risk locations, Moderate-risk locations, Active (non-expired) incidents. Count-up animation (600 ms, once per load, respects reduced motion), delta vs previous period (+12%) with a direction arrow. | P1 |
| FR-AN-02 | **Recent incident timeline** | Reverse-chronological feed (virtualized, infinite scroll) with severity dot, location, AI category, provenance, age. Click focuses the map at that incident. | P1 |
| FR-AN-03 | **Rainfall trend** | Area/line chart of hourly rainfall (mm) for the selected window at the city reference point, overlaid with incident counts per hour as bars (dual axis) to show the relationship. Tooltip syncs both series. | P1 |
| FR-AN-04 | **Area-wise distribution** | Horizontal bar chart (top 10 areas) of incident counts, segmented by severity, with a 'Show map' toggle that renders a choropleth. Click an area to cross-filter the dashboard. | P1 |
| FR-AN-05 | **Frequent hotspots** | Ranked table of recurring spots: location name, incident count, last incident, peak severity, average duration to resolve, trend sparkline. A hotspot is a cluster (grid cell or DBSCAN radius 150 m) with 3 or more incidents in 30 days. Sort by frequency x severity. | P1 |
| FR-AN-06 | **Severity distribution** | Donut or stacked bar with Minor / Moderate / Severe and percentages. Accessible data table alternative. | P1 |
| FR-AN-07 | **Route hazard comparison** | Pick a recent route comparison (or seeded popular corridors) and see a grouped bar chart of Fastest vs Safest route: duration and exposure score. In MVP this uses the user's session comparisons plus 5 seeded corridors. | P1 |
| FR-AN-08 | **Data source and freshness panel** | Table: Source (Community reports, Demo dataset, Open-Meteo, OSRM), last successful sync, status dot (Healthy, Delayed, Failed), record count. Anything stale shows an amber chip. | P1 |
| FR-AN-09 | **Sample size caveat** | If a chart is based on fewer than 10 data points, show 'Based on N reports. Interpret with caution.' | P1 |

**States:** *Loading:* skeleton cards and chart placeholders with shimmer. *Empty:* 'No incidents in this period' with suggestions to widen the range. *Error:* per-widget error with Retry (one failure never breaks the page). *Demo mode:* sticky blue 'Showing demo data' banner. Dashboard aggregates are precomputed server-side (materialised views refreshed every 5 min) and cached.

---

### 3.7 Premium User Experience (cross-cutting, P0 baseline)

Detailed screen specs are in Section 5 and accessibility rules in Section 12. The following requirements apply to every module.

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-UX-01 | Clean white theme by default with a restrained neutral palette, a single accent color, and risk colors reserved exclusively for risk semantics. | P0 |
| FR-UX-02 | Dark map option, independent of UI theme (Light UI + Dark map is allowed). Full dark UI theme follows system preference and a manual toggle (P1). | P0 / P1 |
| FR-UX-03 | Responsive layout: mobile (< 640 px), tablet (640 to 1023 px), desktop (>= 1024 px), wide (>= 1440 px). Touch targets >= 44 px. | P0 |
| FR-UX-04 | Skeleton loading for every async surface, error and empty states for every list/chart/panel, always with a next action. | P0 |
| FR-UX-05 | Motion: page transitions 200 to 280 ms, spring-eased panels, count-up stat cards, marker entrance, route draw animation. All respect `prefers-reduced-motion`. | P0 |
| FR-UX-06 | Always-available risk legend. | P0 |
| FR-UX-07 | Deliver `design.md`: a UI design specification in the repo containing design principles, color tokens (light, dark, risk, map), typography scale, spacing, radii, elevation, motion tokens, component specs, map styling, iconography, layout grids, state patterns and accessibility rules. It is the source of truth for the Tailwind theme and CSS variables. | P0 |

---

## 4. Information Architecture

### 4.1 Application Structure (sitemap)

```
FloodSense
├── /                     Live Map (home)
│   ├── Incident Detail (panel / sheet)
│   ├── Weather Drawer
│   ├── Report Flow (modal / sheet)
│   └── Legend, Filters, Search (map overlays)
├── /routes               Route Planner
│   ├── Route Comparison (panel / sheet)
│   └── Route Hazard Detail
├── /insights             Analytics Dashboard
├── /reports              My Reports
├── /about                About, data sources, how risk is calculated
├── /settings             Units, theme, data mode, map theme, privacy
└── /admin/moderation     Internal moderation queue (P1, role-gated)
```

### 4.2 Navigation

| Breakpoint | Pattern |
| --- | --- |
| Desktop (>= 1024 px) | Slim left rail (64 px, expands to 232 px on hover/pin) with icons + labels: Map, Routes, Insights, My Reports, About, Settings. A top-of-map floating bar holds search, filters and the weather chip. Command palette (`Cmd/Ctrl + K`) for search, jump to place, switch view, toggle theme. |
| Tablet | Left rail collapsed to icons only, panels slide over the map. |
| Mobile (< 640 px) | Bottom tab bar (Map, Routes, Insights, More) with a centred raised **Report** FAB on the Map and Routes screens. Detail content in draggable bottom sheets (three snap points: peek 20%, half 50%, full 92%). |

Global elements: **Data-mode badge** (visible when demo data is in use), **Last updated** indicator, **Theme/Map-theme toggle**, **Offline banner**.

### 4.3 Screen Inventory

| Screen | Route | Primary purpose | Priority |
| --- | --- | --- | --- |
| Live Map | `/` | Awareness, filtering, incident detail | P0 |
| Route Planner | `/routes` | Compare routes and hazards | P0 |
| Weather Drawer | overlay | Rainfall and forecast | P0 |
| Incident Detail | overlay | Evidence, AI explanation | P0 |
| Report Flow | overlay | Submit incident | P1 |
| Insights | `/insights` | Analytics | P1 |
| My Reports | `/reports` | Track own reports | P1 |
| About and Methodology | `/about` | Transparency on data and scoring | P1 |
| Settings | `/settings` | Preferences | P1 |
| Onboarding | modal on first visit | 3-card intro: what it shows, how to read risk, data honesty | P1 |
| 404 / Error | `*` | Recovery | P0 |
| Moderation | `/admin/moderation` | Review queue | P1 |

### 4.4 Layout Hierarchy

**Desktop map screen (z-order from back to front):** full-bleed map > rain overlay > markers > floating search/filter bar (top-left) > weather chip (top-center) > map controls (right: zoom, locate, layers, theme) > legend (bottom-left) > side panel (right, 400 px, overlays map with inset 16 px) > toasts (bottom-center) > modals.

**Mobile map screen:** full-bleed map > top search pill > filter chips (horizontal scroll) > right-edge map controls > bottom sheet (content) > tab bar > Report FAB.

**Content screens (Insights, About, Settings):** left rail + page container (max-width 1200 px, 24 px gutters desktop, 16 px mobile) with a page header (title, filters), then a 12-column grid of cards (12 / 8 / 4 spans).

---

## 5. UI/UX Specification

**Design direction:** a calm, premium, information-dense-but-quiet interface. Apple's clarity and depth (translucent panels, generous radii, SF-style typography), Linear's speed and keyboard-first feel, Stripe's data presentation and restraint, Arc's playful micro-interactions and sidebar, Notion's neutral surfaces and content-first hierarchy. The map is the hero. Chrome stays out of the way. **Color is reserved for meaning:** the only saturated colors on screen are the accent (actions) and the risk colors (data).

### 5.1 Design Tokens (full spec in `design.md`)

| Token group | Light | Dark |
| --- | --- | --- |
| Background | `--bg` #FFFFFF | `--bg` #0B0B0D |
| Surface (cards, panels) | `--surface` #F5F5F7, `--surface-raised` #FFFFFF | `--surface` #1C1C1E, `--surface-raised` #232326 |
| Border / hairline | `--border` #E5E5EA (1 px) | `--border` #2C2C2E |
| Text | `--text` #1D1D1F, `--text-muted` #6E6E73 | `--text` #F5F5F7, `--text-muted` #A1A1A6 |
| Accent | `--accent` #0071E3, hover #0077ED, pressed #0062C4 | `--accent` #2997FF |
| Risk fills | Low #34C759, Moderate #FF9F0A, High #FF3B30, Unknown #8E8E93 | Same hues, +8% lightness |
| Risk text variants (>= 4.5:1 on white) | Low #1E7B34, Moderate #9A5300, High #C4241B, Unknown #636366 | Light variants from fills |
| Info (demo tag) | #0A60C8 on #E8F1FD | #7DB7FF on #12253F |

**Typography:** `-apple-system, 'SF Pro Text', 'Inter', system-ui, sans-serif`. Scale (px): 12 caption, 13 small, 15 body, 17 emphasis, 20 title-3, 24 title-2, 32 title-1, 48 hero numerals. Numerals are tabular (`font-variant-numeric: tabular-nums`) for all measurements and times. Line height 1.4 body, 1.2 headings. Weights 400 / 500 / 600.

**Shape and depth:** radii 8 (inputs, chips), 12 (cards), 16 (panels), 24 (sheets), 999 (pills). Elevation: card hairline border plus `0 1px 2px rgba(0,0,0,0.04)`, floating panel `0 8px 32px rgba(0,0,0,0.12)` with `backdrop-filter: blur(20px) saturate(180%)` over `rgba(255,255,255,0.78)`. **Spacing:** 4 px base grid (4, 8, 12, 16, 24, 32, 48). **Iconography:** Lucide at 1.5 px stroke, 20 px default.

**Motion tokens:** `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`, durations 120 ms (micro), 200 ms (standard), 320 ms (panels), 600 ms (map fly-to). Reduced motion replaces transforms with opacity-only 100 ms fades.

### 5.2 Screen: Live Map (`/`)

**Layout (desktop):** left rail (64 px) + full-bleed map. Floating elements are inset 16 px from edges.

| Zone | Contents |
| --- | --- |
| Top-left | **Search bar** (360 px glass pill): search icon, placeholder 'Search a place or street', clear button, `Cmd K` hint. Suggestion dropdown (max 5 rows, recent searches under the input when empty). Below it: **Filter chips row**: `All`, `High`, `Moderate`, `Low`, `Unknown` (multi-select, each with a risk dot and count), a divider, then `Source` menu button and `Show resolved` toggle. |
| Top-center | **Weather chip**: weather icon, `Heavy rain 14 mm/h`, trend arrow, and `Updated 3 min ago` caption. Tap opens the Weather Drawer. A slim 2 px risk-colored underline reflects the rain risk indicator. |
| Top-right | **Data mode badge** when demo is active: blue pill `Demo data`, tap for a popover explaining it and a switch for data mode. |
| Right edge (vertical stack) | Zoom +/- segmented control, Locate me, Layers popover (Rain overlay, Hotspot heat, Resolved), Map theme (sun / moon). |
| Bottom-left | **Legend** card (collapsible): risk colors with icons and labels, severity glyphs, verification badges. |
| Bottom-right | **Report** primary button (pill, accent) with a `+` icon. |
| Right panel (on selection) | 400 px **Incident Detail panel** (see 5.3). |

**Markers:** 28 px circles with 2 px white stroke and soft shadow. Fill = risk color, inner glyph = severity (one, two, three drops). Unknown = grey dashed ring. Demo markers carry a tiny `D` corner badge. Selected = 36 px with a pulsing 12% accent halo. Clusters: 40 px circle, count in 600 weight, ring color = highest risk inside. Hover (desktop): scale 1.08 and a tooltip showing place name, risk and age.

**Micro-interactions:** markers fade/scale in staggered (20 ms each, capped at 400 ms). Filter chip tap animates counts and fades non-matching markers out in 200 ms before removal. Search suggestion hover highlights the matching place with a ghost pin on the map. Map `flyTo` uses 600 ms ease-out. The refresh indicator is a 12 px ring that fills over 60 s, and a manual refresh spins once.

**Mobile layout:** search pill at the top (full width minus 16 px margins), horizontal scrolling chips beneath, controls on the right edge, weather chip collapses into a compact pill under the search. Peek bottom sheet shows `N incidents in view | Highest risk: High` and can be dragged up to a scrollable list (virtualized) sorted by severity or distance. Report FAB is bottom-right above the tab bar.

### 5.3 Screen: Incident Detail (panel / bottom sheet)

**Layout (top to bottom):**

1. **Header:** close button, share, overflow menu (Report problem). Title (place name), subtitle (area, distance from you).
2. **Risk summary card:** large risk badge (icon + word + score, for example `High | 78`), confidence label (`Confidence: Medium`), score breakdown as five thin horizontal bars with labels (Severity, Rainfall, Recency, Corroboration, History) and an info icon linking to methodology.
3. **Warning banners:** Unverified, Demo data, Insufficient data, Conflicting reports, Stale (as applicable, stacked, each dismissible per session except Demo).
4. **AI analysis card:** headline in 17 px semibold, 80-word explanation, key factors as chips linking to evidence rows, caveats in muted text. Label `AI-generated from the evidence below`. Skeleton text lines while loading. Thumbs up/down feedback (P1).
5. **Facts grid (2 columns):** Severity, Reported depth (`Knee-high, about 35 cm`), Source (Community / Demo), Verification (badge), First reported, **Last updated** (`14:02, 6 min ago`), Corroborations (`3 reports`).
6. **Photo:** 16:9 rounded image with tap-to-zoom lightbox (focus-trapped), alt text from the AI caption.
7. **Reports at this location:** timeline list (virtualized if > 20). Each row: time, severity glyph, description excerpt, verification, 'Show more'.
8. **Rainfall context mini-card:** current mm/h, 3 h accumulation, sparkline.
9. **Action bar (sticky bottom):** `Route around this` (primary), `Still flooded` / `Cleared` (segmented), `Report update`.

**Interactions:** the panel slides in 320 ms with a spring. Selecting another marker crossfades content (160 ms) without closing. Esc closes. On mobile the sheet snaps and the drag handle has an accessible `button` alternative.

### 5.4 Screen: Weather Drawer

**Layout:** drawer (400 px right, or bottom sheet) titled with the location and a location switcher (`Map centre`, `My location`, `Selected incident`).

- **Hero card:** big temperature (48 px), weather icon, condition text, feels-like, humidity and wind in a 3-up grid.
- **Rain risk indicator card:** semicircular gauge (0 to 100) with the category word and a one-line explanation. Below it the intensity ladder (None to Extreme) with the current step highlighted.
- **Hourly chart (recharts or visx):** 24 bars (6 past, 18 forecast) colored by intensity, probability line, `Now` vertical marker, hover/tap tooltip, a keyboard-focusable data table toggle.
- **Accumulation tiles:** Last 1 h, Last 3 h, Last 24 h, Next 6 h.
- **Footer:** `Source: Open-Meteo | Weather updated 14:00 | Fetched 3 min ago`, with a Refresh icon button. Past data is labelled `Model estimate`.

**States:** skeleton versions of each card, a card-level error with Retry, and a stale banner after 30 min.

### 5.5 Screen: Route Planner (`/routes`)

**Layout (desktop):** 420 px left panel (inside the content area, beside the rail), map on the right. Panel sections: **Inputs** (From / To fields stacked with a connector line and a swap button, `Use my location` link), **AI summary card**, **Route cards list**, **Hazard list for the selected route**, and the **status bar** (pinned bottom of panel).

**Route card:** left color key and label badges (`Fastest`, `Safest`, `Recommended`), duration in 24 px (`32 min`), distance (`14.2 km`), delta (`+7 min`), exposure pill (`Hazard exposure: Low | 12`), hazard count with icons, mini route-profile bar (a horizontal bar of the route length with colored hazard segments). Selected card has a 2 px accent border and a soft glow. Expand chevron reveals the hazard list with distance markers.

**Map:** selected route is bold 6 px (accent color if safe, with hazardous sections overlaid in risk color and a dash pattern), alternatives are 4 px grey-blue at 60% opacity. Start pin is a filled circle, destination is a flag. Hazard markers on routes use the standard marker with a distance badge. Hovering a hazard row pulses its marker.

**Mobile:** inputs stay in a top card that collapses to a single line (`Home to Office`) after search. Route cards live in a bottom sheet with a horizontally snapping carousel in peek state and a vertical list at full height.

**Micro-interactions:** the route polyline draws in 500 ms, cards stagger in, swapping start/end rotates the swap icon 180 degrees, a toast announces `Safer route found, +7 min` when avoidance succeeds.

### 5.6 Screen: Report Flow (modal / sheet)

- **Container:** 560 px centered modal on desktop (scrim 40%, focus-trapped, Esc to close with an unsaved-changes confirm), full-screen sheet on mobile.
- **Header:** step indicator (3 dots with labels), close.
- **Step 1 Where:** 280 px mini map, draggable pin with a floating `Move pin` hint, address row, `Use my location` button, search field.
- **Step 2 What:** severity as three large selectable cards with depth illustrations (ankle, knee, waist) and a fourth `Not sure` text option. Textarea with counter. Optional depth stepper. Photo dropzone (drag-and-drop, camera capture on mobile) with preview and remove.
- **Step 3 Review:** summary card, duplicate suggestions, AI suggestion chips (`AI suggests: Underpass flooding | Severe`, accept or dismiss), `Happened` select, consent text, `Submit report` (primary, full width).
- **Success:** animated checkmark, `Thanks, your report is live as Unverified`, buttons `View on map` and `Done`.
- **Micro-interactions:** card selection scales 0.98 then 1, a subtle haptic on mobile where supported, the submit button morphs to a progress ring then a check.

### 5.7 Screen: Insights (`/insights`)

**Layout:** page header (title, time range segmented control, area select, source select, export), then a 12-column grid.

| Row | Cards |
| --- | --- |
| 1 | Four stat cards (3 columns each): large animated number, label, delta chip, tiny sparkline. |
| 2 | Rainfall trend with incident overlay (8 columns), Severity distribution (4 columns). |
| 3 | Area-wise distribution bar chart / choropleth toggle (6 columns), Frequent hotspots table (6 columns). |
| 4 | Recent incident timeline (6 columns, virtualized), Route hazard comparison (6 columns). |
| 5 | Data sources and freshness (12 columns, compact table). |

**Tables:** sticky header, sortable columns (aria-sort), row hover highlight, row click focuses the map at that spot. **Charts:** hairline gridlines, no chart borders, direct labels where possible, tooltips on hover/focus, accessible data table fallback. Mobile stacks cards in one column and tables become two-line list rows.

### 5.8 Screens: My Reports, Settings, About, Onboarding, Errors

- **My Reports:** list of cards with thumbnail, status badge, age, corroboration count and an overflow menu (`Mark cleared`, `Delete my report`). Empty state with a Report CTA.
- **Settings:** grouped sections (Appearance: UI theme, Map theme; Data: Data mode, Units; Privacy: location use, clear local data). Immediate-apply toggles with a subtle saved confirmation.
- **About and Methodology:** how risk scores work (with the formula in plain language), data sources and their limits (explicit note that Open-Meteo is weather data, not flood detection), verification rules, and demo data disclosure. This page is a core trust feature.
- **Onboarding (first visit):** 3 swipeable cards (See flooding, Plan safer routes, Know how reliable it is). Skippable and never shown again.
- **Errors:** 404 with a friendly illustration and `Back to map`. Global error boundary with `Reload`. Offline banner at the top.

### 5.9 Shared Component Behaviours

| Pattern | Spec |
| --- | --- |
| **Buttons** | Primary (accent fill, white text), Secondary (surface fill, hairline border), Ghost, Destructive. 40 px default / 32 px compact / 48 px large. Pressed scale 0.98. Loading state replaces label with a spinner and preserves width. |
| **Chips / filters** | 32 px pills, selected state uses a tinted fill plus a check glyph (not color alone). |
| **Inputs** | 44 px tall on touch, 12 px radius, visible label or `aria-label`, error state with icon + text below. |
| **Modals** | Focus trapped, scroll locked, scrim click closes (except while a form is dirty), return focus to the trigger. |
| **Drawers / sheets** | Right drawer on desktop, bottom sheet on mobile. Drag handle plus close button. Non-modal on the map (map remains interactive) except the Report flow. |
| **Tables** | Sticky header, 44 px rows, sortable, keyboard navigable, empty row state. |
| **Toasts** | Bottom-center, 4 s, pause on hover, `role=status`, with an optional action. Max 2 stacked. |
| **Tooltips** | 300 ms delay, keyboard focus triggers, never the sole carrier of information. |
| **Skeletons** | Match final layout exactly, 1.4 s shimmer, static under reduced motion. |

### 5.10 Dark Mode and Dark Map

- UI theme: Light (default), Dark, System. Switched with a 200 ms crossfade of tokens (no layout shift).
- Dark map is its own tile style and can be combined with either UI theme. Markers get a 2 px dark halo instead of a white stroke. Route lines switch to a brighter accent. Overlay panels use `rgba(28,28,30,0.78)` glass.
- All semantic colors are re-verified for contrast in dark (Section 12).

### 5.11 Responsive Behaviour Summary

| Aspect | Mobile | Tablet | Desktop |
| --- | --- | --- | --- |
| Navigation | Bottom tab bar | Icon rail | Rail with labels, command palette |
| Detail content | Bottom sheet (3 snaps) | Right drawer 360 px | Right panel 400 px |
| Route planner | Top card + bottom carousel | Left panel 360 px | Left panel 420 px |
| Insights grid | 1 column | 2 columns | 12-column grid |
| Map controls | Right-edge icons | Same | Same plus keyboard shortcuts |
| Hover states | Not used | Partial | Full |

**Keyboard shortcuts (desktop):** `/` focus search, `R` report, `F` filters, `L` legend, `D` dark map, `Esc` close, `Cmd/Ctrl K` palette.

---

## 6. Technical Architecture

### 6.1 Principles and Stack

**Principles:** (1) the browser never holds secrets, so Gemini, OSRM and geocoding are called through the backend; (2) every external dependency sits behind a **provider interface** with a fallback, so the app degrades gracefully and demo mode works with zero network; (3) pure domain logic (risk engine, hazard scoring) lives in a shared package and is unit-tested; (4) server state and UI state are separate; (5) the hackathon build and the production build share the same interfaces and differ only in adapters.

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | React 18, TypeScript, Vite | SPA with PWA support. Next.js is a valid alternative if SEO or SSR pages are later needed. |
| Styling / UI | Tailwind CSS, Radix UI primitives (shadcn/ui pattern), Framer Motion, Lucide icons | Tokens from `design.md` map to CSS variables and the Tailwind theme. |
| Map | Leaflet + react-leaflet, Leaflet.markercluster, canvas renderer for dense layers | Tile provider abstraction. |
| Geometry | Turf.js (tree-shaken imports: `@turf/buffer`, `@turf/boolean-intersects`, `@turf/line-slice`, `@turf/nearest-point-on-line`, `@turf/length`, `@turf/line-overlap`, `@turf/destination`) | Runs in the API for authoritative scoring and in the client for live re-scoring. |
| Server state | TanStack Query | Caching, retries, dedupe, background refetch. |
| UI state | Zustand (small slices) | Viewport, filters, selection, theme, data mode, panel state. |
| URL state | Router search params (React Router) | Filters, viewport, selected incident, route endpoints. |
| Forms / validation | React Hook Form + zod | Schemas shared with the backend. |
| Charts | Recharts (or visx for custom charts) |  |
| Backend | Node 20, Fastify, zod, pino | Modular monolith. |
| Data | PostgreSQL 16 + PostGIS, Redis | Hackathon: SQLite or in-memory + JSON seed. Same repository interfaces. |
| Object storage | S3-compatible (R2, S3, MinIO) | Photos via pre-signed URLs, CDN in front. |
| AI | Gemini API (server-side), model via `GEMINI_MODEL` | Structured output mode. |
| Routing | OSRM (self-hosted in production) |  |
| Testing | Vitest, Testing Library, Playwright, MSW |  |
| CI/CD | GitHub Actions, preview deploys |  |
| Observability | Sentry, pino logs, OpenTelemetry traces, uptime checks |  |

### 6.2 System Overview

```
┌──────────────────────────── Browser (React PWA) ───────────────────────────┐
│ Pages: Map | Routes | Insights | Reports | Settings                        │
│ Features -> hooks (TanStack Query) -> api client -> /api/*                 │
│ Zustand (UI) | URL state | Leaflet map | Service worker (offline cache)    │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │ HTTPS (JSON)
┌───────────────────────────────────▼────────────────────────────────────────┐
│ API (Fastify)   middleware: auth/session, rate limit, validation, errors   │
│ Routes -> Services -> Providers/Repositories                                │
│ incidents | weather | risk | routes | ai | geocode | reports | analytics    │
└──────┬─────────────┬─────────────┬─────────────┬──────────────┬────────────┘
       │             │             │             │              │
  PostgreSQL     Redis cache   Object store   Providers (HTTP, circuit breaker)
  + PostGIS      + rate limit  (photos)       Open-Meteo | OSRM | Gemini | Nominatim | Overpass
       │
  Local JSON demo dataset (seed + fallback source)
```

### 6.3 Frontend Architecture

- **Feature-sliced structure:** code is grouped by feature (`map`, `weather`, `risk`, `routes`, `reports`, `insights`), each owning its components, hooks, api functions, types and tests. Shared building blocks live in `shared/ui`, `shared/lib`, `shared/hooks`.
- **Data flow:** component -> feature hook (`useIncidents`) -> TanStack Query -> `api` client -> backend. Components never call `fetch` directly.
- **State management rules:**
  - *Server state* (incidents, weather, routes, analytics) lives only in TanStack Query. Never copy it into Zustand.
  - *UI state* (selected incident id, panel mode, hovered id, theme) lives in Zustand slices (`useMapStore`, `useUiStore`, `useRouteDraftStore`, `usePrefsStore` persisted to localStorage).
  - *Shareable state* (viewport, filters, selected id, route endpoints) is mirrored to the URL and is the source of truth on load.
  - *Form state* lives in React Hook Form.
- **Query keys:** `['incidents', {bbox, filters, mode}]`, `['weather', {lat2, lng2}]`, `['risk', {cellId}]`, `['routes', {from, to}]`, `['analytics', {range, area, source}]`. Stale times are in 7.x per endpoint.
- **Routing and code splitting:** route-level lazy loading (`React.lazy`). The Map route is the main bundle. Insights (charts), Report flow and Moderation are separate chunks.
- **Error boundaries:** one at the app level, one per panel/widget, so a failing chart never blanks the page.
- **Theming:** `data-theme` and `data-map-theme` attributes on `html`, CSS variables everywhere, Tailwind reads the variables.
- **PWA:** service worker caches the app shell, last incident response and demo dataset (stale-while-revalidate) for offline mode.

### 6.4 Backend Architecture

A modular monolith with strict module boundaries (extractable into services later).

| Module | Responsibility |
| --- | --- |
| `incidents` | CRUD, spatial queries (bbox, radius), status lifecycle, corroboration |
| `reports` | Submission pipeline: validation, duplicate check, AI classification, photo handling |
| `weather` | Fetch, normalise, cache and serve snapshots, rainfall classification |
| `risk` | Deterministic scoring engine (imports the shared package), confidence, warnings |
| `ai` | Gemini client, prompt templates, schema validation, fallback explanations, quotas |
| `routes` | OSRM client, via-point generation, hazard scoring, ranking, AI route summary |
| `geocode` | Search and reverse geocoding with cache and throttle |
| `analytics` | Aggregations, hotspot detection, materialised views |
| `uploads` | Pre-signed URLs, image processing worker |
| `moderation` | Queue and actions (role-gated) |
| `health` | Liveness, readiness, provider status (feeds the data-freshness panel) |

**Layering:** `routes (HTTP) -> services (use cases) -> providers/repositories (I/O)`. Services contain business rules. Routes only parse, authorise and shape responses. Providers know nothing about HTTP frameworks.

**Background jobs (BullMQ or a simple interval worker):** expire stale incidents (every 5 min), refresh analytics views (5 min), process images, batch AI classification, warm weather cache for the city grid (10 min), purge expired cache and orphaned uploads.

### 6.5 Provider Layer

Every external system is behind an interface. Adapters are chosen by configuration.

```ts
interface WeatherProvider {
  getSnapshot(p: LatLng, opts?: { signal?: AbortSignal }): Promise<WeatherSnapshot>;
  getGrid(points: LatLng[]): Promise<WeatherSnapshot[]>;
}
interface RoutingProvider {
  route(coords: LatLng[], opts: { alternatives: number }): Promise<RawRoute[]>;
  nearest(p: LatLng): Promise<SnappedPoint>;
}
interface GeocodeProvider {
  search(q: string, bias?: LatLng): Promise<GeocodeResult[]>;
  reverse(p: LatLng): Promise<GeocodeResult | null>;
}
interface AIProvider {
  classifyReport(i: ClassifyInput): Promise<ClassifyOutput>;
  explainRisk(i: ExplainInput): Promise<ExplainOutput>;
  compareReports(i: CompareInput): Promise<CompareOutput>;
  summarizeRoutes(i: RouteSummaryInput): Promise<RouteSummaryOutput>;
}
interface IncidentSource {
  query(q: IncidentQuery): Promise<Incident[]>;
}
```

| Interface | Primary adapter | Fallback adapter |
| --- | --- | --- |
| WeatherProvider | `OpenMeteoProvider` | `CachedWeatherProvider` (stale cache) then `MockWeatherProvider` (demo mode only) |
| RoutingProvider | `OsrmProvider` | None (explicit error). Optional second OSRM host. |
| GeocodeProvider | `NominatimProvider` | `PhotonProvider`, or demo gazetteer for known demo places |
| AIProvider | `GeminiProvider` | `RuleBasedAIProvider` (keyword classifier and template explanations) |
| IncidentSource | `CommunityDbSource` | `DemoJsonSource` (always merged when Data mode includes Demo) |

Each HTTP provider is wrapped by a shared `resilientFetch`: timeout, retry with jittered backoff, **circuit breaker** (opens after 5 failures in 30 s, half-opens after 20 s), request coalescing for identical in-flight calls, and metrics (latency, error rate) that feed the data-freshness panel.

### 6.6 API Layer (client)

- `apiClient` wraps `fetch`: base URL, JSON parsing, `AbortSignal` passthrough, correlation id header, typed error normalisation into `AppError { code, message, retryable, status }`, and zod validation of every response (shared schemas) so the UI never receives malformed data.
- Feature API modules (`incidents.api.ts`, `weather.api.ts`, ...) export plain async functions. Hooks wrap them with TanStack Query.
- Global query defaults: `retry` only for retryable errors (max 2), `refetchOnWindowFocus` true for incidents/weather, `placeholderData: keepPreviousData` for map pans.

### 6.7 Folder Structure (pnpm monorepo)

```
floodsense/
├── apps/
│   ├── web/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── public/ (icons, manifest, demo images)
│   │   └── src/
│   │       ├── app/            (providers, router, error boundaries, layout shells)
│   │       ├── pages/          (MapPage, RoutesPage, InsightsPage, ReportsPage, SettingsPage, AboutPage)
│   │       ├── features/
│   │       │   ├── map/        (components, hooks, layers, store.ts)
│   │       │   ├── incidents/  (IncidentPanel, IncidentList, api, hooks)
│   │       │   ├── weather/    (WeatherChip, WeatherDrawer, charts, api, hooks)
│   │       │   ├── risk/       (RiskBadge, ScoreBreakdown, AiAnalysisCard, hooks)
│   │       │   ├── routes/     (RouteInputs, RouteCard, RouteMapLayer, hooks, api)
│   │       │   ├── reports/    (ReportModal, steps, PhotoUploader, hooks)
│   │       │   └── insights/   (StatCards, charts, HotspotTable, hooks)
│   │       ├── shared/
│   │       │   ├── ui/         (Button, Chip, Card, Sheet, Drawer, Modal, Toast, Skeleton, ...)
│   │       │   ├── hooks/      (useDebounce, useMediaQuery, useGeolocation, ...)
│   │       │   ├── lib/        (apiClient, format, geo, time, a11y, analytics)
│   │       │   └── styles/     (tokens.css, globals.css)
│   │       └── main.tsx
│   └── api/
│       └── src/
│           ├── server.ts, app.ts, config/
│           ├── plugins/        (auth, rateLimit, errorHandler, cors, security)
│           ├── modules/        (incidents, reports, weather, risk, routes, ai, geocode, analytics, uploads, moderation, health)
│           │   └── <module>/   (routes.ts, service.ts, repository.ts, schemas.ts, *.test.ts)
│           ├── providers/      (weather/, routing/, geocode/, ai/, incidents/)
│           ├── lib/            (resilientFetch, cache, logger, geo, ids)
│           ├── jobs/
│           └── db/             (schema, migrations, seed.ts)
├── packages/
│   └── shared/
│       └── src/ (types/, schemas/ (zod), risk/ (scoring, config), routing/ (hazard scoring), rainfall/, constants/)
├── data/
│   ├── demo-incidents.json
│   ├── demo-weather.json
│   ├── demo-routes.json
│   └── areas.geojson
├── docs/ (design.md, PRD.md, adr/)
└── .github/workflows/
```

### 6.8 Component Structure Conventions

- One component per file, `PascalCase.tsx`, colocated test and story. Props typed with an exported interface. Container components (data) separate from presentational components (UI only).
- Presentational components accept data via props and are fully controlled so they can be unit-tested and rendered in Storybook.
- Composition over configuration: for example `<Card><Card.Header/><Card.Body/></Card>`.
- Every async component accepts or derives `isLoading / isError / isEmpty` and renders `Skeleton`, `ErrorState` and `EmptyState` from the shared kit.
- Accessibility is built into shared components (focus rings, roles, labels) and not re-implemented per feature.

### 6.9 Reusable Hooks

| Hook | Purpose |
| --- | --- |
| `useIncidents(bbox, filters)` | Viewport incident query with debounced bbox, keepPreviousData, 60 s refetch while visible |
| `useIncident(id)` | Detail with evidence and AI analysis |
| `useRiskAnalysis(target)` | Score (instant) plus explanation (lazy) |
| `useWeather(latlng)` | Snapshot with rounding, staleness flag, abort handling |
| `useRouteComparison(from, to)` | Orchestrates routes, hazards, scoring and summary |
| `useGeocodeSearch(query)` | Debounced autocomplete with abort |
| `useGeolocation()` | Permission state, one-shot and watch, accuracy, error mapping |
| `useDebounce / useThrottle` | Input and map-move control |
| `useMediaQuery / useBreakpoint` | Responsive switches (sheet vs drawer) |
| `useInterval(cb, ms, {pauseWhenHidden})` | Polling aware of page visibility |
| `useUrlState(key, codec)` | Typed two-way URL param binding |
| `useLocalStorage(key, schema)` | Safe persisted preferences |
| `useReducedMotion()` | Motion preference |
| `useOnlineStatus()` | Offline banner and queueing |
| `useDataMode()` | Live / Demo / Both with banner logic |
| `useCountUp(value)` | Stat card animation |
| `useKeyboardShortcut(keys, cb)` | Global shortcuts |
| `useFocusTrap / useReturnFocus` | Modal and sheet accessibility |
| `useDraftAutosave(key)` | Report draft persistence |

### 6.10 Utility Functions

| Module | Functions |
| --- | --- |
| `geo` | `roundLatLng(p, 2)`, `bboxToString`, `isInsideServiceArea`, `distanceMeters`, `cellId(p)` (geohash/H3), `fitBoundsPadding` |
| `risk` | `computeRiskScore`, `scoreToCategory`, `confidenceFor`, `rainRiskIndex`, `classifyRainIntensity`, `hasInsufficientData` |
| `routing` | `bufferHazards`, `scoreRouteExposure`, `sliceHazardSegments`, `generateViaPoints`, `dedupeRoutes`, `rankRoutes`, `buildDeepLink` |
| `time` | `formatRelative`, `formatCityTime`, `ageHours`, `freshnessBucket` |
| `format` | `formatDistance`, `formatDuration`, `formatMm`, `formatDepth` |
| `text` | `stripPII`, `sanitizeText`, `truncate`, `toSlug` |
| `net` | `resilientFetch`, `withTimeout`, `backoff`, `isRetryable` |
| `a11y` | `announce(msg)` (live region), `trapFocus` |
| `image` | `compressImage`, `readExifLocation`, `validateMagicBytes` |
| `analytics` | `track(event, props)` with a consent gate |

### 6.11 Configuration and Environments

Environments: `local`, `preview` (per PR), `staging`, `production`. Config is validated with zod at boot, and the app refuses to start on missing required values. Feature flags (`flags.rainOverlay`, `flags.reporting`, `flags.analytics`, `flags.avoidanceRouting`) allow progressive rollout. **Hackathon mode:** `DATA_MODE=demo`, `DB_DRIVER=memory`, `CACHE_DRIVER=memory`, and `AI_DRIVER=gemini|rules`, with the full app working offline except weather, routing and Gemini.

---

## 7. API Design

### 7.1 Conventions

- **Base path:** `/api/v1`. JSON over HTTPS. Timestamps are ISO 8601 UTC (`2026-10-09T08:30:00Z`) and the city timezone is returned in config for display. Coordinates are `{ lat, lng }` in responses and `lat,lng` in query strings. Bounding boxes are `west,south,east,north`.
- **Success shape:** the resource or `{ items, meta }` for collections. `meta` carries `generatedAt`, `dataMode`, `sources[]` (with `lastUpdated` and `status`), and `nextCursor` where paginated.
- **Error shape (all endpoints):** `{ error: { code, message, details?, requestId, retryable } }`.

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400 | Bad input. `details` lists field errors. |
| `UNAUTHORIZED` / `FORBIDDEN` | 401 / 403 | Missing session or insufficient role. |
| `NOT_FOUND` | 404 | Unknown resource. |
| `DUPLICATE_RECENT` | 409 | Same device reported the same place within 10 min. |
| `PAYLOAD_TOO_LARGE` / `UNSUPPORTED_MEDIA` | 413 / 415 | Upload limits. |
| `OUT_OF_SERVICE_AREA` | 422 | Coordinates outside covered cities. |
| `RATE_LIMITED` | 429 | Includes `Retry-After` header. |
| `UPSTREAM_UNAVAILABLE` / `UPSTREAM_TIMEOUT` | 502 / 504 | A provider failed and no fallback was available. |
| `INTERNAL` | 500 | Unexpected, logged with requestId. |

- **Degraded responses:** when a fallback was used, the response is still `200` with `meta.degraded: [{ source, reason, fallback }]` so the UI can show the right notice instead of an error.
- **Caching headers:** `Cache-Control` with `s-maxage` and `stale-while-revalidate` for public GETs, `ETag` / `If-None-Match` support on list endpoints, `Vary: Accept-Encoding`. Mutations are never cached.
- **Idempotency:** `POST /reports` and `POST /incidents/:id/votes` require an `Idempotency-Key` header (UUID), stored 24 h, so retries never create duplicates.
- **Client retry defaults:** GET requests retry up to 2 times for network errors, 408, 429 (honouring `Retry-After`), 502, 503 and 504, with jittered exponential backoff (300 ms, 900 ms). Never retry 4xx validation or auth errors.

---

### 7.2 Internal Endpoints

#### API-01 `GET /incidents`

- **Purpose:** incidents within a viewport for the map and lists.
- **Query:** `bbox` (required), `risk` (csv: low, moderate, high, unknown), `source` (community, demo), `includeResolved` (bool), `zoom` (int, enables server clustering when above threshold), `limit` (default 300, max 1000), `cursor`.
- **Request flow:** validate -> resolve `dataMode` (query or session default) -> `IncidentService.query` -> merge Community and Demo sources -> fetch weather rain index per cell (cached) -> compute risk per incident with the shared engine -> apply filters -> cluster if zoom flag -> respond.
- **Response:** `{ items: IncidentSummary[], clusters?: Cluster[], meta }`. `IncidentSummary` = id, location, title, category, severity, depthCm?, riskScore, riskCategory, confidence, verification, source, createdAt, updatedAt, corroborations, hasPhoto.
- **Errors:** 400 invalid bbox (size cap 0.5 degrees per side), 422 outside service area, 504 database timeout (served from cache if present).
- **Caching:** server cache keyed by `(roundedBbox, filtersHash, dataMode)`, TTL 20 s, plus ETag. Client `staleTime` 30 s, refetch interval 60 s (paused when hidden).
- **Retry:** client GET retry policy. Server retries DB read once.

#### API-02 `GET /incidents/:id`

- **Purpose:** full detail for the panel.
- **Response:** `IncidentDetail` = summary + description, reports\[\] (timeline), photo URLs (sized variants), corroboration list, verification history, nearby weather snapshot summary, warnings\[\] (`unverified`, `demo`, `stale`, `conflicting`, `insufficient_data`).
- **Errors:** 404, 410 when expired and purged.
- **Caching:** TTL 15 s server, client `staleTime` 15 s. Invalidated when a report or vote targets the incident.

#### API-03 `GET /incidents/:id/analysis` and `POST /risk/evaluate`

- **Purpose:** risk score, breakdown and AI explanation for an incident (GET) or any `{ lat, lng }` location (POST body).
- **Request flow:** gather evidence (reports within 300 m, 6 h) -> weather snapshot -> deterministic score + confidence + warnings (synchronous, always returned) -> AI explanation: cache lookup by `evidenceHash` -> Gemini T2 -> validate schema and evidence ids -> store -> respond. Query `?explain=false` returns the score only. Query `?explain=lazy` returns the score and an `explanationStatus: 'pending'`, and the client polls once or uses the same endpoint with `?explain=only`.
- **Response:** `{ score, category, confidence, breakdown: {severity, rain, recency, corroboration, history}, warnings[], evidence[], explanation?: { headline, explanation, keyFactors[], caveats[], recommendedAction, generatedBy: 'gemini'|'template', generatedAt } }`.
- **Errors:** 404, 422, never 5xx for AI failure (falls back to `generatedBy: 'template'` with `meta.degraded`).
- **Caching:** explanation cached 5 min per `(cellId, evidenceHash)` in Redis. Score recomputed on each call (cheap).
- **Retry:** Gemini call: 1 retry after 800 ms on 429/5xx, 8 s timeout, then template fallback.

#### API-04 `POST /reports`

- **Purpose:** submit a new waterlogging report.
- **Body:** `{ location: {lat,lng}, description, severity: 'minor'|'moderate'|'severe'|'unsure', depthCm?, occurredAt?, photoId?, locationAccuracyM?, category? , confirmsIncidentId? }`.
- **Request flow:** session/device token -> rate limit -> zod validate -> inside service area -> sanitise text and strip PII -> duplicate check (merge or return 409/`confirmsIncidentId` path) -> attach photo (validated, processed) -> persist incident/report -> enqueue AI classification (T1) -> update corroboration state -> respond with the created incident (optimistic status) -> background: reclassify, plausibility check, re-score.
- **Response:** `201 { incident: IncidentSummary, mergedInto?: string, aiPending: boolean }`.
- **Errors:** 400, 409 `DUPLICATE_RECENT`, 413/415 for photo, 422, 429.
- **Caching:** none. Invalidates incident list caches for affected cells.
- **Retry:** client retries only with the same `Idempotency-Key`, max 2 attempts.

#### API-05 `POST /reports/duplicates`

- **Purpose:** pre-submit duplicate and nearby-incident check.
- **Body:** `{ location, category?, occurredAt? }` **Response:** `{ matches: [{ incident: IncidentSummary, distanceM, ageMin, similarity }] }`.
- **Caching:** none (must be live). **Errors:** fails open with `matches: []` and `meta.degraded`. **Retry:** one client retry.

#### API-06 `POST /uploads/sign`

- **Purpose:** pre-signed upload for photos. **Body:** `{ contentType, sizeBytes }`. **Response:** `{ photoId, uploadUrl, headers, expiresAt }` (5 min). Server verifies type and size caps, and after upload a worker validates magic bytes, strips EXIF, creates variants and flags the file `ready`. **Errors:** 413, 415, 429. **Retry:** the client retries the PUT up to 3 times with backoff.

#### API-07 `POST /incidents/:id/votes`

- **Purpose:** quick confirmation actions. **Body:** `{ vote: 'still_flooded'|'cleared'|'inaccurate' }`. **Rules:** one vote per device per incident per 30 min. **Response:** updated `IncidentSummary`. **Errors:** 404, 409, 429. **Caching:** none. Invalidates the incident cache.

#### API-08 `GET /weather`

- **Purpose:** normalised weather snapshot for a location.
- **Query:** `lat`, `lng`.
- **Request flow:** round to 2 decimals -> cache lookup -> Open-Meteo fetch -> validate and normalise -> classify rainfall -> compute `rainRiskIndex` -> cache -> respond.
- **Response:** `WeatherSnapshot` (see Data Models) with `meta.fetchedAt`, `meta.providerTime`, `meta.stale`.
- **Errors:** 400, 422, 502/504 only when no stale cache exists.
- **Caching:** Redis TTL 10 min (current/hourly), stale-if-error up to 2 h. HTTP `s-maxage=300, stale-while-revalidate=300`. Client `staleTime` 5 min.
- **Retry:** 6 s timeout, 2 server retries (500 ms, 1500 ms), then the stale cache. Circuit breaker on the provider.

#### API-09 `GET /weather/grid`

- **Purpose:** rainfall for a viewport sample grid (rain overlay). **Query:** `bbox`, `n` (default 5, max 7). **Flow:** build n x n points -> one batched Open-Meteo request with comma-separated coordinates -> normalise to `{ cells: [{ center, intensityMmH, label, riskIndex }] }`. **Cache:** per cell 10 min. **Errors and retry:** as API-08, overlay silently hides on failure.

#### API-10 `GET /geocode/search` and `GET /geocode/reverse`

- **Purpose:** place search and reverse lookup. **Query:** `q` (3 to 100 chars), `near` (lat,lng bias), `limit` (max 5) / `lat`, `lng`.
- **Flow:** normalise query -> cache -> throttle queue (1 req/s to Nominatim per its usage policy, valid User-Agent) -> restrict to the city's country/viewbox -> map to `GeocodeResult { id, label, lat, lng, type, boundingBox? }`.
- **Errors:** 400 for short query, 429 own limiter, 502 provider (fallback to Photon or the demo gazetteer).
- **Caching:** Redis 24 h for search, 7 days for reverse (rounded to 4 decimals). Client `staleTime` 10 min.

#### API-11 `POST /routes/compare`

- **Purpose:** compute and compare routes with hazard scoring and AI summary.
- **Body:** `{ from: {lat,lng}, to: {lat,lng}, profile: 'driving', avoidHazards: true }`.
- **Request flow:** validate and snap points (OSRM `nearest`) -> OSRM `route` with alternatives -> load hazards in the corridor bbox -> Turf scoring per route -> if the best route is Moderate or High and `avoidHazards`, generate via-point candidates, query OSRM (max 4), dedupe -> rank and label -> AI summary T4 (parallel with final scoring, with a 6 s cap) -> respond.
- **Response:** `{ routes: RouteResult[], recommendedId, summary: { text, generatedBy }, status: { routesComputedAt, hazardsCheckedAt, weatherUpdatedAt }, warnings[] }`. `RouteResult` = id, labels\[\], geometry (GeoJSON LineString, simplified to 5 m tolerance for transport), distanceM, durationS, exposure { score, category, hazards\[\]: { incidentId, atKm, lengthM, severity, risk, distanceFromRouteM }, hazardousSegments: GeoJSON MultiLineString }.
- **Errors:** 400, 422 (outside area or too far), 404-style `NO_ROUTE` as `422`, 502/504 for OSRM (retried), partial success with `warnings: ['hazard_data_unavailable']`.
- **Caching:** OSRM geometry cached 5 min by `(snapped from, snapped to)`. Hazard scoring is never cached longer than 60 s. Final response cached 60 s per request hash. Client `staleTime` 60 s, plus a 2-minute hazard re-score via `POST /routes/rescore` (takes route geometries, returns updated exposures only).
- **Retry:** OSRM 2 retries (400 ms, 1200 ms). The AI summary does not block, and falls back to the template.

#### API-12 `GET /analytics/*`

- **Endpoints:** `/analytics/summary` (stat cards with deltas), `/analytics/timeline` (cursor-paginated recent incidents), `/analytics/rainfall-trend`, `/analytics/areas`, `/analytics/hotspots`, `/analytics/severity`, `/analytics/route-hazards`.
- **Query:** `range` (24h, 7d, 30d), `area` (csv), `source`.
- **Response:** each returns series or rows plus `meta.sampleSize`, `meta.sources[]`, `meta.generatedAt`.
- **Errors:** 400, 422 for an unsupported range, independent failure per endpoint.
- **Caching:** materialised views refreshed every 5 min, API cache 60 s, client `staleTime` 2 min.
- **Retry:** client default.

#### API-13 `GET /status`

- **Purpose:** data sources freshness (powers the freshness panel and an uptime check). **Response:** `{ sources: [{ id, name, status: 'healthy'|'delayed'|'failed', lastSuccessAt, latencyMs, recordCount? }], dataMode, version }`. **Caching:** 15 s. **Errors:** always 200 (reports failure inside the payload).

#### API-14 `GET /config`

- **Purpose:** city config (center, bounds, timezone, defaults), feature flags, tile style URLs, thresholds for client display. **Caching:** `max-age=300`, ETag.

#### API-15 `GET /me/reports`, `POST /me/reports/:id/resolve`, `DELETE /me/reports/:id`

- **Purpose:** device-scoped report management. **Auth:** device session. **Rules:** delete only within 24 h and anonymises rather than hard-deletes when corroborated by others. **Caching:** none. **Errors:** 401, 403, 404.

#### API-16 Moderation (`/admin/*`, role `moderator`)

- `GET /admin/queue`, `POST /admin/incidents/:id/verify|reject|merge|resolve`. Audit-logged. No caching, CSRF-protected, per-action rate limit.

---

### 7.3 External Provider Calls (made only by the backend)

| Provider | Endpoint and key parameters | Request flow and response handling | Caching | Retry / failure |
| --- | --- | --- | --- | --- |
| **Open-Meteo** Forecast | `GET https://api.open-meteo.com/v1/forecast` with `latitude`, `longitude`, `current`, `hourly`, `minutely_15`, `past_hours`, `forecast_hours`, `timezone=auto` | Validate with zod, convert units, map WMO `weather_code` to label/icon, null-safe fields. Multi-location batch for grids. | 10 min Redis, stale-if-error 2 h | 6 s timeout, 2 retries, circuit breaker, then stale cache or demo weather (demo mode). Commercial use requires a paid plan or self-hosting. |
| **OSRM** | `GET {OSRM_URL}/route/v1/driving/{lng,lat;lng,lat}?alternatives=3&overview=full&geometries=geojson`, `/nearest/v1/driving/{lng,lat}` | Parse `routes[]`, `code` must be `Ok`, else map `NoRoute` or `NoSegment` to `NO_ROUTE`. Public demo server only for development. | Route 5 min, nearest 1 h | 5 s timeout, 2 retries, optional secondary host. |
| **Nominatim** (OSM) | `GET /search?format=jsonv2&q=&limit=5&viewbox=&bounded=1`, `/reverse` | Throttled to 1 req/s with User-Agent, cached heavily. Production: self-host or Photon. | 24 h / 7 d | 1 retry, then Photon or demo gazetteer. |
| **Gemini API** | `generateContent` with `responseMimeType: application/json` and a response schema, `temperature: 0.2` | Build prompt from template, attach evidence in delimited blocks, validate output, verify evidence ids and numbers. | 5 min (explanations), classification stored permanently with the report | 8 s timeout, 1 retry on 429/5xx, quota guard, then rule-based fallback. |
| **Overpass** (P2) | `POST /api/interpreter` with a bounded query for `tunnel=yes`, `layer<0` ways and admin boundaries | Convert to GeoJSON, simplify, store in DB. Run as a nightly job, never per user request. | 24 h+ | 2 retries, skip on failure. |
| **Map tiles** | Provider-defined URL template | Client loads tiles directly from the configured provider (no keys exposed for restricted providers: use a signed tile proxy). | Browser/CDN | Tile error event triggers the visual notice and retry. |

### 7.4 Realtime Updates

MVP uses polling (60 s incidents, 5 min weather, 2 min route re-score). P2 adds Server-Sent Events (`GET /events/incidents?bbox=`) pushing `incident.created|updated|resolved` so the map updates without polling. The SSE endpoint falls back to polling when unsupported.

---

## 8. Data Models

All types live in `packages/shared` as zod schemas with inferred TypeScript types, so frontend, backend and tests share one definition.

### 8.1 Enums and Primitives

```ts
type LatLng = { lat: number; lng: number };
type BBox = [west: number, south: number, east: number, north: number];

type RiskCategory = 'low' | 'moderate' | 'high' | 'unknown';
type Severity = 'minor' | 'moderate' | 'severe';
type SeverityInput = Severity | 'unsure';
type Verification = 'demo' | 'unverified' | 'corroborated' | 'verified' | 'resolved' | 'expired';
type DataSource = 'demo' | 'community' | 'partner';
type DataMode = 'live' | 'demo' | 'both';
type Confidence = 'high' | 'medium' | 'low';
type IncidentCategory =
  | 'street_waterlogging' | 'underpass_flooding' | 'drain_overflow'
  | 'low_lying_area' | 'road_closed' | 'vehicle_stalled' | 'other';
type RainIntensity = 'none' | 'light' | 'moderate' | 'heavy' | 'very_heavy' | 'extreme';
type Warning =
  | 'unverified' | 'demo' | 'stale' | 'conflicting' | 'insufficient_data' | 'ai_unavailable';
```

### 8.2 Core Interfaces

```ts
interface Incident {
  id: string;                    // uuid
  cityId: string;
  location: LatLng;
  placeName: string | null;      // reverse-geocoded or user supplied
  areaId: string | null;         // ward / neighbourhood
  title: string;                 // generated, e.g. 'Underpass flooding near Andheri Subway'
  category: IncidentCategory;
  severity: Severity;
  depthCm: number | null;
  depthSource: 'reported' | 'ai_estimated' | null;
  verification: Verification;
  source: DataSource;
  corroborationCount: number;
  photoIds: string[];
  firstReportedAt: string;       // ISO
  lastReportedAt: string;        // ISO, drives recency
  updatedAt: string;             // ISO, shown as Last updated
  resolvedAt: string | null;
  expiresAt: string;
}

interface IncidentSummary extends Pick<Incident,
  'id' | 'location' | 'placeName' | 'title' | 'category' | 'severity' | 'depthCm' |
  'verification' | 'source' | 'corroborationCount' | 'updatedAt' | 'firstReportedAt'> {
  riskScore: number | null;      // null when unknown
  riskCategory: RiskCategory;
  confidence: Confidence;
  hasPhoto: boolean;
}

interface Report {
  id: string;
  incidentId: string;
  deviceId: string | null;       // never exposed publicly
  location: LatLng;
  locationAccuracyM: number | null;
  description: string;           // sanitised
  severityInput: SeverityInput;
  depthCm: number | null;
  occurredAt: string;
  createdAt: string;
  photoId: string | null;
  ai: AIClassification | null;
  status: 'pending' | 'accepted' | 'rejected' | 'merged';
  rejectionReason?: string;
}

interface AIClassification {
  category: IncidentCategory;
  suggestedSeverity: Severity;
  extractedDepthCm: number | null;
  confidence: number;            // 0..1
  flags: Array<'possible_spam' | 'off_topic' | 'duplicate_likely' | 'contradicts_user_severity'>;
  language: string;
  model: string;
  promptVersion: string;
  createdAt: string;
}

interface Photo {
  id: string;
  status: 'pending' | 'ready' | 'rejected';
  variants: { thumb: string; medium: string };   // CDN URLs
  width: number; height: number;
  plausibility: { floodScene: boolean; score: number } | null;
  altText: string | null;
}
```

### 8.3 Weather and Risk

```ts
interface WeatherSnapshot {
  location: LatLng;              // rounded cell centre
  timezone: string;
  providerTime: string;          // current.time from Open-Meteo
  fetchedAt: string;
  stale: boolean;
  current: {
    temperatureC: number | null;
    apparentTemperatureC: number | null;
    humidityPct: number | null;
    precipitationMmH: number | null;
    windKmh: number | null;
    weatherCode: number | null;
    condition: string;           // 'Heavy rain'
    intensity: RainIntensity;
  };
  hourly: Array<{ time: string; precipMm: number | null; probabilityPct: number | null;
                  intensity: RainIntensity; isForecast: boolean }>;
  accumulation: { last1hMm: number | null; last3hMm: number | null;
                  last24hMm: number | null; next6hMm: number | null };
  resolution: '15min' | 'hourly';
  rainRisk: { index: number; category: RiskCategory; drivers: string[] };
  source: 'open-meteo' | 'cache' | 'demo';
}

interface RiskBreakdown { severity: number; rain: number | null; recency: number;
                        corroboration: number; history: number }   // each 0..1

interface RiskResult {
  score: number | null;          // 0..100, null when insufficient data
  category: RiskCategory;
  confidence: Confidence;
  breakdown: RiskBreakdown;
  weightsVersion: string;
  warnings: Warning[];
  evidence: EvidenceItem[];
  computedAt: string;
}

interface EvidenceItem {
  id: string; kind: 'report' | 'weather' | 'history';
  summary: string; ageMinutes: number; verification: Verification;
  freshness: 'fresh' | 'recent' | 'aging' | 'stale';
}

interface AIExplanation {
  headline: string;
  explanation: string;
  keyFactors: Array<{ text: string; evidenceId: string }>;
  caveats: string[];
  recommendedAction: string;
  generatedBy: 'gemini' | 'template';
  model?: string;
  generatedAt: string;
}
```

### 8.4 Routing

```ts
interface RouteHazard {
  incidentId: string;
  atKm: number;                  // distance along the route
  lengthM: number;               // length inside the buffer
  distanceFromRouteM: number;
  severity: Severity;
  riskScore: number;
  verification: Verification;
  ageMinutes: number;
  impact: number;                // 0..1
}

interface RouteResult {
  id: string;
  labels: Array<'fastest' | 'safest' | 'recommended'>;
  geometry: GeoJSON.LineString;
  distanceM: number;
  durationS: number;
  deltaVsFastestS: number;
  exposure: {
    score: number | null;
    category: RiskCategory;
    hazards: RouteHazard[];
    hazardousSegments: GeoJSON.MultiLineString | null;
    longestHazardM: number;
  };
  notRecommended: boolean;
  origin: 'osrm_alternative' | 'avoidance_candidate';
  avoidsIncidentIds: string[];
}

interface RouteComparison {
  routes: RouteResult[];
  recommendedId: string;
  summary: { text: string; tradeoff?: string; generatedBy: 'gemini' | 'template' };
  status: { routesComputedAt: string; hazardsCheckedAt: string; weatherUpdatedAt: string | null };
  warnings: Warning[];
}
```

### 8.5 Analytics, Config and Misc

```ts
interface AnalyticsSummary {
  range: '24h' | '7d' | '30d';
  totalIncidents: number; activeIncidents: number;
  highRiskLocations: number; moderateRiskLocations: number;
  deltas: { totalIncidents: number; highRiskLocations: number };   // vs previous period, percent
  sampleSize: number;
}
interface Hotspot {
  id: string; centroid: LatLng; placeName: string; areaId: string | null;
  incidentCount: number; peakSeverity: Severity; lastIncidentAt: string;
  avgResolveMinutes: number | null; trend: number[];   // sparkline buckets
}
interface SourceStatus {
  id: string; name: string; status: 'healthy' | 'delayed' | 'failed';
  lastSuccessAt: string | null; latencyMs: number | null; recordCount?: number;
}
interface CityConfig {
  id: string; name: string; center: LatLng; bounds: BBox; timezone: string;
  defaultZoom: number; serviceAreaGeoJSON: GeoJSON.Polygon;
}
interface UserPrefs {
  uiTheme: 'light' | 'dark' | 'system'; mapTheme: 'light' | 'dark';
  dataMode: DataMode; units: { rain: 'mm' | 'in'; temp: 'C' | 'F' };
  onboardingSeen: boolean; legendOpen: boolean;
}
```

### 8.6 Database Schema (PostgreSQL 16 + PostGIS)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE cities (
  id text PRIMARY KEY, name text NOT NULL, timezone text NOT NULL,
  center geography(Point,4326) NOT NULL, service_area geography(Polygon,4326) NOT NULL
);

CREATE TABLE areas (
  id text PRIMARY KEY, city_id text REFERENCES cities(id), name text NOT NULL,
  geom geography(MultiPolygon,4326) NOT NULL
);
CREATE INDEX areas_geom_gix ON areas USING gist (geom);

CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text UNIQUE NOT NULL, trust_score real NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz,
  blocked boolean NOT NULL DEFAULT false
);

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id text NOT NULL REFERENCES cities(id),
  area_id text REFERENCES areas(id),
  location geography(Point,4326) NOT NULL,
  place_name text, title text NOT NULL,
  category text NOT NULL, severity text NOT NULL CHECK (severity IN ('minor','moderate','severe')),
  depth_cm int CHECK (depth_cm BETWEEN 0 AND 300), depth_source text,
  verification text NOT NULL, source text NOT NULL CHECK (source IN ('demo','community','partner')),
  corroboration_count int NOT NULL DEFAULT 1,
  first_reported_at timestamptz NOT NULL, last_reported_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz, expires_at timestamptz NOT NULL
);
CREATE INDEX incidents_loc_gix ON incidents USING gist (location);
CREATE INDEX incidents_active_idx ON incidents (city_id, last_reported_at DESC)
  WHERE resolved_at IS NULL;
CREATE INDEX incidents_area_idx ON incidents (area_id, first_reported_at DESC);

CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL, status text NOT NULL DEFAULT 'pending',
  width int, height int, plausibility jsonb, alt_text text,
  created_at timestamptz NOT NULL DEFAULT now(), purge_after timestamptz
);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  device_id uuid REFERENCES devices(id),
  location geography(Point,4326) NOT NULL, location_accuracy_m int,
  description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 500),
  severity_input text NOT NULL, depth_cm int,
  occurred_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  photo_id uuid REFERENCES photos(id), ai jsonb,
  status text NOT NULL DEFAULT 'pending', rejection_reason text,
  idempotency_key uuid UNIQUE
);
CREATE INDEX reports_incident_idx ON reports (incident_id, occurred_at DESC);
CREATE INDEX reports_device_idx ON reports (device_id, created_at DESC);

CREATE TABLE incident_votes (
  id bigserial PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id),
  vote text NOT NULL CHECK (vote IN ('still_flooded','cleared','inaccurate')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX votes_lookup_idx ON incident_votes (incident_id, device_id, created_at DESC);

CREATE TABLE ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task text NOT NULL, input_hash text NOT NULL, output jsonb, model text,
  prompt_version text, latency_ms int, status text, created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX ai_runs_cache_idx ON ai_runs (task, input_hash);

CREATE TABLE rainfall_hourly (
  city_id text REFERENCES cities(id), observed_at timestamptz,
  precip_mm real, source text, PRIMARY KEY (city_id, observed_at)
);

CREATE TABLE moderation_actions (
  id bigserial PRIMARY KEY, incident_id uuid REFERENCES incidents(id),
  moderator text NOT NULL, action text NOT NULL, note text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE source_status (
  id text PRIMARY KEY, status text, last_success_at timestamptz,
  latency_ms int, updated_at timestamptz DEFAULT now()
);

CREATE MATERIALIZED VIEW hotspots_30d AS
  SELECT ST_ClusterDBSCAN(location::geometry, eps := 0.0015, minpoints := 3)
           OVER () AS cluster_id, id, location, severity, first_reported_at
  FROM incidents WHERE first_reported_at > now() - interval '30 days';
```

Notes: Redis holds weather snapshots, geocode results, AI explanation cache, rate-limit counters and idempotency keys. The analytics materialised views (`hotspots_30d`, daily and hourly incident counts by area and severity) refresh every 5 min with `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

### 8.7 Demo Dataset Specification (`data/demo-incidents.json`)

Each entry matches `Incident` plus `reports[]` and a pre-computed `ai` block so the demo works without a Gemini key. Required coverage: 40 incidents, 10 areas, all three severities, all verification states, ages from 5 min to 7 h (so recency decay is visible), 4 locations with conflicting reports, 3 clusters of 3 or more reports (hotspots), 6 incidents with photos (bundled sample images), 5 incidents lacking depth, and 3 'insufficient data' locations. Every record has `source: 'demo'` and `verification: 'demo'`, and timestamps are stored as offsets (`minutesAgo`) so the data always looks fresh at load time.

```ts
// shape of one seed entry
{ key: 'andheri-subway', location: { lat: 19.1197, lng: 72.8464 }, placeName: 'Andheri Subway',
  category: 'underpass_flooding', severity: 'severe', depthCm: 70,
  minutesAgo: 25, reports: [{ minutesAgo: 25, text: 'Water above knee, buses diverted' }],
  ai: { category: 'underpass_flooding', suggestedSeverity: 'severe', confidence: 0.93 } }
```

### 8.8 Retention and Privacy

Reports and incidents are kept 12 months (analytics), photos 90 days unless the incident is a recurring hotspot, raw device tokens are never stored (hash only), IP addresses are hashed with a rotating salt and kept 30 days for abuse control, and user deletion requests anonymise reports (remove `device_id`, photo).

---

## 9. Component Inventory

### 9.1 Foundation UI (`shared/ui`)

| ID | Component | Notes |
| --- | --- | --- |
| CMP-001 | `Button`, `IconButton` | Variants: primary, secondary, ghost, destructive. Sizes, loading state. |
| CMP-002 | `Chip`, `ChipGroup`, `FilterChip` | Single/multi-select, count badge, selected check glyph. |
| CMP-003 | `Badge` | Variants: risk, severity, verification, source (Demo), freshness. |
| CMP-004 | `Card` (Header/Body/Footer) | Elevation variants, interactive hover. |
| CMP-005 | `Input`, `Textarea`, `Select`, `Combobox`, `Stepper`, `SegmentedControl`, `Switch` | Labelled, error state, 44 px touch height. |
| CMP-006 | `Modal`, `Drawer`, `BottomSheet` | Focus trap, snap points, drag handle plus button alternative. |
| CMP-007 | `Tooltip`, `Popover`, `DropdownMenu`, `CommandPalette` | Radix-based. |
| CMP-008 | `Toast` and `ToastProvider` | Queue, actions, `role=status`. |
| CMP-009 | `Skeleton` (Text, Card, Chart, Row, Map) | Match final layouts. |
| CMP-010 | `EmptyState`, `ErrorState`, `OfflineBanner`, `InlineAlert` | Always with an action. |
| CMP-011 | `Table` (sortable, sticky, virtualized variant), `Tabs`, `Accordion` |  |
| CMP-012 | `Icon` wrapper (Lucide), `Spinner`, `ProgressRing`, `Divider`, `Kbd` |  |
| CMP-013 | `Lightbox` / `ImageViewer` | Focus-trapped, pinch-zoom. |
| CMP-014 | `Avatar`, `Tag`, `CopyButton`, `ShareButton` (Web Share API with copy fallback) |  |

### 9.2 Layout and App Shell

| ID | Component | Notes |
| --- | --- | --- |
| CMP-020 | `AppShell` | Rail/tab-bar switching, page transitions. |
| CMP-021 | `NavRail`, `BottomTabBar`, `TopBar` |  |
| CMP-022 | `PageHeader`, `PageContainer`, `Grid12` |  |
| CMP-023 | `DataModeBanner` | Persistent demo disclosure with popover. |
| CMP-024 | `ThemeToggle`, `MapThemeToggle` |  |
| CMP-025 | `ErrorBoundary` (App, Panel, Widget) |  |
| CMP-026 | `OnboardingCarousel` | Three cards, skippable. |
| CMP-027 | `FreshnessIndicator` | 'Updated 3 min ago' with stale styling and live ring. |

### 9.3 Map

| ID | Component | Notes |
| --- | --- | --- |
| CMP-030 | `FloodMap` | Leaflet container, tile provider, bounds, URL sync. |
| CMP-031 | `IncidentMarker`, `ClusterMarker`, `SelectedMarkerHalo` | Risk color + severity glyph + demo badge. |
| CMP-032 | `MapControls` (Zoom, Locate, Layers) |  |
| CMP-033 | `SearchBox` + `SuggestionList` | Debounced, keyboard navigable. |
| CMP-034 | `RiskFilterBar` | Chips with counts, source and resolved toggles. |
| CMP-035 | `RiskLegend` | Collapsible. |
| CMP-036 | `RainOverlay` | Grid cells layer. |
| CMP-037 | `UserLocationMarker`, `TempPin`, `HoverTooltip` |  |
| CMP-038 | `ViewportIncidentList` | Virtualized list in the mobile peek sheet. |
| CMP-039 | `MapTileErrorNotice` |  |

### 9.4 Incident and Risk

| ID | Component | Notes |
| --- | --- | --- |
| CMP-040 | `IncidentPanel` | Panel/sheet container. |
| CMP-041 | `RiskBadge`, `RiskScoreGauge` | Icon + word + score. |
| CMP-042 | `ScoreBreakdownBars` | Five contributors with explanation. |
| CMP-043 | `AiAnalysisCard` | Streaming skeleton, feedback buttons, 'AI-generated' label. |
| CMP-044 | `WarningBanner` | unverified, demo, stale, conflicting, insufficient data. |
| CMP-045 | `FactsGrid`, `DepthReference` | Depth with body-height reference. |
| CMP-046 | `ReportTimeline`, `ReportRow` | Virtualized. |
| CMP-047 | `VerificationBadge`, `ProvenanceTag` |  |
| CMP-048 | `IncidentActionBar` | Route around, still flooded / cleared, report update. |
| CMP-049 | `ReportComparisonCard` | AI multi-report comparison. |

### 9.5 Weather

| ID | Component | Notes |
| --- | --- | --- |
| CMP-050 | `WeatherChip` | Map top-center. |
| CMP-051 | `WeatherDrawer` | Hero, gauge, chart, tiles, footer. |
| CMP-052 | `RainRiskGauge`, `IntensityLadder` |  |
| CMP-053 | `HourlyRainChart` | Bars + probability line, data table toggle. |
| CMP-054 | `AccumulationTiles`, `LocationSwitcher` |  |

### 9.6 Routes

| ID | Component | Notes |
| --- | --- | --- |
| CMP-060 | `RouteInputs` (`PlaceField`, `SwapButton`) |  |
| CMP-061 | `RouteCard`, `RouteLabelBadge`, `ExposurePill` |  |
| CMP-062 | `RouteProfileBar` | Length bar with hazard segments. |
| CMP-063 | `RouteMapLayer` | Polylines, segments overlay, pins, chevrons. |
| CMP-064 | `HazardList`, `HazardRow` | Distance markers, hover linking. |
| CMP-065 | `RouteSummaryCard` | AI summary with template fallback label. |
| CMP-066 | `RouteStatusBar` | Computed / checked / weather times plus refresh. |
| CMP-067 | `OpenInMapsMenu` | Deep links. |

### 9.7 Reports

| ID | Component | Notes |
| --- | --- | --- |
| CMP-070 | `ReportModal`, `ReportStepper` |  |
| CMP-071 | `LocationPicker` (mini map, draggable pin) |  |
| CMP-072 | `SeverityCardSelect` | Depth illustrations. |
| CMP-073 | `PhotoUploader` | Compress, preview, progress, camera capture. |
| CMP-074 | `DuplicateSuggestions` |  |
| CMP-075 | `AiSuggestionChips` | Accept / dismiss. |
| CMP-076 | `ReportSuccess`, `MyReportCard`, `QuickVoteButtons` |  |
| CMP-077 | `ModerationQueue`, `ModerationRow` | Admin. |

### 9.8 Insights

| ID | Component | Notes |
| --- | --- | --- |
| CMP-080 | `StatCard` (animated number, delta, sparkline) |  |
| CMP-081 | `RainfallTrendChart` | Dual axis with incident overlay. |
| CMP-082 | `AreaDistributionChart`, `AreaChoropleth` |  |
| CMP-083 | `SeverityDonut` | Plus accessible table. |
| CMP-084 | `HotspotTable` | Sparkline column, sort. |
| CMP-085 | `IncidentTimeline` | Virtualized, infinite scroll. |
| CMP-086 | `RouteHazardComparisonChart` |  |
| CMP-087 | `DataFreshnessPanel`, `SampleSizeNote`, `InsightsFilters` |  |

---

## 10. Performance Strategy

### 10.1 Budgets

| Metric | Budget |
| --- | --- |
| LCP (mobile 4G) | < 2.5 s (map shell paints < 1.2 s) |
| INP | < 200 ms |
| CLS | < 0.05 |
| Initial JS (gzip) | < 180 KB for the Map route, < 120 KB per lazy route chunk |
| Incident API p95 | < 300 ms (cache hit < 60 ms) |
| Weather API p95 | < 400 ms (cache hit < 60 ms) |
| Route compare p75 | < 5 s |
| Map interaction | 60 fps pan/zoom with 500 markers, graceful at 5,000 via clustering and canvas |

Budgets are enforced in CI (Lighthouse CI, `size-limit`, bundle analyzer diff on every PR).

### 10.2 Techniques

| Area | Strategy |
| --- | --- |
| **Lazy loading** | Lazy-load routes (`React.lazy` + `Suspense` with matching skeletons). Defer Recharts, the Report modal, Lightbox, command palette and Moderation until first use. Prefetch the Routes chunk on hover/focus of its nav item and during idle time (`requestIdleCallback`). AI explanation, photos and charts load only after the panel is visible. |
| **Code splitting** | Vendor chunks: `react`, `leaflet`, `turf` (tree-shaken per function), `charts`, `motion`. Dynamic import of Framer Motion features (`LazyMotion` with `domAnimation`). No full-lodash or full-Turf imports (lint rule). |
| **Memoization** | `React.memo` for markers and list rows, `useMemo` for derived geometry (clustering input, GeoJSON), `useCallback` for handlers passed to map layers, selector-based Zustand subscriptions (`useStore(s => s.selectedId)`) to avoid broad re-renders. Marker icons are cached by `(risk, severity, selected, demo)` key. Pure functions in `shared` (risk scoring) are memoised by input hash. |
| **Image optimization** | Client-side compression before upload. Server produces 400 px and 1200 px WebP variants (AVIF optional), served via CDN with long-lived immutable cache headers. `loading=lazy`, explicit width/height to prevent CLS, blur-up placeholders. Icons are tree-shaken inline SVG (Lucide). Fonts are self-hosted, `font-display: swap`, subset to Latin, with the primary weight preloaded. Demo images are bundled as optimised WebP. |
| **API caching** | Layered: browser (TanStack Query with per-endpoint `staleTime`), CDN (`s-maxage` on public GETs), Redis (weather, geocode, routes, AI), DB materialised views (analytics). ETag/304 for lists. Cache keys are rounded (coordinates to 2 decimals, bbox snapped to a grid) to maximise hit rates. Request coalescing on the server for identical in-flight calls. |
| **Virtualization** | `@tanstack/react-virtual` for the mobile viewport list, report timelines (> 20), recent incident feed, hotspot table (> 50) and moderation queue. Map layers: Leaflet canvas renderer when markers > 300, server clustering above a zoom threshold, viewport culling. |
| **Debouncing / throttling** | Search input 350 ms, map-move incident refetch 400 ms (on `moveend`, not `move`), filter changes 150 ms, route inputs 500 ms after both fields are valid, window resize 150 ms (throttled), geolocation watch 2 s throttle. AbortController cancels superseded requests. |
| **Infinite scrolling** | Recent incident timeline and My Reports use cursor pagination (`limit=20`) with an intersection-observer sentinel and a visible Load more button as a keyboard and fallback path. Map incident data is **not** paginated (it is viewport-bounded). |
| **Network** | HTTP/2 or 3, Brotli, preconnect to tile and API origins, batching for weather grids, `navigator.connection.saveData` reduces overlay and animation work. |
| **Rendering** | Transform/opacity-only animations, `content-visibility: auto` for off-screen cards, `will-change` only during active animation, CSS containment on map overlays. |
| **Backend** | Connection pooling, GiST spatial indexes, selecting only needed columns, precomputed risk cells for the city grid every 10 minutes, worker queues for AI and image processing, and graceful degradation under load (disable AI explanations first, then the overlay, then analytics refresh). |
| **Offline / resilience** | Service worker: cache-first for the app shell and fonts, stale-while-revalidate for incidents and demo data, network-first for routes and weather. |

### 10.3 Measurement

Web Vitals are reported to analytics (consented), with Sentry performance traces, API latency histograms per endpoint and per provider, synthetic uptime checks every minute, and a weekly review against budgets.

---

## 11. Security

### 11.1 Authentication

| Actor | Method | Notes |
| --- | --- | --- |
| Anonymous visitor (MVP default) | Signed, httpOnly, SameSite=Lax **device session cookie** issued on first request. Only a hash is stored. | Enables rate limiting, idempotency, quick votes and My Reports without friction. |
| Registered user (P2) | Email magic link and Google/Apple OAuth through a managed auth provider (for example Auth.js or Clerk). Passwords are avoided. | Adds trust score, notifications, saved places. |
| Moderator / admin | SSO or OAuth with MFA enforced, session lifetime 8 h, optional IP allowlist. | Separate `/admin` surface. |
| Service-to-service (partner feeds, P2) | API keys with scopes, hashed at rest, rotation support, per-key rate limits. |  |

### 11.2 Authorization

- **RBAC:** `anonymous` < `user` < `moderator` < `admin`, enforced in a central policy layer (not scattered across routes).
- **Object-level checks:** a device can only read or modify its own reports (`/me/*`). Quick votes are limited per device. Only moderators can verify, reject or merge. Every moderation action is audit-logged (who, what, when, before and after).
- **Data exposure:** public responses never include `deviceId`, GPS accuracy history, EXIF, IP or token data. Reporter identity is never exposed. Public incident coordinates are the confirmed pin, not raw device location.
- **Trust model:** a device trust score (starts at 0.5) rises with corroborated reports and falls with rejected ones. Low-trust devices have reports capped at Unverified and are rate-limited harder. It is automated and never shown to users as a score.

### 11.3 Input Validation and Output Safety

- **Everywhere:** zod schemas at every API boundary (body, query, params, headers), strict mode (unknown keys rejected), length and range limits, coordinate checks against the service area, whitelisted enums.
- **Text:** Unicode normalisation, control characters removed, HTML stripped (plain text only), rendered through React escaping (never `dangerouslySetInnerHTML`), links and contact details removed from public text, profanity filter.
- **Files:** type allowlist by **magic bytes** (not extension or client MIME), max size enforced in the signed-URL policy and again server-side, images decoded and **re-encoded** by a sandboxed worker (drops embedded payloads), EXIF stripped, dimension cap, malware scan hook in production. Uploads are served from a separate cookieless domain.
- **SQL:** parameterised queries only (ORM or query builder). Spatial inputs are validated before geometry construction.
- **SSRF:** the backend never fetches user-supplied URLs. Provider hosts come from an allowlist in config.
- **AI-specific:** untrusted text sits in delimited data blocks, outputs are schema-validated, evidence ids and numbers are verified against the input, output containing URLs, HTML or instructions is dropped, the model has no tool access, and prompts and keys stay server-side.

### 11.4 API and Transport Security

- HTTPS only, HSTS (1 year, preload), TLS 1.2 or higher.
- **CORS:** explicit origin allowlist per environment, never a wildcard with credentials.
- **CSRF:** SameSite cookies plus a double-submit CSRF token on state-changing requests. Admin routes also require a custom header.
- **Security headers:** strict **CSP** (`default-src 'self'`, `img-src` limited to self, data:, CDN and tile hosts, `connect-src 'self'`, `script-src 'self'` with nonces, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self), camera=(self)`, `Cross-Origin-Opener-Policy: same-origin`.
- **Dependency hygiene:** lockfile, Dependabot or Renovate, audit and license checks in CI, SBOM generation, pinned container images, minimal non-root runtime image.
- **Logging:** structured logs with requestId, no PII or tokens, secret redaction, audit log retention of 1 year. Alerts on 5xx spikes, circuit-breaker opens, AI quota exhaustion and unusual report volume.
- **Abuse and misinformation controls:** per-device and per-IP-hash limits, geographic plausibility checks (impossible travel between reports), AI spam flags, moderator queue, a Report a problem action on every incident, and the ability to quickly disable a bad actor's reports.

### 11.5 Environment Variables and Secrets

| Variable | Scope | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | API only, secret | Gemini access |
| `GEMINI_MODEL` | API | Model identifier (config, not code) |
| `OSRM_URL`, `OSRM_URL_SECONDARY` | API | Routing hosts |
| `NOMINATIM_URL`, `NOMINATIM_USER_AGENT` | API | Geocoding host and required User-Agent with contact |
| `OPEN_METEO_URL`, `OPEN_METEO_API_KEY` | API | Weather host and optional commercial key |
| `DATABASE_URL`, `REDIS_URL` | API, secret | Data stores |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `CDN_BASE_URL` | API, secret | Photo storage |
| `SESSION_SECRET`, `CSRF_SECRET`, `IP_HASH_SALT` | API, secret | Cookies and hashing |
| `ALLOWED_ORIGINS` | API | CORS allowlist |
| `DATA_MODE`, `DB_DRIVER`, `CACHE_DRIVER`, `AI_DRIVER` | API | Runtime modes |
| `VITE_API_BASE_URL`, `VITE_TILE_URL`, `VITE_SENTRY_DSN`, `VITE_ANALYTICS_ID` | Web (public by design) | Non-secret client config. Never put keys here. |

Rules: secrets live in the platform secret manager (never in git), `.env.example` documents every variable, pre-commit secret scanning (gitleaks), separate keys per environment, a rotation runbook, and the app fails fast on missing or malformed config.

### 11.6 Rate Limiting

| Scope | Limit (per device / IP hash) | Response |
| --- | --- | --- |
| Global API | 120 req/min | 429 + `Retry-After` |
| `GET /incidents`, `/weather` | 60 req/min | 429 |
| `GET /geocode/*` | 30 req/min (and 1 req/s upstream) | 429 |
| `POST /routes/compare` | 12 req/min, 120/day | 429 |
| `POST /reports` | 5/hour, 20/day | 429 with a friendly message |
| `POST /incidents/:id/votes` | 1 per incident per 30 min, 30/hour | 409 / 429 |
| `POST /uploads/sign` | 10/hour | 429 |
| AI-triggering endpoints | 20/hour per device plus a global daily budget cap | Fallback to template, not an error |
| `/admin/*` | 60 req/min per user | 429 |

Implemented with a Redis sliding-window limiter, a stricter tier for low-trust devices, and a global switch that sheds AI first when under attack. A CDN/WAF layer (bot protection, geo rules) fronts production.

### 11.7 Privacy and Compliance

- Location is requested only on explicit user action, is never stored for read-only browsing, and reports store only the pin the user confirmed. GPS accuracy is kept for quality checks only.
- Clear privacy notice and consent text on the report form. Analytics are consent-gated and avoid personal identifiers.
- Align with data-protection law in launch markets (for example India's DPDP Act and GDPR for EU users): purpose limitation, retention limits (see 8.8), access and deletion requests, and a breach procedure.
- **Safety disclaimer** in About and Onboarding: FloodSense is informational and not an official warning system. Users must follow official advisories, and links to local disaster-management authorities are included.
- Third-party terms to honour: OpenStreetMap attribution, tile provider terms, Nominatim usage policy, Open-Meteo licence (attribution, and a commercial plan for SaaS use), Gemini API terms.

---

## 12. Accessibility

**Target: WCAG 2.2 Level AA across all screens**, verified by automated and manual testing. Accessibility is a release gate, not a polish task.

### 12.1 Requirements

| Area | Requirements |
| --- | --- |
| **Color and contrast** | Text contrast >= 4.5:1 (large text 3:1). UI components and map markers >= 3:1 against their background in light, dark and both map themes. Risk is **never conveyed by color alone**: every risk level has an icon, a text label and, on the map, a distinct marker glyph or pattern. Hazardous route segments use dash patterns plus color. |
| **Text and media** | Body text >= 15 px, supports 200% zoom and 400% reflow without horizontal scroll (except the map and wide tables inside their own scroll container). Images have meaningful alt text (AI captions are reviewed and editable). Charts have text or table alternatives and direct labels. |
| **Keyboard** | All functionality is available by keyboard with a logical tab order and visible focus rings (2 px accent, 3:1 contrast, 2 px offset). Map: arrow keys pan, `+` and `-` zoom, `Enter` opens the focused marker, `Esc` closes panels. Skip links (Skip to map, Skip to results). No keyboard traps: modals trap focus intentionally and return it on close. |
| **Map alternative** | A **List view** of all incidents in the viewport (sortable, searchable) gives equal access to map content. Markers are focusable buttons with accessible names (for example: High risk, severe waterlogging, Andheri Subway, updated 6 minutes ago). Clusters announce their count and highest risk. |
| **Pointer and gestures** | Touch targets >= 44 x 44 px (never below the 24 px WCAG 2.5.8 minimum). Drag-only interactions have alternatives: bottom sheets have buttons, and the report pin can be moved by search or by arrow-nudge buttons (WCAG 2.5.7). Pinch and long-press have equivalent controls. |
| **Motion** | Honour `prefers-reduced-motion` (no parallax or count-up, opacity-only transitions). Nothing flashes more than 3 times per second. Auto-updating content (60 s refresh) can be paused and updates never steal focus. |
| **Forms** | Visible labels, instructions before input, inline errors announced via `aria-live`, an error summary that receives focus on submit failure, errors that explain the fix, `autocomplete` attributes, no time limits, and no cognitive tests for authentication. |
| **Language and content** | `lang` set, plain language at about grade 8, consistent navigation and component behaviour, consistent help location (About and Report a problem). Times show both relative and absolute forms. |
| **Semantics** | Native elements first (`button`, `a`, `table`, `dialog`), ARIA only where needed. Landmarks (`header`, `nav`, `main`, `aside`). Modals use `role=dialog` with `aria-modal`, a label and a description. Tabs, comboboxes and menus follow the ARIA Authoring Practices. |
| **Screen reader announcements** | Polite live regions (`role=status`) announce results loaded (12 incidents in view), route found, report submitted, filters applied and errors. Loading states use `aria-busy`. Skeletons are hidden from assistive tech behind a single Loading status. |
| **Themes** | Both themes pass contrast checks. System preference is respected. Forced-colors / high-contrast mode is supported (borders and icons keep their meaning). |
| **Charts and data** | Each chart has a Show as table toggle, keyboard-navigable data points, patterns or labels in addition to color, and descriptive summaries (for example: Rainfall peaked at 18 mm/h at 14:00). |

### 12.2 Testing Plan

- **Automated:** `eslint-plugin-jsx-a11y`, `axe-core` in unit and Playwright tests (zero serious or critical violations to merge), Lighthouse accessibility >= 95.
- **Manual, every release:** keyboard-only pass of every flow, screen reader passes (VoiceOver with Safari on iOS, TalkBack with Chrome on Android, NVDA with Firefox or Chrome), 200% and 400% zoom, Windows High Contrast, reduced motion, and color-blindness simulation (protanopia, deuteranopia, tritanopia) on the map and legend.
- Include users with disabilities in beta feedback. Publish an accessibility statement with a contact route.

---

## 13. Development Roadmap

### 13.1 Milestone Overview

| Milestone | Timeframe | Theme | Exit criteria |
| --- | --- | --- | --- |
| **M0: Hackathon demo** | 6 hours | Tier 1 working end to end | Map with demo data, weather, AI analysis, route comparison and the guided demo scenario all working. Demo banner and provenance labels present. |
| **M1: MVP hardening** | Weeks 1 to 3 | Reliable and testable | Backend API with real provider adapters, caching, tests, complete error/empty/loading states, `design.md` finalised, a11y baseline, CI/CD, staging. |
| **M2: Community and insight** | Weeks 4 to 7 | Reporting and analytics | Reporting flow with photos, duplicates and quick votes, moderation queue, analytics dashboard on real aggregates, My Reports. |
| **M3: Public beta** | Weeks 8 to 12 | Trust and scale | Postgres/PostGIS and Redis in production, rate limiting, security review, PWA offline, SSE updates, observability, accessibility audit, closed beta in one city. |
| **M4: Production v1** | Weeks 13 to 20 | Data quality and reliability | Self-hosted OSRM, commercial weather plan or self-hosted Open-Meteo, partner or authority data feed, accounts and trust scores, multi-city config, SLOs and on-call, legal and privacy review. |
| **M5: SaaS expansion** | After v1 | Commercial | B2B dashboards, exports and API, alerts (push, WhatsApp, SMS), vehicle profiles, white-label, team workspaces, native apps. |

### 13.2 M0: Six-Hour Hackathon Plan

| Hour | Deliverable |
| --- | --- |
| 0:00 to 0:45 | Repo scaffold (Vite, React, TS, Tailwind), basic tokens from `design.md`, shared types, demo dataset (40 incidents), app shell, theme, skeletons. |
| 0:45 to 2:00 | Live map: Leaflet, tile abstraction, markers, clustering, filters, legend, incident panel, search, dark map toggle. |
| 2:00 to 2:45 | Weather: Open-Meteo through a thin API route, rainfall classification, chip, drawer, hourly chart, error fallback. |
| 2:45 to 3:45 | Risk engine (shared, tested), Gemini explanation endpoint with schema validation and rule-based fallback, warnings. |
| 3:45 to 5:00 | Route planner: OSRM, Turf exposure scoring, hazard overlay, comparison cards, avoidance candidates, AI summary. |
| 5:00 to 5:40 | Polish: transitions, error/empty states, mobile layout, demo scenario button, About page with data honesty. |
| 5:40 to 6:00 | Rehearse the demo path, freeze, write README and `.env.example`. If time remains: the reporting form (P1). |

**Cut order if behind:** (1) rain overlay, (2) multi-report AI comparison, (3) avoidance via-points (keep OSRM alternatives only), (4) full dark UI theme (keep the dark map), (5) analytics. **Never cut:** provenance labels, the demo banner, and fallbacks.

### 13.3 Backlog by Milestone

**M1 MVP hardening**

1. Fastify API modules, provider interfaces, resilientFetch, Redis cache, structured errors.
2. Persistence: Postgres schema and seed script, repository layer (swap from in-memory).
3. Tests: unit tests for the risk engine, rainfall classification, route scoring and URL codecs (90% target on `packages/shared`), MSW integration tests for providers, Playwright E2E for the three core journeys.
4. Complete states for every screen, offline banner, error boundaries, consent-gated analytics events.
5. Performance pass to meet budgets, accessibility pass to AA, CI with preview deploys.

**M2 Community and insight**

1. Report flow, upload pipeline, duplicate detection, corroboration logic, quick votes.
2. Moderation queue, audit log, simple trust scoring, spam heuristics.
3. Analytics endpoints, materialised views, dashboard widgets, hotspot detection, CSV export.
4. AI quality loop: golden set, prompt versioning, feedback buttons, weekly accuracy report.

**M3 Public beta**

1. Security review and pen-test checklist, CSP in report-only then enforced, WAF.
2. PWA offline caching, SSE incident updates, saved places.
3. Observability dashboards, alerts and error budgets. Load test (500 concurrent map users, 50 route requests per second).
4. Closed beta with about 200 users in one city, feedback survey, trust metrics review.

**M4 Production v1**

1. Self-hosted OSRM (regional extract, nightly updates) with a secondary instance. Open-Meteo commercial plan or self-hosting.
2. Integrate authoritative sources where available (municipal control room feeds, traffic advisories, gauge data) as `partner` provenance with higher verification.
3. Accounts, trust scores, notification preferences. Multi-city onboarding tooling (city config, boundaries, demo-data generator).
4. Legal: privacy policy, terms, data-processing agreements, accessibility statement. SLOs (99.5% availability and the p95 latency budgets).

### 13.4 Testing Strategy

| Layer | Tools | Coverage focus |
| --- | --- | --- |
| Unit | Vitest | Risk engine, rainfall classification, route scoring, formatters, validators |
| Component | Testing Library + Storybook | States (loading, empty, error), a11y roles, keyboard |
| Integration | Vitest + MSW, Supertest | API modules with mocked providers, fallbacks, cache behaviour |
| Contract | Shared zod schemas | Provider response drift detection (scheduled canary calls) |
| E2E | Playwright | Map to incident to explanation, search to route comparison, report submission, offline mode |
| Visual | Playwright screenshots or Chromatic | Light, dark, mobile, desktop |
| AI evals | Golden dataset | Category accuracy, severity agreement, hallucination checks (evidence id and number verification) |
| Performance | Lighthouse CI, k6 | Budgets and load |
| Accessibility | axe, manual screen reader passes | Section 12 |

### 13.5 Key Analytics Events

`map_viewed`, `marker_selected`, `filter_changed`, `search_performed`, `weather_drawer_opened`, `risk_explanation_viewed`, `warning_seen`, `route_requested`, `route_selected` (with whether it was the fastest), `avoidance_route_found`, `open_in_maps_clicked`, `report_started`, `report_submitted`, `duplicate_confirmed`, `vote_cast`, `insights_viewed`, `theme_changed`, `data_mode_changed`, `error_shown` (code only). No free text or exact coordinates are logged, only rounded cells.

### 13.6 Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| No authoritative live flood feed | Empty or misleading map | Clear provenance labels, demo-mode disclosure, community reports, partner feed roadmap, insufficient-data states |
| False or malicious reports | Loss of trust, safety risk | Verification tiers, corroboration, rate limits, device trust, moderation queue, AI plausibility checks |
| Over-reliance on AI text | Hallucinated explanations | Deterministic score, schema validation, evidence-id verification, template fallback, visible AI-generated label |
| Public API limits (OSRM demo, OSM tiles, Nominatim, Open-Meteo free tier) | Throttling, policy violations | Provider abstraction, caching, self-hosting and commercial plans before launch |
| OSRM cannot exclude arbitrary roads | Weak avoidance | Via-point detour generation plus scoring, honest no-safer-route state, evaluate an engine with custom penalties (Valhalla, GraphHopper) in M4 |
| Liability if users rely on the app | Legal exposure | Informational disclaimer, links to official advisories, no guarantee language, legal review |
| Mobile map performance | Poor UX | Clustering, canvas rendering, budgets, lazy loading |
| Gemini cost or outage | Feature degradation | Caching, quotas, rule-based fallback |

### 13.7 Assumptions Made (the feature list was silent)

1. The launch city is configurable. Mumbai is used for the demo data.
2. Anonymous device sessions are sufficient for MVP reporting. Accounts arrive in M3 to M4.
3. Driving is the only routing profile in MVP. Two-wheeler weighting is a later enhancement.
4. The UI is English-only in MVP, but report text in other languages is accepted and classified.
5. A small backend is required even in the hackathon, to protect the Gemini key and proxy OSRM and Nominatim, so the browser never holds secrets.
6. The risk score is a transparent heuristic, not a hydrological prediction. Weights are tuned with real data after beta.
7. Hotspot thresholds (3 incidents in 30 days within 150 m) and rainfall bands are defaults to calibrate per city.

### 13.8 Definition of Done (per feature)

- Meets its FRs and has loading, empty, error and degraded states implemented.
- Unit and integration tests pass, and E2E covers the primary flow.
- Accessibility checks pass (axe clean, keyboard and screen-reader pass for new UI).
- Performance budgets respected with no bundle regressions.
- Analytics events added, errors reported to Sentry, docs updated (`design.md`, API docs).
- Security checklist complete: validation, authorisation, rate limits, no secrets in the client.
