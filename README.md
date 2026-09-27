# Quran Planner

Generate a day-by-day reading plan to finish the Quran in a chosen number of days — starting from any Surah and Ayah — and export it as a high-resolution image.

## Table of Contents

- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [How the Planning Algorithm Works](#how-the-planning-algorithm-works)
  - [1. Building Cumulative Timelines](#1-building-cumulative-timelines)
  - [2. Locating Your Starting Point](#2-locating-your-starting-point)
  - [3. Reading Volume Balancing Modes](#3-reading-volume-balancing-modes)
  - [4. Day Ending Strategies & Boundary Snapping](#4-day-ending-strategies--boundary-snapping)
  - [5. Mapping Each Day Back to a Surah & Ayah](#5-mapping-each-day-back-to-a-surah--ayah)

<p align="center">
  <a href="https://zainkhalid.org/quran-planner.html">
    <img src="https://img.shields.io/badge/Live%20Demo-Click%20Here-brightgreen" alt="Live Demo" />
  </a>
</p>

## Screenshots

<p align="center">
  <img src="screenshots/home-page.png" alt="Home Page" width="48%" />
  <img src="screenshots/dark-mode.png" alt="Dark Mode" width="48%" />
</p>

<p align="center">
  <img src="screenshots/plan.png" alt="Generated Plan" width="48%" />
  <img src="screenshots/download-plan.png" alt="Download Plan" width="48%" />
</p>

## Quick Start

Open [`index.html`](index.html) directly in any modern browser, or serve it locally:

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173/index.html`.

## Tech Stack

| Layer | Details |
|---|---|
| Markup | Semantic HTML5 |
| Styling | Vanilla CSS — custom properties (`:root` / `html.dark`), flexbox & grid |
| Logic | Vanilla ES6+ JavaScript, `Intl.DateTimeFormat` for Islamic calendar dates, `localStorage` for persistence |
| Export | [html2canvas](https://html2canvas.hertzen.com/) for client-side PNG rendering |

## How the Planning Algorithm Works

The planner takes a starting point (Surah + Ayah) and a target number of days, then evenly distributes the remaining ayahs so you finish exactly on schedule — no day is left noticeably shorter or longer due to rounding.

Four steps make this work:

### 1. Building a Cumulative Timeline

The Quran has **6,236 ayahs across 114 Surahs**. On startup, the app builds a *prefix sum array* — a running total of ayahs before each Surah — so any ayah's position can be found instantly instead of re-counting every time.

```javascript
// CUMULATIVE_AYAHS[i] = total ayahs before Surah at array index i
const CUMULATIVE_AYAHS = (() => {
  const arr = [0];
  let sum = 0;
  for (let i = 0; i < SURAHS.length; i++) {
    sum += SURAHS[i].ayahs;
    arr.push(sum);
  }
  return arr;
})();
```

This produces a single timeline from `1` to `6,236`:

| Surah | Ayahs | Global range |
|---|---|---|
| 1 – Al-Fatiha | 7 | 1–7 |
| 2 – Al-Baqarah | 286 | 8–293 |
| 3 – Ali 'Imran | 200 | 294–493 |
| ... | ... | ... |
| 114 – An-Nas | 6 | 6231–6236 |

```javascript
// The resulting array:
[0, 7, 293, 493, 669, /* ... */ 6230, 6236]
//  ↑                                    ↑
//  before Surah 1                       total Quran ayahs
```

> **A note on indexing:** everywhere in this codebase, `SURAHS` is a plain 0-indexed array (`SURAHS[0]` = Surah 1, `SURAHS[113]` = Surah 114). Any variable named `*Idx` (`surahIdx`, `startSurahIdx`) refers to this 0-based position — not the Surah's actual number. The two are only ever off by exactly 1.

### 2. Locating Your Starting Point

**Populating the dropdown.** The `<select id="startSurah">` uses each Surah's 0-based index as the option value, while showing the 1-based number to the user:

```javascript
SURAHS.forEach((surah, index) => {
  const option = document.createElement('option');
  option.value = index;                          // 0, 1, 2, ... 113
  option.textContent = `${surah.number}. ${surah.name}`; // "1. Al-Fatiha", etc.
  DOM.startSurah.appendChild(option);
});
```

`parseInt(DOM.startSurah.value)` at plan-generation time gives you `startSurahIdx` directly.

**Finding how much you've already read.** Given a starting Surah and Ayah, `ayahsBefore()` converts that into a single global position:

```javascript
function ayahsBefore(surahIdx, ayahOffset) {
  return (CUMULATIVE_AYAHS[surahIdx] || 0) + ayahOffset;
}

const alreadyRead = ayahsBefore(startSurahIdx, startAyah - 1);
```

**Example** — starting from Surah 2 (Al-Baqarah), Ayah 100:
- `startSurahIdx = 1` (0-based index for Surah 2)
- `ayahOffset = 99` (99 ayahs completed before this one)
- `alreadyRead = CUMULATIVE_AYAHS[1] + 99 = 7 + 99 = 106`

**Remaining ayahs** is then just:

```javascript
const remaining = CONSTANTS.TOTAL_AYAHS - alreadyRead; // 6,236 - 106 = 6,130
```

### 3. Reading Volume Balancing Modes

Reading load can be balanced using either:
- **`BY_AYAH_COUNT`**: Distributes remaining ayahs evenly across days.
- **`BY_WORD_COUNT`**: Balances reading effort based on word count per ayah, ensuring lighter days with long ayahs (like Al-Baqarah) and balanced reading lengths throughout.

To avoid rounding drift, the cumulative target for each day is calculated independently:

$$\text{Target after Day } D = \text{round}\left(\frac{\text{Remaining Units}}{\text{Total Days}} \times D\right)$$

### 4. Day Ending Strategies & Boundary Snapping

Rather than ending abruptly in the middle of a passage, the planner supports scalable **Day Ending Strategies**:
- **`MATHEMATICAL`**: Concludes the day at the exact mathematically calculated ayah.
- **`NEAREST_RUKU`**: Finishes the day at the nearest Ruku ending boundary (556 rukus across the Quran).

#### Unified Daily Boundary Enforcement
When snapping each intermediate day, strict safety invariants are guaranteed:

$$\text{minAllowed} \le \text{target} \le \text{maxAllowed}$$

- **`minAllowed = currentAyahIndex + 1`**: Ensures the reader always advances forward by at least 1 ayah today (prevents 0-ayah days).
- **`maxAllowed = TOTAL_AYAHS - (remainingDays - 1)`**: Guarantees that every subsequent day in the schedule still has at least 1 ayah to read (prevents starving later days).

### 5. Mapping Each Day Back to a Surah & Ayah

Once each day's global finish position is established, binary search converts the global index ($1 \dots 6236$) back to the corresponding Surah and relative Ayah in **O(log N)**:

```javascript
const { surahIdx: dSurah, ayahInSurah: dAyah, surah } = getSurahAndAyahFromCumulative(targetGlobalAyah);
```