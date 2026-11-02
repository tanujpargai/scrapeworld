# ScrapeWorld

> **Business Intelligence, Lead Qualification, and Opportunity Intelligence Platform**

ScrapeWorld is an end-to-end prospect discovery, qualification, and intelligence platform built specifically for web development and digital marketing agencies. It bridges the gap between raw business discovery (Google Maps / local directories) and actionable sales conversations through automated technical website audits, zero-cost public domain/TLS intelligence, configurable Ideal Customer Profile (ICP) scoring, and deterministic service opportunity assessments.

---

## Key Capabilities

### 1. Zero-Cost Business Intelligence & Discovery
- **Public Signal Enrichment**: Zero-paid-API enrichment using public RDAP (domain registration age, registrar), native TLS certificate inspection (expiry, issuer, validity), robots.txt, sitemaps, and security headers.
- **Technology & Platform Detection**: Rule-based detection of CMS platforms (WordPress, Shopify, Squarespace, Wix), analytics trackers (GA4, GTM, Meta Pixel), and legacy tech without commercial lookup APIs.
- **Safety & Rate Limiting**: Built-in SSRF protection (`url-safety`), non-routable IP blocking, domain resolution guards, and timeout controls.

### 2. Configurable Ideal Customer Profile (ICP) Engine
- **Multi-Profile Support**: Tailor qualification rules per service vertical (e.g., Website Redesign, E-Commerce Modernization, Local SEO, Conversion Rate Optimization).
- **Rule Engine**:
  - **Hard Filters**: Non-negotiable criteria (e.g., must have active phone, minimum 15 reviews).
  - **Exclusions**: Automatic rejection of competitors (e.g., web agencies, marketing firms).
  - **Weighted Scoring**: 0–100 additive scoring based on configurable positive and negative signals.
- **Deterministic Explanations**: Full transparency into why every lead qualified or failed, with exact point additions and deductions.

### 3. Deterministic Opportunity Intelligence Engine
- **Vertical Assessments**: Generates targeted service opportunity profiles for:
  - **Web Development** (Integral Labs): Redesign, mobile responsiveness, SSL modernization, performance optimization.
  - **Marketing & SEO** (Integral Marketing): Local SEO, social metadata, tracking/analytics implementations.
- **Agency Outreach Briefs**: Automatically generates actionable pitch points, conversation icebreakers, and technical audit checklists tailored to each lead.

### 4. Lightweight Lead Management & CRM Layer
- **Status Pipeline**: Track leads across standard agency stages: `NEW`, `QUALIFIED`, `CONTACTED`, `REPLIED`, `MEETING`, `WON`, `LOST`, `DISQUALIFIED`.
- **Filtering & Search**: Multi-dimensional filtering by service opportunity, priority level (`HIGH`, `MEDIUM`, `LOW`), ICP profile, and status.
- **Opportunity Drawer**: Slide-over drawer providing deep-dive technical diagnostics and outreach angles.
- **Exporting**: One-click CSV and JSON exports for outreach lists and qualified leads.

---

## Architecture & Tech Stack

- **Framework**: Next.js (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Lucide React
- **Data Persistence**:
  - Persistent JSON file-backed storage (`data/`) for zero-dependency local operation.
  - Optional Prisma ORM with PostgreSQL for production scale.
- **Background Processing**:
  - Modular worker architecture with optional BullMQ + Redis for asynchronous queueing and crawling.
- **Testing**: Jest with comprehensive unit and integration test suites.

---

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm (or yarn / pnpm)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/tanujpargai/scrapeworld.git
   cd scrapeworld
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Optional for local development — default settings allow immediate out-of-the-box operation)*

### Running the Application
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality Assurance & Verification

### Running Tests
Execute the full test suite (190+ test cases covering ICP evaluation, opportunity intelligence, RDAP/TLS parsing, normalization, and lead management):
```bash
npm test
```

### Type Checking
Run strict TypeScript static analysis:
```bash
npx tsc --noEmit
```

---

## License
Proprietary — Internal agency platform for Integral Labs and Integral Marketing.
