/**
 * @file calendar-modal.js
 * @description Guided modal dialog explaining separate calendar creation before exporting .ics events.
 *
 * What is this file for:
 * - Informs the user how importing .ics events into a dedicated calendar prevents personal calendar clutter
 *   and allows one-click deletion of the entire schedule.
 * - Provides tabbed platform instructions for Google Calendar, Apple Calendar, and Outlook.
 * - Allows users to remember their preference ("Don't show this tip again").
 *
 * What you can find in this file:
 * - `initCalendarModal`: Sets up tab switching, close handlers, backdrop clicks, and key bindings.
 * - `openCalendarModal`: Displays the modal dialog with total event counts and traps focus.
 * - `closeCalendarModal`: Dismisses the modal and restores body scroll and focus.
 */

import { DOM } from './dom.js';
import { Storage } from '../services/storage.js';
import { downloadCalendarPlan } from '../services/export.js';

let isModalActive = false;

const modalDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

/**
 * Handles Escape key navigation while modal is active.
 * @param {KeyboardEvent} event
 */
function handleKeyDown(event) {
  if (event.key === 'Escape' && isModalActive) {
    event.preventDefault();
    closeCalendarModal();
  }
}

/**
 * Opens the Add to Calendar guidance modal.
 * @param {Object} plan - Current active plan object
 */
export function openCalendarModal(plan) {
  if (!DOM.calendarModal) return;

  isModalActive = true;

  if (DOM.calendarModalDaysCount && plan) {
    DOM.calendarModalDaysCount.textContent = plan.days ? `${plan.days}` : '—';
  }

  // Calculate and format the start and end dates of the plan
  if (DOM.calendarModalDateRange) {
    if (plan && plan.schedule && plan.schedule.length > 0) {
      const firstItem = plan.schedule[0];
      const lastItem = plan.schedule[plan.schedule.length - 1];

      const startDate = firstItem.date instanceof Date ? firstItem.date : new Date(firstItem.date);
      const endDate = lastItem.date instanceof Date ? lastItem.date : new Date(lastItem.date);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        const startStr = modalDateFormatter.format(startDate);
        const endStr = modalDateFormatter.format(endDate);
        DOM.calendarModalDateRange.textContent = `(${startStr} – ${endStr})`;
      } else {
        DOM.calendarModalDateRange.textContent = '';
      }
    } else {
      DOM.calendarModalDateRange.textContent = '';
    }
  }

  if (DOM.calendarModalDontShow) {
    DOM.calendarModalDontShow.checked = false;
  }

  DOM.calendarModal.style.display = 'flex';
  DOM.calendarModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  document.addEventListener('keydown', handleKeyDown);

  // Focus primary download button for accessible navigation
  const focusBtn = () => {
    if (DOM.calendarModalDownloadBtn) {
      DOM.calendarModalDownloadBtn.focus();
    }
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(focusBtn);
  } else {
    setTimeout(focusBtn, 0);
  }
}

/**
 * Closes the Add to Calendar guidance modal.
 */
export function closeCalendarModal() {
  if (!DOM.calendarModal) return;

  isModalActive = false;
  DOM.calendarModal.style.display = 'none';
  DOM.calendarModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  document.removeEventListener('keydown', handleKeyDown);

  if (DOM.calendarBtn) {
    DOM.calendarBtn.focus();
  }
}

/**
 * Initializes calendar guidance modal events, tabs, and action buttons.
 */
export function initCalendarModal() {
  if (!DOM.calendarModal) return;

  // Close & Cancel buttons
  if (DOM.calendarModalCloseBtn) {
    DOM.calendarModalCloseBtn.addEventListener('click', closeCalendarModal);
  }

  if (DOM.calendarModalCancelBtn) {
    DOM.calendarModalCancelBtn.addEventListener('click', closeCalendarModal);
  }

  // Backdrop click dismiss
  DOM.calendarModal.addEventListener('click', event => {
    if (event.target === DOM.calendarModal) {
      closeCalendarModal();
    }
  });

  // Download button inside modal
  if (DOM.calendarModalDownloadBtn) {
    DOM.calendarModalDownloadBtn.addEventListener('click', () => {
      if (DOM.calendarModalDontShow && DOM.calendarModalDontShow.checked) {
        Storage.setItem(Storage.KEYS.SKIP_CALENDAR_TIP, 'true');
      }
      closeCalendarModal();
      if (typeof downloadCalendarPlan === 'function') {
        downloadCalendarPlan();
      }
    });
  }
}
