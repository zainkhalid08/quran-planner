/**
 * @file lookup-tables.js
 * @description Precomputed cumulative lookup tables and prefix-sum arrays.
 *
 * What is this file for:
 * - Calculates prefix-sum arrays once at initialization from SURAHS data to allow O(1) range queries
 *   and O(log N) binary searches during reading plan distribution.
 *
 * What you can find in this file:
 * - `SURAH_START_AYAHS`: Prefix sums of ayahs before each Surah (maps 0-based Surah index to global ayah offset).
 * - `CUMULATIVE_RUKU_ENDINGS`: Array of 556 global ayah boundaries where Rukus end.
 * - `CUMULATIVE_WORDS`: Uint32Array of cumulative word counts across all 6,236 ayahs.
 */
import { CONSTANTS, SURAHS } from '../data/surahs.js';


/**
 * Cumulative starting ayah index for each Surah (1-based global index lookup table).
 * SURAH_START_AYAHS[i] gives total ayahs before Surah index i.
 */
export const SURAH_START_AYAHS = (() => {
  const arr = new Array(SURAHS.length + 1).fill(0);
  for (let i = 0; i < SURAHS.length; i++) {
    arr[i + 1] = arr[i] + SURAHS[i].ayahs;
  }
  return arr;
})();

/**
 * 556 Cumulative Ruku Endings dynamically computed from SURAHS.rukuEndingAyahs.
 * Stores the 1-based global ayah index where each Ruku concludes.
 */
export const CUMULATIVE_RUKU_ENDINGS = (() => {
  const endings = [];
  let cumulativeAyahs = 0;
  for (let s = 0; s < SURAHS.length; s++) {
    const surah = SURAHS[s];
    if (Array.isArray(surah.rukuEndingAyahs)) {
      for (let r = 0; r < surah.rukuEndingAyahs.length; r++) {
        endings.push(cumulativeAyahs + surah.rukuEndingAyahs[r]);
      }
    }
    cumulativeAyahs += surah.ayahs;
  }
  return endings;
})();

/**
 * Cumulative word counts across all 6,236 ayahs computed directly from SURAHS.ayahWords.
 * CUMULATIVE_WORDS[i] = total words from global ayah 1 through global ayah i.
 */
export const CUMULATIVE_WORDS = (() => {
  const cum = new Uint32Array(CONSTANTS.TOTAL_AYAHS + 1);
  let running = 0;
  let idx = 1;
  for (let s = 0; s < SURAHS.length; s++) {
    const surah = SURAHS[s];
    if (Array.isArray(surah.ayahWords)) {
      for (let a = 0; a < surah.ayahWords.length; a++) {
        running += surah.ayahWords[a];
        cum[idx++] = running;
      }
    }
  }
  return cum;
})();

