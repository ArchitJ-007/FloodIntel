# 🌊 FloodIntel

> **Real-Time Urban Flood Intelligence, Risk Assessment & Route Resilience System**  
> *Built for Hackathon Judging & Rapid Municipal Environmental Response*

---

**FloodIntel** - An IEEE Synapse Hackathon Prototype Made By Our Team  
Our Team Was Ranked **29** Out Of **57 Teams** For our Project

## 📌 Executive Summary

**FloodIntel** is a real-time flood monitoring, deterministic hazard scoring, and safe navigation platform engineered for citizens, municipal emergency responders, and urban commuters. By fusing open hydrologic weather telemetry, road network routing, citizen incident crowdsourcing, and explainable AI, FloodIntel bridges the critical gap between raw meteorological data and street-level travel decisions.

---

## 🛠️ Architecture & Actual Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React Server & Client Components)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict type-checking)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Google Stitch Dark-Themed Surface Palette)
- **Map Visualizations**: [Leaflet](https://leafletjs.com/) with [CARTO Voyager](https://carto.com/basemaps) public raster basemaps (no credentials exposed client-side)
- **Location & Geocoding**: [Mappls](https://about.mappls.com/) AutoSuggest API + [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) fallback + Curated India Landmark dictionary (covering Mumbai, Delhi, Bengaluru, Pune, Chennai, Kochi, Hyderabad, and more)
- **Weather Telemetry**: [Open-Meteo Forecast API](https://open-meteo.com/en/docs) (Real-time precipitation rates, 24h past/forecast series, PRD rainfall classification)
- **Routing & Pathfinding**: [OSRM](http://project-osrm.org/) (Open Source Routing Machine driving routes) + [Turf.js](https://turfjs.org/) (Spatial hazard buffer intersections and exposure calculation)
- **Risk Assessment**: Deterministic, reproducible mathematical risk engine ($score = 100 \times [0.35S + 0.25R + 0.15T + 0.15C + 0.10H]$)
- **AI Summaries & Classification**: Google Gemini (`@google/genai` SDK with `gemini-3.5-flash` primary) backed by deterministic safety templates
- **Report Persistence**: Versioned browser-local storage (`floodintel_user_reports_v1`)

---

## ✨ Core Application Modules

| Module | Route | Capabilities & Purpose |
| :--- | :--- | :--- |
| **🌐 Public Safety Portal** | `/` | Real-time threat index, location search, quick jump presets, illustrative hazard preview canvas, and live system status. |
| **🗺️ Interactive Risk Map** | `/risk-map` | India-wide spatial map displaying citizen and demo hazards, live Open-Meteo weather context, regional vs nationwide filters, and AI risk explanation panel. |
| **🧭 Safe Journey Planner** | `/plan-journey` | Dynamic routing calculating shortest, safest, and recommended corridors that avoid submerged bottlenecks using OSRM and Turf.js. |
| **📢 Citizen Hazard Reporter** | `/report-hazard` | Geo-tagged citizen incident reporting with input sanitization, duplicate detection, photo attachment, and truthful local persistence. |
| **🛡️ Command Portal** | `/officials` | Unauthenticated prototype command console with incident triage, local verification actions, and CSV export. |

---

## ⚠️ Provenance, Compliance & Safety Principles

1. **Deterministic Authority**: Risk scores are strictly calculated by the deterministic mathematical engine. AI cannot calculate or alter numeric scores, invent evidence IDs, or create route geometry.
2. **Weather vs Ground Observations**: Meteorological rainfall telemetry is never claimed to be confirmed street-level flooding without ground reports or physical sensors.
3. **Demo Data Transparency**: Synthetic records carry clear `[DEMO DATA]` badges. Real citizen submissions are saved locally on the reporting device as unverified reports.
4. **Local Device Persistence**: Citizen reports are stored in browser localStorage. They are unverified and are not shared with other devices or municipal databases.
5. **Officials Console Disclaimer**: The `/officials` dashboard is a prototype review interface (`DEMO ONLY — NOT AN AUTHENTICATED MUNICIPAL CONSOLE`).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18.18.0 or later, v20+ recommended)
- npm or yarn

### 2. Installation
```bash
git clone https://github.com/ArchitJ-007/FloodIntel.git
cd FloodIntel
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your API credentials in `.env.local`:
```ini
# Optional Mappls Static Key for India-wide place search
MAPPLS_API_KEY=your_mappls_key_here

# Optional Google Gemini API credentials
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
*(Note: If API keys are omitted or quota-limited, FloodIntel gracefully falls back to Open-Meteo geocoding and deterministic AI templates with truthful provenance indicators.)*

### 4. Running the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the comprehensive unit and integration test suite:
```bash
npm test
```
The test suite validates:
- Deterministic risk engine scoring, weights, and renormalizations (`riskEngine.test.ts`)
- Open-Meteo precipitation classification and accumulation calculations (`weather.test.ts`)
- OSRM route comparison and Turf.js hazard buffer intersections (`routing.test.ts`)
- Gemini AI prompt protection, output schemas, and template fallbacks (`gemini.test.ts`)
- Report validation, sanitization, and PRD duplicate detection (`reportingValidation.test.ts`)
- India-wide coordinate bounds, Mappls geocoding, and curated landmarks (`places.test.ts`)

Type-check without emitting:
```bash
npx tsc --noEmit
```

Production build validation:
```bash
npm run build
```

---

## 📄 License & Hackathon Notice

Developed for emergency disaster management and smart mobility evaluation. Real-world emergency transit decisions must follow official municipal disaster management authority instructions.
