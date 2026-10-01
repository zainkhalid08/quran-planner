/**
 * @file algo.js
 * @description Core schedule generation algorithm, boundary enforcement, and mathematical mapping.
 *
 * What is this file for:
 * - Implements the mathematical and passage-snapping logic to divide remaining Quran reading
 *   volume evenly across any specified number of target days without rounding drift.
 *
 * What you can find in this file:
 * - Coordinate mapping: `ayahsBefore`, `wordsBefore`, `getSurahAndAyahFromCumulative` (binary search).
 * - Target solvers: `findNearestAyahByWords`, `snapToNearestRuku` (O(log N) binary search over Rukus).
 * - Extensible registries: `DAY_ENDING_HANDLERS` (MATHEMATICAL, NEAREST_RUKU) and `CALCULATION_STRATEGIES`.
 * - `calculatePlan`: The primary planning pipeline enforcing daily boundaries (`minAllowed <= target <= maxAllowed`).
 */
import { CONSTANTS, SURAHS } from '../data/surahs.js';

import {
  SURAH_START_AYAHS,
  CUMULATIVE_RUKU_ENDINGS,
  CUMULATIVE_WORDS
} from './lookup-tables.js';
import {
  CONFIG,
  READING_CALCULATION_MODES,
  DAY_ENDING_STRATEGIES
} from '../config.js';

/**
 * Calculates the total ayahs read from Surah 1 up to a given Surah and ayah offset.
 * @param {number} surahIdx - 0-based index of the current Surah.
 * @param {number} ayahOffset - Completed ayahs within this Surah (e.g. ayah - 1).
 * @returns {number} Total ayahs read from the start of the Quran.
 */
function ayahsBefore(surahIdx, ayahOffset) {
  return SURAH_START_AYAHS[surahIdx] + ayahOffset;
}

/**
 * Calculates the total words read from Surah 1 up to a given Surah and ayah offset.
 * @param {number} surahIdx - 0-based index of the current Surah.
 * @param {number} ayahOffset - Completed ayahs within this Surah (e.g. ayah - 1).
 * @returns {number} Total words read from the start of the Quran.
 */
function wordsBefore(surahIdx, ayahOffset) {
  const globalAyah = ayahsBefore(surahIdx, ayahOffset);
  return CUMULATIVE_WORDS[globalAyah];
}

/**
 * Converts a 1-based cumulative global ayah index (1 to 6236) to { surahIdx, ayahInSurah, surah }.
 * @param {number} globalAyah - 1-based global ayah index.
 * @returns {{ surahIdx: number, ayahInSurah: number, surah: Object }}
 */
function getSurahAndAyahFromCumulative(globalAyah) {
  const bounded = Math.max(1, Math.min(CONSTANTS.TOTAL_AYAHS, globalAyah));
  let low = 0;
  let high = SURAHS.length - 1;
  let surahIdx = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (SURAH_START_AYAHS[mid] < bounded) {
      surahIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const ayahInSurah = bounded - SURAH_START_AYAHS[surahIdx];
  return {
    surahIdx,
    ayahInSurah,
    surah: SURAHS[surahIdx]
  };
}

/**
 * Finds the global ayah index whose cumulative words are closest to targetWordCount.
 * Uses binary search over CUMULATIVE_WORDS in O(log N).
 * @param {number} targetWordCount - Target cumulative words.
 * @returns {number} 1-based global ayah index.
 */
function findNearestAyahByWords(targetWordCount) {
  let low = 1;
  let high = CONSTANTS.TOTAL_AYAHS;
  let bestAyah = 1;
  let minDiff = Infinity;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const diff = CUMULATIVE_WORDS[mid] - targetWordCount;
    const absDiff = Math.abs(diff);

    if (absDiff < minDiff) {
      minDiff = absDiff;
      bestAyah = mid;
    }

    if (diff === 0) return mid;
    if (diff < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return bestAyah;
}

/**
 * Snaps a target global ayah to the nearest Ruku ending within [minAllowed, maxAllowed].
 * @param {number} targetAyah - Target global ayah index.
 * @param {number} minAllowed - Minimum allowable global ayah (strictly ahead of previous day).
 * @param {number} maxAllowed - Maximum allowable global ayah (leaving at least 1 ayah for subsequent days).
 * @returns {number} Clamped and snapped global ayah index.
 */
function snapToNearestRuku(targetAyah, minAllowed, maxAllowed) {
  let low = 0;
  let high = CUMULATIVE_RUKU_ENDINGS.length - 1;
  let rIdx = CUMULATIVE_RUKU_ENDINGS.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (CUMULATIVE_RUKU_ENDINGS[mid] >= targetAyah) {
      rIdx = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  const candidates = [];
  if (rIdx < CUMULATIVE_RUKU_ENDINGS.length) candidates.push(CUMULATIVE_RUKU_ENDINGS[rIdx]);
  if (rIdx > 0) candidates.push(CUMULATIVE_RUKU_ENDINGS[rIdx - 1]);

  const valid = candidates.filter(c => c >= minAllowed && c <= maxAllowed);
  if (!valid.length) {
    return Math.max(minAllowed, Math.min(maxAllowed, targetAyah));
  }

  valid.sort((a, b) => Math.abs(a - targetAyah) - Math.abs(b - targetAyah));
  return valid[0];
}

/**
 * Extensible Day Ending Strategies registry.
 * Each strategy implements `adjustDayEnd({ targetGlobalAyah, minAllowed, maxAllowed })`.
 */
const DAY_ENDING_HANDLERS = {
  MATHEMATICAL: {
    adjustDayEnd({ targetGlobalAyah, minAllowed, maxAllowed }) {
      return Math.max(minAllowed, Math.min(maxAllowed, targetGlobalAyah));
    }
  },
  NEAREST_RUKU: {
    adjustDayEnd({ targetGlobalAyah, minAllowed, maxAllowed }) {
      return snapToNearestRuku(targetGlobalAyah, minAllowed, maxAllowed);
    }
  }
};

/**
 * Calculation strategies registry for reading volume distribution.
 * Each strategy implements `calculateIdealTarget({ day, days, alreadyReadAyahs, remainingAyahs, alreadyReadWords, remainingWords })`.
 */
const CALCULATION_STRATEGIES = {
  BY_AYAH_COUNT: {
    calculateIdealTarget({ day, days, alreadyReadAyahs, remainingAyahs }) {
      return alreadyReadAyahs + Math.round((remainingAyahs / days) * day);
    }
  },
  BY_WORD_COUNT: {
    calculateIdealTarget({ day, days, alreadyReadWords, remainingWords }) {
      const targetWord = alreadyReadWords + Math.round((remainingWords / days) * day);
      return findNearestAyahByWords(targetWord);
    }
  }
};

let cachedPlanDateFormatter = null;

/**
 * Reusable Intl.DateTimeFormat instance for plan dates to avoid instantiating in loops.
 * @returns {Intl.DateTimeFormat}
 */
function getPlanDateFormatter() {
  if (!cachedPlanDateFormatter) {
    cachedPlanDateFormatter = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
  return cachedPlanDateFormatter;
}

/**
 * Unified calculation pipeline:
 * 1. Computes mathematical volume target based on readingVolumeCalculationMode.
 * 2. Applies dayEndingStrategy (e.g. NEAREST_RUKU or MATHEMATICAL).
 * 3. Enforces daily boundaries (minAllowed <= target <= maxAllowed).
 * 4. Calculates precise dayAyahsCount, dayWordsCount, dates, and Surah coordinates.
 *
 * @param {Object} params
 * @param {number} params.days - Number of days to complete the reading.
 * @param {number} params.startSurahIdx - 0-based index of the starting Surah.
 * @param {number} params.startAyah - Starting ayah number within the starting Surah.
 * @param {Date} params.planStartDate - Start date of the plan.
 * @param {string} [params.volumeMode] - Volume calculation mode override.
 * @param {string} [params.endingStrategy] - Day ending strategy override.
 * @returns {{ remainingAyahs: number, remainingWords: number, remaining: number, schedule: Array<Object> }}
 */
function calculatePlan({
  days,
  startSurahIdx,
  startAyah,
  planStartDate,
  volumeMode,
  endingStrategy
}) {
  const currentConfig = typeof CONFIG !== 'undefined' ? CONFIG : null;
  const modes = typeof READING_CALCULATION_MODES !== 'undefined'
    ? READING_CALCULATION_MODES
    : { BY_AYAH_COUNT: 'BY_AYAH_COUNT', BY_WORD_COUNT: 'BY_WORD_COUNT' };
  const dayStrategies = typeof DAY_ENDING_STRATEGIES !== 'undefined'
    ? DAY_ENDING_STRATEGIES
    : { MATHEMATICAL: 'MATHEMATICAL', NEAREST_RUKU: 'NEAREST_RUKU' };

  const activeVolumeMode = volumeMode || currentConfig?.readingVolumeCalculationMode || modes.BY_WORD_COUNT;
  const activeEndingStrategy = endingStrategy || currentConfig?.dayEndingStrategy || dayStrategies.NEAREST_RUKU;

  const volumeHandler = CALCULATION_STRATEGIES[activeVolumeMode] || CALCULATION_STRATEGIES.BY_WORD_COUNT;
  const endingHandler = DAY_ENDING_HANDLERS[activeEndingStrategy] || DAY_ENDING_HANDLERS.NEAREST_RUKU;

  const alreadyReadAyahs = ayahsBefore(startSurahIdx, startAyah - 1);
  const remainingAyahs = CONSTANTS.TOTAL_AYAHS - alreadyReadAyahs;

  const alreadyReadWords = CUMULATIVE_WORDS[alreadyReadAyahs];
  const totalWords = CUMULATIVE_WORDS[CONSTANTS.TOTAL_AYAHS];
  const remainingWords = totalWords - alreadyReadWords;

  const currentDayDate = new Date();
  currentDayDate.setHours(0, 0, 0, 0);

  const dateFormatter = getPlanDateFormatter();
  const schedule = [];
  let currentAyahIndex = alreadyReadAyahs;

  for (let day = 1; day <= days; day++) {
    // Boundary enforcement:
    // minAllowed: Every day advances at least 1 ayah ahead of previous day
    // maxAllowed: Leaves at least 1 ayah for each of the remaining days
    const minAllowed = currentAyahIndex + 1;
    const maxAllowed = CONSTANTS.TOTAL_AYAHS - (days - day);

    let targetAyah;

    if (day === days) {
      targetAyah = CONSTANTS.TOTAL_AYAHS;
    } else {
      // 1. Calculate ideal mathematical target based on chosen volume balancing mode
      const idealTarget = volumeHandler.calculateIdealTarget({
        day,
        days,
        alreadyReadAyahs,
        remainingAyahs,
        alreadyReadWords,
        remainingWords
      });

      // Clamp ideal target within safe bounds before snapping
      const clampedIdeal = Math.max(minAllowed, Math.min(maxAllowed, idealTarget));

      // 2. Adjust target according to chosen day-ending strategy (e.g. Nearest Ruku)
      const adjustedTarget = endingHandler.adjustDayEnd({
        targetGlobalAyah: clampedIdeal,
        minAllowed,
        maxAllowed
      });

      // 3. Final unified boundary enforcement
      targetAyah = Math.max(minAllowed, Math.min(maxAllowed, adjustedTarget));
    }

    const dayAyahsCount = targetAyah - currentAyahIndex;
    const dayWordsCount = CUMULATIVE_WORDS[targetAyah] - CUMULATIVE_WORDS[currentAyahIndex];

    const { surahIdx: targetSurahIdx, ayahInSurah: targetAyahInSurah, surah: targetSurah } =
      getSurahAndAyahFromCumulative(targetAyah);

    const currentDate = new Date(planStartDate);
    currentDate.setDate(planStartDate.getDate() + day - 1);
    const dateStr = dateFormatter.format(currentDate);

    const isCurrentDate = currentDate.getTime() === currentDayDate.getTime();

    schedule.push({
      day,
      date: currentDate,
      dateStr,
      isToday: isCurrentDate,
      surah: targetSurah,
      targetAyah: targetAyahInSurah,
      targetGlobalAyah: targetAyah,
      dayAyahsCount,
      dayWordsCount
    });

    currentAyahIndex = targetAyah;
  }

  return {
    remainingAyahs,
    remainingWords,
    remaining: remainingAyahs,
    schedule
  };
}

export {
  ayahsBefore,
  wordsBefore,
  getSurahAndAyahFromCumulative,
  findNearestAyahByWords,
  snapToNearestRuku,
  DAY_ENDING_HANDLERS,
  CALCULATION_STRATEGIES,
  getPlanDateFormatter,
  calculatePlan
};
