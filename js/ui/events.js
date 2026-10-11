/**
 * @file events.js
 * @description User interaction management, form synchronization, quick-select pill handlers, and UI event binding.
 *
 * What is this file for:
 * - Manages all interactive DOM event listeners and binds user actions (pills, dates, enter keys, buttons)
 *   to controller services.
 *
 * What you can find in this file:
 * - `populateSurahDropdown`: Fills the starting Surah `<select>` using a batched DocumentFragment.
 * - `updateAyahMax`: Synchronizes starting ayah max limits and placeholder when Surah selection changes.
 * - `initDateBounds`: Sets date boundary limits on the target date picker input.
 * - `clearRamadanNote`: Helper to hide the informational Ramadan banner.
 * - `initUIEvents`: Orchestrates all event attachments for pills, custom dates, keyboard triggers, and action buttons.
 */
import { DOM } from './dom.js';

import { CONSTANTS, SURAHS } from '../data/surahs.js';
import { initTheme } from './theme.js';
import { initStatTooltips } from './tooltips.js';
import { showToast } from './toast.js';
import { getNextRamadanStart, getEndRamadanPlan } from '../calendar/ramadan.js';
import { generatePlan, clearPlan, getCurrentPlan } from '../services/plan-service.js';
import { downloadPlan, printPlan, downloadCalendarPlan } from '../services/export.js';
import { sharePlan } from '../services/share-service.js';
import { Storage } from '../services/storage.js';
import { initCalendarModal, openCalendarModal } from './calendar-modal.js';
import { getOrdinal, showBeforeRamadanTip, showEndRamadanTip, clearInfoBox } from './info-box.js';

/**
 * Populates the starting Surah dropdown list from the SURAHS array.
 */
function populateSurahDropdown() {
  const fragment = document.createDocumentFragment();
  SURAHS.forEach((surah, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${surah.number}. ${surah.name}`;
    fragment.appendChild(option);
  });
  DOM.startSurah.appendChild(fragment);
  updateAyahMax();
}

/**
 * Updates the max attribute and placeholder of the ayah input field
 * based on the total ayahs available in the selected Surah.
 */
function updateAyahMax() {
  const surahIndex = parseInt(DOM.startSurah.value);
  const maxAyahs = SURAHS[surahIndex].ayahs;
  DOM.startAyah.max = maxAyahs;
  DOM.startAyah.placeholder = `1 – ${maxAyahs}`;
  if (DOM.startAyah.value && parseInt(DOM.startAyah.value) > maxAyahs) {
    DOM.startAyah.value = maxAyahs;
  }
}

/**
 * Sets min and max date bounds on the custom date picker input.
 */
function initDateBounds() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + CONSTANTS.TOTAL_AYAHS);

  const formatDateToISO = date => date.toISOString().split('T')[0];
  DOM.pickDateInput.min = formatDateToISO(tomorrow);
  DOM.pickDateInput.max = formatDateToISO(maxDate);
}

/**
 * Hides and clears the Ramadan informative note container.
 */
function clearRamadanNote() {
  clearInfoBox(DOM.ramadanNote);
}

/**
 * Initializes all form events, preset duration buttons, and custom date picker.
 */
function initUIEvents() {
  // Populate surah dropdown and set date picker bounds
  populateSurahDropdown();
  initDateBounds();
  initTheme();
  initStatTooltips();
  initCalendarModal();

  // Fixed-duration pills (15 days / 1 month / etc.)
  document.querySelectorAll('.pill[data-days]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      DOM.days.value = pill.dataset.days;
      clearRamadanNote();
    });
  });

  // Dynamic "Before Ramadan" pill
  DOM.ramadanPill.addEventListener('click', () => {
    const ramadanStart = getNextRamadanStart();
    if (!ramadanStart) {
      showToast("Couldn't calculate Ramadan's start date on this device/browser.", 'error');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((ramadanStart - today) / (1000 * 60 * 60 * 24));

    DOM.days.value = daysUntil;

    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    DOM.ramadanPill.classList.add('active');

    showBeforeRamadanTip(ramadanStart);
  });

  // Dynamic "End Ramadan" pill
  if (DOM.endRamadanPill) {
    DOM.endRamadanPill.addEventListener('click', () => {
      const planInfo = getEndRamadanPlan();
      if (!planInfo) {
        showToast("Couldn't calculate Ramadan's end date on this device/browser.", 'error');
        return;
      }

      DOM.days.value = planInfo.totalDays;

      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      DOM.endRamadanPill.classList.add('active');

      showEndRamadanTip(planInfo);
    });
  }

  // Dismiss Ramadan note on close button click
  if (DOM.ramadanNote) {
    DOM.ramadanNote.addEventListener('click', event => {
      if (event.target.closest('.info-box-close, .tip-box-close, .pill-note-close')) {
        clearRamadanNote();
      }
    });
  }

  // Keep pills in sync if user types a matching number manually
  DOM.days.addEventListener('input', () => {
    const enteredDays = DOM.days.value;
    document.querySelectorAll('.pill[data-days]').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.days === enteredDays);
    });
    DOM.ramadanPill.classList.remove('active');
    if (DOM.endRamadanPill) DOM.endRamadanPill.classList.remove('active');
    DOM.pickDatePill.classList.remove('active');
    clearRamadanNote();
  });

  // Date picker interactions
  DOM.pickDatePill.addEventListener('click', () => {
    if (typeof DOM.pickDateInput.showPicker === 'function') {
      DOM.pickDateInput.showPicker();
    } else {
      DOM.pickDateInput.click();
    }
  });

  DOM.pickDateInput.addEventListener('change', () => {
    if (!DOM.pickDateInput.value) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pickedDate = new Date(DOM.pickDateInput.value + 'T00:00:00');
    pickedDate.setHours(0, 0, 0, 0);

    const daysUntil = Math.round((pickedDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil < 1) {
      showToast('Please pick a date in the future.', 'warning');
      return;
    }

    DOM.days.value = daysUntil;

    document.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
    DOM.pickDatePill.classList.add('active');

    clearRamadanNote();
  });

  // Starting Surah change listener
  if (DOM.startSurah) {
    DOM.startSurah.addEventListener('change', updateAyahMax);
  }

  // Generate plan action button
  if (DOM.generatePlanBtn) {
    DOM.generatePlanBtn.addEventListener('click', () => {
      if (typeof generatePlan === 'function') generatePlan();
    });
  }

  // Print / Save as PDF button
  if (DOM.printBtn) {
    DOM.printBtn.addEventListener('click', () => {
      if (typeof printPlan === 'function') printPlan();
    });
  }

  // Add to Calendar action button
  if (DOM.calendarBtn) {
    DOM.calendarBtn.addEventListener('click', () => {
      const skipTip = Storage.getItem(Storage.KEYS.SKIP_CALENDAR_TIP) === 'true';
      if (skipTip) {
        if (typeof downloadCalendarPlan === 'function') downloadCalendarPlan();
        return;
      }

      const plan = typeof getCurrentPlan === 'function' ? getCurrentPlan() : null;
      if (!plan || !plan.schedule || !plan.schedule.length) {
        if (typeof downloadCalendarPlan === 'function') downloadCalendarPlan();
        return;
      }

      openCalendarModal(plan);
    });
  }

  // Share Plan action button
  if (DOM.shareBtn) {
    DOM.shareBtn.addEventListener('click', () => {
      if (typeof sharePlan === 'function') sharePlan();
    });
  }

  // Download plan button
  if (DOM.downloadBtn) {
    DOM.downloadBtn.addEventListener('click', () => {
      if (typeof downloadPlan === 'function') downloadPlan();
    });
  }

  // Reset / Clear plan button
  if (DOM.clearPlanBtn) {
    DOM.clearPlanBtn.addEventListener('click', () => {
      if (typeof clearPlan === 'function') clearPlan();
    });
  }

  // Enter key support to trigger plan generation
  if (DOM.days) {
    DOM.days.addEventListener('keydown', event => {
      if (event.key === 'Enter' && typeof generatePlan === 'function') generatePlan();
    });
  }

  if (DOM.startAyah) {
    DOM.startAyah.addEventListener('keydown', event => {
      if (event.key === 'Enter' && typeof generatePlan === 'function') generatePlan();
    });
  }
}

export {
  populateSurahDropdown,
  updateAyahMax,
  initDateBounds,
  clearRamadanNote,
  initUIEvents
};

