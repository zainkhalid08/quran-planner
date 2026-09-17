# Quran Planner
Get a day by day plan, to finish reading the Quran in x number of days. Export the plan as a high-resolution image.

<!-- <p align="center">
  <a href="https://zainkhalid.org/quran-planner.html" style="text-decoration: none;">
    <img src="https://img.shields.io/badge/Live%20Demo-Click%20Here-brightgreen" alt="Live Demo" />
  </a>
</p> -->

## Screenshots

<p align="center">
  <img src="assets/images/home-page.png" alt="Home Page" width="48%" />
  <img src="assets/images/dark-mode.png" alt="Dark Mode" width="48%" />
</p>

<p align="center">
  <img src="assets/images/plan.png" alt="Generated Plan" width="48%" />
  <img src="assets/images/download-plan.png" alt="Download Plan" width="48%" />
</p>

## Quick Start

Open [`quran-planner.html`](quran-planner.html) directly in any modern web browser, or serve it locally:

```bash
python3 -m http.server 5173
```

Then visit:
```
http://localhost:5173/quran-planner.html
```

## Tech Stack

- **HTML5 & Semantic Markup**: 
- **Vanilla CSS**: Custom design system with CSS custom properties (`:root` / `html.dark`), responsive flexbox & grid layouts.
- **Vanilla JavaScript**: Pure ES6+, `Intl.DateTimeFormat` for Islamic calendar calculation, and `localStorage` API.
- **html2canvas**: Client-side image rendering for PNG downloads.

