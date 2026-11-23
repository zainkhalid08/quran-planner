/**
 * @file completion.js
 * @description Completion surprise shown when the reader drops the bookmark at the end of the plan.
 *
 * What is this file for:
 * - Opens a calm completion card with a Quranic dua (Al-Baqarah 2:127) and a short recap of the
 *   reading journey, with gently falling stars behind it.
 *
 * What you can find in this file:
 * - `showCompletion`: Opens the card once per plan (remembered in Storage).
 * - `forgetCompletion`: Clears the "already shown" flag (used when the plan is cleared).
 *
 * Notes:
 * - Only bookmark.js calls `showCompletion`, and only when a drop or key press commits 100%,
 *   never on page load, so a finished plan doesn't show it again on every visit.
 * - "Completed the Quran" is only claimed when the plan started at the first ayah; otherwise the
 *   card says the reader reached the end of the Quran.
 * - The Amiri font is loaded lazily on first open, since nothing else on the page needs it.
 */

import { Storage } from '../services/storage.js';

const STAR_COUNT = 26;
const AMIRI_HREF = 'https://fonts.googleapis.com/css2?family=Amiri&display=swap';

const el = {
  modal: document.getElementById('completionModal'),
  title: document.getElementById('completionTitle'),
  stars: document.getElementById('completionStars'),
  started: document.getElementById('completionStarted'),
  finished: document.getElementById('completionFinished'),
  days: document.getElementById('completionDays'),
  ayahs: document.getElementById('completionAyahs'),
  closeBtn: document.getElementById('completionCloseBtn')
};

const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const numberFormatter = new Intl.NumberFormat('en-US');
const DAY_MS = 24 * 60 * 60 * 1000;

let ready = false;
let returnFocus = null;

function planId(schedule, base, total) {
  const start = schedule[0].date;
  return `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}:${base}:${total}`;
}

function loadAmiri() {
  if (document.querySelector(`link[href="${AMIRI_HREF}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = AMIRI_HREF;
  document.head.appendChild(link);
}

function spawnStars() {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.stars.replaceChildren();
  if (reduceMotion) return;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < STAR_COUNT; i++) {
    const star = document.createElement('span');
    star.className = 'completion-star';
    star.style.left = `${Math.random() * 100}%`;
    star.style.setProperty('--size', `${6 + Math.random() * 10}px`);
    star.style.setProperty('--drift', `${(Math.random() - 0.5) * 80}px`);
    star.style.animationDuration = `${7 + Math.random() * 7}s`;
    star.style.animationDelay = `${-Math.random() * 12}s`;
    fragment.appendChild(star);
  }
  el.stars.appendChild(fragment);
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
  } else if (e.key === 'Tab') {
    // The close button is the only focusable element: keep focus inside the dialog
    e.preventDefault();
    el.closeBtn.focus();
  }
}

function close() {
  el.modal.style.display = 'none';
  el.modal.setAttribute('aria-hidden', 'true');
  el.stars.replaceChildren();
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeyDown);
  if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
}

function init() {
  el.closeBtn.addEventListener('click', close);
  el.modal.addEventListener('click', (e) => {
    if (e.target === el.modal) close();
  });
  ready = true;
}

/**
 * Opens the completion card unless it was already shown for this plan.
 * @param {Object} p
 * @param {Array<Object>} p.schedule - Day items from `calculatePlan`.
 * @param {number} p.base - Global ayah count before day 1 (0 when the plan starts at Al-Fatiha 1).
 * @param {number} p.total - Ayahs in the plan.
 */
function showCompletion({ schedule, base, total }) {
  if (!el.modal || !schedule.length) return;
  const id = planId(schedule, base, total);
  if (Storage.getItem(Storage.KEYS.COMPLETION) === id) return;
  Storage.setItem(Storage.KEYS.COMPLETION, id);
  if (!ready) init();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = schedule[0].date;
  const daysTaken = Math.max(1, Math.round((today - start) / DAY_MS) + 1);

  el.title.textContent = base === 0 ? "You've completed the Quran" : "You've reached the end of the Quran";
  el.started.textContent = dateFormatter.format(start);
  el.finished.textContent = dateFormatter.format(today);
  el.days.textContent = numberFormatter.format(daysTaken);
  el.ayahs.textContent = numberFormatter.format(total);

  loadAmiri();
  spawnStars();
  returnFocus = document.activeElement;
  el.modal.style.display = 'flex';
  el.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKeyDown);
  requestAnimationFrame(() => el.closeBtn.focus());
}

/** Forgets that the card was shown for the current plan (used when the plan is cleared). */
function forgetCompletion() {
  Storage.removeItem(Storage.KEYS.COMPLETION);
}

export { showCompletion, forgetCompletion };
