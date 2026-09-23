/* ── Configuration & Modes ── */
const READING_CALCULATION_MODES = {
  BY_AYAH_COUNT: 'BY_AYAH_COUNT',
  BY_WORD_COUNT: 'BY_WORD_COUNT'
};

const DAY_ENDING_STRATEGIES = {
  EXACT: 'EXACT',
  NEAREST_RUKU: 'NEAREST_RUKU'
};

const CONFIG = {
  readingVolumeCalculationMode: READING_CALCULATION_MODES.BY_WORD_COUNT,
  dayEndingStrategy: DAY_ENDING_STRATEGIES.NEAREST_RUKU,
  showDailyAyahsCount: false,
  showDailyWordsCount: false
};
