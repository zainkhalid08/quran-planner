/**
 * Renders the plan card onto a canvas using html2canvas and triggers a PNG file download.
 */
async function downloadPlan() {
  const downloadButton = DOM.downloadBtn;

  downloadButton.disabled = true;
  downloadButton.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"
         style="animation:spin 0.8s linear infinite">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" stroke-width="1.5"
              stroke-dasharray="22" stroke-dashoffset="10"/>
    </svg>
    Generating image…`;

  // Clone the exact same rendered results card to preserve responsive UI while exporting at standard width
  const cardClone = DOM.results.cloneNode(true);
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
    await document.fonts.ready;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const canvas = await html2canvas(cardClone, {
      scale: 3,
      useCORS: true,
      backgroundColor: isDarkMode ? '#0d0d0d' : '#ffffff',
      logging: false,
    });

    const totalDays = DOM.statDays.textContent;
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
    alert('Could not generate image. Please try again.');
  } finally {
    if (cardClone.parentNode) {
      document.body.removeChild(cardClone);
    }
    downloadButton.disabled = false;
    downloadButton.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.5 10.5L3.5 6.5H6V1.5H9V6.5H11.5L7.5 10.5Z" fill="currentColor" />
        <path d="M2 12.5H13V13.5H2V12.5Z" fill="currentColor" />
      </svg>
      Download Image`;
  }
}
