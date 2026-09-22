// Cached DOM elements
const DOM = {
  days: document.getElementById('days'),
  startSurah: document.getElementById('startSurah'),
  startAyah: document.getElementById('startAyah'),
  results: document.getElementById('results'),
  resultsActions: document.getElementById('resultsActions'),
  resultsFooter: document.getElementById('resultsFooter'),
  planRows: document.getElementById('planRows'),
  statDays: document.getElementById('statDays'),
  statRemaining: document.getElementById('statRemaining'),
  statAvg: document.getElementById('statAvg'),
  pickDatePill: document.getElementById('pickDatePill'),
  pickDateInput: document.getElementById('pickDateInput'),
  ramadanPill: document.getElementById('ramadanPill'),
  ramadanNote: document.getElementById('ramadanNote'),
  downloadBtn: document.getElementById('downloadBtn'),
  card: document.querySelector('.card')
};

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
 * Initializes floating tooltip handler for daily stat pills.
 */
function initStatTooltips() {
  let activeTooltip = null;
  let hideTimeout = null;

  function removeTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function showStatTooltip(targetElement) {
    const tooltipText = targetElement.getAttribute('data-title') || targetElement.getAttribute('title');
    if (!tooltipText) return;

    if (!targetElement.getAttribute('data-title')) {
      targetElement.setAttribute('data-title', tooltipText);
    }

    removeTooltip();

    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'daily-stat-tooltip';
    tooltipElement.textContent = tooltipText;
    tooltipElement.style.visibility = 'hidden';
    document.body.appendChild(tooltipElement);
    activeTooltip = tooltipElement;

    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = tooltipElement.offsetWidth;
    const tooltipHeight = tooltipElement.offsetHeight;

    let top = rect.top - tooltipHeight - 6;
    let left = rect.left + rect.width / 2;

    if (top < 8) {
      top = rect.bottom + 6;
    }

    const minLeft = (tooltipWidth / 2) + 8;
    const maxLeft = window.innerWidth - (tooltipWidth / 2) - 8;
    left = Math.max(minLeft, Math.min(maxLeft, left));

    tooltipElement.style.top = `${Math.round(top)}px`;
    tooltipElement.style.left = `${Math.round(left)}px`;
    tooltipElement.style.visibility = '';

    hideTimeout = setTimeout(removeTooltip, 2200);
  }

  document.addEventListener('click', function (event) {
    const statPill = event.target.closest('.daily-stat');
    if (statPill) {
      event.stopPropagation();
      showStatTooltip(statPill);
    } else {
      removeTooltip();
    }
  });

  window.addEventListener('scroll', removeTooltip, { passive: true });
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
      alert("Couldn't calculate Ramadan's start date on this device/browser.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((ramadanStart - today) / (1000 * 60 * 60 * 24));

    DOM.days.value = daysUntil;

    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    DOM.ramadanPill.classList.add('active');

    const dateStr = ramadanStart.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    DOM.ramadanNote.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.5 1.5C4.19 1.5 1.5 4.19 1.5 7.5C1.5 10.81 4.19 13.5 7.5 13.5C10.81 13.5 13.5 10.81 13.5 7.5C13.5 4.19 10.81 1.5 7.5 1.5Z" stroke="currentColor" stroke-width="1.3"/>
        <path d="M7.5 4.75V7.75L9.5 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      <span><strong>Ramadan is expected to begin around ${dateStr}</strong> (${daysUntil} day${daysUntil === 1 ? '' : 's'} from today). Actual start depends on moon sighting and may shift by a day or more.</span>
    `;
    DOM.ramadanNote.style.display = 'flex';
  });

  // Keep pills in sync if user types a matching number manually
  DOM.days.addEventListener('input', () => {
    const enteredDays = DOM.days.value;
    document.querySelectorAll('.pill[data-days]').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.days === enteredDays);
    });
    DOM.ramadanPill.classList.remove('active');
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
      alert('Please pick a date in the future.');
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

