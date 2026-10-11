/**
 * @file share-service.js
 * @description Dedicated service for generating share links, triggering native share / clipboard fallback,
 * and loading shared plans from URL parameters.
 *
 * What is this file for:
 * - Encapsulates all sharing logic cleanly away from plan calculation and export services.
 * - Bridges the plan-encoder module with user actions, UI buttons, toasts, and browser APIs.
 *
 * What you can find in this file:
 * - `generateShareUrl`: Builds a full shareable URL containing an obfuscated, URL-safe Base64URL token.
 * - `sharePlan`: Main action triggering navigator.share or copying to clipboard with visual feedback.
 * - `loadPlanFromUrl`: Inspects current URL on boot, decodes any active share token, populates the form,
 *   and renders the shared plan.
 */

import { DOM } from '../ui/dom.js';
import { showToast } from '../ui/toast.js';
import { updateAyahMax } from '../ui/events.js';
import { getCurrentPlan, generatePlan } from './plan-service.js';
import { encodePlan, decodePlan } from '../utils/plan-encoder.js';

/**
 * Flag preventing duplicate simultaneous share triggers.
 */
let isSharing = false;

/**
 * Builds a clean, fully-qualified URL containing the encoded plan token (?p=...).
 *
 * @param {Object} plan
 * @returns {string} Fully qualified URL string.
 */
export function generateShareUrl(plan) {
  if (!plan || !plan.days) return '';

  const token = encodePlan({
    days: plan.days,
    startSurahIdx: plan.startSurahIdx || 0,
    startAyah: plan.startAyah || 1,
    startDate: plan.planStartDate || plan.startDate
  });

  const url = new URL(window.location.href);
  url.search = `?p=${token}`;
  url.hash = '';
  return url.toString();
}

/**
 * Copies a string to clipboard using navigator.clipboard with fallback to document.execCommand.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
  // Method 1: Async Clipboard API (Modern browsers)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to fallback if permission was denied or blocked
    }
  }

  // Method 2: Synchronous execCommand fallback (Firefox / Safari fallback)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (successful) return true;
  } catch (e) {
    console.warn('execCommand copy failed:', e);
  }

  return false;
}

/**
 * Temporarily shows "Copied!" feedback state on the share button.
 *
 * @param {HTMLElement} btn
 * @param {string} originalHtml
 */
function showCopiedButtonState(btn, originalHtml) {
  if (!btn) return;
  btn.classList.add('btn-copied');
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polyline points="2.5 8 6 11.5 12.5 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Link Copied!`;

  setTimeout(() => {
    btn.classList.remove('btn-copied');
    btn.innerHTML = originalHtml;
    btn.disabled = false;
    isSharing = false;
  }, 2200);
}

/**
 * Shares the currently active reading plan using navigator.share or copies the link to clipboard.
 *
 * @returns {Promise<void>}
 */
export async function sharePlan() {
  if (isSharing) return;

  const plan = typeof getCurrentPlan === 'function' ? getCurrentPlan() : null;
  if (!plan || !plan.schedule || !plan.schedule.length) {
    if (typeof showToast === 'function') {
      showToast('Please generate a plan first to share.', 'warning');
    }
    return;
  }

  const shareBtn = DOM.shareBtn || document.getElementById('shareBtn');
  const originalHtml = shareBtn ? shareBtn.innerHTML : '';

  isSharing = true;

  try {
    const shareUrl = generateShareUrl(plan);
    if (!shareUrl) throw new Error('Could not generate share URL.');

    const shareData = {
      title: 'Quran Reading Plan',
      text: `Quran Reading Schedule: ${plan.days} days reading plan.`,
      url: shareUrl
    };

    // If native share sheet is truly available and callable (mobile browsers)
    let sharedViaSheet = false;
    if (typeof navigator.share === 'function') {
      const canShare = typeof navigator.canShare === 'function' ? navigator.canShare(shareData) : true;
      if (canShare) {
        try {
          await navigator.share(shareData);
          sharedViaSheet = true;
          isSharing = false;
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            // User intentionally closed/cancelled the native share sheet
            isSharing = false;
            return;
          }
          // Any other error -> fall through to clipboard copy
        }
      }
    }

    // Fallback: Copy to clipboard
    if (!sharedViaSheet) {
      if (shareBtn) shareBtn.disabled = true;
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        if (typeof showToast === 'function') {
          showToast('Link copied to clipboard!', 'info');
        }
        showCopiedButtonState(shareBtn, originalHtml);
      } else {
        throw new Error('Clipboard write failed.');
      }
    }
  } catch (err) {
    console.error('Share action failed:', err);
    if (typeof showToast === 'function') {
      showToast('Failed to copy link. Please try again.', 'error');
    }
    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.innerHTML = originalHtml;
    }
    isSharing = false;
  }
}

/**
 * Checks URL parameters for an encoded plan token (?p=...).
 * If found and valid, restores form fields and renders the plan.
 *
 * @returns {boolean} True if a shared plan was successfully loaded from URL, false otherwise.
 */
export function loadPlanFromUrl() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('p');
    if (!token) return false;

    const planData = decodePlan(token);
    if (!planData || !planData.days) return false;

    // Populate form fields
    if (DOM.days) {
      DOM.days.value = planData.days;
    }

    if (DOM.startSurah && planData.startSurahIdx !== undefined) {
      DOM.startSurah.value = planData.startSurahIdx;
      if (typeof updateAyahMax === 'function') {
        updateAyahMax();
      }
    }

    if (DOM.startAyah && planData.startAyah) {
      DOM.startAyah.value = planData.startAyah;
    }

    // Highlight matching preset pill if applicable
    document.querySelectorAll('.pill[data-days]').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.days === String(planData.days));
    });

    // Generate plan automatically using custom start date if provided
    generatePlan(planData.startDate || null, false);

    if (typeof showToast === 'function') {
      showToast('Loaded shared Quran reading plan.', 'info');
    }

    return true;
  } catch (err) {
    console.warn('loadPlanFromUrl encountered an error:', err);
    return false;
  }
}

const shareService = {
  generateShareUrl,
  sharePlan,
  loadPlanFromUrl
};

export default shareService;
