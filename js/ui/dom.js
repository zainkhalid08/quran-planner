/* ── Cached DOM Elements ── */
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
  endRamadanPill: document.getElementById('endRamadanPill'),
  ramadanNote: document.getElementById('ramadanNote'),
  downloadBtn: document.getElementById('downloadBtn'),
  clearPlanBtn: document.getElementById('clearPlanBtn'),
  generatePlanBtn: document.getElementById('generatePlanBtn'),
  card: document.querySelector('.card')
};

if (typeof window !== 'undefined') {
  window.DOM = DOM;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DOM };
}
