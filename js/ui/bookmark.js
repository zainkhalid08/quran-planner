/**
 * @file bookmark.js
 * @description Draggable single bookmark for the reading plan, like a ribbon in a physical book.
 *
 * What is this file for:
 * - Lets the user drag one ribbon vertically through the plan and drop it at the exact ayah they
 *   stopped at (anywhere inside a day, or in the gap between two days to mark that day completed).
 *
 * What you can find in this file:
 * - `syncBookmark`: Called after every plan render. Rebuilds day ranges, restores the saved
 *   position and repositions the ribbon.
 * - `resetBookmark`: Called when the plan is cleared. Removes the saved position and hides the ribbon.
 *
 * Model:
 * - Position is stored as a global ayah count (number of ayahs of the Quran read so far), so it
 *   stays at the same place in the Quran when the plan is regenerated with a different day count.
 * - Inside a day card, ayahs are spread from card top (first ayah) to card bottom (last ayah).
 *   The gap between two cards is the "day completed" position.
 */

import { DOM } from './dom.js';
import { Storage } from '../services/storage.js';
import { getSurahAndAyahFromCumulative } from '../core/algo.js';
import { renderProgress, hideProgress } from './progress.js';
import { showCompletion, forgetCompletion } from './completion.js';
import { trackReading, renderStreak } from './streak.js';

const GAP_HALF = 3; // half of the 6px margin between day rows
const EDGE_SCROLL_ZONE = 90;

const state = {
  ready: false,
  schedule: [],
  rows: [],
  base: 0, // global ayah count before day 1
  cum: [0], // cumulative ayahs relative to base; cum[i] = ayahs read when day i is finished
  total: 0,
  value: 0, // ayahs read, relative to base (0..total)
  dragging: false,
  grab: 0,
  lastY: 0,
  raf: 0
};

const el = {};

function createElements() {
  const ribbon = document.createElement('div');
  ribbon.className = 'bookmark';
  ribbon.hidden = true;
  ribbon.innerHTML = `
    <div class="bookmark-line"></div>
    <div class="bookmark-tip" aria-hidden="true"></div>
    <button type="button" class="bookmark-tab" role="slider" aria-label="Bookmark"
            aria-orientation="vertical" aria-valuemin="0" aria-valuenow="0">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>
      <span class="bookmark-grip" aria-hidden="true"><i></i><i></i></span>
    </button>`;
  DOM.planList.appendChild(ribbon);

  el.ribbon = ribbon;
  el.tab = ribbon.querySelector('.bookmark-tab');
  el.tip = ribbon.querySelector('.bookmark-tip');
}

/* ── Geometry ───────────────────────────────────────────────────────────── */

/** Day index (0-based) that owns relative ayah count v. v = 0 belongs to day 0. */
function dayOf(v) {
  let i = 0;
  while (i < state.rows.length - 1 && v > state.cum[i + 1]) i++;
  return i;
}

/** Y (relative to the plan list) of the gap above row i. i = rows.length is below the last row. */
function gapY(i) {
  const rows = state.rows;
  if (i === 0) return rows[0].offsetTop - GAP_HALF;
  const prev = rows[i - 1];
  return prev.offsetTop + prev.offsetHeight + GAP_HALF;
}

function yOf(v) {
  const boundary = state.cum.indexOf(v);
  if (boundary !== -1) return gapY(boundary);
  const i = dayOf(v);
  const row = state.rows[i];
  const count = state.schedule[i].dayAyahsCount;
  return row.offsetTop + ((v - state.cum[i]) / count) * row.offsetHeight;
}

function valueAt(y) {
  const { rows, cum, schedule } = state;
  const n = rows.length;
  if (y <= rows[0].offsetTop) return 0;
  const last = rows[n - 1];
  if (y >= last.offsetTop + last.offsetHeight) return state.total;
  for (let i = 0; i < n; i++) {
    const row = rows[i];
    if (y <= row.offsetTop + row.offsetHeight) {
      return cum[i] + Math.round(((y - row.offsetTop) / row.offsetHeight) * schedule[i].dayAyahsCount);
    }
    if (i < n - 1 && y < rows[i + 1].offsetTop) return cum[i + 1]; // in the gap: day completed
  }
  return state.total;
}

/* ── Labels & painting ──────────────────────────────────────────────────── */

function describe(v) {
  if (v === 0) return 'Nothing read yet';
  const i = dayOf(v);
  if (v === state.cum[i + 1]) return `Day ${i + 1} completed`;
  const { surah, ayahInSurah } = getSurahAndAyahFromCumulative(state.base + v);
  return `${surah.name}, ayah ${ayahInSurah}`;
}

function paint(v) {
  const i = dayOf(v);
  state.rows.forEach((row, n) => {
    const done = n < i || (n === i && v === state.cum[i + 1]);
    const partial = !done && n === i && v > state.cum[i];
    row.classList.toggle('read', done);
    row.classList.toggle('partial', partial);
    if (partial) {
      const f = (v - state.cum[i]) / state.schedule[i].dayAyahsCount;
      row.style.setProperty('--bookmark-fill', `${f * 100}%`);
    }
  });
  const text = describe(v);
  el.tab.setAttribute('aria-valuenow', String(v));
  el.tab.setAttribute('aria-valuetext', text);
  el.tip.textContent = text;
  el.ribbon.classList.toggle('complete', v === state.total);
  renderProgress({ value: v, total: state.total, dragging: state.dragging });
}

function place(y, snap) {
  el.ribbon.classList.toggle('snap', !!snap);
  el.ribbon.style.transform = `translateY(${y}px)`;
}

function setValue(v, { snap = true, save = true } = {}) {
  state.value = Math.max(0, Math.min(state.total, v));
  paint(state.value);
  place(yOf(state.value), snap);
  if (save) {
    const previous = parseInt(Storage.getItem(Storage.KEYS.BOOKMARK), 10);
    const next = state.base + state.value;
    Storage.setItem(Storage.KEYS.BOOKMARK, String(next));
    trackReading(Number.isFinite(previous) ? previous : state.base, next);
  }
  // A drop or key press that lands on the very end of the plan: show the completion card (once per plan)
  if (save && state.value === state.total) {
    showCompletion({ schedule: state.schedule, base: state.base, total: state.total });
  }
}

/* ── Dragging ───────────────────────────────────────────────────────────── */

function follow() {
  const top = DOM.planList.getBoundingClientRect().top;
  const y = state.lastY - top - state.grab;
  const v = valueAt(y);
  place(Math.max(gapY(0), Math.min(gapY(state.rows.length), y)), false);
  if (v !== state.value) {
    state.value = v;
    paint(v);
  }

  let dy = 0;
  if (state.lastY < EDGE_SCROLL_ZONE) dy = -Math.ceil((EDGE_SCROLL_ZONE - state.lastY) / 6);
  else if (state.lastY > window.innerHeight - EDGE_SCROLL_ZONE) {
    dy = Math.ceil((state.lastY - (window.innerHeight - EDGE_SCROLL_ZONE)) / 6);
  }
  if (dy) {
    window.scrollBy(0, dy);
    state.raf = requestAnimationFrame(follow);
  } else {
    state.raf = 0;
  }
}

function endDrag() {
  if (!state.dragging) return;
  state.dragging = false;
  DOM.planList.classList.remove('bookmark-dragging');
  cancelAnimationFrame(state.raf);
  state.raf = 0;
  setValue(state.value);
}

function bindEvents() {
  el.tab.addEventListener('pointerdown', (e) => {
    state.dragging = true;
    el.tab.setPointerCapture(e.pointerId);
    state.grab = Math.max(0, e.clientY - el.tab.getBoundingClientRect().top - 3);
    state.lastY = e.clientY;
    DOM.planList.classList.add('bookmark-dragging');
    follow();
    e.preventDefault();
  });
  el.tab.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    state.lastY = e.clientY;
    if (!state.raf) follow();
  });
  el.tab.addEventListener('pointerup', endDrag);
  el.tab.addEventListener('pointercancel', endDrag);

  // Keyboard: arrows move one ayah, PageUp/PageDown move a whole day
  el.tab.addEventListener('keydown', (e) => {
    const v = state.value;
    const i = dayOf(v);
    const n = state.rows.length;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') setValue(v - 1);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') setValue(v + 1);
    else if (e.key === 'PageDown') setValue(state.cum[v >= state.cum[i + 1] ? Math.min(i + 2, n) : i + 1]);
    else if (e.key === 'PageUp') setValue(state.cum[v > state.cum[i] ? i : Math.max(i - 1, 0)]);
    else if (e.key === 'Home') setValue(0);
    else if (e.key === 'End') setValue(state.total);
    else return;
    e.preventDefault();
  });

  // Row heights change with viewport width and font loading: keep the ribbon glued to its ayah
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      if (state.ready && !el.ribbon.hidden && !state.dragging) setValue(state.value, { snap: false, save: false });
    }).observe(DOM.planRows);
  }
}

/* ── Public API ─────────────────────────────────────────────────────────── */

/**
 * Attaches the bookmark to a freshly rendered plan and restores the saved position.
 * @param {Array<Object>} schedule - Day items from `calculatePlan`.
 */
function syncBookmark(schedule) {
  if (!DOM.planList || !DOM.planRows || !schedule.length) return;
  if (!state.ready) {
    createElements();
    bindEvents();
    state.ready = true;
  }

  state.schedule = schedule;
  state.rows = Array.from(DOM.planRows.querySelectorAll('.day-row'));
  state.base = schedule[0].targetGlobalAyah - schedule[0].dayAyahsCount;
  state.cum = [0];
  schedule.forEach((item) => state.cum.push(state.cum[state.cum.length - 1] + item.dayAyahsCount));
  state.total = state.cum[state.cum.length - 1];
  el.tab.setAttribute('aria-valuemax', String(state.total));

  const saved = parseInt(Storage.getItem(Storage.KEYS.BOOKMARK), 10);
  const relative = Number.isFinite(saved) ? saved - state.base : 0;

  el.ribbon.hidden = false;
  setValue(relative, { snap: false, save: false });
  renderStreak();
}

/** Removes the saved position and hides the ribbon (used when the plan is cleared). */
function resetBookmark() {
  Storage.removeItem(Storage.KEYS.BOOKMARK);
  forgetCompletion();
  hideProgress();
  if (!state.ready) return;
  el.ribbon.hidden = true;
  state.value = 0;
}

export { syncBookmark, resetBookmark };
