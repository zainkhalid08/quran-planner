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
 * Calculates the day-by-day Quran reading schedule.
 * Pure computation with zero DOM dependencies.
 *
 * @param {Object} params
 * @param {number} params.days - Number of days to complete the reading.
 * @param {number} params.startSurahIdx - 0-based index of the starting Surah.
 * @param {number} params.startAyah - Starting ayah number within the starting Surah.
 * @param {Date} params.planStartDate - Start date of the plan.
 * @returns {{ remaining: number, schedule: Array<Object> }}
 */
function calculatePlan({ days, startSurahIdx, startAyah, planStartDate }) {
  const alreadyRead = ayahsBefore(startSurahIdx, startAyah - 1);
  const remaining = CONSTANTS.TOTAL_AYAHS - alreadyRead;

  const currentDayDate = new Date();
  currentDayDate.setHours(0, 0, 0, 0);

  let surahIdx = startSurahIdx;
  let ayahInSurah = startAyah - 1;
  let totalRead = 0;
  const schedule = [];

  for (let day = 1; day <= days; day++) {
    const target = Math.round((remaining / days) * day);
    let toRead = target - totalRead;
    const dayAyahsCount = toRead;
    totalRead = target;

    while (surahIdx < SURAHS.length && toRead > 0) {
      const left = SURAHS[surahIdx].ayahs - ayahInSurah;
      if (toRead >= left) {
        toRead -= left;
        ayahInSurah = 0;
        surahIdx++;
      } else {
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
      dayAyahsCount
    });
  }

  return {
    remaining,
    schedule
  };
}
