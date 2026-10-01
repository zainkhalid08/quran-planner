/**
 * @file plan-renderer.js
 * @description DOM rendering engine for plan summary metrics and day-by-day reading schedule rows.
 *
 * What is this file for:
 * - Formats and renders the calculated schedule into the DOM using batched `DocumentFragment` updates
 *   to eliminate layout reflows and display summary statistics.
 *
 * What you can find in this file:
 * - Formatters: Cached instances of `Intl.NumberFormat` and `Intl.DateTimeFormat`.
 * - `renderPlan`: Primary rendering function updating summary statistics (`statDays`, `statAvg`),
 *   generating day rows with ARIA list semantics (`role="listitem"`, `aria-posinset`, `aria-setsize`),
 *   and attaching formatted completion timestamps.
 */

import { DOM } from './dom.js';
import { CONFIG } from '../config.js';

/**
 * Cached formatters to prevent repeated synchronous Intl instantiation.
 */
let cachedNumberFormatter = null;
let cachedResultsDateFormatter = null;

function getNumberFormatter() {
  if (!cachedNumberFormatter) {
    cachedNumberFormatter = new Intl.NumberFormat('en-US');
  }
  return cachedNumberFormatter;
}

function getResultsDateFormatter() {
  if (!cachedResultsDateFormatter) {
    cachedResultsDateFormatter = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  return cachedResultsDateFormatter;
}

/**
 * Renders the day-by-day plan rows and summary statistics in the DOM.
 *
 * @param {Object} planData
 * @param {number} planData.days - Total days in the plan.
 * @param {number} planData.remaining - Total ayahs to read.
 * @param {Array<Object>} planData.schedule - Array of day items calculated by algo.js.
 * @param {Date} planData.planStartDate - Plan start date.
 */
function renderPlan({ days, remaining, schedule, planStartDate }) {
  const numberFormatter = getNumberFormatter();

  if (DOM.statDays) DOM.statDays.textContent = days;
  if (DOM.statAvg) DOM.statAvg.textContent = numberFormatter.format(Math.round(remaining / days));

  if (DOM.planRows) {
    DOM.planRows.setAttribute('role', 'list');
    DOM.planRows.setAttribute('aria-label', `Day-by-day reading schedule for ${days} days`);
  }

  // Batch DOM row insertions using a DocumentFragment to eliminate per-row layout reflows
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const row = document.createElement('div');
    row.className = 'day-row';
    row.setAttribute('role', 'listitem');
    row.setAttribute('aria-posinset', String(item.day));
    row.setAttribute('aria-setsize', String(days));

    const wordsCountStr = item.dayWordsCount != null ? numberFormatter.format(item.dayWordsCount) : '';

    row.innerHTML = `
      <div class="day-info">
        <div class="day-num">Day ${item.day}</div>
        <div class="day-date">${item.dateStr}</div>
        ${item.isToday ? '<span class="today-pill" aria-label="Today\'s reading">Today</span>' : ''}
      </div>
      <div class="surah-info">
        <div class="surah-name">${item.surah.name}</div>
        <div class="surah-meta">
          <span>Surah ${item.surah.number}</span>
          <span class="surah-arabic" lang="ar" dir="rtl">${item.surah.arabic}</span>
        </div>
      </div>
      <div class="ayah-target">
        <span class="ayah-badge">Read till ayah ${item.targetAyah}</span>
        ${CONFIG.showDailyAyahsCount ? `<span class="daily-stat" title="Ayahs to read" aria-label="${item.dayAyahsCount} ayahs to read">${item.dayAyahsCount}</span>` : ''}
        ${CONFIG.showDailyWordsCount ? `<span class="daily-stat" title="Words to read" aria-label="${wordsCountStr} words to read">${wordsCountStr}</span>` : ''}
      </div>
    `;
    fragment.appendChild(row);
  }

  // Single batched update to the live DOM
  if (typeof DOM.planRows.replaceChildren === 'function') {
    DOM.planRows.replaceChildren(fragment);
  } else {
    DOM.planRows.innerHTML = '';
    DOM.planRows.appendChild(fragment);
  }

  DOM.results.style.display = 'block';
  // Re-trigger animation on regenerate
  DOM.results.style.animation = 'none';
  void DOM.results.offsetWidth;
  DOM.results.style.animation = '';

  if (DOM.resultsActions) DOM.resultsActions.style.display = 'flex';

  if (DOM.resultsFooter) {
    const dateStr = getResultsDateFormatter().format(planStartDate);
    DOM.resultsFooter.textContent = `Generated on ${dateStr}`;
  }
}

export { renderPlan };

