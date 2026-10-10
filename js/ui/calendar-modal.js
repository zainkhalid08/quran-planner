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
 * Switches the active tab and displays the corresponding calendar guidance panel.
 * @param {string} targetTab - 'google', 'apple', or 'outlook'
 */
function switchTab(targetTab) {
  const tabs = DOM.calendarModal?.querySelectorAll('.modal-tab');
  const panels = {
    google: document.getElementById('panelGoogle'),
    apple: document.getElementById('panelApple'),
    outlook: document.getElementById('panelOutlook')
  };

  if (!tabs) return;

  tabs.forEach(tab => {
    const isSelected = tab.dataset.tab === targetTab;
    tab.classList.toggle('active', isSelected);
    tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });

  Object.entries(panels).forEach(([name, panel]) => {
    if (panel) {
      if (name === targetTab) {
        panel.style.display = 'block';
        panel.classList.add('active');
      } else {
        panel.style.display = 'none';
        panel.classList.remove('active');
      }
    }
  });
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

  if (DOM.calendarModalDontShow) {
    DOM.calendarModalDontShow.checked = false;
  }

  // Reset to default tab (Google Calendar)
  switchTab('google');

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

  // Tab switching
  const tabs = DOM.calendarModal.querySelectorAll('.modal-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab) {
        switchTab(tab.dataset.tab);
      }
    });
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
