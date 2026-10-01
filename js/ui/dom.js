/**
 * @file dom.js
 * @description Centralized registry of cached DOM element references.
 *
 * What is this file for:
 * - Provides pre-queried element references across the application, avoiding repeated `document.getElementById` calls.
 *
 * What you can find in this file:
 * - `DOM`: Object mapping semantic keys (e.g. `days`, `startSurah`, `generatePlanBtn`, `results`, `downloadBtn`)
 *   to their corresponding live DOM elements.
 */
export const DOM = {

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

