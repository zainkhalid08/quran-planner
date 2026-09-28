/* ── Floating Stat Tooltips ── */

/**
 * Initializes floating tooltip handler for daily stat pills.
 */
function initStatTooltips() {
  let activeTooltip = null;
  let hideTimeout = null;

  function removeTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  }

  function showStatTooltip(targetElement) {
    const tooltipText = targetElement.getAttribute('data-title') || targetElement.getAttribute('title');
    if (!tooltipText) return;

    if (!targetElement.getAttribute('data-title')) {
      targetElement.setAttribute('data-title', tooltipText);
    }

    removeTooltip();

    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'daily-stat-tooltip';
    tooltipElement.textContent = tooltipText;
    tooltipElement.style.visibility = 'hidden';
    document.body.appendChild(tooltipElement);
    activeTooltip = tooltipElement;

    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = tooltipElement.offsetWidth;
    const tooltipHeight = tooltipElement.offsetHeight;

    let top = rect.top - tooltipHeight - 6;
    let left = rect.left + rect.width / 2;

    if (top < 8) {
      top = rect.bottom + 6;
    }

    const minLeft = (tooltipWidth / 2) + 8;
    const maxLeft = window.innerWidth - (tooltipWidth / 2) - 8;
    left = Math.max(minLeft, Math.min(maxLeft, left));

    tooltipElement.style.top = `${Math.round(top)}px`;
    tooltipElement.style.left = `${Math.round(left)}px`;
    tooltipElement.style.visibility = '';

    hideTimeout = setTimeout(removeTooltip, 2200);
  }

  document.addEventListener('click', function (event) {
    const statPill = event.target.closest('.daily-stat');
    if (statPill) {
      event.stopPropagation();
      showStatTooltip(statPill);
    } else {
      removeTooltip();
    }
  });

  window.addEventListener('scroll', removeTooltip, { passive: true });
}
