/**
 * Calculates the estimated date of the next Ramadan 1st using the Umm al-Qura calendar.
 * @param {Date} [from=new Date()] - Reference date to search forward from.
 * @returns {Date|null} The Gregorian date corresponding to the upcoming 1st of Ramadan.
 */
function getNextRamadanStart(from = new Date()) {
  const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });

  const candidateDate = new Date(from);
  candidateDate.setHours(0, 0, 0, 0);

  // Ramadan is month 9 in the Hijri calendar; scan forward day by day
  // (well under a lunar year, so 400 iterations is a safe ceiling)
  for (let dayOffset = 0; dayOffset < 400; dayOffset++) {
    const parts = hijriFormatter.formatToParts(candidateDate);
    const hijriMonth = parseInt(parts.find(part => part.type === 'month').value, 10);
    const hijriDay = parseInt(parts.find(part => part.type === 'day').value, 10);
    if (hijriMonth === 9 && hijriDay === 1) return new Date(candidateDate);
    candidateDate.setDate(candidateDate.getDate() + 1);
  }
  return null;
}

/**
 * Hides and clears the Ramadan informative note container.
 */
function clearRamadanNote() {
  if (DOM && DOM.ramadanNote) {
    DOM.ramadanNote.style.display = 'none';
    DOM.ramadanNote.innerHTML = '';
  }
}
