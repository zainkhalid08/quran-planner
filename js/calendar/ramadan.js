/**
 * Cached Hijri DateTimeFormat instance to prevent synchronous instantiation in search loops.
 */
let cachedHijriFormatter = null;
let isHijriFormatterSupported = true;

/**
 * Gets or creates the cached Hijri DateTimeFormat instance.
 * @returns {Intl.DateTimeFormat|null}
 */
function getHijriFormatter() {
  if (!isHijriFormatterSupported) return null;
  if (!cachedHijriFormatter) {
    try {
      cachedHijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      isHijriFormatterSupported = false;
      return null;
    }
  }
  return cachedHijriFormatter;
}

/**
 * Extracts Hijri day, month, and year parts for a given date using the Umm al-Qura calendar.
 * @param {Date} [date=new Date()]
 * @returns {{ day: number, month: number, year: number }|null}
 */
function getHijriDateParts(date = new Date()) {
  const hijriFormatter = getHijriFormatter();
  if (!hijriFormatter) return null;

  try {
    const parts = hijriFormatter.formatToParts(date);
    let day = 0;
    let month = 0;
    let year = 0;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.type === 'day') day = parseInt(part.value, 10);
      else if (part.type === 'month') month = parseInt(part.value, 10);
      else if (part.type === 'year') year = parseInt(part.value, 10);
    }
    if (!day || !month || !year) return null;
    return { day, month, year };
  } catch (e) {
    return null;
  }
}

/**
 * Calculates the estimated date of the next Ramadan 1st using the Umm al-Qura calendar.
 * @param {Date} [from=new Date()] - Reference date to search forward from.
 * @returns {Date|null} The Gregorian date corresponding to the upcoming 1st of Ramadan.
 */
function getNextRamadanStart(from = new Date()) {
  const candidateDate = new Date(from);
  candidateDate.setHours(0, 0, 0, 0);

  // Ramadan is month 9 in the Hijri calendar; scan forward day by day
  // (well under a lunar year, so 400 iterations is a safe ceiling)
  for (let dayOffset = 0; dayOffset < 400; dayOffset++) {
    const hijri = getHijriDateParts(candidateDate);
    if (hijri && hijri.month === 9 && hijri.day === 1) return new Date(candidateDate);
    candidateDate.setDate(candidateDate.getDate() + 1);
  }
  return null;
}

/**
 * Calculates plan information for completing the Quran by the 29th of Ramadan (including 29 days of Ramadan).
 * If currently before Ramadan, includes days until Ramadan + 29 days of Ramadan.
 * If currently in Ramadan (up to day 29), includes remaining days through the 29th.
 * @param {Date} [from=new Date()] - Reference date to search forward from.
 * @returns {{
 *   totalDays: number,
 *   daysUntilRamadan: number,
 *   ramadanDaysIncluded: number,
 *   ramadanStart: Date,
 *   ramadanEnd: Date,
 *   isCurrentlyRamadan: boolean,
 *   currentHijriDay?: number
 * }|null}
 */
function getEndRamadanPlan(from = new Date()) {
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);

  const hijri = getHijriDateParts(today);
  if (!hijri) return null;

  // Case 1: Today is already inside Ramadan (month 9) and up to the 29th
  if (hijri.month === 9 && hijri.day <= 29) {
    const daysRemaining = 29 - hijri.day + 1;
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (daysRemaining - 1));
    return {
      totalDays: daysRemaining,
      daysUntilRamadan: 0,
      ramadanDaysIncluded: daysRemaining,
      ramadanStart: today,
      ramadanEnd: endDate,
      isCurrentlyRamadan: true,
      currentHijriDay: hijri.day
    };
  }

  // Case 2: Today is before the next Ramadan (or Ramadan 30 has passed)
  const searchStart = new Date(today);
  if (hijri.month === 9) {
    searchStart.setDate(searchStart.getDate() + 1);
  }

  const ramadanStart = getNextRamadanStart(searchStart);
  if (!ramadanStart) return null;

  const daysUntil = Math.round((ramadanStart - today) / (1000 * 60 * 60 * 24));
  const totalDays = daysUntil + 29;
  const endDate = new Date(ramadanStart);
  endDate.setDate(endDate.getDate() + 28); // 29th of Ramadan

  return {
    totalDays,
    daysUntilRamadan: daysUntil,
    ramadanDaysIncluded: 29,
    ramadanStart,
    ramadanEnd: endDate,
    isCurrentlyRamadan: false
  };
}

if (typeof window !== 'undefined') {
  window.getHijriFormatter = getHijriFormatter;
  window.getHijriDateParts = getHijriDateParts;
  window.getNextRamadanStart = getNextRamadanStart;
  window.getEndRamadanPlan = getEndRamadanPlan;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getHijriFormatter,
    getHijriDateParts,
    getNextRamadanStart,
    getEndRamadanPlan
  };
}
