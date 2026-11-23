/**
 * @file progress.js
 * @description Reading progress summary shown in the results stats row, driven by the bookmark.
 *
 * What is this file for:
 * - Turns the bookmark position into an at-a-glance summary: percent of the plan read, as a stat
 *   pill and a thin bar under the stats row.
 *
 * What you can find in this file:
 * - `renderProgress`: Called by bookmark.js on every repaint (including while dragging).
 * - `hideProgress`: Called when the plan is cleared.
 *
 * Model:
 * - Stays hidden until something is read, so a new plan doesn't open with "0%".
 *   It appears or disappears when the bookmark is dropped, never mid-drag.
 */

const el = {
  item: document.getElementById('statProgressItem'),
  value: document.getElementById('statProgress'),
  strip: document.getElementById('progressStrip'),
  track: document.getElementById('progressTrack'),
  fill: document.getElementById('progressFill')
};

function setVisible(visible) {
  if (el.item) el.item.hidden = !visible;
  if (el.strip) el.strip.hidden = !visible;
}

/**
 * Updates the progress pill and bar.
 * @param {Object} p
 * @param {number} p.value - Ayahs read, relative to the plan start (0..total).
 * @param {number} p.total - Ayahs in the plan.
 * @param {boolean} [p.dragging] - True while the bookmark is being dragged.
 */
function renderProgress({ value, total, dragging = false }) {
  if (!el.item || !el.strip || !total) return;

  // Showing/hiding changes the height above the plan list, which moves the rows under a dragged
  // bookmark and flips the value back, so visibility only changes when the drag is not in progress.
  const visible = value > 0;
  if (!dragging) setVisible(visible);
  if (!visible) return;

  const ratio = value / total;
  let pct = Math.floor(ratio * 100);
  const pctText = pct === 0 ? '<1%' : `${pct}%`;
  if (value === total) pct = 100;

  el.value.textContent = pctText;
  el.strip.classList.toggle('complete', value === total);
  el.fill.style.width = `${ratio * 100}%`;
  el.track.setAttribute('aria-valuenow', String(pct));
  el.track.setAttribute('aria-valuetext', `${pctText} of the plan read`);
}

/** Hides the progress summary (used when the plan is cleared). */
function hideProgress() {
  setVisible(false);
}

export { renderProgress, hideProgress };
