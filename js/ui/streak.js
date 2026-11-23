/**
 * @file streak.js
 * @description Daily reading streak shown as a stat pill, driven by bookmark saves.
 *
 * What is this file for:
 * - Remembers which days the reader moved the bookmark forward and shows how many of those days
 *   in a row lead up to today.
 *
 * What you can find in this file:
 * - `trackReading`: Called by bookmark.js on every committed bookmark save (drop or key press).
 * - `renderStreak`: Refreshes the pill (called after every plan render).
 * - Hovering the pill (or tapping it on touch screens) shows a small card with a hadith on
 *   consistency (Sahih al-Bukhari 6464 and 6465).
 *
 * Model:
 * - A day counts when any save moves the bookmark forward, even by one ayah. Moving it back
 *   (e.g. correcting an overshoot) doesn't count, and doesn't undo a day that already counted.
 *   Comparing against the previous position, not the start of the day, means a correction
 *   followed by one ayah of reading still keeps the streak.
 * - If today isn't read yet, the streak up to yesterday still shows; it only resets after a
 *   whole day without progress.
 * - Positions are global ayah counts, and the history survives Reset Plan: the streak is about
 *   the reading habit, not one plan.
 * - It only changes on a save, never mid-drag, so its width changes can't move the plan rows
 *   under a dragged bookmark.
 */

import { Storage } from '../services/storage.js';

const MAX_DAYS_KEPT = 400;

const el = {
  item: document.getElementById('statStreakItem'),
  value: document.getElementById('statStreakVal'),
  hadith: document.getElementById('streakHadith')
};

let hadithReady = false;

/** Local calendar day as YYYY-MM-DD. */
function dayKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function loadDays() {
  const data = Storage.getJSON(Storage.KEYS.STREAK);
  return Array.isArray(data?.days) ? data.days : [];
}

/** Consecutive reading days ending today, or ending yesterday if today isn't read yet. */
function countStreak(days) {
  const set = new Set(days);
  const cursor = new Date();
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (set.has(dayKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/* ── Hadith card ───────────────────────────────────────────────────────── */
/* Shown on hover with a mouse, and on tap on touch screens. It's a fixed-position overlay, so
   showing it never shifts the layout above the plan rows. */

const HOVER_CLOSE_DELAY = 150; // lets the pointer cross the gap from the pill into the card

let hoverTimer = 0;
let lastPointerType = 'mouse';

function isHadithOpen() {
  return el.hadith && !el.hadith.hidden;
}

/** Places the card under the pill (above it if there's no room), kept inside the viewport. */
function positionHadith() {
  const gap = 8;
  const rect = el.item.getBoundingClientRect();
  const width = el.hadith.offsetWidth;
  const height = el.hadith.offsetHeight;
  let top = rect.bottom + gap;
  if (top + height > window.innerHeight - gap && rect.top - height - gap >= gap) {
    top = rect.top - height - gap;
  }
  const left = Math.max(gap, Math.min(rect.left, window.innerWidth - width - gap));
  el.hadith.style.top = `${Math.round(top)}px`;
  el.hadith.style.left = `${Math.round(left)}px`;
}

function openHadith() {
  clearTimeout(hoverTimer);
  if (isHadithOpen()) return;
  el.hadith.style.visibility = 'hidden';
  el.hadith.hidden = false;
  positionHadith();
  el.hadith.style.visibility = '';
}

function closeHadith() {
  clearTimeout(hoverTimer);
  if (isHadithOpen()) el.hadith.hidden = true;
}

function closeHadithSoon() {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(closeHadith, HOVER_CLOSE_DELAY);
}

function initHadith() {
  if (hadithReady || !el.hadith) return;
  hadithReady = true;

  // Mouse: show while hovering the pill or the card itself
  const onEnter = (e) => {
    if (e.pointerType === 'mouse') openHadith();
  };
  const onLeave = (e) => {
    if (e.pointerType === 'mouse') closeHadithSoon();
  };
  el.item.addEventListener('pointerenter', onEnter);
  el.item.addEventListener('pointerleave', onLeave);
  el.hadith.addEventListener('pointerenter', onEnter);
  el.hadith.addEventListener('pointerleave', onLeave);

  // Touch / pen: tap the pill to show or hide
  el.item.addEventListener('pointerdown', (e) => {
    lastPointerType = e.pointerType;
  });
  el.item.addEventListener('click', () => {
    if (lastPointerType === 'mouse') return;
    if (isHadithOpen()) closeHadith();
    else openHadith();
  });

  // Tap anywhere else, or Escape, hides it; taps inside the card don't
  document.addEventListener('click', (e) => {
    if (isHadithOpen() && !el.item.contains(e.target) && !el.hadith.contains(e.target)) closeHadith();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeHadith();
  });

  // Stay attached to the pill while the page scrolls or resizes
  const follow = () => {
    if (isHadithOpen()) positionHadith();
  };
  window.addEventListener('scroll', follow, { passive: true });
  window.addEventListener('resize', follow);
}

/* ── Pill ──────────────────────────────────────────────────────────────── */

/** Refreshes the streak pill; hidden until there is at least one reading day in the streak. */
function renderStreak() {
  if (!el.item || !el.value) return;
  initHadith();
  const count = countStreak(loadDays());
  el.item.hidden = count === 0;
  if (!count) {
    closeHadith();
    return;
  }
  const number = document.createElement('span');
  number.textContent = String(count);
  el.value.replaceChildren(number, count === 1 ? ' day' : ' days');
}

/**
 * Records a committed bookmark move.
 * @param {number} previous - Global ayah position before the save.
 * @param {number} next - Global ayah position after the save.
 */
function trackReading(previous, next) {
  if (next <= previous) return;
  let days = loadDays();
  const today = dayKey(new Date());
  if (days.includes(today)) return;
  days.push(today);
  if (days.length > MAX_DAYS_KEPT) days = days.slice(-MAX_DAYS_KEPT);
  Storage.setItem(Storage.KEYS.STREAK, { days });
  renderStreak();
}

export { trackReading, renderStreak };
