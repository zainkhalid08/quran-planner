/**
 * Calculates the total ayahs read from Surah 1 up to a given Surah and ayah offset.
 * @param {number} surahIdx - 0-based index of the current Surah.
 * @param {number} ayahOffset - Completed ayahs within this Surah (e.g. ayah - 1).
 * @returns {number} Total ayahs read from the start of the Quran.
 */
function ayahsBefore(surahIdx, ayahOffset) {
  let totalAyahs = 0;
  for (let i = 0; i < surahIdx; i++) totalAyahs += SURAHS[i].ayahs;
  return totalAyahs + ayahOffset;
}

/**
 * Calculates the total words read from Surah 1 up to a given Surah and ayah offset.
 * @param {number} surahIdx - 0-based index of the current Surah.
 * @param {number} ayahOffset - Completed ayahs within this Surah (e.g. ayah - 1).
 * @returns {number} Total words read from the start of the Quran.
 */
function wordsBefore(surahIdx, ayahOffset) {
  let totalWords = 0;
  for (let i = 0; i < surahIdx; i++) {
    const wordsArr = SURAHS[i].ayahWords;
    for (let w = 0; w < wordsArr.length; w++) {
      totalWords += wordsArr[w];
    }
  }
  if (surahIdx < SURAHS.length) {
    const currentWords = SURAHS[surahIdx].ayahWords;
    for (let w = 0; w < ayahOffset; w++) {
      totalWords += currentWords[w];
    }
  }
  return totalWords;
}

// Internal cached list of all ayahs in sequential order for fast lookup
let _allAyahsCache = null;

function getAllAyahs() {
  if (!_allAyahsCache) {
    _allAyahsCache = [];
    for (let sIdx = 0; sIdx < SURAHS.length; sIdx++) {
      const surah = SURAHS[sIdx];
      for (let aIdx = 0; aIdx < surah.ayahWords.length; aIdx++) {
        _allAyahsCache.push({
          surahIdx: sIdx,
          surah,
          ayahNum: aIdx + 1,
          words: surah.ayahWords[aIdx]
        });
      }
    }
  }
  return _allAyahsCache;
}

let _totalWordsCache = null;

function getTotalWords() {
  if (_totalWordsCache === null) {
    _totalWordsCache = getAllAyahs().reduce((sum, a) => sum + a.words, 0);
  }
  return _totalWordsCache;
}

/**
 * Calculation strategies registry.
 * Each strategy implements `calculateSchedule({ days, startSurahIdx, startAyah, planStartDate })`.
 */
const CALCULATION_STRATEGIES = {
  /**
   * Standard Ayah-count calculation: distributes remaining ayahs evenly across days.
   */
  BY_AYAH_COUNT: {
    calculateSchedule({ days, startSurahIdx, startAyah, planStartDate }) {
      const alreadyRead = ayahsBefore(startSurahIdx, startAyah - 1);
      const remainingAyahs = CONSTANTS.TOTAL_AYAHS - alreadyRead;

      const currentDayDate = new Date();
      currentDayDate.setHours(0, 0, 0, 0);

      let surahIdx = startSurahIdx;
      let ayahInSurah = startAyah - 1;
      let totalRead = 0;
      const schedule = [];

      for (let day = 1; day <= days; day++) {
        const target = Math.round((remainingAyahs / days) * day);
        let toRead = target - totalRead;
        const dayAyahsCount = toRead;
        totalRead = target;
        let dayWordsCount = 0;

        while (surahIdx < SURAHS.length && toRead > 0) {
          const left = SURAHS[surahIdx].ayahs - ayahInSurah;
          if (toRead >= left) {
            const wordsArr = SURAHS[surahIdx].ayahWords;
            for (let w = ayahInSurah; w < SURAHS[surahIdx].ayahs; w++) {
              dayWordsCount += wordsArr[w];
            }
            toRead -= left;
            ayahInSurah = 0;
            surahIdx++;
          } else {
            const wordsArr = SURAHS[surahIdx].ayahWords;
            for (let w = ayahInSurah; w < ayahInSurah + toRead; w++) {
              dayWordsCount += wordsArr[w];
            }
            ayahInSurah += toRead;
            toRead = 0;
          }
        }

        let targetSurahIndex = surahIdx;
        let targetAyahInSurah = ayahInSurah;
        if (targetAyahInSurah === 0) {
          if (targetSurahIndex > 0) {
            targetSurahIndex = surahIdx - 1;
            targetAyahInSurah = SURAHS[targetSurahIndex].ayahs;
          } else {
            targetAyahInSurah = SURAHS[0].ayahs;
          }
        }
        targetSurahIndex = Math.min(targetSurahIndex, SURAHS.length - 1);

        const currentDate = new Date(planStartDate);
        currentDate.setDate(planStartDate.getDate() + day - 1);
        const dateStr = currentDate.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        const isCurrentDate = currentDate.getTime() === currentDayDate.getTime();

        schedule.push({
          day,
          date: currentDate,
          dateStr,
          isToday: isCurrentDate,
          surah: SURAHS[targetSurahIndex],
          targetAyah: targetAyahInSurah,
          dayAyahsCount,
          dayWordsCount
        });
      }

      return {
        remainingAyahs,
        remaining: remainingAyahs,
        schedule
      };
    }
  },

  /**
   * Word-count calculation: distributes remaining words evenly across days,
   * aligning each day's end to the closest completion ayah.
   */
  BY_WORD_COUNT: {
    calculateSchedule({ days, startSurahIdx, startAyah, planStartDate }) {
      const allAyahs = getAllAyahs();
      const totalWords = getTotalWords();

      let startIndex = 0;
      for (let i = 0; i < allAyahs.length; i++) {
        if (allAyahs[i].surahIdx === startSurahIdx && allAyahs[i].ayahNum === startAyah) {
          startIndex = i;
          break;
        }
      }

      const alreadyReadAyahs = startIndex;
      const remainingAyahs = allAyahs.length - alreadyReadAyahs;

      let alreadyReadWords = 0;
      for (let i = 0; i < startIndex; i++) {
        alreadyReadWords += allAyahs[i].words;
      }
      const remainingWords = totalWords - alreadyReadWords;

      const currentDayDate = new Date();
      currentDayDate.setHours(0, 0, 0, 0);

      let currentIdx = startIndex;
      let accumulatedWords = alreadyReadWords;
      const schedule = [];

      for (let day = 1; day <= days; day++) {
        const currentDate = new Date(planStartDate);
        currentDate.setDate(planStartDate.getDate() + day - 1);
        const dateStr = currentDate.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const isCurrentDate = currentDate.getTime() === currentDayDate.getTime();

        if (day === days) {
          let dayWords = 0;
          let dayAyahsCount = 0;
          for (let i = currentIdx; i < allAyahs.length; i++) {
            dayWords += allAyahs[i].words;
            dayAyahsCount++;
          }
          const lastAyah = allAyahs[allAyahs.length - 1];
          schedule.push({
            day,
            date: currentDate,
            dateStr,
            isToday: isCurrentDate,
            surah: lastAyah.surah,
            targetAyah: lastAyah.ayahNum,
            dayAyahsCount,
            dayWordsCount: dayWords
          });
          break;
        }

        const targetCumulativeWords = alreadyReadWords + Math.round((remainingWords / days) * day);
        const minAyahsToLeave = days - day;
        const maxIdxForToday = allAyahs.length - 1 - minAyahsToLeave;

        let bestIdx = currentIdx;
        let bestDiff = Infinity;
        let runningWords = accumulatedWords;

        for (let i = currentIdx; i <= maxIdxForToday; i++) {
          runningWords += allAyahs[i].words;
          const diff = Math.abs(runningWords - targetCumulativeWords);
          if (diff <= bestDiff) {
            bestDiff = diff;
            bestIdx = i;
          } else {
            break;
          }
        }

        let dayWords = 0;
        let dayAyahsCount = 0;
        for (let i = currentIdx; i <= bestIdx; i++) {
          dayWords += allAyahs[i].words;
          dayAyahsCount++;
        }

        accumulatedWords += dayWords;
        const target = allAyahs[bestIdx];

        schedule.push({
          day,
          date: currentDate,
          dateStr,
          isToday: isCurrentDate,
          surah: target.surah,
          targetAyah: target.ayahNum,
          dayAyahsCount,
          dayWordsCount: dayWords
        });

        currentIdx = bestIdx + 1;
      }

      return {
        remainingAyahs,
        remainingWords,
        remaining: remainingAyahs,
        schedule
      };
    }
  }
};


/**
 * Calculates the day-by-day Quran reading schedule using the configured readingVolumeCalculationMode.
 * Pure computation with zero DOM dependencies.
 *
 * @param {Object} params
 * @param {number} params.days - Number of days to complete the reading.
 * @param {number} params.startSurahIdx - 0-based index of the starting Surah.
 * @param {number} params.startAyah - Starting ayah number within the starting Surah.
 * @param {Date} params.planStartDate - Start date of the plan.
 * @returns {{ remainingAyahs: number, remaining: number, schedule: Array<Object> }}
 */
function calculatePlan(params) {
  const currentConfig = typeof CONFIG !== 'undefined' ? CONFIG : null;
  const modes = typeof READING_CALCULATION_MODES !== 'undefined'
    ? READING_CALCULATION_MODES
    : { BY_AYAH_COUNT: 'BY_AYAH_COUNT', BY_WORD_COUNT: 'BY_WORD_COUNT' };

  const mode = currentConfig?.readingVolumeCalculationMode || modes.BY_AYAH_COUNT;
  const strategy = CALCULATION_STRATEGIES[mode];

  if (!strategy) {
    console.warn(`Unknown readingVolumeCalculationMode '${mode}', falling back to BY_AYAH_COUNT.`);
    return CALCULATION_STRATEGIES.BY_AYAH_COUNT.calculateSchedule(params);
  }

  return strategy.calculateSchedule(params);
}

