# quranplanner.org — Development & System Architecture Guide

Welcome to the **Quran Planner** codebase! This document serves as the comprehensive architectural reference and guide.

If you ever need to add a feature, refactor an export flow, adapt CSS styles, or fix a bug, this guide contains everything you need to know.

---

## 📑 Table of Contents

1. [Executive Summary & Core Principles](#1-executive-summary--core-principles)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Directory & File Map](#3-directory--file-map)
4. [Data Layer & Lookup Tables](#4-data-layer--lookup-tables)
5. [The Core Algorithm Engine (`js/core/algo.js`)](#5-the-core-algorithm-engine)
6. [Services Layer (`js/services/`)](#6-services-layer)
   - [Plan Lifecycle (`plan-service.js`)](#plan-service)
   - [Multi-Page PDF & Print Service (`export.js`)](#export-service)
   - [iCalendar (`.ics`) Generator (`export.js`)](#icalendar-generator)
   - [URL Plan Sharing & Obfuscation (`share-service.js` & `plan-encoder.js`)](#sharing-and-encoding)
   - [Defensive Local Storage (`storage.js`)](#storage-service)
7. [User Interface Layer (`js/ui/`)](#7-user-interface-layer)
   - [Centralized DOM Registry (`dom.js`)](#dom-registry)
   - [Rendering Engine (`plan-renderer.js`)](#plan-renderer)
   - [Event Hub (`events.js`)](#event-hub)
   - [Add to Calendar Modal (`calendar-modal.js`)](#calendar-modal)
   - [Unified Info & Tip Boxes (`info-box.js`)](#info-box-component)
   - [Toast Notification System (`toast.js`)](#toast-system)
   - [Theme System (`theme.js`)](#theme-system)
8. [Islamic Hijri & Ramadan Calculations (`js/calendar/ramadan.js`)](#8-islamic-hijri--ramadan-calculations)
9. [CSS Design System & Print Engine (`css/styles.css`)](#9-css-design-system--print-engine)
10. [Local Development, Testing & Verification](#10-local-development-testing--verification)
11. [Gotchas, Invariants & Developer Golden Rules](#11-gotchas-invariants--developer-golden-rules)

---

## 1. Executive Summary & Core Principles

**`quranplanner.org`** is a 100% static, client-side, zero-backend web application that creates custom daily reading plans for the Quran. Users specify how many days they want to finish in (or a target finish date / Ramadan), and an optional starting point (Surah & Ayah).

### Core Pillars
1. **Zero External Backend / 100% Client-Side**:
   - Runs on static hosting (GitHub Pages). No Node.js runtime, no databases, no server-side APIs.
2. **Vanilla ES6 Modules**:
   - Native standard ES Modules (`<script type="module" src="js/app.js">`). No bundling, Webpack, or Vite step required. Instant browser refresh.
3. **Pure Precision Math**:
   - Algorithmic word-count balancing with $O(\log N)$ binary search. Zero rounding drift.
4. **Privacy First**:
   - All state is persisted purely in the user's browser `localStorage`.
5. **Universal Accessibility (a11y)**:
   - Full keyboard navigation, `aria-live` polite regions, screen-reader semantics, and high-contrast dark/light theme support.

---

## 2. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 index.html                                  │
│   (Semantic HTML5, Accessible Dialogs, Responsive Cards, Print Breakpoints) │
└───────────────────────┬─────────────────────────────────────────────────────┘
                        │
                        ▼
               js/app.js (Entry Point)
       ┌────────────────┴────────────────┐
       ▼                                 ▼
js/ui/events.js                  js/services/plan-service.js
 (Binds Form, Pills, Keys)        (Coordinates State & Generation)
       │                                 │
       │                                 ├────────────────────────┐
       ▼                                 ▼                        ▼
js/calendar/ramadan.js            js/core/algo.js           js/services/storage.js
(Umm al-Qura Hijri Engine)       (Prefix sums, Ruku snap,   (Safe localStorage)
                                  Word volume balancing)
                                         │
                                         ▼
                                 js/ui/plan-renderer.js
                                 (DOM Fragment Rendering)
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
       js/services/export.js   js/ui/calendar-modal.js   js/services/share-service.js
       (Vector PDF & .ics)     (Guidance Dialog)         (Base64URL Tokenizer)
```

---

## 3. Directory & File Map

```
quran-planner/
├── index.html                   # Core single-page layout & semantic DOM templates
├── README.md                    # Public user & feature overview
├── css/
│   └── styles.css               # Unified stylesheet: design tokens, dark mode, print rules
├── js/
│   ├── app.js                   # Application bootstrap / entry point
│   ├── config.js                # Default algorithm settings & balancing modes
│   ├── data/
│   │   └── surahs.js            # 114 Surahs list (numbers, English names, Arabic, ayah counts)
│   ├── core/
│   │   ├── lookup-tables.js     # Pre-computed prefix tables: SURAH_START_AYAHS, CUMULATIVE_WORDS, RUKUS
│   │   └── algo.js              # Core mathematical planner & Ruku-snapping engine
│   ├── services/
│   │   ├── plan-service.js      # Plan lifecycle controller (validation, calculate, render, persist)
│   │   ├── export.js            # Vector PDF / Print engine and RFC 5545 iCalendar (.ics) generator
│   │   ├── share-service.js     # Obfuscated URL token share & clipboard handler
│   │   └── storage.js           # Defensive try/catch localStorage wrapper
│   ├── calendar/
│   │   └── ramadan.js           # Umm al-Qura Hijri calendar computations via Intl.DateTimeFormat
│   ├── utils/
│   │   └── plan-encoder.js      # Base64URL encoder/decoder for compact shareable links
│   └── ui/
│       ├── dom.js               # Centralized cached registry of DOM element references
│       ├── events.js            # User interactions, pill handlers, form synchronization
│       ├── plan-renderer.js     # Efficient DocumentFragment DOM table builder
│       ├── calendar-modal.js    # Add-to-Calendar guidance dialog with acknowledgement enforcement
│       ├── info-box.js          # Unified reusable callout component for tips & duration notices
│       ├── toast.js             # Accessible, non-blocking notification alerts with vibration
│       ├── theme.js             # Light / Dark / System appearance manager
│       └── tooltips.js          # Accessible desktop hovering stat tooltips
└── documentation/
    ├── algo.md                  # Detailed mathematical walkthrough of the algorithm
    └── handover.md              # THIS HANDOVER GUIDE
```

---

## 4. Data Layer & Lookup Tables

The Quran consists of **6,236 Ayahs** across **114 Surahs** and **77,430 words**.

### `js/data/surahs.js`
- Exports `CONSTANTS.TOTAL_AYAHS = 6236` and `CONSTANTS.TOTAL_SURAHS = 114`.
- Exports `SURAHS`: An array of 114 objects indexed `0` to `113`.
  ```javascript
  { number: 1, name: "Al-Fatihah", arabic: "الفاتحة", ayahs: 7 }
  ```
  > **Indexing Rule**: `SURAHS[0]` is Surah 1. Any variable named `surahIdx` or `startSurahIdx` in code is **always 0-indexed**.

### `js/core/lookup-tables.js`
Contains typed static arrays initialized via IIFEs to enable instant $O(1)$ lookups:
- `SURAH_START_AYAHS`: Array of length 115. `SURAH_START_AYAHS[i]` gives the number of ayahs that exist *before* Surah `i`. For example, `SURAH_START_AYAHS[0] = 0`, `SURAH_START_AYAHS[1] = 7`.
- `CUMULATIVE_WORDS`: Array of length 6,237. `CUMULATIVE_WORDS[globalAyah]` gives the total cumulative words from the start of the Quran up to that global ayah.
- `CUMULATIVE_RUKU_ENDINGS`: Array of length 556 containing the global ayah numbers where each Ruku section concludes.

---

## 5. The Core Algorithm Engine (`js/core/algo.js`)

*(For complete math proofs and step-by-step walkthroughs, refer to [`documentation/algo.md`](algo.md))*

### Primary Function: `calculatePlan(params)`
```javascript
calculatePlan({
  days,            // e.g. 30
  startSurahIdx,   // e.g. 1 (Surah 2)
  startAyah,       // e.g. 100
  planStartDate,   // Date instance
  volumeMode,      // 'BY_WORD_COUNT' (default) or 'BY_AYAH_COUNT'
  endingStrategy   // 'NEAREST_RUKU' (default) or 'MATHEMATICAL'
})
```

### The 4 Key Invariants
1. **Prefix Coordinate Mapping**:
   The planner flattens any `(surah, ayah)` into a single 1-based index from `1` to `6236`:
   ```javascript
   function ayahsBefore(surahIdx, ayahOffset) {
     return SURAH_START_AYAHS[surahIdx] + ayahOffset;
   }
   ```
2. **Cumulative Balancing (No Rounding Drift)**:
   Targets are evaluated from Day 1 rather than accumulating delta errors day-by-day:
   $$\text{targetWord} = \text{alreadyReadWords} + \text{round}\left(\frac{\text{remainingWords}}{\text{days}} \times d\right)$$
3. **Strict Boundary Safety (`minAllowed <= target <= maxAllowed`)**:
   - `minAllowed = currentAyahIndex + 1`: Every day is guaranteed to advance by at least 1 verse (no empty/0-ayah days).
   - `maxAllowed = TOTAL_AYAHS - (days - day)`: Ensures that enough verses remain so that every future day has at least 1 verse (no starved days).
4. **Final Day Pinning**:
   On `day === days`, `targetAyah` is hard-pinned to `6236` (Surah 114, Ayah 6), guaranteeing completion on the exact chosen date.

---

## 6. Services Layer (`js/services/`)

### `plan-service.js`
Coordinates between the user's input, the algorithm, and the DOM:
- `generatePlan(customStartDate, skipScroll)`: Reads `#days`, `#startSurah`, `#startAyah`, runs input validation, runs `calculatePlan()`, saves plan in `localStorage`, and triggers `renderPlan()`.
- `clearPlan()`: Resets inputs, clears DOM result table, and removes saved plan from `localStorage`.
- `loadSavedPlan()`: Restores previous inputs and plan on page refresh.
- `getCurrentPlan()`: Getter for currently active plan in memory.

### `export.js`
Handles document exports:
1. **Vector PDF & Print (`printPlan()`)**:
   - Sets `document.title = 'quranplanner.org'`. In desktop and mobile browsers (iOS Safari, Android Chrome), `window.print()` names the generated PDF according to `document.title`.
   - Fires `window.print()`. Clean `@media print` rules in `styles.css` hide the page chrome and paginate the results card cleanly.
2. **iCalendar Export (`downloadCalendarPlan()`)**:
   - Generates standard RFC 5545 `.ics` content with `DTSTART;VALUE=DATE` and `DTEND;VALUE=DATE` all-day events.
   - Triggers download via Blob URL (with data-URI fallback).
   - Each event summary is formatted as: `Day X: Read till Surah [Name] [Ayah]`.

### `share-service.js` & `plan-encoder.js`
- `sharePlan()`: Invokes native `navigator.share()` on mobile devices (HTTPS). Falls back to copying the shareable URL to clipboard with a toast notification on desktop.
- `encodePlan()`: Packs `{ days, startSurahIdx, startAyah, startDate }` into a compact URL-safe Base64URL string (omits default values to keep strings tiny: `?p=...`).
- `loadPlanFromUrl()`: Decodes `?p=` parameter on page load, populates fields, and automatically renders the shared schedule.

### `storage.js`
Defensive storage wrapper preventing uncaught exceptions in browser incognito/private modes:
- `Storage.KEYS`: Centralized keys (`PLAN`, `THEME`).
- Wraps all `localStorage.getItem` and `localStorage.setItem` calls in `try / catch`.

---

## 7. User Interface Layer (`js/ui/`)

### `dom.js` (DOM Registry)
To maximize rendering performance and eliminate repeated `document.getElementById` queries, all primary DOM nodes are cached once in `DOM`. Always import `DOM` rather than querying elements manually:
```javascript
import { DOM } from './dom.js';
DOM.days.value = 30;
```

### `plan-renderer.js`
- Batches all day-by-day table row elements into a single in-memory `DocumentFragment` before updating `#planRows`.
- Highlights today's reading with `.today-row` and a badge `Today`.
- Uses `Intl.NumberFormat` and `Intl.DateTimeFormat` with cached instances.

### `events.js`
The master event hub. Initialized once on page boot (`initUIEvents()`):
- Handles preset duration pills (`15 Days`, `1 Month`, `3 Months`, `6 Months`, `1 Year`).
- Synchronizes the native `<input type="date">` with `#days`.
- Manages starting Surah `<select>` change events and sets `#startAyah` max limits.
- Supports `Enter` key on form inputs.

### `calendar-modal.js`
Controls the **Add to Calendar** modal (`#calendarModal`):
- Opens when `#calendarBtn` is clicked.
- Displays dynamic event count and date span:
  `Adds 15 daily events from 11 Oct 2026 to 25 Oct 2026`.
- **Mandatory Acknowledgement**: Keeps `#calendarModalDownloadBtn` disabled until the user checks `#calendarModalDontShow` (`"I've read the note and I understand"`).
- Resets the checkbox to unchecked and download button to disabled every time the modal opens.
- Fully accessible with `Escape` key dismiss and initial autofocus.

### `info-box.js` (Reusable Callout Component)
Standardized UI component for informational callouts.
- Styled by `.info-box`, `.info-box-icon`, `.info-box-body`, `.info-box-title`, `.info-box-desc`, `.info-box-close`.
- Used for:
  1. **Before Ramadan Notice** in form (`#ramadanNote`).
  2. **End Ramadan Notice** in form (`#ramadanNote`).
  3. **New Calendar Tip** inside the calendar modal.

### `toast.js`
Accessible notification toasts:
- Non-blocking, stacked in fixed `#toastContainer`.
- Positioned to clear mobile Dynamic Islands and notches:
  `top: max(calc(env(safe-area-inset-top, 0px) + 18px), 64px)`.
- If the exact same message is triggered repeatedly, it shakes via `.toast-vibrate` instead of spamming duplicates.

### `theme.js`
Light / Dark / System mode:
- Toggles `<html class="dark">`.
- Synchronizes with CSS color variables (`:root` and `html.dark`).
- Dynamically responds to OS `prefers-color-scheme` changes when in `system` mode.

---

## 8. Islamic Hijri & Ramadan Calculations (`js/calendar/ramadan.js`)

Uses the native browser internationalization engine:
```javascript
new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { ... })
```
- Estimates the upcoming **1st of Ramadan** using Umm al-Qura lunar calculations without requiring external prayer-time APIs.
- Provides:
  - `getNextRamadanStart()`: Finds the Gregorian date for the upcoming 1st of Ramadan.
  - `getEndRamadanPlan()`: Calculates the total days to finish by the **29th of Ramadan**.

> **Note on Lunar Sighting**: Moon sighting can shift by ±1 day. All UI banners include a respectful disclaimer informing users that actual dates depend on local moon sighting.

---

## 9. CSS Design System & Print Engine (`css/styles.css`)

### CSS Custom Properties (`:root`)
- Modern design tokens with semantic variables: `--bg`, `--card`, `--text`, `--muted`, `--accent`, `--border`, `--radius-md`, `--shadow-card`.
- Dark theme overrides live under `html.dark`.

### Print & PDF Engine (`@media print`)
When printing (`window.print()`):
- **Full Chrome Suppression**: Hides headers, form cards, pills, buttons, theme switches, toasts, and dialogs.
- **Card Expansion**: `#results` expands to 100% vector width without borders or box-shadows.
- **Page Break Avoidance**:
  ```css
  .day-row {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  ```
  Prevents day rows from breaking awkwardly across printed page margins.
- **Title Scaling**: Header displays `quranplanner.org` at `24pt`, while the subtitle is suppressed (`display: none !important`).

---

## 10. Local Development, Testing & Verification

Because there are **no build tools, transpilers, or dependencies**, local development is immediate:

### 1. Running Locally
Run any lightweight static server:
```bash
# Python 3
python3 -m http.server 5173

# Or Node.js
npx serve .
```
Visit `http://localhost:5173/index.html`.

### 2. Syntax & Validation Checks
Verify syntax across all ES modules without a bundler:
```bash
node --check js/app.js
node --check js/core/algo.js
node --check js/services/export.js
node --check js/ui/calendar-modal.js
```

---

## 11. Gotchas, Invariants & Developer Golden Rules

1. **Keep it 100% Static**:
   Do **not** introduce server-side dependencies, Node.js express routes, or external APIs that require secret keys. GitHub Pages hosts this completely free.
2. **Preserve the 0-Index vs 1-Index Rule**:
   - `SURAHS` array is 0-indexed (`0` to `113`).
   - Global Ayahs are 1-indexed (`1` to `6236`).
   - Verses within Surahs are 1-indexed (`1` to `surah.ayahs`).
3. **Always Check Safe Areas on Mobile**:
   When adjusting floating elements (toasts, modals, headers), always account for `env(safe-area-inset-top)` and Dynamic Islands.
4. **Never Break Algorithm Safety Invariants**:
   If modifying `algo.js`, never allow `targetAyah` to fall below `minAllowed` or exceed `maxAllowed`.
5. **PDF Naming Convention**:
   If updating print logic, maintain `document.title = 'quranplanner.org'` before calling `window.print()` to preserve the clean `.pdf` default filename.

---

### Handover Complete
You now have the complete architectural blueprint of the application. The codebase is clean, modular, and built to last. Welcome aboard, and best of luck building on top of Quran Planner! 🚀
