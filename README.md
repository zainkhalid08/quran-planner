# Quran Planner
Get a day by day plan, to finish reading the Quran in x number of days. Export the plan as a high-resolution image.

## Table of Contents

- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [How the Planning Algorithm Works](#how-the-planning-algorithm-works)
  - [1. Cumulative Timeline (Prefix Sums)](#1-cumulative-timeline-prefix-sums)
  - [2. Finding Remaining Ayahs](#2-finding-remaining-ayahs)
    - [Where does `surahIdx` come from?](#where-does-surahidx-come-from)
    - [Calculating `alreadyRead` & `remaining`](#calculating-alreadyread--remaining)
  - [3. Calculating Daily Targets](#3-calculating-daily-targets)
  - [4. Direct Mapping to Surah & Ayah (Dual-Direction Lookup)](#4-direct-mapping-to-surah--ayah-dual-direction-lookup)

<!-- <p align="center">
  <a href="https://zainkhalid.org/quran-planner.html" style="text-decoration: none;">
    <img src="https://img.shields.io/badge/Live%20Demo-Click%20Here-brightgreen" alt="Live Demo" />
  </a>
</p> -->

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

Open [`index.html`](index.html) directly in any modern web browser, or serve it locally:

```bash
python3 -m http.server 5173
```

Then visit:
```
http://localhost:5173/index.html
```

## Tech Stack

- **HTML5 & Semantic Markup**: 
- **Vanilla CSS**: Custom design system with CSS custom properties (`:root` / `html.dark`), responsive flexbox & grid layouts.
- **Vanilla JavaScript**: Pure ES6+, `Intl.DateTimeFormat` for Islamic calendar calculation, and `localStorage` API.
- **html2canvas**: Client-side image rendering for PNG downloads.

## How the Planning Algorithm Works

The goal of the algorithm is to divide your reading equally across your chosen number of days, starting from any Surah and Ayah.

Here is how it works step-by-step:

### 1. Cumulative Timeline (Prefix Sums)
The Quran has **6,236 ayahs** across 114 Surahs. At startup, the app creates a cumulative count of where each Surah begins along a single timeline from `1` to `6,236`:
- Surah 1 (*Al-Fatiha*) covers ayahs **1 to 7**.
- Surah 2 (*Al-Baqarah*) covers ayahs **8 to 293** (7 + 286).
- Surah 3 (*Ali 'Imran*) covers ayahs **294 to 493** (293 + 200), and so on.

```javascript
// Prefix sum array: CUMULATIVE_AYAHS[i] = total ayahs before Surah index i
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

#### Example Array:
```javascript
// CUMULATIVE_AYAHS index maps to:
[
  0,     // index 0: before Surah 1 (Al-Fatiha, 7 ayahs)
  7,     // index 1: before Surah 2 (Al-Baqarah, 286 ayahs)
  293,   // index 2: before Surah 3 (Ali 'Imran, 200 ayahs)
  493,   // index 3: before Surah 4 (An-Nisa, 176 ayahs)
  669,   // index 4: before Surah 5 (Al-Ma'idah, 120 ayahs)
  // ...
  6230,  // index 113: before Surah 114 (An-Nas, 6 ayahs)
  6236   // index 114: total ayahs in entire Quran
]
```

### 2. Finding Remaining Ayahs
When you pick a starting point (e.g. Surah 2, Ayah 100):

#### Where does `surahIdx` come from?
The Surah dropdown `<select id="startSurah">` is populated using each Surah's **0-based array index** (`0` to `113`) as its option `value`, while displaying the 1-based Surah number to the user:
```html
<select id="startSurah">
  <option value="0">1. Al-Fatiha</option>
  <option value="1">2. Al-Baqarah</option>
  <option value="2">3. Ali 'Imran</option>
  <!-- ... -->
  <option value="113">114. An-Nas</option>
</select>
```

```javascript
SURAHS.forEach((surah, index) => {
  const option = document.createElement('option');
  option.value = index; // 0 for Al-Fatiha, 1 for Al-Baqarah, ..., 113 for An-Nas
  option.textContent = `${surah.number}. ${surah.name}`;
  DOM.startSurah.appendChild(option);
});
```
When generating the plan, `parseInt(DOM.startSurah.value)` directly yields this 0-based index `startSurahIdx`.

#### Calculating `alreadyRead` & `remaining`:
1. **Already read**: The app finds your global starting position using `ayahsBefore`:
   ```javascript
   function ayahsBefore(surahIdx, ayahOffset) {
     return (CUMULATIVE_AYAHS[surahIdx] || 0) + ayahOffset;
   }

   const alreadyRead = ayahsBefore(startSurahIdx, startAyah - 1);
   ```
   **Example**: Starting from **Surah 2 (Al-Baqarah), Ayah 100**:
   - `startSurahIdx = 1` (0-based index for Surah 2)
   - `ayahOffset = 99` (completed 99 ayahs in this Surah, starting at ayah 100)
   - `alreadyRead = CUMULATIVE_AYAHS[1] + 99 = 7 + 99 = 106` ayahs already read.

2. **Remaining**:
   ```javascript
   const remaining = CONSTANTS.TOTAL_AYAHS - alreadyRead;
   ```
   **Example**: `6,236 - 106 = 6,130` ayahs left to complete.

### 3. Calculating Daily Targets
To avoid rounding drift (so day targets stay smooth and don't end up one ayah short or over at the end), each day's cumulative progress is calculated as:

$$\text{Target for Day } D = \text{round}\left(\frac{\text{Remaining Ayahs}}{\text{Total Days}} \times D\right)$$

In code:
```javascript
for (let day = 1; day <= days; day++) {
  // Target ayahs to have read from starting point by this day
  const target = Math.round((remaining / days) * day);
  
  // Daily count to read on this specific day
  const dayAyahsCount = target - totalRead;
  totalRead = target;
  ...
}
```

#### Example Walkthrough (Reading 6,130 remaining ayahs in 30 days):
Average is $6,130 / 30 \approx 204.33$ ayahs/day. Notice how rounding dynamically balances daily counts:

| Day | Calculation $\text{round}(204.33 \times D)$ | Cumulative Target | Ayahs Read Today | Total Quran Ayah (`alreadyRead + target`) |
|---|---|---|---|---|
| **Day 1** | $\text{round}(204.33)$ | **204** | 204 | $106 + 204 =$ **310** |
| **Day 2** | $\text{round}(408.67)$ | **409** | 205 | $106 + 409 =$ **515** |
| **Day 3** | $\text{round}(613.00)$ | **613** | 204 | $106 + 613 =$ **719** |
| ... | ... | ... | ... | ... |
| **Day 30** | $\text{round}(6,130.00)$ | **6,130** | 204 | $106 + 6,130 =$ **6,236** (Exact end) |

### 4. Direct Mapping to Surah & Ayah (Dual-Direction Lookup)
By adding `alreadyRead + target`, the planner knows the exact global ayah number for that day (e.g., Ayah #310 on Day 1). 

Using a fast binary search over the sorted `CUMULATIVE_AYAHS` timeline, it immediately resolves both the Surah and the Ayah within that Surah:

```javascript
function getSurahAndAyahFromGlobal(globalAyah) {
  const target = Math.max(1, Math.min(globalAyah, CONSTANTS.TOTAL_AYAHS));
  let low = 0, high = SURAHS.length - 1;
  let surahIdx = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (CUMULATIVE_AYAHS[mid] < target) {
      surahIdx = mid;       // Candidate surah
      low = mid + 1;        // Search higher
    } else {
      high = mid - 1;       // Search lower
    }
  }

  return {
    surahIdx,
    ayah: target - CUMULATIVE_AYAHS[surahIdx]
  };
}
```

#### Example Lookup for Day 1 (Global Ayah 310):
1. Binary search finds that Ayah `310` lies between `CUMULATIVE_AYAHS[2]` (293) and `CUMULATIVE_AYAHS[3]` (493).
2. Candidate `surahIdx = 2` $\rightarrow$ **Surah 3 (Ali 'Imran)**.
3. Ayah offset within Surah: $310 - 293 =$ **Ayah 17**.
4. Result: **"Read till Surah Ali 'Imran (3), Ayah 17"** (204 ayahs read on Day 1).

Each day's target is determined in $O(\log N)$ time:
```javascript
const { surahIdx: dSurah, ayah: dAyah } = getSurahAndAyahFromGlobal(alreadyRead + target);
```



