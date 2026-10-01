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

import { showToast } from '../ui/toast.js';

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
 * Triggers the browser's native print / save as PDF dialog for the generated reading plan.
 * @returns {void}
 */
function printPlan() {
  if (!DOM.results || DOM.results.style.display === 'none') {
    showToast('Please generate a plan first to print or save as PDF.', 'warning');
    return;
  }
  window.print();
}

const exportService = {
  downloadPlan,
  printPlan
};

export { downloadPlan, printPlan, exportService };

