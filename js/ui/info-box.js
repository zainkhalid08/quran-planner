/**
 * @file info-box.js
 * @description Common reusable Info Box / Tip component for duration notices and modal guidance.
 *
 * What is this file for:
 * - Provides a unified, accessible notice component that displays tips, guidance, and plan completion info.
 * - Standardizes date formatting with ordinals across duration presets.
 * - Manages rendering, info icon display, dismiss buttons, and accessible ARIA attributes.
 *
 * What you can find in this file:
 * - `INFO_ICON_SVG`: Unified info icon SVG used across all tips.
 * - `getOrdinal`: Calculates English ordinal suffix (1st, 2nd, 3rd...).
 * - `formatDateOrdinal`: Formats Date objects into clean strings (e.g. "28th Feb 2025").
 * - `showInfoBox`: Core function to render an info box with title, message, and close button.
 * - `clearInfoBox`: Clears and hides the info box container.
 * - `showBeforeRamadanTip`: Preset helper for "Before Ramadan".
 * - `showEndRamadanTip`: Preset helper for "End Ramadan".
 */

import { DOM } from './dom.js';

const INFO_ICON_SVG = `
  <svg class="info-box-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
`;

const CLOSE_ICON_SVG = `
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
    <line x1="3" y1="3" x2="11" y2="11"/>
    <line x1="11" y1="3" x2="3" y2="11"/>
  </svg>
`;

/**
 * Returns ordinal string for a number (e.g. 1st, 2nd, 3rd, 8th).
 * @param {number} n
 * @returns {string}
 */
export function getOrdinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * Formats a Date object into an ordinal date string (e.g. "28th Feb 2025").
 * @param {Date|string} date
 * @param {Object} [options]
 * @param {boolean} [options.includeYear=true]
 * @returns {string}
 */
function formatDateOrdinal(date, options = { includeYear: true }) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const dayOrdinal = getOrdinal(d.getDate());
  const month = d.toLocaleDateString('en-GB', { month: 'short' });
  const year = options.includeYear ? ` ${d.getFullYear()}` : '';
  return `${dayOrdinal} ${month}${year}`;
}

/**
 * Renders an informational box with consistent layout and info icon.
 *
 * @param {Object} options
 * @param {string} options.title - Bold title (e.g. "Plan completes 1 day before Ramadan")
 * @param {string} options.message - Descriptive text or HTML string
 * @param {HTMLElement} [options.container] - Target container element (defaults to DOM.ramadanNote)
 * @param {boolean} [options.dismissible=true] - Whether to include a close button
 * @param {Function} [options.onDismiss] - Optional callback when user clicks dismiss
 */
export function showInfoBox({
  title,
  message,
  container = DOM.ramadanNote,
  dismissible = true,
  onDismiss = null
}) {
  const target = container || (DOM && DOM.ramadanNote) || document.getElementById('ramadanNote');
  if (!target) return;

  const closeButtonHtml = dismissible
    ? `
      <button type="button" class="info-box-close" aria-label="Close notice" title="Close">
        ${CLOSE_ICON_SVG}
      </button>
    `
    : '';

  target.innerHTML = `
    ${INFO_ICON_SVG}
    <div class="info-box-body">
      <strong class="info-box-title">${title}</strong>
      <p class="info-box-desc">${message}</p>
    </div>
    ${closeButtonHtml}
  `;

  target.setAttribute('role', 'status');
  target.setAttribute('aria-live', 'polite');
  target.style.display = 'flex';

  if (dismissible) {
    const closeBtn = target.querySelector('.info-box-close, .tip-box-close, .pill-note-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        clearInfoBox(target);
        if (typeof onDismiss === 'function') {
          onDismiss();
        }
      }, { once: true });
    }
  }
}

/**
 * Clears and hides the info box container.
 *
 * @param {HTMLElement} [container] - Target container element (defaults to DOM.ramadanNote)
 */
export function clearInfoBox(container = DOM.ramadanNote) {
  const target = container || (DOM && DOM.ramadanNote) || document.getElementById('ramadanNote');
  if (!target) return;

  target.style.display = 'none';
  target.innerHTML = '';
}

/**
 * Displays the tip for "Before Ramadan" reading plans.
 *
 * @param {Date} ramadanStart - Gregorian date for upcoming Ramadan 1st
 * @param {HTMLElement} [container]
 */
export function showBeforeRamadanTip(ramadanStart, container = DOM.ramadanNote) {
  if (!ramadanStart) return;

  const finishDate = new Date(ramadanStart);
  finishDate.setDate(finishDate.getDate() - 1);

  const startDayOrdinal = getOrdinal(ramadanStart.getDate());
  const startMonth = ramadanStart.toLocaleDateString('en-GB', { month: 'short' });
  const startYear = ramadanStart.getFullYear();
  const dateStr = `${startDayOrdinal} ${startMonth} ${startYear}`;

  let finishDateStr = getOrdinal(finishDate.getDate());
  if (finishDate.getMonth() !== ramadanStart.getMonth() || finishDate.getFullYear() !== ramadanStart.getFullYear()) {
    const finishMonth = finishDate.toLocaleDateString('en-GB', { month: 'short' });
    const finishYear = finishDate.getFullYear() !== startYear ? ` ${finishDate.getFullYear()}` : '';
    finishDateStr += ` ${finishMonth}${finishYear}`;
  }

  showInfoBox({
    container,
    title: 'Plan completes 1 day before Ramadan',
    message: `Ramadan starts around ${dateStr}, plan ends on ${finishDateStr}. Actual start depends on moon sighting and may shift by a day or more.`
  });
}

/**
 * Displays the tip for "End Ramadan" reading plans.
 *
 * @param {Object} planInfo - Plan info object returned from getEndRamadanPlan()
 * @param {HTMLElement} [container]
 */
export function showEndRamadanTip(planInfo, container = DOM.ramadanNote) {
  if (!planInfo || !planInfo.ramadanEnd) return;

  const endDateStr = planInfo.ramadanEnd.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  showInfoBox({
    container,
    title: 'Plan completes by 29th of Ramadan',
    message: `That is around ${endDateStr}. Actual dates depend on moon sighting and may shift by a day or more.`
  });
}
