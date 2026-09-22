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
  DOM.statDays.textContent = days;
  DOM.statRemaining.textContent = remaining.toLocaleString();
  DOM.statAvg.textContent = Math.round(remaining / days).toLocaleString();

  DOM.planRows.innerHTML = '';

  schedule.forEach(item => {
    const row = document.createElement('div');
    row.className = 'day-row';

    row.innerHTML = `
      <div class="day-info">
        <div class="day-num">Day ${item.day}</div>
        <div class="day-date">${item.dateStr}</div>
        ${item.isToday ? '<span class="today-pill">Today</span>' : ''}
      </div>
      <div class="surah-info">
        <div class="surah-name">${item.surah.name}</div>
        <div class="surah-meta">
          <span>Surah ${item.surah.number}</span>
          <span class="surah-arabic">${item.surah.arabic}</span>
        </div>
      </div>
      <div class="ayah-target">
        <span class="ayah-badge">Read till ayah ${item.targetAyah}</span>
        ${CONFIG.showDailyAyahsCount ? `<span class="daily-stat" title="Ayahs to read">${item.dayAyahsCount}</span>` : ''}
      </div>
    `;
    DOM.planRows.appendChild(row);
  });

  DOM.results.style.display = 'block';
  // Re-trigger animation on regenerate
  DOM.results.style.animation = 'none';
  void DOM.results.offsetWidth;
  DOM.results.style.animation = '';

  if (DOM.resultsActions) DOM.resultsActions.style.display = 'flex';

  if (DOM.resultsFooter) {
    const dateStr = planStartDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    DOM.resultsFooter.textContent = `Generated on ${dateStr}`;
  }
}

/**
 * Validates inputs, invokes calculatePlan from algo.js, saves the plan, and renders it.
 *
 * @param {string} [customStartDate] - Optional ISO date string for custom start date.
 * @param {boolean} [skipScroll=false] - Whether to skip smooth scrolling to results.
 */
function generatePlan(customStartDate, skipScroll) {
  const days = parseInt(DOM.days.value);
  if (!days || days < 1) {
    alert('Please enter a valid number of days.');
    return;
  }

  const startSurahIdx = parseInt(DOM.startSurah.value);
  const rawAyah = parseInt(DOM.startAyah.value) || 1;
  const startAyah = Math.max(1, Math.min(rawAyah, SURAHS[startSurahIdx].ayahs));

  const alreadyRead = ayahsBefore(startSurahIdx, startAyah - 1);
  const remaining = CONSTANTS.TOTAL_AYAHS - alreadyRead;

  if (remaining <= 0) {
    alert("You've already completed the Quran from that position!");
    return;
  }

  if (days > remaining) {
    alert(`You only have ${remaining.toLocaleString()} ayahs left. Please enter ${remaining.toLocaleString()} days or fewer.`);
    return;
  }

  const planStartDate = customStartDate ? new Date(customStartDate) : new Date();
  planStartDate.setHours(0, 0, 0, 0);

  // Save plan details to Storage
  const savedPlanData = {
    days,
    startSurahIdx,
    startAyah,
    startDate: planStartDate.toISOString()
  };
  Storage.setItem(Storage.KEYS.PLAN, savedPlanData);

  const planResult = calculatePlan({
    days,
    startSurahIdx,
    startAyah,
    planStartDate
  });

  renderPlan({
    days,
    remaining: planResult.remaining,
    schedule: planResult.schedule,
    planStartDate
  });

  if (!skipScroll) {
    DOM.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Clears any active plan, removes saved data from storage,
 * and resets inputs back to their initial default state.
 */
function clearPlan() {
  Storage.removeItem(Storage.KEYS.PLAN);

  // Reset days input and all pill selections
  if (DOM.days) DOM.days.value = '';
  document.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
  if (DOM.pickDateInput) DOM.pickDateInput.value = '';
  clearRamadanNote();

  // Reset starting surah & ayah to initial state
  if (DOM.startSurah) {
    DOM.startSurah.value = 0;
    updateAyahMax();
  }
  if (DOM.startAyah) DOM.startAyah.value = '';

  DOM.results.style.display = 'none';
  if (DOM.resultsActions) DOM.resultsActions.style.display = 'none';
  DOM.planRows.innerHTML = '';
  if (DOM.resultsFooter) DOM.resultsFooter.textContent = '';
  if (DOM.card) {
    DOM.card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Restores previously generated plan and form fields from localStorage on page visit.
 */
function loadSavedPlan() {
  const saved = Storage.getJSON(Storage.KEYS.PLAN);
  if (!saved || !saved.days || !saved.startDate) return;

  // Restore form inputs
  DOM.days.value = saved.days;
  if (typeof saved.startSurahIdx !== 'undefined') {
    DOM.startSurah.value = saved.startSurahIdx;
    updateAyahMax();
  }
  if (saved.startAyah && saved.startAyah > 1) {
    DOM.startAyah.value = saved.startAyah;
  }

  // Highlight matching preset pill if applicable
  document.querySelectorAll('.pill[data-days]').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.days === String(saved.days));
  });

  // Re-generate plan using the original start date (skip automatic jump scroll on initial load)
  generatePlan(saved.startDate, true);
}
