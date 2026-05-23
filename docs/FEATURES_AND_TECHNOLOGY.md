# CrowdSphere AI — Features, Technology & How It Works

This document describes what CrowdSphere AI does, which technologies power it, and how the pieces fit together. It is written for operators, reviewers, and developers evaluating or extending the platform.

**Venue context:** Rajiv Gandhi International Cricket Stadium (RGIS), Hyderabad — IPL crowd operations command center (demonstration / prototype).

**Live deployment:** [https://crowdsphere-ai-36348366746.us-central1.run.app](https://crowdsphere-ai-36348366746.us-central1.run.app)  
**Source:** [github.com/keshavatigro/CrowdSphereAI](https://github.com/keshavatigro/CrowdSphereAI)

---

## 1. Purpose

CrowdSphere AI addresses a common stadium operations problem: **ticketing, crowd movement, vision, and emergencies live in separate systems**, so operators cannot react quickly when density spikes, gates queue, or weather threatens.

The application provides a **single browser-based command center** that:

- Shows live (simulated) telemetry for zones, gates, and incidents
- Recommends and applies crowd routing (`hold` / `in` / `out`)
- Uses **Google Gemini** for vision, telemetry analysis, and emergency playbooks
- Uses **OpenAI GPT-4o** as a conversational copilot that can **execute** backend actions via tools
- Supports IPL fixtures, match phases, and security tiers for realistic demo scenarios

---

## 2. Feature overview

### 2.1 Real-time command dashboard

The main UI (`CommandCenter`) is organized into sections:

| Section | What it shows |
|--------|----------------|
| **Real-time monitoring** | Occupancy widgets, zone status, gate queues, vision alert count |
| **Match & event analytics** | Attendance vs capacity, per-zone bars, fixture context |
| **Security intelligence** | Security tier (low / standard / high), steward/K9 posture for high-profile matches |
| **AI risk prediction** | Composite risk score from density, vision, emergencies, and Gemini insights |
| **Live operations** | Zone map, ticketing, vision panel, copilot, emergency controls, Gemini advisor |

**Header controls:**

- **IPL match selector** — fixtures grouped by security level (low, standard, **high** for sell-out derbies such as SRH vs RCB, SRH vs MI, SRH vs GT)
- **Match phase** — pre-match, in play, post-match (changes simulated crowd profiles)
- **Voice on/off** — browser text-to-speech for critical alerts (only when the fixture is **Live**)
- **Connected** — SSE link status
- **Live / Offline** — live when the fixture date equals today; otherwise treated as historical replay
- **Theme toggle** — light (default) or dark mode

Changing match or phase triggers a loading overlay, updates server state, and refreshes the Gemini telemetry advisor.

### 2.2 Unified ticketing simulation

Operators can simulate ticket scans at gates. Each scan:

- Updates gate queue and scan rate
- Increases linked zone occupancy
- Appears in recent ticket events

This demonstrates how **ingress data** can feed the same state model as crowd zones.

### 2.3 Dynamic crowd routing & digital signage

When zones are critical or when AI recommends action, the system can:

- Apply **routing actions** per zone: `hold` (block ingress), `in`, or `out`
- Write **digital signage** messages shown in the operations panel (with high-contrast styling in light and dark themes)

Routing can be triggered manually, via Gemini advisor “Apply routing plan,” or via the OpenAI copilot tool `apply_crowd_routing`.

### 2.4 Gemini — “Eyes” (vision & telemetry)

| Capability | Description |
|------------|-------------|
| **Telemetry advisor** | Analyzes full stadium state; returns risk summary, recommendations, and optional routing actions |
| **Vision — demo mode** | **Simulate CCTV scan** using live zone telemetry + stadium blueprint (no camera feed required) |
| **Vision — upload** | Optional base64 image upload for multimodal Gemini analysis |
| **Emergency playbooks** | Structured steps for weather, medical, crowd crush, etc. |
| **Blueprint egress** | Short guidance tied to nearest secure exit from `stadium-blueprint.json` |

If `GEMINI_API_KEY` is missing or the API fails, **rule-based fallbacks** keep demos usable.

### 2.5 OpenAI Command Copilot — “Brain”

GPT-4o powers a chat panel with **function calling**. The copilot can:

- Read live stadium status and gate queues
- Search **emergency SOPs** via RAG (`emergency-sops.json` + embeddings)
- Apply crowd routing, trigger shelter protocol, draft fan comms, and more

**Vision → Copilot pipeline:** a vision alert can be forwarded through `/api/pipeline/vision-to-copilot` so the operator sees a copilot reply with executable follow-ups.

### 2.6 Emergency response

- Trigger incidents (type, severity, affected zones)
- Generate AI playbooks (Gemini) and track active incidents
- Resolve incidents when cleared
- **Weather webhook** (`POST /api/webhooks/weather`) — simulates lightning proximity and can auto-run shelter protocol (close open-air gates, update signage)

### 2.7 Match context & security tiers

**IPL fixtures** (`ipl-fixtures.ts`) define match name, date, competition, and security level.

**Match phases** (`match-phase-profiles.ts`) adjust:

- Zone occupancy targets and flow rates
- Gate queue lengths
- Recommended directions (ingress vs egress bias)

**High-security + in play:** occupancy is refined to roughly **98–99%** total capacity with mostly critical/elevated zones — useful for sell-out demos.

### 2.8 Voice alerts

On **live** match days, with voice enabled:

- The client compares successive SSE state updates
- Detects new critical zones, emergencies, vision alerts, advisor changes
- Speaks short alerts via the browser **Web Speech API** (with cooldown to avoid repetition)

### 2.9 Stadium detail modal

Clicking the stadium name opens history, gate layout, past incident lessons, and security records from `stadium-profile.json`.

---

## 3. Technology stack

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | UI, routing, API routes in one project |
| **Styling** | Tailwind CSS v4 | Responsive layout, light/dark themes (`src/lib/theme.ts`) |
| **Validation** | Zod | Request body validation on API routes |
| **Google AI** | `@google/genai` (Gemini 2.5 Flash) | Vision, telemetry, playbooks, blueprint text |
| **OpenAI** | `openai` SDK (GPT-4o, `text-embedding-3-small`) | Copilot chat, tool execution, SOP RAG |
| **Realtime** | Server-Sent Events (SSE) | Push stadium state to all connected browsers |
| **State (demo)** | In-memory singleton store (`globalThis`) | Zones, gates, incidents, signage, match metadata |
| **Pub/sub** | In-process `broadcast.ts` | Notify SSE subscribers when store changes |
| **IDs** | `uuid` | Incidents, tickets, notifications |
| **Hosting** | Google Cloud Run | Containerized Next.js (`Dockerfile`, standalone output) |
| **Secrets** | GCP Secret Manager | `GEMINI_API_KEY`, `OPENAI_API_KEY` in production |
| **CI** | GitHub Actions | Lint, typecheck, build on push/PR |

**Environment variables (server-only):**

- `GEMINI_API_KEY` — Google AI Studio
- `OPENAI_API_KEY` — OpenAI Platform

Never commit real keys; use `.env.local` locally and Secret Manager on Cloud Run.

---

## 4. How it works — architecture

### 4.1 High-level diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Browser — Command Center                       │
│  Dashboard · SSE client · Voice · Copilot UI · Theme (light/dark) │
└─────────────────────────────┬────────────────────────────────────┘
                              │
              REST (POST/PATCH/GET)          SSE GET /api/events
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                     Next.js server (App Router)                     │
│  API routes · Zod validation · rate limiting (security.ts)        │
└───────┬─────────────────────────────────────┬────────────────────┘
        │                                     │
        ▼                                     ▼
┌───────────────┐                     ┌───────────────┐
│    Gemini     │                     │    OpenAI     │
│ vision ·      │                     │ copilot ·     │
│ telemetry ·   │                     │ tools · RAG   │
│ playbooks     │                     │               │
└───────┬───────┘                     └───────┬───────┘
        │                                     │
        └─────────────────┬───────────────────┘
                          ▼
                 ┌─────────────────┐
                 │  Stadium store   │
                 │ zones · gates ·  │
                 │ incidents · match│
                 └────────┬─────────┘
                          │ broadcast()
                          ▼
                 ┌─────────────────┐
                 │  SSE subscribers │
                 │  (all clients)   │
                 └─────────────────┘
```

**Design metaphor:**

- **Eyes** — Gemini observes (vision + telemetry)
- **Brain** — OpenAI reasons and plans in natural language
- **Hands** — Backend store and APIs execute routing, shelter, signage, emergencies

### 4.2 State model

The canonical object is `StadiumState` (`src/lib/types.ts`), including:

- `zones[]` — occupancy, capacity, status (`normal` | `elevated` | `critical`), flow rate, recommended direction
- `gates[]` — queue length, scan rate, open/closed
- `activeIncidents[]`, `visionAlerts[]`, `fanNotifications[]`
- `signageMessages` — zone id → message
- `matchId`, `matchName`, `matchDate`, `matchPhase`, `matchBroadcast` (`live` | `offline`)
- `securityLevel`, `lastInsight`, weather string

`getStore()` returns a **singleton** `StadiumStore` attached to `globalThis` so all API handlers share one world state per server instance.

### 4.3 Realtime loop

1. Client opens `EventSource("/api/events")`.
2. Server sends initial state, then runs a **~4 second simulation tick** (adjusts occupancy/queues slightly).
3. On any mutation (scan, routing, emergency, match change), `broadcast()` pushes a new `state` event.
4. `useStadiumStream` normalizes fixture metadata and updates React state.
5. `useVoiceAlerts` diffs previous vs current state for spoken alerts.

### 4.4 Match / fixture change flow

1. User selects fixture or phase in the header.
2. `PATCH /api/match` with `{ fixtureId }` and/or `{ phase }`.
3. Store applies phase profile, occupancy, security metadata, and may call Gemini for a fresh advisor insight.
4. Updated state is broadcast; UI clears loading overlay.

### 4.5 Vision flow (demo path)

1. User selects zone and clicks **Simulate CCTV scan**.
2. `POST /api/vision/analyze` with `{ demo: true, zoneId, ... }`.
3. Server builds a text prompt from live telemetry + blueprint context.
4. Gemini returns density estimate, anomalies, recommended actions.
5. Store records a `VisionAlert`; optional pipeline sends summary to copilot.

### 4.6 Copilot tool execution flow

1. User sends a message to `POST /api/copilot/chat`.
2. OpenAI may return tool calls (`get_stadium_status`, `apply_crowd_routing`, `search_sops`, etc.).
3. `agent-tools.ts` runs each tool against the store / RAG / Gemini.
4. Results are sent back to the model for a final natural-language reply.
5. Updated `StadiumState` is returned to the client.

### 4.7 Security (demo scope)

- API keys only on the server
- Input sanitization (`sanitizeText`)
- Per-IP rate limits on sensitive routes
- Zod schemas reject malformed payloads

Production would add authentication, persistent storage, and audited operator roles.

---

## 5. API surface (summary)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/state` | GET | Full snapshot |
| `/api/events` | GET | SSE stream |
| `/api/ticketing/scan` | POST | Simulate gate scan |
| `/api/crowd` | GET/POST | Zones/gates; apply routing |
| `/api/emergency` | GET/POST/PATCH | Incidents |
| `/api/ai/analyze` | POST | Gemini telemetry analysis |
| `/api/match` | PATCH | Change fixture and/or phase |
| `/api/vision/analyze` | POST | Demo or image vision |
| `/api/copilot/chat` | POST | Copilot + tools |
| `/api/copilot/draft-comms` | POST | Draft fan messages |
| `/api/pipeline/vision-to-copilot` | POST | Vision → copilot handoff |
| `/api/webhooks/weather` | POST | Lightning → shelter |
| `/api/blueprint/exit` | POST | Egress guidance |

See the main [README](../README.md) for curl examples.

---

## 6. Static data assets

| File | Purpose |
|------|---------|
| `src/data/stadium-profile.json` | Venue facts, history, gate labels |
| `src/data/stadium-blueprint.json` | Zones, exits, adjacency for routing/vision |
| `src/data/emergency-sops.json` | SOP text for RAG retrieval |

---

## 7. Deployment

**Local:** `npm install` → configure `.env.local` → `npm run dev`

**Production:** Docker image on **Cloud Run** (`crowdsphereai` project). Deploy script: `scripts/deploy-cloud-run.sh` (stores secrets in GCP Secret Manager).

The Next.js build uses `output: "standalone"` for a minimal container image.

---

## 8. Scalability & limitations (important)

This repository is a **demonstration prototype**:

| Current behavior | Production direction |
|------------------|---------------------|
| In-memory store | Redis or PostgreSQL |
| In-process SSE broadcast | Redis Pub/Sub or managed realtime |
| Single Cloud Run instance | Horizontally scaled instances + sticky sessions or shared state |
| Simulated telemetry ticks | Real sensors, ticketing feeds, CCTV integrations |
| No operator login | SSO / RBAC for stadium staff |

Understanding these boundaries helps when presenting the app as a **vision** versus a production system.

---

## 9. Suggested demo narrative (5–10 minutes)

1. Open dashboard — confirm **Live** badge if today matches the default fixture date.
2. Select a **high-security** match and **In play** — observe ~98%+ occupancy.
3. Enable **Voice** and trigger a critical zone or emergency.
4. **Simulate ticket scan** at a busy gate.
5. Run **Simulate CCTV scan** on Food Court.
6. **Run Gemini Crowd Analysis** → **Apply AI Routing Plan** — read digital signage.
7. Ask the **Command Copilot** about North Stand or SOPs; approve a tool action.
8. Switch to **Post-match** — egress bias on zones.
9. Run **weather webhook** — shelter protocol and closed gates.

---

## 10. Related documentation

- [README.md](../README.md) — quick start, environment variables, API curl examples, project tree
- [.env.example](../.env.example) — required environment variables

For questions or extensions, start in `src/lib/store.ts` (state), `src/components/CommandCenter.tsx` (UI shell), and `src/lib/agent-tools.ts` (copilot capabilities).
