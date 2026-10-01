/**
 * @file config.js
 * @description Global configuration options, balancing modes, and day-ending strategies.
 *
 * What is this file for:
 * - Defines system-wide configuration settings and selectable algorithm modes for Quran reading plans.
 *
 * What you can find in this file:
 * - `READING_CALCULATION_MODES`: Supported volume balancing strategies (`BY_AYAH_COUNT`, `BY_WORD_COUNT`).
 * - `DAY_ENDING_STRATEGIES`: Boundary snapping strategies (`MATHEMATICAL`, `NEAREST_RUKU`).
 * - `CONFIG`: Default runtime configuration object defining active modes and daily stat visibility flags.
 */
export const READING_CALCULATION_MODES = {
  BY_AYAH_COUNT: 'BY_AYAH_COUNT',
  BY_WORD_COUNT: 'BY_WORD_COUNT'
};

export const DAY_ENDING_STRATEGIES = {
  MATHEMATICAL: 'MATHEMATICAL',
  NEAREST_RUKU: 'NEAREST_RUKU'
};

export const CONFIG = {
  readingVolumeCalculationMode: READING_CALCULATION_MODES.BY_WORD_COUNT,
  dayEndingStrategy: DAY_ENDING_STRATEGIES.NEAREST_RUKU,
  showDailyAyahsCount: false,
  showDailyWordsCount: false
};
