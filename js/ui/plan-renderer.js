/**
 * Plan Renderer
 * Renders the day-by-day plan rows and summary statistics in the DOM.
 */

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
        ${CONFIG.showDailyWordsCount ? `<span class="daily-stat" title="Words to read">${item.dayWordsCount.toLocaleString()}</span>` : ''}
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

if (typeof window !== 'undefined') {
  window.renderPlan = renderPlan;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderPlan };
}
