/* ── Plan Service ── */

/**
 * Validates inputs, invokes calculatePlan from algo.js, saves the plan, and renders it.
 *
 * @param {string} [customStartDate] - Optional ISO date string for custom start date.
 * @param {boolean} [skipScroll=false] - Whether to skip smooth scrolling to results.
 */
function generatePlan(customStartDate, skipScroll) {
  const daysInput = typeof DOM !== 'undefined' && DOM.days ? DOM.days : document.getElementById('days');
  const startSurahSelect = typeof DOM !== 'undefined' && DOM.startSurah ? DOM.startSurah : document.getElementById('startSurah');
  const startAyahInput = typeof DOM !== 'undefined' && DOM.startAyah ? DOM.startAyah : document.getElementById('startAyah');
  const resultsCard = typeof DOM !== 'undefined' && DOM.results ? DOM.results : document.getElementById('results');

  const days = parseInt(daysInput.value);
  if (!days || days < 1) {
    if (typeof showToast === 'function') {
      showToast('Please enter valid number of days.', 'warning');
    }
    return;
  }

  const startSurahIdx = parseInt(startSurahSelect.value);

  const maxAyahs = SURAHS[startSurahIdx].ayahs;

  let startAyah = 1;
  if (startAyahInput.value.trim() !== '') {
    startAyah = parseInt(startAyahInput.value);
    if (isNaN(startAyah) || startAyah < 1 || startAyah > maxAyahs) {
      if (typeof showToast === 'function') {
        const surahName = SURAHS[startSurahIdx].name;
        showToast(`Please enter ayah number between 1 and ${maxAyahs} .`, 'warning');
      }
      return;
    }
  }

  const alreadyRead = ayahsBefore(startSurahIdx, startAyah - 1);
  const remaining = CONSTANTS.TOTAL_AYAHS - alreadyRead;

  if (remaining <= 0) {
    if (typeof showToast === 'function') {
      showToast("You've already completed the Quran from that position!", 'info');
    }
    return;
  }

  if (days > remaining) {
    if (typeof showToast === 'function') {
      showToast(`You have ${remaining.toLocaleString()} ayahs left. Please enter ${remaining.toLocaleString()} days or fewer.`, 'warning');
    }
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

  if (typeof renderPlan === 'function') {
    renderPlan({
      days,
      remaining: planResult.remainingAyahs ?? planResult.remaining,
      schedule: planResult.schedule,
      planStartDate
    });
  }

  if (!skipScroll && resultsCard) {
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  if (typeof clearRamadanNote === 'function') {
    clearRamadanNote();
  }

  // Reset starting surah & ayah to initial state
  if (DOM.startSurah) {
    DOM.startSurah.value = 0;
    if (typeof updateAyahMax === 'function') {
      updateAyahMax();
    }
  }
  if (DOM.startAyah) DOM.startAyah.value = '';

  if (DOM.results) DOM.results.style.display = 'none';
  if (DOM.resultsActions) DOM.resultsActions.style.display = 'none';
  if (DOM.planRows) DOM.planRows.innerHTML = '';
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
  if (DOM.days) DOM.days.value = saved.days;
  if (typeof saved.startSurahIdx !== 'undefined' && DOM.startSurah) {
    DOM.startSurah.value = saved.startSurahIdx;
    if (typeof updateAyahMax === 'function') {
      updateAyahMax();
    }
  }
  if (saved.startAyah && saved.startAyah > 1 && DOM.startAyah) {
    DOM.startAyah.value = saved.startAyah;
  }

  // Highlight matching preset pill if applicable
  document.querySelectorAll('.pill[data-days]').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.days === String(saved.days));
  });

  // Re-generate plan using the original start date (skip automatic jump scroll on initial load)
  generatePlan(saved.startDate, true);
}

const planService = {
  generatePlan,
  clearPlan,
  loadSavedPlan
};

if (typeof window !== 'undefined') {
  window.generatePlan = generatePlan;
  window.clearPlan = clearPlan;
  window.loadSavedPlan = loadSavedPlan;
  window.planService = planService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generatePlan, clearPlan, loadSavedPlan, planService };
}
