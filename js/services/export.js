/**
 * @file export.js
 * @description Export service converting reading schedule cards to downloadable PNG images and printable vector PDFs.
 *
 * What is this file for:
 * - Uses html2canvas to clone, style, render, and download the user's generated reading plan as a PNG image.
 * - Triggers native multi-page vector printing and Save-as-PDF via `window.print()`.
 *
 * What you can find in this file:
 * - `downloadPlan`: Asynchronous function handling DOM cloning at standard width, html2canvas rendering,
 *   Blob generation, and simulated link click download.
 * - `printPlan`: Triggers the browser's native print / save as PDF dialog for the generated plan.
 * - `exportService`: Namespace object grouping export capabilities.
 */
import { DOM } from '../ui/dom.js';
import { APP_VERSION } from '../config.js';
import { showToast } from '../ui/toast.js';
import { getCurrentPlan } from './plan-service.js';
import { generateShareUrl } from './share-service.js';

/**
 * Renders the plan card onto a canvas using html2canvas and triggers a PNG file download.
 * @param {Object} [options]
 * @param {HTMLElement} [options.targetElement] - Element to render into an image (defaults to DOM.results).
 * @param {HTMLElement} [options.buttonElement] - Button that triggered the export (defaults to DOM.downloadBtn).
 * @returns {Promise<void>}
 */
async function downloadPlan(options = {}) {
  const downloadButton = options.buttonElement || DOM.downloadBtn;
  const sourceElement = options.targetElement || DOM.results;

  if (!sourceElement) {
    showToast('No plan found to download.', 'warning');
    return;
  }


  if (downloadButton) {
    downloadButton.disabled = true;
    downloadButton.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
           style="animation:spin 0.8s linear infinite" aria-hidden="true">
        <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" stroke-width="1.5"
                stroke-dasharray="22" stroke-dashoffset="10"/>
      </svg>
      Generating image…`;
  }

  // Clone the exact same rendered results card to preserve responsive UI while exporting at standard width
  const cardClone = sourceElement.cloneNode(true);
  cardClone.id = 'resultsExportClone';
  cardClone.style.position = 'fixed';
  cardClone.style.top = '-9999px';
  cardClone.style.left = '-9999px';
  cardClone.style.width = '640px';
  cardClone.style.maxWidth = '640px';
  cardClone.style.animation = 'none';
  cardClone.style.transform = 'none';

  const exportHeader = cardClone.querySelector('.results-header');
  if (exportHeader) {
    exportHeader.style.display = 'block';
  }

  document.body.appendChild(cardClone);

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Calculate dynamic resolution scaling to prevent exceeding mobile canvas limits (e.g. Safari 16MP ceiling)
    const cloneWidth = cardClone.offsetWidth || 640;
    const cloneHeight = cardClone.offsetHeight || cardClone.scrollHeight || 1000;
    const naturalArea = cloneWidth * cloneHeight;
    const MAX_CANVAS_AREA = 12_000_000; // 12 MP safe ceiling across mobile WebKit and memory constraints
    const MAX_CANVAS_DIMENSION = 16_000; // Safe upper bound for maximum single dimension
    const IDEAL_SCALE = 2.5; // High-DPI crisp export for standard plan lengths

    let scale = Math.min(
      IDEAL_SCALE,
      Math.sqrt(MAX_CANVAS_AREA / naturalArea),
      MAX_CANVAS_DIMENSION / cloneHeight
    );
    scale = Math.max(1.0, Math.round(scale * 100) / 100);

    const isDarkMode = document.documentElement.classList.contains('dark');
    const canvas = await html2canvas(cardClone, {
      scale,
      useCORS: true,
      backgroundColor: isDarkMode ? '#0d0d0d' : '#ffffff',
      logging: false,
    });

    const statDaysEl = DOM.statDays || document.getElementById('statDays');
    const totalDays = statDaysEl ? statDaysEl.textContent : 'custom';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      throw new Error('Canvas to Blob conversion failed');
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `quran-plan-${totalDays}days.png`;
    link.href = objectUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  } catch (err) {
    console.error('Download failed:', err);
    if (typeof showToast === 'function') {
      showToast('Could not generate image. Please try again.', 'error');
    }
  } finally {
    if (cardClone.parentNode) {
      document.body.removeChild(cardClone);
    }
    if (downloadButton) {
      downloadButton.disabled = false;
      downloadButton.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M7.5 10.5L3.5 6.5H6V1.5H9V6.5H11.5L7.5 10.5Z" fill="currentColor" />
          <path d="M2 12.5H13V13.5H2V12.5Z" fill="currentColor" />
        </svg>
        Download Image`;
    }
  }
}

/**
 * Flag preventing re-entrant or duplicate print dialog triggers.
 */
let isPrinting = false;

/**
 * Triggers the browser's native print / save as PDF dialog for the generated reading plan.
 * Temporarily sets document.title to "quranplanner.org" so browsers default the saved PDF filename to quranplanner.org.pdf.
 * @returns {void}
 */
function printPlan() {
  if (isPrinting) return;
  if (!DOM.results || DOM.results.style.display === 'none') {
    showToast('Please generate a plan first to print or save as PDF.', 'warning');
    return;
  }
  isPrinting = true;
  document.title = 'quranplanner.org';

  const restoreTitle = () => {
    isPrinting = false;
    window.removeEventListener('afterprint', restoreTitle);
  };

  window.addEventListener('afterprint', restoreTitle, { once: true });

  try {
    window.print();
  } catch (err) {
    console.error('Print failed:', err);
    restoreTitle();
  } finally {
    setTimeout(restoreTitle, 3000);
  }
}

/**
 * Converts a Date object or date string into YYYYMMDD string for iCalendar all-day events.
 * @param {Date|string} date
 * @returns {string}
 */
function formatIcsDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Converts a full transliterated Surah name (e.g. "An-Nisa", "Al-Baqarah") to a concise title (e.g. "Nisa", "Baqarah").
 * @param {string} name
 * @returns {string}
 */
function getShortSurahName(name) {
  if (!name) return 'Surah';
  return name.replace(/^(?:Al|An|At|Ar|As|Ash|Az|Ad|Ath|Al-)\b-?/i, '').replace(/^-+/, '');
}

/**
 * Builds standard RFC 5545 iCalendar content string for the schedule.
 * @param {Object} plan - Complete plan object
 * @returns {string}
 */
function generateIcs(plan) {
  const schedule = plan.schedule;
  const totalDays = plan.days;
  const shareUrl = typeof generateShareUrl === 'function' ? generateShareUrl(plan) : '';

  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//quranplanner.org v${APP_VERSION}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Quran Reading Plan'
  ];

  for (const item of schedule) {
    const dtStart = formatIcsDate(item.date);
    const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
    const nextDay = new Date(itemDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const dtEnd = formatIcsDate(nextDay);

    const surahName = item.surah?.name || 'Surah';
    const shortSurah = getShortSurahName(surahName);
    const surahNumber = item.surah?.number || '';
    const surahArabic = item.surah?.arabic ? ` (${item.surah.arabic})` : '';
    const targetAyah = item.targetAyah || 1;
    const dayCount = item.dayAyahsCount || 0;

    const summary = `Day ${item.day}/${totalDays}: Till ${shortSurah} ${targetAyah}`;

    const descParts = [
      `Day ${item.day} of ${totalDays}`,
      `Read till Surah ${surahNumber}. ${surahName}${surahArabic} Ayah ${targetAyah}.`,
      `Ayah count is ${dayCount}`
    ];
    if (shareUrl) {
      descParts.push(shareUrl);
    }
    const description = descParts.join('\\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:quran-plan-d${item.day}-${dtStart}@quranplanner.org`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Flag preventing duplicate calendar export triggers.
 */
let isExportingCalendar = false;

/**
 * Generates an iCalendar (.ics) file for the active schedule and triggers a file download.
 * @returns {void}
 */
function downloadCalendarPlan() {
  if (isExportingCalendar) return;
  const calendarBtn = DOM.calendarBtn || document.getElementById('calendarBtn');
  const plan = typeof getCurrentPlan === 'function' ? getCurrentPlan() : null;

  if (!plan || !plan.schedule || !plan.schedule.length) {
    if (typeof showToast === 'function') {
      showToast('Please generate a plan first to export to calendar.', 'warning');
    }
    return;
  }

  isExportingCalendar = true;
  let originalHtml = '';
  if (calendarBtn) {
    originalHtml = calendarBtn.innerHTML;
    calendarBtn.disabled = true;
    calendarBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
           style="animation:spin 0.8s linear infinite" aria-hidden="true">
        <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" stroke-width="1.5"
                stroke-dasharray="22" stroke-dashoffset="10"/>
      </svg>
      Exporting…`;
  }

  try {
    const icsData = generateIcs(plan);
    const filename = `quran-plan-${plan.days}days.ics`;

    let downloaded = false;

    // Primary: Blob URL download
    try {
      const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
      if (typeof window.navigator !== 'undefined' && typeof window.navigator.msSaveOrOpenBlob === 'function') {
        window.navigator.msSaveOrOpenBlob(blob, filename);
        downloaded = true;
      } else {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = objectUrl;
        link.setAttribute('download', filename);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (link.parentNode) link.parentNode.removeChild(link);
          URL.revokeObjectURL(objectUrl);
        }, 1200);
        downloaded = true;
      }
    } catch (blobErr) {
      console.warn('Blob download failed, trying data URI fallback:', blobErr);
    }

    // Fallback: Data URI download if Blob was blocked
    if (!downloaded) {
      const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsData);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = dataUri;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 500);
    }

    if (typeof showToast === 'function') {
      showToast('Calendar schedule (.ics) downloaded. Open it to sync with your calendar.', 'info');
    }

    if (calendarBtn) {
      calendarBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <polyline points="2.5 8 6 11.5 12.5 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Downloaded!`;
      setTimeout(() => {
        isExportingCalendar = false;
        calendarBtn.disabled = false;
        calendarBtn.innerHTML = originalHtml;
      }, 2200);
    } else {
      isExportingCalendar = false;
    }
  } catch (err) {
    isExportingCalendar = false;
    console.error('Calendar export failed:', err);
    if (typeof showToast === 'function') {
      showToast('Failed to export calendar. Please try again.', 'error');
    }
    if (calendarBtn) {
      calendarBtn.disabled = false;
      calendarBtn.innerHTML = originalHtml;
    }
  }
}

const exportService = {
  downloadPlan,
  printPlan,
  downloadCalendarPlan
};

export { downloadPlan, printPlan, downloadCalendarPlan, exportService };

