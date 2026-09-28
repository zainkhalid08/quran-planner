/* ── UI Events & Form Handlers ── */

/**
 * Populates the starting Surah dropdown list from the SURAHS array.
 */
function populateSurahDropdown() {
  SURAHS.forEach((surah, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${surah.number}. ${surah.name}`;
    DOM.startSurah.appendChild(option);
  });
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
 * Returns ordinal string for a number (e.g. 1st, 2nd, 3rd, 8th).
 * @param {number} n
 * @returns {string}
 */
function getOrdinal(n) {
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
 * Hides and clears the Ramadan informative note container.
 */
function clearRamadanNote() {
  if (DOM && DOM.ramadanNote) {
    DOM.ramadanNote.style.display = 'none';
    DOM.ramadanNote.innerHTML = '';
  }
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

    DOM.ramadanNote.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.5 1.5C4.19 1.5 1.5 4.19 1.5 7.5C1.5 10.81 4.19 13.5 7.5 13.5C10.81 13.5 13.5 10.81 13.5 7.5C13.5 4.19 10.81 1.5 7.5 1.5Z" stroke="currentColor" stroke-width="1.3"/>
        <path d="M7.5 4.75V7.75L9.5 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      <span class="pill-note-text"><strong>Plan completes 1 day before Ramadan</strong> <br> Ramadan starts around ${dateStr}, plan ends on ${finishDateStr}. Actual start depends on moon sighting and may shift by a day or more.</span>
      <button type="button" class="pill-note-close" aria-label="Close notice" title="Close">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <line x1="3" y1="3" x2="11" y2="11"/>
          <line x1="11" y1="3" x2="3" y2="11"/>
        </svg>
      </button>
    `;
    DOM.ramadanNote.style.display = 'flex';
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

      const endDateStr = planInfo.ramadanEnd.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      DOM.ramadanNote.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7.5 1.5C4.19 1.5 1.5 4.19 1.5 7.5C1.5 10.81 4.19 13.5 7.5 13.5C10.81 13.5 13.5 10.81 13.5 7.5C13.5 4.19 10.81 1.5 7.5 1.5Z" stroke="currentColor" stroke-width="1.3"/>
          <path d="M7.5 4.75V7.75L9.5 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span class="pill-note-text"><strong>Plan completes by 29th of Ramadan</strong> <br>That is around ${endDateStr}. Actual dates depend on moon sighting and may shift by a day or more.</span>
        <button type="button" class="pill-note-close" aria-label="Close notice" title="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <line x1="3" y1="3" x2="11" y2="11"/>
            <line x1="11" y1="3" x2="3" y2="11"/>
          </svg>
        </button>
      `;
      DOM.ramadanNote.style.display = 'flex';
    });
  }

  // Dismiss Ramadan note on close button click
  if (DOM.ramadanNote) {
    DOM.ramadanNote.addEventListener('click', event => {
      if (event.target.closest('.pill-note-close')) {
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

  // Enter key support to trigger plan generation
  DOM.days.addEventListener('keydown', event => {
    if (event.key === 'Enter') generatePlan();
  });
}
