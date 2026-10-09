# 🌊 FloodIntel

> **Real-Time Urban Flood Intelligence, Risk Assessment & Route Resilience System**  
> *Built for Hackathon Judging & Rapid Municipal Environmental Response*

---

## 📌 Executive Summary

**FloodIntel** is a high-performance, real-time flood monitoring and disaster mitigation platform engineered for citizens, municipal emergency responders, and urban planners. By fusing hyper-local hydrologic telemetry, predictive precipitation models, verified citizen incident crowdsourcing, and intelligent pathfinding, FloodIntel bridges the critical gap between raw meteorological data and street-level safety decisions.

---

## ✨ Core Pillars & Features

| Module | Route | Capabilities & Purpose |
| :--- | :--- | :--- |
| **🌐 Public Portal (Landing)** | `/` | Real-time threat index, regional waterlogging advisories, quick telemetry KPIs, and immediate emergency contact protocols. |
| **🗺️ Live Risk Map** | `/risk-map` | High-fidelity interactive spatial map displaying active flood hazard zones, sensor water level elevations, rainfall intensity overlays, and filtering by severity. |
| **🧭 Safe Journey Planner** | `/plan-journey` | Dynamic routing calculating safe, passable transit corridors that bypass high-risk inundation zones and submerged bottlenecks. |
| **📢 Citizen Hazard Reporter** | `/report-hazard` | Fast, geo-tagged citizen incident reporting for waterlogging, clogged drains, and road blockages, feeding into the municipal verification queue. |
| **🛡️ Emergency Operations Dashboard** | `/officials` | Secure municipal dispatch command center featuring telemetry alert feeds, rapid resource deployment, sensor health monitoring, and municipal advisory broadcasting. |

---

## 🛠️ Architecture & Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Components & Client Interactivity)
- **UI & Components**: [React](https://react.dev/) + [Lucide Icons](https://lucide.dev/) + Google Material Symbols
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom Dark-Themed Surface/Primary Palette with High-Contrast Disaster Indicators)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict type-checking and interface definitions)
- **Target Integrations**:
  - **OpenWeatherMap API**: Quantitative Precipitation Forecasting & atmospheric telemetry.
  - **Spatial Routing**: Deterministic shortest & safest path engine.
  - **Google Gemini AI**: Explainable natural-language safety advisories and risk factor breakdown.

---

## ⚠️ Core Operational Constraints & Compliance

In strict adherence to safety and ethics specifications:
1. **Weather vs Ground Truth**: Meteorological rain data is never displayed as confirmed street-level waterlogging without telemetry or crowd-verified ground reports.
2. **Demo Data Transparency**: Synthetic telemetry feeds and mock emergency incidents are explicitly tagged with `[DEMO DATA]` badges to ensure test transparency during judging.
3. **Deterministic Routing**: Navigation paths are computed via mathematical graph algorithms; AI is reserved solely for explainable summaries and natural-language risk insights, avoiding hallucinated paths.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have installed:
- [Node.js](https://nodejs.org/) (v18.18.0 or later recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) / [pnpm](https://pnpm.io/)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/FloodIntel.git
cd FloodIntel
npm install
```

### 2. Configure Environment Variables

Duplicate the template configuration file:

```bash
cp .env.example .env.local
```

Open `.env.local` and add your respective API credentials:

```ini
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweathermap_api_key_here
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_DEMO_MODE=true
```

> *Note: The core user interface and simulated emergency dispatch telemetry run out-of-the-box in Demo Mode without requiring third-party API keys.*

### 3. Launch Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to explore the platform.

---

## 📂 Project Structure

```plaintext
FloodIntel/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root HTML layout, dark theme tokens & fonts
│   │   ├── page.tsx                # Landing Page & Public Safety Portal
│   │   ├── risk-map/
│   │   │   └── page.tsx            # Interactive Flood Risk Map
│   │   ├── plan-journey/
│   │   │   └── page.tsx            # Safe Navigation & Inundation Bypass Planner
│   │   ├── report-hazard/
│   │   │   └── page.tsx            # Citizen Incident Reporting Flow
│   │   └── officials/
│   │       └── page.tsx            # Municipal Emergency Dispatch Center
│   └── components/
│       ├── TopNavBar.tsx           # Global Navigation & Telemetry Status Beacon
│       └── Footer.tsx              # Protocol & Municipal Dispatch Links
├── public/                         # Static icons and assets
├── FloodIntel PRD.md               # Product Requirements Document & Architecture Spec
├── .env.example                    # Clean environment variables blueprint
├── .gitignore                      # Safe Git exclusions (node_modules, .next, .env)
├── package.json                    # Project scripts & dependencies
├── tailwind.config.js              # Theme design system & disaster severity palette
└── tsconfig.json                   # TypeScript configuration
```

---

## 📋 Available Scripts

- `npm run dev` — Starts the local Next.js development server at port 3000.
- `npm run build` — Compiles and builds production-optimized assets.
- `npm run start` — Runs the compiled Next.js production build.

---

## ⚖️ License & Hackathon Notice

Developed for emergency disaster management evaluation. Real-world emergency decisions must follow official municipal disaster management authority instructions.
